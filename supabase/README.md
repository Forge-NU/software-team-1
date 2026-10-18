# Supabase backend

## Layout

```
supabase/
  config.toml          local Supabase settings (used by `supabase start`)
  deno.json            Deno settings for running the tests
  migrations/          database schema, applied in filename order
  functions/places/    edge function for the Google Places API (being replaced by OpenStreetMap)
  scripts/             one-off scripts, e.g. importing places from OpenStreetMap
  tests/
    database/          schema tests against the real migrations
    places/            edge function tests
    osm/               OpenStreetMap importer tests
    lib/               app client (src/lib) tests
```

## Migrations

| File | What it contains |
| --- | --- |
| `20261007013000_initial_schema.sql` | Every table from the ERD, indexes, triggers (`users` row on sign-up, `overall_ratings` recalculation) and row level security policies |
| `20261007013100_seed_lookups.sql` | Values for the lookup tables (`location_type`, `campus`, `price_range`, `day`, `seat_type`, `capacity`, `outlet_level`, `crowd_level`, `noise_level`) |
| `20261007013200_upsert_google_place.sql` | `upsert_google_place(jsonb)`, used by the `places` edge function to save a location, its address and hours in one transaction |
| `20261013170000_postgis.sql` | Adds `PostGIS` and a computed `geo_location` column for distance queries |
| `20261015161300_posts.sql` | Replaces `check_in` and `photo` with `post` and `post_photo`, the private `post-photos` bucket, and `create_post` |
| `20261016150500_review_photos.sql` | Optional `review_photo` rows, the private `review-photos` bucket, and `attach_review_photos` |
| `20261018120000_openstreetmap.sql` | `osm_type`/`osm_id` on `location`, and `upsert_osm_places(jsonb)`, used by the OpenStreetMap import script to save locations, addresses and hours in one transaction |

### Why the filenames look like that

The Supabase CLI only picks up files named `<timestamp>_<name>.sql`. It runs them in timestamp order and records which ones have been applied to each database, so a file without the timestamp prefix is silently skipped.

The schema is split by purpose so each file is easy to review:

- **Schema** is the table structure and rules.
- **Seed lookups** is reference data. It lives in a migration rather than `seed.sql` because `seed.sql` only runs locally on `supabase db reset`, and production needs these rows too.
- **Upsert Google place** is only needed by the Places integration.

### Changing the schema

Once a migration has been pushed to the hosted project, never edit it. The CLI won't re-run it, so the change would never reach the database. Add a new file instead:

```bash
npx supabase migration new add_something    # creates migrations/<timestamp>_add_something.sql
npx supabase db reset                       # rebuild the local database from all migrations
npx supabase db push                        # apply new migrations to the hosted project
```

### Posts

A post is a check-in: crowd, noise and wifi live on `post`, and it is saved with at least one photo in `post_photo`. The app calls this through `src/lib/posts.ts` (`createPost`, `getPostsForLocation`, `getRecentPhotos`). Photos are objects in the private `post-photos` bucket, under `{userId}/{file}`, and the client turns those paths into signed URLs.

Explore (B-5) should read posts on the location instead of `seating_area.check_in` and `seating_area.photo`:

```
post (
  created_at, crowd_level_id, noise_level_id,
  crowd_level ( label ), noise_level ( label ),
  post_photo ( storage_path, created_at )
)
```

Crowdedness is the latest post's crowd level. The photo strip signs `post_photo.storage_path` on the client. The author display name is `users.name`.

Reviews use `src/lib/reviews.ts` (`createReview`, `getReviewsForSeating`). A review never requires a photo; when photos are included they live in the `review-photos` bucket and are linked with `attach_review_photos`.

## Importing places from OpenStreetMap

`scripts/import_osm.ts` fetches libraries, cafes, coworking spaces and campus buildings around Boston from the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) and saves them with `upsert_osm_places`. It replaces importing from Google Places, whose terms don't allow keeping place details in our own database.

```bash
npm run import:osm -- --dry-run --out=places.json    # fetch and summarize, save nothing
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run import:osm
```

- The service role key is under Dashboard → Project Settings → API (or `npx supabase status` locally). It bypasses row level security, so never commit it or ship it in the app.
- `--types=library,cafe,coworking,campus_building,park,restaurant` picks what to fetch (the first four by default). Campus buildings are only fetched on university grounds.
- `campus` is filled in when a place is on the grounds of a university in the `campus` table. `scripts/osm/overpass.ts` maps each one to its OSM name (`CAMPUS_AREAS`).
- `opening_hours` is converted into one `day_hours` row per day. Breaks during the day (e.g. a lunch break) become first open to last close. About a quarter of places have hours in OSM, and some values are wrong at the source.
- OSM has no price level, so `price_range_id` is left for admins to set.
- Re-running is safe: places are matched on `osm_type`/`osm_id`, and name, coordinates, address and hours are refreshed. Manual `location_type`, `campus` and price edits are kept.
- It makes two requests to the public Overpass server and retries with backoff when the server is busy. Don't run it on a schedule against the public server.

OSM data is © OpenStreetMap contributors under the [ODbL](https://www.openstreetmap.org/copyright). The app must show that credit wherever it displays locations with an `osm_id`, and data derived from it has to stay available under the ODbL if it's used publicly.

## Edge function: `places`

- `functions/places/index.ts` is the entry point. It reads env vars and starts the server.
- `functions/places/handler.ts` routes search, import and sync requests.
- `functions/places/google.ts` is the Google API client and converts responses into our schema.

The app calls it through `src/lib/places.ts`.

It needs `GOOGLE_PLACES_API_KEY`:

- **Hosted:** `npx supabase secrets set GOOGLE_PLACES_API_KEY=...`
- **Local:** put it in `supabase/functions/.env` (see `functions/.env.example`), then run `npx supabase functions serve places`

## Tests

Requires [Deno](https://deno.com) (`brew install deno`). No Docker, Supabase project or Google key needed.

```bash
npm run test:backend
```

| File | What it covers |
| --- | --- |
| `tests/places/google_test.ts` | Converting Google responses (hours, address, place type, price), and the requests sent to Google |
| `tests/places/handler_test.ts` | Each edge function route end to end, with Google and the database faked: input validation, error codes, and the caller's login being passed through |
| `tests/database/schema_test.ts` | The real migrations running in an in-memory Postgres ([PGlite](https://pglite.dev)): constraints, cascade deletes, the ratings trigger, row level security for anon, student and admin, posts and the photo bucket, `upsert_google_place`, `upsert_osm_places`, and `nearby_locations` (radius, ordering, filters, cursor pagination, input validation) |
| `tests/osm/overpass_test.ts` | Converting OSM tags (location type, address, opening hours) and the Overpass queries, retries and campus matching, with the server faked |
| `tests/lib/places_test.ts` | `getNearbyLocations` in `src/lib/places.ts`, with PostgREST faked by running `nearby_locations` in the in-memory database: paging with `nextCursor`, filters, and pageSize/cursor validation |

`tests/database/db.ts` stands in for the parts of Supabase the migrations rely on (`auth.users`, `auth.uid()`, the `anon` and `authenticated` roles, `storage`, and the `extensions` schema) and loads PGlite's PostGIS extension. Each test runs inside a transaction that is rolled back afterward, so tests don't affect each other. Use `seed(db)` for a starting admin, two students, and a location with an area and seat, and `db.as(userId)` to run a query as that user (`null` for signed out).

`deno.json` maps `src/lib/supabase.ts` (which reads Expo env vars) to `tests/lib/supabase.ts`, a client pointed at a fake URL that tests answer by stubbing `fetch`.
