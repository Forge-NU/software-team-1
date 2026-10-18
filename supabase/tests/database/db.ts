// In-memory Postgres (PGlite) with the real migrations applied, for schema tests.
// Stubs the pieces of Supabase the migrations depend on: the anon/authenticated
// roles, auth.users, auth.uid(), storage.buckets/objects, the extensions schema and the default
// grants Supabase gives those roles.

import { PGlite } from 'npm:@electric-sql/pglite@0.5.8'
import { postgis } from 'npm:@electric-sql/pglite-postgis@0.2.8'

export const ADMIN = '00000000-0000-0000-0000-00000000000a'
export const STUDENT = '00000000-0000-0000-0000-00000000000b'
export const OTHER_STUDENT = '00000000-0000-0000-0000-00000000000c'

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create schema extensions;
  grant usage on schema extensions to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;

  create schema storage;
  grant usage on schema storage to anon, authenticated;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text not null references storage.buckets (id),
    name text not null,
    unique (bucket_id, name)
  );
  grant select on storage.buckets to anon, authenticated;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  alter table storage.objects enable row level security;
  -- Supabase drops the filename and returns only the folders.
  create function storage.foldername(name text)
  returns text[]
  language plpgsql
  immutable
  as $fn$
  declare
    parts text[];
  begin
    parts := string_to_array(name, '/');
    return parts[1:array_length(parts, 1) - 1];
  end;
  $fn$;
  grant execute on function storage.foldername(text) to anon, authenticated;
`

async function createDatabase(): Promise<PGlite> {
  const pg = new PGlite({ extensions: { postgis } })
  await pg.exec(SUPABASE_STUBS)
  const dir = new URL('../../migrations/', import.meta.url)
  const files = [...Deno.readDirSync(dir)].map((e) => e.name).filter((n) => n.endsWith('.sql')).sort()
  for (const file of files) {
    await pg.exec(Deno.readTextFileSync(new URL(file, dir)))
  }
  return pg
}

const pg = await createDatabase()

/** A user id to act as a signed-in user, or null to act as anon. */
export type Actor = string | null

export interface Db {
  /** Runs a query as the database owner (bypasses RLS), like the service role. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  /** Runs a query as a signed-in user, or as anon when actor is null. */
  as(actor: Actor): { query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> }
}

async function run<T>(actor: Actor | undefined, sql: string, params: unknown[] = []): Promise<T[]> {
  await pg.exec('savepoint q')
  try {
    if (actor !== undefined) {
      await pg.query(`select set_config('role', $1, true), set_config('request.jwt.claim.sub', $2, true)`, [
        actor ? 'authenticated' : 'anon',
        actor ?? '',
      ])
    }
    const { rows } = await pg.query<T>(sql, params)
    if (actor !== undefined) {
      await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', true)`)
    }
    await pg.exec('release savepoint q')
    return rows
  } catch (err) {
    await pg.exec('rollback to savepoint q; release savepoint q')
    throw err
  }
}

const db: Db = {
  query: (sql, params) => run(undefined, sql, params),
  as: (actor) => ({ query: (sql, params) => run(actor, sql, params) }),
}

/** Runs fn inside a transaction that is always rolled back, so tests don't affect each other. */
export async function withDb(fn: (db: Db) => Promise<void>): Promise<void> {
  await pg.exec('begin')
  try {
    await fn(db)
  } finally {
    await pg.exec('rollback')
  }
}

/** Asserts the promise fails with the given Postgres error code (e.g. 23514 check, 42501 RLS). */
export async function assertPgError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise
  } catch (err) {
    const actual = (err as { code?: string }).code
    if (actual === code) return
    throw new Error(`Expected Postgres error ${code}, got ${actual}: ${(err as Error).message}`)
  }
  throw new Error(`Expected Postgres error ${code}, but the query succeeded`)
}

export interface Fixture {
  locationId: number
  areaId: number
  seatingId: number
}

/** Creates an admin, two students, and a location with one area and one seating area. */
export async function seed(db: Db): Promise<Fixture> {
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'admin@northeastern.edu', '{"name": "Ada Admin"}'),
       ($2, 'student@northeastern.edu', '{"name": "Sam Student"}'),
       ($3, 'other@northeastern.edu', null)`,
    [ADMIN, STUDENT, OTHER_STUDENT],
  )
  await db.query(`update public.users set user_type = 'admin' where user_id = $1`, [ADMIN])

  const [{ location_id }] = await db.query<{ location_id: number }>(
    `insert into public.location (name, latitude, longitude, location_type, campus)
     values ('Snell Library', 42.338, -71.088, 'library', 'Northeastern University')
     returning location_id`,
  )
  const [{ area_id }] = await db.query<{ area_id: number }>(
    `insert into public.area (location_id, name, floor) values ($1, 'Quiet floor', '3') returning area_id`,
    [location_id],
  )
  const [{ seating_id }] = await db.query<{ seating_id: number }>(
    `insert into public.seating_area (location_id, area_id, name, seat_type, capacity_id, outlet_level_id)
     values ($1, $2, 'Window desks', 'desk', 1, 3)
     returning seating_id`,
    [location_id, area_id],
  )
  return { locationId: location_id, areaId: area_id, seatingId: seating_id }
}
