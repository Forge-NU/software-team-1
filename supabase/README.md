# Supabase backend

## Layout

```
supabase/
  config.toml          local Supabase settings (used by `supabase start`)
  deno.json            Deno settings for running the tests
  migrations/          database schema, applied in filename order
  functions/           Edge Functions (Deno); secrets stay here / on the host — never in the Expo app
  scripts/             one-off scripts, e.g. importing places from OpenStreetMap
  tests/
    database/          schema tests against the real migrations
    delete-account/    delete-account Edge Function handler tests
    osm/               OpenStreetMap importer tests
    lib/               app client (src/lib) tests
```

## Migrations

| File | What it contains |
| --- | --- |
| `20261007013000_initial_schema.sql` | Every table from the ERD, indexes, triggers (`users` row on sign-up, `overall_ratings` recalculation) and row level security policies |
| `20261007013100_seed_lookups.sql` | Values for the lookup tables (`location_type`, `campus`, `price_range`, `day`, `seat_type`, `capacity`, `outlet_level`, `crowd_level`, `noise_level`) |
| `20261007013200_upsert_google_place.sql` | `upsert_google_place(jsonb)`, used by the former Google Places edge function (dropped in `20261018130000`) |
| `20261013170000_postgis.sql` | Adds `PostGIS` and a computed `geo_location` column for distance queries |
| `20261015161300_posts.sql` | Replaces `check_in` and `photo` with `post` and `post_photo`, the private `post-photos` bucket, and `create_post` |
| `20261016150500_review_photos.sql` | Optional `review_photo` rows, the private `review-photos` bucket, and `attach_review_photos` |
| `20261018120000_openstreetmap.sql` | `osm_type`/`osm_id` on `location`, and `upsert_osm_places(jsonb)`, used by the OpenStreetMap import script to save locations, addresses and hours in one transaction |
| `20261018130000_drop_google_places.sql` | Drops `upsert_google_place`. `google_place_id` is kept for locations imported before the switch |
| `20261101120000_area_amenities.sql` | The `phone_policy` lookup table, and optional `phone_policy_id`, `time_limit_minutes` and `wheelchair_accessible` on `area`. Null means unknown or not applicable |
| `20261103120000_saved_spots.sql` | `saved_spot`: a user's bookmarked locations, readable and writable only by that user |
| `20261104120000_study_preferences.sql` | `user_preferences`: noise and amenity preferences and the saved-spot notification setting, visible only to their owner |
| `20261110010000_abuse_controls.sql` | Post rate limits in `create_post`, `flag.post_id` + one-report-per-target, and `open_flags` for admins (no auto-hide) |
| `20261111010000_backend_settings.sql` | `backend_settings` key/value table; `create_post` reads spot cooldown (10m) and hourly cap (100) from it |

### Why the filenames look like that

The Supabase CLI only picks up files named `<timestamp>_<name>.sql`. It runs them in timestamp order and records which ones have been applied to each database, so a file without the timestamp prefix is silently skipped.

The schema is split by purpose so each file is easy to review:

- **Schema** is the table structure and rules.
- **Seed lookups** is reference data. It lives in a migration rather than `seed.sql` because `seed.sql` only runs locally on `supabase db reset`, and production needs these rows too.
- **Upsert Google place** was only needed by the Google Places integration, which has been removed.

### Changing the schema

Once a migration has been pushed to the hosted project, never edit it. The CLI won't re-run it, so the change would never reach the database. Add a new file instead:

```bash
npx supabase migration new add_something    # creates migrations/<timestamp>_add_something.sql
npx supabase db reset                       # rebuild the local database from all migrations
npx supabase db push                        # apply new migrations to the hosted project
```

Then regenerate the types (below) and commit them with the migration.

### Users

`public.users` is the only identity table. `handle_new_user()` creates one row per sign-up, with `name` taken from the sign-up metadata's `name` key (falling back to the part of the email before the @). Every other table that belongs to a user references `public.users`, and author names come from `users.name`.

### Generated types

`database.types.ts` (repo root) is generated from the `public` schema. Don't edit it by hand:

```bash
npx supabase gen types typescript --schema public > database.types.ts            # local database
npx supabase gen types typescript --remote --schema public > database.types.ts   # or the linked hosted project
npx oxfmt database.types.ts                                                       # the CLI's output is unformatted
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

## Account deletion (`delete-account`)

App Store rules require in-app account deletion. The Expo app calls `deleteMyAccount()` in `src/lib/auth.ts`, which invokes the `delete-account` Edge Function with the user's JWT, then signs out.

The function:

1. Resolves the caller from the JWT (never from the request body)
2. Removes Storage objects under `{userId}/` in the private `post-photos` and `review-photos` buckets
3. Calls `auth.admin.deleteUser`, which cascades `public.users` and related rows (posts, votes, reviews, follows, …)

`SUPABASE_SERVICE_ROLE_KEY` is required only as an Edge Function secret (injected automatically by `supabase functions serve` / the hosted project). Do not put it in `.env` for Expo or any `EXPO_PUBLIC_*` variable.

```bash
npx supabase functions serve delete-account   # local; CLI injects URL, anon, and service role
npx supabase functions deploy delete-account  # hosted; service role is already a project secret
```

## Importing places from OpenStreetMap

`scripts/import_osm.ts` fetches libraries, cafes, coworking spaces and campus buildings around Boston from the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) and saves them with `upsert_osm_places`. It replaced the Google Places edge function, since Google's terms don't allow keeping place details in our own database.

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

## Tests

Requires [Deno](https://deno.com) (`brew install deno`). No Docker or Supabase project needed.

```bash
npm run test:backend
```

| File | What it covers |
| --- | --- |
| `tests/database/schema_test.ts` | The real migrations running in an in-memory Postgres ([PGlite](https://pglite.dev)): constraints, cascade deletes, the ratings trigger, row level security for anon, student and admin, posts and the photo bucket, `upsert_osm_places`, and `nearby_locations` (radius, ordering, filters, cursor pagination, input validation) |
| `tests/delete-account/handler_test.ts` | `delete-account` Edge Function: JWT-only identity, storage prefix cleanup in both photo buckets, auth user delete (including already-gone retries), and rejecting unauthenticated callers |
| `tests/osm/overpass_test.ts` | Converting OSM tags (location type, address, opening hours) and the Overpass queries, retries and campus matching, with the server faked |
| `tests/lib/places_test.ts` | `getNearbyLocations` in `src/lib/places.ts`, with PostgREST faked by running `nearby_locations` in the in-memory database: paging with `nextCursor`, filters, and pageSize/cursor validation |
| `tests/lib/auth_test.ts` | `signUp` sends the display name under the metadata key `handle_new_user` reads |

`tests/database/users.test.sql` is a [pgTAP](https://pgtap.org) test for sign-up and `users` RLS. It runs against the local Supabase stack with `npx supabase test db`.

`tests/database/db.ts` stands in for the parts of Supabase the migrations rely on (`auth.users`, `auth.uid()`, the `anon` and `authenticated` roles, `storage`, and the `extensions` schema) and loads PGlite's PostGIS extension. Each test runs inside a transaction that is rolled back afterward, so tests don't affect each other. Use `seed(db)` for a starting admin, two students, and a location with an area and seat, and `db.as(userId)` to run a query as that user (`null` for signed out).

`deno.json` maps `src/lib/supabase.ts` (which reads Expo env vars) to `tests/lib/supabase.ts`, a client pointed at a fake URL that tests answer by stubbing `fetch`.
