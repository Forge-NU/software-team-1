import { assertEquals, assertRejects, assertStringIncludes } from 'jsr:@std/assert@1'
import { getNearbyLocations } from '../../../src/lib/places.ts'
import { type Db, withDb } from '../database/db.ts'
import { SUPABASE_URL } from './supabase.ts'

// Snell Library. 0.001 degrees of latitude is about 111 m.
const HERE = { lat: 42.338, lon: -71.088 }

/** Answers the app's PostgREST rpc call by running nearby_locations against the in-memory database, as anon. */
function stubRpc(db: Db) {
  const original = globalThis.fetch
  const calls: Record<string, unknown>[] = []
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init)
    const url = new URL(req.url)
    if (url.origin !== SUPABASE_URL || url.pathname !== '/rest/v1/rpc/nearby_locations') {
      return new Response('unexpected request', { status: 404 })
    }
    const args = await req.json()
    calls.push(args)
    const keys = Object.keys(args)
    try {
      const rows = await db.as(null).query(
        `select location_id, google_place_id, name, latitude, longitude, location_type, campus, price_range_id
         from public.nearby_locations(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})`,
        Object.values(args),
      )
      return Response.json(rows)
    } catch (err) {
      return Response.json({ code: (err as { code?: string }).code, message: (err as Error).message }, { status: 400 })
    }
  }
  return { calls, [Symbol.dispose]: () => (globalThis.fetch = original) }
}

async function insert(db: Db, name: string, latitude: number, fields: Record<string, unknown> = {}) {
  const row = { name, latitude, longitude: HERE.lon, location_type: 'cafe', ...fields }
  const cols = Object.keys(row)
  const [{ location_id }] = await db.query<{ location_id: number }>(
    `insert into public.location (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
     returning location_id`,
    Object.values(row),
  )
  return location_id
}

Deno.test('getNearbyLocations', async (t) => {
  await t.step('pages through every location in distance order using nextCursor', () =>
    withDb(async (db) => {
      using _ = stubRpc(db)
      // Three at the same distance so page boundaries fall inside a tie.
      for (const [name, lat] of [['A', 42.338], ['B', 42.339], ['C', 42.339], ['D', 42.339], ['E', 42.340]] as const) {
        await insert(db, name, lat)
      }
      await insert(db, 'Too far', 42.36)

      const pages: string[][] = []
      let cursor: string | undefined
      for (let i = 0; i < 10; i++) {
        const page = await getNearbyLocations(HERE.lat, HERE.lon, 500, {}, cursor, 2)
        pages.push(page.locations.map((l) => l.name))
        assertEquals(page.hasMore, page.nextCursor !== null)
        if (!page.nextCursor) break
        cursor = page.nextCursor
      }
      assertEquals(pages, [['A', 'B'], ['C', 'D'], ['E']])
    }))

  await t.step('a full last page has no next page', () =>
    withDb(async (db) => {
      using _ = stubRpc(db)
      await insert(db, 'A', 42.338)
      await insert(db, 'B', 42.339)
      const page = await getNearbyLocations(HERE.lat, HERE.lon, 500, {}, undefined, 2)
      assertEquals(page.locations.map((l) => l.name), ['A', 'B'])
      assertEquals(page.hasMore, false)
      assertEquals(page.nextCursor, null)
    }))

  await t.step('the cursor is the last location\'s coordinates and id', () =>
    withDb(async (db) => {
      using _ = stubRpc(db)
      await insert(db, 'A', 42.338)
      const b = await insert(db, 'B', 42.339)
      await insert(db, 'C', 42.340)
      const page = await getNearbyLocations(HERE.lat, HERE.lon, 500, {}, undefined, 2)
      assertEquals(page.nextCursor, `42.339,${HERE.lon},${b}`)
    }))

  await t.step('the cursor keeps full coordinate precision, so paging past a tie is exact', () =>
    withDb(async (db) => {
      using _ = stubRpc(db)
      // Coordinates whose distances differ only in the last bits.
      for (const [name, lat] of [['A', 42.33912345678901], ['B', 42.33912345678901], ['C', 42.339123456789014]] as const) {
        await insert(db, name, lat, { longitude: -71.08765432109877 })
      }
      const first = await getNearbyLocations(HERE.lat, HERE.lon, 500, {}, undefined, 1)
      assertEquals(first.nextCursor?.startsWith('42.33912345678901,-71.08765432109877,'), true)
      const second = await getNearbyLocations(HERE.lat, HERE.lon, 500, {}, first.nextCursor!, 1)
      const third = await getNearbyLocations(HERE.lat, HERE.lon, 500, {}, second.nextCursor!, 1)
      assertEquals([first, second, third].map((p) => p.locations[0].name), ['A', 'B', 'C'])
      assertEquals(third.hasMore, false)
    }))

  await t.step('returns an empty page when nothing is nearby', () =>
    withDb(async (db) => {
      using _ = stubRpc(db)
      assertEquals(await getNearbyLocations(HERE.lat, HERE.lon, 500), { locations: [], nextCursor: null, hasMore: false })
    }))

  await t.step('sends filters and asks for one extra row to detect another page', () =>
    withDb(async (db) => {
      using rpc = stubRpc(db)
      await insert(db, 'Tatte', 42.338, { campus: 'Northeastern University', price_range_id: 2 })
      await insert(db, 'Pavement', 42.339, { campus: 'MIT', price_range_id: 2 })

      const page = await getNearbyLocations(HERE.lat, HERE.lon, 500, {
        campus: 'Northeastern University',
        locationType: 'cafe',
        name: 'tat',
        priceRange: 2,
      })
      assertEquals(page.locations.map((l) => l.name), ['Tatte'])
      assertEquals(rpc.calls[0], {
        lat: HERE.lat,
        lon: HERE.lon,
        radius_m: 500,
        campus_filter: 'Northeastern University',
        location_type_filter: 'cafe',
        name_filter: 'tat',
        price_range_filter: 2,
        after_latitude: null,
        after_longitude: null,
        after_location_id: null,
        page_size: 31,
      })
    }))

  await t.step('an empty name filter is ignored and price range 0 is kept', () =>
    withDb(async (db) => {
      using rpc = stubRpc(db)
      await getNearbyLocations(HERE.lat, HERE.lon, 500, { name: '', priceRange: 0 })
      assertEquals(rpc.calls[0].name_filter, null)
      assertEquals(rpc.calls[0].price_range_filter, 0)
    }))

  await t.step('rejects an invalid pageSize or cursor without calling the database', () =>
    withDb(async (db) => {
      using rpc = stubRpc(db)
      for (const pageSize of [0, 100, 1.5, NaN]) {
        await assertRejects(() => getNearbyLocations(HERE.lat, HERE.lon, 500, {}, undefined, pageSize), RangeError)
      }
      for (const cursor of ['', 'abc', '42.3,-71', '42.3,-71,0', '42.3,-71,1.5', '42.3,x,1', '42.3,-71,-1']) {
        await assertRejects(() => getNearbyLocations(HERE.lat, HERE.lon, 500, {}, cursor), RangeError, 'cursor')
      }
      assertEquals(rpc.calls, [])
      await getNearbyLocations(HERE.lat, HERE.lon, 500, {}, undefined, 99)
      assertEquals(rpc.calls.length, 1)
    }))

  await t.step('throws database errors', () =>
    withDb(async (db) => {
      using _ = stubRpc(db)
      // supabase-js rejects with a plain PostgrestError object, not an Error instance.
      const rejection = (promise: Promise<unknown>) => promise.then(() => null, (err) => err as { message: string })
      assertStringIncludes((await rejection(getNearbyLocations(91, HERE.lon, 500)))!.message, 'Invalid latitude')
      assertStringIncludes((await rejection(getNearbyLocations(HERE.lat, HERE.lon, 0)))!.message, 'Invalid radius')
    }))
})
