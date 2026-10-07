import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createHandler, HttpError } from '../../functions/places/handler.ts'

const SUPABASE_URL = 'http://supabase.test'
const GOOGLE_URL = 'https://places.googleapis.com/v1'
const AUTH = 'Bearer user-jwt'

const snell = {
  id: 'ChIJsnell',
  displayName: { text: 'Snell Library' },
  formattedAddress: '360 Huntington Ave, Boston, MA 02115, USA',
  location: { latitude: 42.338, longitude: -71.088 },
  primaryType: 'library',
  types: ['library', 'point_of_interest'],
  addressComponents: [
    { longText: '360', shortText: '360', types: ['street_number'] },
    { longText: 'Huntington Avenue', shortText: 'Huntington Ave', types: ['route'] },
    { longText: 'Boston', shortText: 'Boston', types: ['locality'] },
    { longText: 'Massachusetts', shortText: 'MA', types: ['administrative_area_level_1'] },
    { longText: 'United States', shortText: 'US', types: ['country'] },
    { longText: '02115', shortText: '02115', types: ['postal_code'] },
  ],
  regularOpeningHours: { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] },
}

const cafe = {
  id: 'ChIJcafe',
  displayName: { text: 'Pavement Coffeehouse' },
  location: { latitude: 42.34, longitude: -71.09 },
  primaryType: 'coffee_shop',
}

interface FakeBackend {
  googlePlaces?: Record<string, unknown>[]
  googleStatus?: number
  /** Rows the fake PostgREST returns for any `location` select. */
  locations?: Record<string, unknown>[]
  rpcResult?: { status: number; body: unknown }
}

/** Routes fetch calls to fake Google Places and PostgREST endpoints and records them. */
function fakeBackend(backend: FakeBackend = {}) {
  const original = globalThis.fetch
  const calls: { method: string; url: URL; headers: Headers; body: unknown }[] = []

  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init)
    const url = new URL(req.url)
    const text = await req.text()
    calls.push({ method: req.method, url, headers: req.headers, body: text ? JSON.parse(text) : null })

    if (url.href.startsWith(GOOGLE_URL)) {
      if (backend.googleStatus) return new Response('google error', { status: backend.googleStatus })
      const places = backend.googlePlaces ?? []
      if (url.pathname.endsWith('places:searchText')) return Response.json({ places })
      const id = decodeURIComponent(url.pathname.split('/').pop()!)
      const place = places.find((p) => p.id === id)
      return place ? Response.json(place) : new Response('not found', { status: 404 })
    }

    if (url.pathname === '/rest/v1/location') {
      const rows = backend.locations ?? []
      const wantsObject = req.headers.get('Accept')?.includes('vnd.pgrst.object')
      return Response.json(wantsObject ? rows[0] ?? null : rows)
    }

    if (url.pathname === '/rest/v1/rpc/upsert_google_place') {
      const { status, body } = backend.rpcResult ?? { status: 200, body: 42 }
      return Response.json(body, { status })
    }

    return new Response(`unexpected request ${req.method} ${url}`, { status: 599 })
  }

  return {
    calls,
    google: () => calls.filter((c) => c.url.href.startsWith(GOOGLE_URL)),
    postgrest: () => calls.filter((c) => c.url.href.startsWith(SUPABASE_URL)),
    rpcPayload: () => (calls.find((c) => c.url.pathname.endsWith('/rpc/upsert_google_place'))?.body as {
      place: Record<string, unknown>
    })?.place,
    [Symbol.dispose]: () => (globalThis.fetch = original),
  }
}

const handler = createHandler(() => ({
  apiKey: 'google-key',
  createSupabase: (authorization) =>
    createClient(SUPABASE_URL, 'anon-key', {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    }),
}))

function request(path: string, body?: unknown, method = 'POST') {
  return handler(
    new Request(`${SUPABASE_URL}/functions/v1/places${path}`, {
      method,
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

Deno.test('routing', async (t) => {
  await t.step('answers CORS preflight', async () => {
    const res = await request('/search', undefined, 'OPTIONS')
    assertEquals(res.status, 200)
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
    await res.body?.cancel()
  })

  await t.step('rejects non-POST methods', async () => {
    const res = await request('/search', undefined, 'GET')
    assertEquals(res.status, 405)
    await res.body?.cancel()
  })

  await t.step('returns 404 for unknown routes', async () => {
    using _backend = fakeBackend()
    const res = await request('/nope/at/all', {})
    assertEquals(res.status, 404)
    await res.body?.cancel()
  })

  await t.step('returns 500 when configuration is missing', async () => {
    const broken = createHandler(() => {
      throw new HttpError(500, 'GOOGLE_PLACES_API_KEY is not configured')
    })
    const res = await broken(new Request('http://x/places/search', { method: 'POST', body: '{}' }))
    assertEquals(res.status, 500)
    assertEquals(await res.json(), { error: 'GOOGLE_PLACES_API_KEY is not configured' })
  })

  await t.step('rejects bodies that are not JSON objects', async () => {
    using _backend = fakeBackend()
    for (const body of ['not json', '[1, 2]', 'null']) {
      const res = await request('/search', body)
      assertEquals(res.status, 400, body)
      await res.body?.cancel()
    }
  })
})

Deno.test('POST /places/search', async (t) => {
  await t.step('validates input', async () => {
    using backend = fakeBackend()
    for (const body of [{}, { query: '   ' }, { query: 'x', latitude: 'north' }, { query: 'x', pageSize: 'ten' }]) {
      const res = await request('/search', body)
      assertEquals(res.status, 400, JSON.stringify(body))
      await res.body?.cancel()
    }
    assertEquals(backend.calls.length, 0)
  })

  await t.step('returns Google results marked with existing location ids', async () => {
    using backend = fakeBackend({
      googlePlaces: [snell, cafe],
      locations: [{ location_id: 7, google_place_id: 'ChIJsnell' }],
    })
    const res = await request('/search', { query: ' study spots ', latitude: 42.34, longitude: -71.09 })

    assertEquals(res.status, 200)
    assertEquals(await res.json(), {
      results: [
        {
          googlePlaceId: 'ChIJsnell',
          name: 'Snell Library',
          formattedAddress: '360 Huntington Ave, Boston, MA 02115, USA',
          latitude: 42.338,
          longitude: -71.088,
          primaryType: 'library',
          locationId: 7,
        },
        {
          googlePlaceId: 'ChIJcafe',
          name: 'Pavement Coffeehouse',
          formattedAddress: null,
          latitude: 42.34,
          longitude: -71.09,
          primaryType: 'coffee_shop',
          locationId: null,
        },
      ],
    })

    const [google] = backend.google()
    assertEquals(google.headers.get('X-Goog-Api-Key'), 'google-key')
    assertEquals((google.body as { textQuery: string }).textQuery, 'study spots')

    const [lookup] = backend.postgrest()
    assertEquals(lookup.headers.get('Authorization'), AUTH)
    assertEquals(lookup.url.searchParams.get('google_place_id'), 'in.(ChIJsnell,ChIJcafe)')
  })

  await t.step('skips the database lookup when Google finds nothing', async () => {
    using backend = fakeBackend({ googlePlaces: [] })
    const res = await request('/search', { query: 'nothing here' })
    assertEquals(await res.json(), { results: [] })
    assertEquals(backend.postgrest().length, 0)
  })

  await t.step('returns 502 when Google fails', async () => {
    using _backend = fakeBackend({ googleStatus: 500 })
    const res = await request('/search', { query: 'x' })
    assertEquals(res.status, 502)
    assertStringIncludes((await res.json()).error, 'Google Places request failed')
  })
})

Deno.test('POST /places (import)', async (t) => {
  await t.step('requires googlePlaceId', async () => {
    using backend = fakeBackend()
    const res = await request('', { campus: 'MIT' })
    assertEquals(res.status, 400)
    await res.body?.cancel()
    assertEquals(backend.calls.length, 0)
  })

  await t.step('imports a place as the caller and returns the location id', async () => {
    using backend = fakeBackend({ googlePlaces: [snell], rpcResult: { status: 200, body: 42 } })
    const res = await request('', { googlePlaceId: 'ChIJsnell', campus: 'Northeastern University' })

    assertEquals(res.status, 201)
    assertEquals(await res.json(), { locationId: 42 })

    const rpc = backend.postgrest().find((c) => c.url.pathname.endsWith('/rpc/upsert_google_place'))!
    assertEquals(rpc.headers.get('Authorization'), AUTH)

    const payload = backend.rpcPayload()
    assertEquals(payload.google_place_id, 'ChIJsnell')
    assertEquals(payload.name, 'Snell Library')
    assertEquals(payload.default_location_type, 'library')
    assertEquals(payload.location_type, null)
    assertEquals(payload.campus, 'Northeastern University')
    assertEquals((payload.address as { street_one: string }).street_one, '360 Huntington Avenue')
    assertEquals((payload.hours as unknown[]).length, 7)
  })

  await t.step('passes a location type override through', async () => {
    using backend = fakeBackend({ googlePlaces: [cafe] })
    const res = await request('', { googlePlaceId: 'ChIJcafe', locationType: 'coworking' })
    assertEquals(res.status, 201)
    await res.body?.cancel()
    assertEquals(backend.rpcPayload().location_type, 'coworking')
    assertEquals(backend.rpcPayload().default_location_type, 'cafe')
  })

  await t.step('returns 403 when RLS rejects a non-admin', async () => {
    using _backend = fakeBackend({
      googlePlaces: [snell],
      rpcResult: {
        status: 403,
        body: { code: '42501', message: 'new row violates row-level security policy for table "location"' },
      },
    })
    const res = await request('', { googlePlaceId: 'ChIJsnell' })
    assertEquals(res.status, 403)
    assertEquals(await res.json(), { error: 'Only admins can import places' })
  })

  await t.step('returns 400 for an unknown campus or location type', async () => {
    using _backend = fakeBackend({
      googlePlaces: [snell],
      rpcResult: {
        status: 409,
        body: { code: '23503', message: 'violates foreign key constraint', details: 'Key (campus)=(Hogwarts)' },
      },
    })
    const res = await request('', { googlePlaceId: 'ChIJsnell', campus: 'Hogwarts' })
    assertEquals(res.status, 400)
    assertStringIncludes((await res.json()).error, 'Hogwarts')
  })

  await t.step('returns 500 for other database errors', async () => {
    using _backend = fakeBackend({
      googlePlaces: [snell],
      rpcResult: { status: 500, body: { code: 'XX000', message: 'boom' } },
    })
    const res = await request('', { googlePlaceId: 'ChIJsnell' })
    assertEquals(res.status, 500)
    await res.body?.cancel()
  })

  await t.step('returns 404 when Google does not know the place', async () => {
    using backend = fakeBackend({ googlePlaces: [] })
    const res = await request('', { googlePlaceId: 'ChIJmissing' })
    assertEquals(res.status, 404)
    await res.body?.cancel()
    assertEquals(backend.postgrest().length, 0)
  })

  await t.step('returns 422 when the place has no coordinates', async () => {
    using _backend = fakeBackend({ googlePlaces: [{ ...snell, location: undefined }] })
    const res = await request('', { googlePlaceId: 'ChIJsnell' })
    assertEquals(res.status, 422)
    await res.body?.cancel()
  })
})

Deno.test('POST /places/:locationId/sync', async (t) => {
  await t.step('rejects a non-numeric id', async () => {
    using _backend = fakeBackend()
    const res = await request('/abc/sync')
    assertEquals(res.status, 400)
    await res.body?.cancel()
  })

  await t.step('returns 404 for an unknown location', async () => {
    using _backend = fakeBackend({ locations: [] })
    const res = await request('/7/sync')
    assertEquals(res.status, 404)
    await res.body?.cancel()
  })

  await t.step('returns 409 for a location that was not imported from Google', async () => {
    using _backend = fakeBackend({ locations: [{ google_place_id: null }] })
    const res = await request('/7/sync')
    assertEquals(res.status, 409)
    await res.body?.cancel()
  })

  await t.step('re-fetches the place and upserts it without overrides', async () => {
    using backend = fakeBackend({ googlePlaces: [snell], locations: [{ google_place_id: 'ChIJsnell' }] })
    const res = await request('/7/sync')

    assertEquals(res.status, 200)
    assertEquals(await res.json(), { locationId: 7 })

    const [lookup] = backend.postgrest()
    assertEquals(lookup.url.searchParams.get('location_id'), 'eq.7')
    assertEquals(backend.google()[0].url.pathname, '/v1/places/ChIJsnell')
    assertEquals(backend.rpcPayload().location_type, null)
    assertEquals(backend.rpcPayload().campus, null)
  })
})
