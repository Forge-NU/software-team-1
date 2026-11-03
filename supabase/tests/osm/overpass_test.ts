import { assertEquals, assertRejects, assertStringIncludes } from 'jsr:@std/assert@1'
import {
  buildBboxQuery,
  buildCampusQuery,
  collectPlaces,
  deriveLocationType,
  normalizeAddress,
  normalizeHours,
  type OsmElement,
  overpass,
  OverpassError,
  parseCampusResults,
  toPayload,
  USER_AGENT,
} from '../../scripts/osm/overpass.ts'

const BOSTON = { lat: 42.36, lon: -71.06 }
const hours = (value: string) => normalizeHours(value, BOSTON.lat, BOSTON.lon)

function stubFetch(responses: (Response | ((req: Request) => Response))[]) {
  const requests: Request[] = []
  const fetchFn = (input: string | URL | Request, init?: RequestInit) => {
    const req = new Request(input, init)
    requests.push(req)
    const next = responses.shift()
    if (!next) throw new Error('unexpected request')
    return Promise.resolve(typeof next === 'function' ? next(req) : next)
  }
  return { fetch: fetchFn as typeof fetch, requests }
}
const noSleep = () => Promise.resolve()
const queryOf = async (req: Request) => new URLSearchParams(await req.text()).get('data')!

Deno.test('deriveLocationType', () => {
  assertEquals(deriveLocationType({ amenity: 'library', building: 'university' }), 'library')
  assertEquals(deriveLocationType({ amenity: 'cafe' }), 'cafe')
  assertEquals(deriveLocationType({ amenity: 'coworking_space' }), 'coworking')
  assertEquals(deriveLocationType({ office: 'coworking' }), 'coworking')
  assertEquals(deriveLocationType({ amenity: 'fast_food' }), 'restaurant')
  assertEquals(deriveLocationType({ leisure: 'park' }), 'park')
  assertEquals(deriveLocationType({ building: 'college' }), 'campus_building')
  assertEquals(deriveLocationType({ shop: 'books' }), 'other')
})

Deno.test('normalizeAddress', async (t) => {
  await t.step('maps addr tags and defaults the country to US', () => {
    assertEquals(
      normalizeAddress({
        'addr:housenumber': '360',
        'addr:street': 'Huntington Avenue',
        'addr:unit': 'Floor 3',
        'addr:city': 'Boston',
        'addr:state': 'MA',
        'addr:postcode': '02115',
      }),
      {
        street_one: '360 Huntington Avenue',
        street_two: 'Floor 3',
        city: 'Boston',
        region: 'MA',
        postal_code: '02115',
        country_code: 'US',
      },
    )
  })

  await t.step('uses addr:country when valid', () => {
    assertEquals(normalizeAddress({ 'addr:city': 'Toronto', 'addr:country': 'ca' })?.country_code, 'CA')
    assertEquals(normalizeAddress({ 'addr:city': 'Boston', 'addr:country': 'USA' })?.country_code, null)
  })

  await t.step('returns null without any address tags', () => {
    assertEquals(normalizeAddress({ name: 'Cafe', 'addr:country': 'US' }), null)
  })

  await t.step('street without a house number', () => {
    assertEquals(normalizeAddress({ 'addr:street': 'Forsyth Street' })?.street_one, 'Forsyth Street')
  })
})

Deno.test('normalizeHours', async (t) => {
  await t.step('weekday and weekend hours, skipping holidays', () => {
    assertEquals(hours('Mo-Fr 07:00-22:00; Sa,Su 09:00-18:00; PH off'), [
      { day: 'Sunday', open_time: '09:00', close_time: '18:00' },
      { day: 'Monday', open_time: '07:00', close_time: '22:00' },
      { day: 'Tuesday', open_time: '07:00', close_time: '22:00' },
      { day: 'Wednesday', open_time: '07:00', close_time: '22:00' },
      { day: 'Thursday', open_time: '07:00', close_time: '22:00' },
      { day: 'Friday', open_time: '07:00', close_time: '22:00' },
      { day: 'Saturday', open_time: '09:00', close_time: '18:00' },
    ])
  })

  await t.step('open all day', () => {
    const week = hours('24/7')!
    assertEquals(week.length, 7)
    assertEquals(week.every((d) => d.open_time === '00:00' && d.close_time === '24:00'), true)
    assertEquals(hours('Mo 00:00-24:00'), [{ day: 'Monday', open_time: '00:00', close_time: '24:00' }])
  })

  await t.step('hours past midnight belong to the day they opened', () => {
    assertEquals(hours('Fr 18:00-02:00, Sa 10:00-22:00'), [
      { day: 'Friday', open_time: '18:00', close_time: '02:00' },
      { day: 'Saturday', open_time: '10:00', close_time: '22:00' },
    ])
    assertEquals(hours('Th-Fr 11:00-02:00'), [
      { day: 'Thursday', open_time: '11:00', close_time: '02:00' },
      { day: 'Friday', open_time: '11:00', close_time: '02:00' },
    ])
  })

  await t.step('a later ";" rule for the next day replaces its after-midnight hours, per the OSM syntax', () => {
    assertEquals(hours('Fr 18:00-02:00; Sa 10:00-22:00'), [
      { day: 'Friday', open_time: '18:00', close_time: '24:00' },
      { day: 'Saturday', open_time: '10:00', close_time: '22:00' },
    ])
  })

  await t.step('Saturday night running into Sunday is not a Sunday opening', () => {
    assertEquals(hours('Sa 20:00-03:00'), [{ day: 'Saturday', open_time: '20:00', close_time: '03:00' }])
  })

  await t.step('a break during the day becomes first open to last close', () => {
    assertEquals(hours('Tu 08:00-12:00,13:00-17:00'), [{ day: 'Tuesday', open_time: '08:00', close_time: '17:00' }])
  })

  await t.step('always closed is an empty week', () => {
    assertEquals(hours('off'), [])
  })

  await t.step('unparseable values return null', () => {
    assertEquals(hours('ask the barista'), null)
    assertEquals(hours('Mo-Fr 25:00-26:00'), null)
  })
})

Deno.test('toPayload', async (t) => {
  await t.step('uses node coordinates', () => {
    assertEquals(
      toPayload(
        {
          type: 'node',
          id: 42,
          lat: 42.34,
          lon: -71.09,
          tags: { name: ' Tatte ', amenity: 'cafe', opening_hours: 'Mo 07:00-19:00', 'addr:city': 'Boston' },
        },
        'Northeastern University',
      ),
      {
        osm_type: 'node',
        osm_id: 42,
        name: 'Tatte',
        latitude: 42.34,
        longitude: -71.09,
        default_location_type: 'cafe',
        campus: 'Northeastern University',
        address: { street_one: null, street_two: null, city: 'Boston', region: null, postal_code: null, country_code: 'US' },
        hours: [{ day: 'Monday', open_time: '07:00', close_time: '19:00' }],
      },
    )
  })

  await t.step('uses the center of ways and relations, with no campus, address or hours by default', () => {
    const payload = toPayload({
      type: 'way',
      id: 29566437,
      center: { lat: 42.3383, lon: -71.0879 },
      tags: { name: 'Snell Library', amenity: 'library' },
    })
    assertEquals(payload?.latitude, 42.3383)
    assertEquals(payload?.longitude, -71.0879)
    assertEquals([payload?.campus, payload?.address, payload?.hours], [null, null, null])
  })

  await t.step('skips unnamed or unplaced elements', () => {
    assertEquals(toPayload({ type: 'node', id: 1, lat: 42, lon: -71, tags: { amenity: 'cafe' } }), null)
    assertEquals(toPayload({ type: 'node', id: 1, lat: 42, lon: -71, tags: { name: '  ' } }), null)
    assertEquals(toPayload({ type: 'way', id: 1, tags: { name: 'Cafe' } }), null)
  })
})

Deno.test('queries', async (t) => {
  await t.step('bbox query covers the requested types but not campus buildings', () => {
    const query = buildBboxQuery(['library', 'coworking', 'campus_building'], {
      south: 42.3,
      west: -71.19,
      north: 42.42,
      east: -71.02,
    })
    assertEquals(
      query,
      '[out:json][timeout:180];(nwr["amenity"="library"](42.3,-71.19,42.42,-71.02);' +
        'nwr["amenity"="coworking_space"](42.3,-71.19,42.42,-71.02);' +
        'nwr["office"="coworking"](42.3,-71.19,42.42,-71.02););out center tags;',
    )
  })

  await t.step('campus query marks each campus and uses its OSM name', () => {
    const query = buildCampusQuery(['cafe', 'campus_building'], ['MIT', 'Northeastern University'])
    assertStringIncludes(query, 'make campus_marker name="MIT";out;')
    assertStringIncludes(query, '["name"="Massachusetts Institute of Technology"]->.grounds;')
    assertStringIncludes(query, 'rel["type"="site"]["amenity"~"^(university|college)$"]["name"="Northeastern University"]')
    assertStringIncludes(query, 'nwr["building"~"^(university|college)$"]["name"](area.campus);')
    assertEquals(query.indexOf('"MIT"') < query.indexOf('"Northeastern University"'), true)
  })

  await t.step('names are escaped', () => {
    assertStringIncludes(buildCampusQuery(['cafe'], ['A "quoted" \\ name']), 'name="A \\"quoted\\" \\\\ name"')
  })

  await t.step('campus results are grouped by the preceding marker', () => {
    const marker = (name: string) => ({ type: 'campus_marker', id: 1, tags: { name } }) as unknown as OsmElement
    const a = { type: 'node', id: 1 } as OsmElement
    const b = { type: 'way', id: 2 } as OsmElement
    assertEquals(parseCampusResults([a, marker('MIT'), b, marker('Tufts University'), marker('Boston College'), a]), [
      { campus: 'MIT', element: b },
      { campus: 'Boston College', element: a },
    ])
  })
})

Deno.test('overpass', async (t) => {
  await t.step('posts the query as a form with an identifying User-Agent', async () => {
    const stub = stubFetch([Response.json({ elements: [{ type: 'node', id: 1 }] })])
    assertEquals(await overpass('[out:json];node(1);out;', { fetch: stub.fetch }), [{ type: 'node', id: 1 }])
    const [req] = stub.requests
    assertEquals(req.method, 'POST')
    assertEquals(req.url, 'https://overpass-api.de/api/interpreter')
    assertEquals(req.headers.get('User-Agent'), USER_AGENT)
    assertEquals(await queryOf(req), '[out:json];node(1);out;')
  })

  await t.step('retries with backoff while the server is busy', async () => {
    const waits: number[] = []
    const stub = stubFetch([
      new Response('busy', { status: 429 }),
      new Response('busy', { status: 504 }),
      Response.json({ elements: [] }),
    ])
    await overpass('q', { fetch: stub.fetch, sleep: (ms) => (waits.push(ms), Promise.resolve()) })
    assertEquals(waits, [15_000, 30_000])
  })

  await t.step('gives up after the retries, and does not retry bad queries', async () => {
    const busy = stubFetch([new Response('busy', { status: 502 }), new Response('busy', { status: 502 })])
    const err = await assertRejects(() => overpass('q', { fetch: busy.fetch, retries: 1, sleep: noSleep }), OverpassError)
    assertEquals(err.status, 502)

    const bad = stubFetch([new Response('parse error', { status: 400 })])
    await assertRejects(() => overpass('q', { fetch: bad.fetch, sleep: noSleep }), OverpassError, 'parse error')
    assertEquals(bad.requests.length, 1)
  })
})

Deno.test('collectPlaces', async (t) => {
  const tatte = { type: 'node', id: 1, lat: 42.34, lon: -71.09, tags: { name: 'Tatte', amenity: 'cafe' } } as const
  const pavement = { type: 'node', id: 2, lat: 42.35, lon: -71.08, tags: { name: 'Pavement', amenity: 'cafe' } } as const
  const curry = {
    type: 'way',
    id: 3,
    center: { lat: 42.339, lon: -71.087 },
    tags: { name: 'Curry Student Center', building: 'university' },
  } as const
  const marker = (name: string) => ({ type: 'campus_marker', id: 1, tags: { name } })

  await t.step('merges the area and campus results, giving campus places their campus', async () => {
    const stub = stubFetch([
      Response.json({ elements: [tatte, pavement, { type: 'node', id: 9, lat: 42, lon: -71, tags: { amenity: 'cafe' } }] }),
      Response.json({ elements: [marker('Northeastern University'), tatte, curry, marker('MIT')] }),
    ])
    const places = await collectPlaces({
      types: ['cafe', 'campus_building'],
      campuses: ['Northeastern University', 'MIT'],
      fetch: stub.fetch,
      sleep: noSleep,
    })
    assertEquals(places.map((p) => [p.name, p.campus, p.default_location_type]), [
      ['Tatte', 'Northeastern University', 'cafe'],
      ['Pavement', null, 'cafe'],
      ['Curry Student Center', 'Northeastern University', 'campus_building'],
    ])
    assertStringIncludes(await queryOf(stub.requests[0]), 'nwr["amenity"="cafe"](42.3,-71.19,42.42,-71.02);')
    assertStringIncludes(await queryOf(stub.requests[1]), 'make campus_marker name="Northeastern University"')
  })

  await t.step('only queries campuses when just campus buildings are requested', async () => {
    const stub = stubFetch([Response.json({ elements: [marker('MIT'), curry] })])
    const places = await collectPlaces({ types: ['campus_building'], campuses: ['MIT'], fetch: stub.fetch, sleep: noSleep })
    assertEquals(stub.requests.length, 1)
    assertEquals(places.map((p) => p.campus), ['MIT'])
  })

  await t.step('a place on two campuses keeps the first', async () => {
    const stub = stubFetch([
      Response.json({ elements: [] }),
      Response.json({ elements: [marker('Harvard University'), tatte, marker('MIT'), tatte] }),
    ])
    const places = await collectPlaces({
      types: ['cafe'],
      campuses: ['Harvard University', 'MIT'],
      fetch: stub.fetch,
      sleep: noSleep,
    })
    assertEquals(places.map((p) => p.campus), ['Harvard University'])
  })
})
