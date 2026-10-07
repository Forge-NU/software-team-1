# Supabase backend

## Layout

```
supabase/
  config.toml          local Supabase settings (used by `supabase start`)
  deno.json            Deno settings for running the tests
  migrations/          database schema, applied in filename order
  functions/places/    edge function for the Google Places API
  tests/
    database/          schema tests against the real migrations
    places/            edge function tests
```

## Migrations

| File | What it contains |
| --- | --- |
| `20261007013000_initial_schema.sql` | Every table from the ERD, indexes, triggers (`users` row on sign-up, `overall_ratings` recalculation) and row level security policies |
| `20261007013100_seed_lookups.sql` | Values for the lookup tables (`location_type`, `campus`, `price_range`, `day`, `seat_type`, `capacity`, `outlet_level`, `crowd_level`, `noise_level`) |
| `20261007013200_upsert_google_place.sql` | `upsert_google_place(jsonb)`, used by the `places` edge function to save a location, its address and hours in one transaction |

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
| `tests/database/schema_test.ts` | The real migrations running in an in-memory Postgres ([PGlite](https://pglite.dev)): constraints, cascade deletes, the ratings trigger, row level security for anon, student and admin, and `upsert_google_place` |

`tests/database/db.ts` stands in for the parts of Supabase the migrations rely on (`auth.users`, `auth.uid()`, the `anon` and `authenticated` roles). Each test runs inside a transaction that is rolled back afterward, so tests don't affect each other. Use `seed(db)` for a starting admin, two students, and a location with an area and seat, and `db.as(userId)` to run a query as that user (`null` for signed out).
