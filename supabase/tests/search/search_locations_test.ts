import { assertEquals } from 'jsr:@std/assert@1'
import { assertPgError, type Db, withDb } from '../database/db.ts'

const RAISE_EXCEPTION = 'P0001'
const BOSTON = { lat: 42.3398, lon: -71.0892 }

async function addLocation(db: Db, name: string, lat = BOSTON.lat, lon = BOSTON.lon): Promise<number> {
  const [{ location_id }] = await db.query<{ location_id: number }>(
    `insert into public.location (name, latitude, longitude, location_type)
     values ($1, $2, $3, 'library') returning location_id`,
    [name, lat, lon],
  )
  return Number(location_id)
}

async function addAll(db: Db, names: string[]) {
  for (const name of names) await addLocation(db, name)
}

const search = async (
  db: Db,
  query: string,
  opts: { lat?: number | null; lon?: number | null; limit?: number } = {},
  actor: string | null = null,
) =>
  (await db.as(actor).query<{ name: string }>(
    'select name from public.search_locations($1, $2::float8, $3::float8, $4::int)',
    [query, opts.lat ?? null, opts.lon ?? null, opts.limit ?? 20],
  )).map((r) => r.name)

Deno.test('search_locations', async (t) => {
  await t.step('a partial name finds matches: "sne" returns Snell results', () =>
    withDb(async (db) => {
      await addAll(db, ['Snell Library', 'Snell Engineering Center', 'Law Library', 'Curry Student Center'])
      assertEquals(await search(db, 'sne'), ['Snell Engineering Center', 'Snell Library'])
    }))

  await t.step('matching is case-insensitive and ignores surrounding spaces', () =>
    withDb(async (db) => {
      await addAll(db, ['Snell Library', 'Law Library'])
      assertEquals(await search(db, '  SNELL '), ['Snell Library'])
    }))

  await t.step('names starting with the query come first, then later words, then anywhere', () =>
    withDb(async (db) => {
      await addAll(db, ['Calibre Coffee', 'Snell Library', 'Library Annex'])
      assertEquals(await search(db, 'lib'), ['Library Annex', 'Snell Library', 'Calibre Coffee'])
    }))

  await t.step('small typos still match', () =>
    withDb(async (db) => {
      await addAll(db, ['Snell Library', 'Law Library', 'Curry Student Center'])
      assertEquals((await search(db, 'libary')).sort(), ['Law Library', 'Snell Library'])
    }))

  await t.step('no results for an unknown name, an empty query, or only spaces', () =>
    withDb(async (db) => {
      await addAll(db, ['Snell Library'])
      assertEquals(await search(db, 'zzqx'), [])
      assertEquals(await search(db, ''), [])
      assertEquals(await search(db, '   '), [])
    }))

  await t.step('LIKE wildcards are matched literally', () =>
    withDb(async (db) => {
      await addAll(db, ['Snell Library', 'Law Library'])
      assertEquals(await search(db, '%'), [])
      assertEquals(await search(db, '_'), [])
    }))

  await t.step('works without coordinates, ordering equal matches by name', () =>
    withDb(async (db) => {
      await addLocation(db, 'Cafe Near', BOSTON.lat + 0.001, BOSTON.lon)
      await addLocation(db, 'Cafe Far', BOSTON.lat + 0.05, BOSTON.lon)
      assertEquals(await search(db, 'cafe'), ['Cafe Far', 'Cafe Near'])
    }))

  await t.step('with coordinates, equal matches are nearest first', () =>
    withDb(async (db) => {
      await addLocation(db, 'Cafe Near', BOSTON.lat + 0.001, BOSTON.lon)
      await addLocation(db, 'Cafe Far', BOSTON.lat + 0.05, BOSTON.lon)
      assertEquals(await search(db, 'cafe', BOSTON), ['Cafe Near', 'Cafe Far'])
    }))

  await t.step('a better name match beats a closer spot', () =>
    withDb(async (db) => {
      await addLocation(db, 'Corner Cafe', BOSTON.lat + 0.001, BOSTON.lon)
      await addLocation(db, 'Cafe Far', BOSTON.lat + 0.05, BOSTON.lon)
      assertEquals(await search(db, 'cafe', BOSTON), ['Cafe Far', 'Corner Cafe'])
    }))

  await t.step('respects the result limit', () =>
    withDb(async (db) => {
      await addAll(db, ['Cafe A', 'Cafe B', 'Cafe C'])
      assertEquals((await search(db, 'cafe', { limit: 2 })).length, 2)
    }))

  await t.step('signed-out and signed-in callers can both search', () =>
    withDb(async (db) => {
      await addAll(db, ['Snell Library'])
      assertEquals(await search(db, 'snell', {}, null), ['Snell Library'])
    }))

  await t.step('rejects invalid input', () =>
    withDb(async (db) => {
      await assertPgError(search(db, 'snell', { lat: BOSTON.lat }), RAISE_EXCEPTION)
      await assertPgError(search(db, 'snell', { lat: 100, lon: 0 }), RAISE_EXCEPTION)
      await assertPgError(search(db, 'snell', { lat: 0, lon: 200 }), RAISE_EXCEPTION)
      await assertPgError(search(db, 'snell', { limit: 0 }), RAISE_EXCEPTION)
      await assertPgError(search(db, 'snell', { limit: 51 }), RAISE_EXCEPTION)
      await assertPgError(search(db, 'x'.repeat(101)), RAISE_EXCEPTION)
    }))

  await t.step('location names have a trigram index, so search stays fast', () =>
    withDb(async (db) => {
      const rows = await db.query<{ indexdef: string }>(
        `select indexdef from pg_indexes where indexname = 'location_name_trgm_idx'`,
      )
      assertEquals(rows.length, 1)
    }))
})
