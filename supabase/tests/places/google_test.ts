import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1'
import {
  deriveLocationType,
  getPlace,
  GooglePlacesError,
  normalizeAddress,
  normalizeHours,
  searchText,
  toUpsertPayload,
} from '../../functions/places/google.ts'

function stubFetch(handler: (req: Request) => Response | Promise<Response>) {
  const original = globalThis.fetch
  const requests: Request[] = []
  globalThis.fetch = (input, init) => {
    const req = new Request(input, init)
    requests.push(req.clone())
    return Promise.resolve(handler(req))
  }
  return { requests, [Symbol.dispose]: () => (globalThis.fetch = original) }
}

const period = (openDay: number, open: string, closeDay: number, close: string) => {
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  return {
    open: { day: openDay, hour: oh, minute: om },
    close: { day: closeDay, hour: ch, minute: cm },
  }
}

Deno.test('normalizeHours', async (t) => {
  await t.step('returns null when Google has no hours', () => {
    assertEquals(normalizeHours(undefined), null)
    assertEquals(normalizeHours([]), null)
  })

  await t.step('a single period with no close means open 24/7', () => {
    const hours = normalizeHours([{ open: { day: 0, hour: 0, minute: 0 } }])!
    assertEquals(hours.length, 7)
    for (const h of hours) assertEquals([h.open_time, h.close_time], ['00:00', '24:00'])
    assertEquals(hours.map((h) => h.day), [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    ])
  })

  await t.step('maps day numbers starting from Sunday and pads times', () => {
    assertEquals(normalizeHours([period(1, '8:05', 1, '17:30')]), [
      { day: 'Monday', open_time: '08:05', close_time: '17:30' },
    ])
  })

  await t.step('collapses split periods to earliest open and latest close', () => {
    assertEquals(normalizeHours([period(2, '17:00', 2, '22:00'), period(2, '11:00', 2, '14:00')]), [
      { day: 'Tuesday', open_time: '11:00', close_time: '22:00' },
    ])
  })

  await t.step('keeps after-midnight closes on the opening day', () => {
    assertEquals(normalizeHours([period(5, '18:00', 6, '02:00')]), [
      { day: 'Friday', open_time: '18:00', close_time: '02:00' },
    ])
  })

  await t.step('closing at midnight is stored as 24:00, including Saturday into Sunday', () => {
    assertEquals(normalizeHours([period(6, '08:00', 0, '00:00')]), [
      { day: 'Saturday', open_time: '08:00', close_time: '24:00' },
    ])
  })

  await t.step('sorts days', () => {
    const hours = normalizeHours([period(3, '09:00', 3, '17:00'), period(0, '10:00', 0, '16:00')])!
    assertEquals(hours.map((h) => h.day), ['Sunday', 'Wednesday'])
  })
})

Deno.test('normalizeAddress', async (t) => {
  await t.step('returns null without components', () => {
    assertEquals(normalizeAddress(undefined), null)
    assertEquals(normalizeAddress([]), null)
  })

  await t.step('builds a US address', () => {
    assertEquals(
      normalizeAddress([
        { longText: '360', shortText: '360', types: ['street_number'] },
        { longText: 'Huntington Avenue', shortText: 'Huntington Ave', types: ['route'] },
        { longText: 'Suite 2', shortText: 'Suite 2', types: ['subpremise'] },
        { longText: 'Boston', shortText: 'Boston', types: ['locality', 'political'] },
        { longText: 'Massachusetts', shortText: 'MA', types: ['administrative_area_level_1', 'political'] },
        { longText: 'United States', shortText: 'US', types: ['country', 'political'] },
        { longText: '02115', shortText: '02115', types: ['postal_code'] },
      ]),
      {
        street_one: '360 Huntington Avenue',
        street_two: 'Suite 2',
        city: 'Boston',
        region: 'MA',
        postal_code: '02115',
        country_code: 'US',
      },
    )
  })

  await t.step('falls back to premise and postal_town', () => {
    const address = normalizeAddress([
      { longText: 'Bodleian Library', shortText: 'Bodleian Library', types: ['premise'] },
      { longText: 'Oxford', shortText: 'Oxford', types: ['postal_town'] },
      { longText: 'United Kingdom', shortText: 'GB', types: ['country'] },
    ])!
    assertEquals([address.street_one, address.city, address.country_code], ['Bodleian Library', 'Oxford', 'GB'])
  })

  await t.step('leaves missing parts null', () => {
    const address = normalizeAddress([{ longText: 'United States', shortText: 'US', types: ['country'] }])!
    assertEquals(address, {
      street_one: null,
      street_two: null,
      city: null,
      region: null,
      postal_code: null,
      country_code: 'US',
    })
  })
})

Deno.test('deriveLocationType', async (t) => {
  await t.step('maps Google types to our location types', () => {
    assertEquals(deriveLocationType({ id: 'x', primaryType: 'library' }), 'library')
    assertEquals(deriveLocationType({ id: 'x', primaryType: 'coffee_shop' }), 'cafe')
    assertEquals(deriveLocationType({ id: 'x', primaryType: 'coworking_space' }), 'coworking')
    assertEquals(deriveLocationType({ id: 'x', types: ['university'] }), 'campus_building')
    assertEquals(deriveLocationType({ id: 'x', types: ['park'] }), 'park')
    assertEquals(deriveLocationType({ id: 'x', types: ['restaurant'] }), 'restaurant')
  })

  await t.step('prefers the more specific type', () => {
    assertEquals(deriveLocationType({ id: 'x', primaryType: 'university', types: ['library'] }), 'library')
    assertEquals(deriveLocationType({ id: 'x', types: ['restaurant', 'cafe'] }), 'cafe')
  })

  await t.step('falls back to other', () => {
    assertEquals(deriveLocationType({ id: 'x' }), 'other')
    assertEquals(deriveLocationType({ id: 'x', primaryType: 'gas_station' }), 'other')
  })
})

Deno.test('toUpsertPayload', async (t) => {
  const place = {
    id: 'ChIJ123',
    displayName: { text: 'Snell Library' },
    location: { latitude: 42.338, longitude: -71.088 },
    primaryType: 'library',
    priceLevel: 'PRICE_LEVEL_MODERATE',
  }

  await t.step('maps fields and leaves overrides null by default', () => {
    assertEquals(toUpsertPayload(place), {
      google_place_id: 'ChIJ123',
      name: 'Snell Library',
      latitude: 42.338,
      longitude: -71.088,
      default_location_type: 'library',
      location_type: null,
      campus: null,
      price_range_id: 2,
      address: null,
      hours: null,
    })
  })

  await t.step('applies overrides', () => {
    const payload = toUpsertPayload(place, { locationType: 'campus_building', campus: 'Northeastern University' })
    assertEquals([payload.location_type, payload.campus], ['campus_building', 'Northeastern University'])
  })

  await t.step('maps every price level and ignores unknown ones', () => {
    const levels = ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE']
    levels.forEach((level, i) => {
      assertEquals(toUpsertPayload({ ...place, priceLevel: `PRICE_LEVEL_${level}` }).price_range_id, i)
    })
    assertEquals(toUpsertPayload({ ...place, priceLevel: 'PRICE_LEVEL_UNSPECIFIED' }).price_range_id, null)
    assertEquals(toUpsertPayload({ ...place, priceLevel: undefined }).price_range_id, null)
  })

  await t.step('falls back to the place id when there is no name', () => {
    assertEquals(toUpsertPayload({ ...place, displayName: undefined }).name, 'ChIJ123')
  })

  await t.step('rejects places without coordinates', () => {
    const err = assertThrows(() => toUpsertPayload({ ...place, location: undefined }), GooglePlacesError)
    assertEquals(err.status, 422)
  })
})

Deno.test('searchText', async (t) => {
  await t.step('sends the query, key, field mask and location bias', async () => {
    using fetch = stubFetch(() => Response.json({ places: [{ id: 'a' }] }))
    const places = await searchText('test-key', {
      query: 'quiet cafe',
      latitude: 42.34,
      longitude: -71.09,
      radiusMeters: 1000,
      pageSize: 5,
    })

    assertEquals(places, [{ id: 'a' }])
    const [req] = fetch.requests
    assertEquals(req.url, 'https://places.googleapis.com/v1/places:searchText')
    assertEquals(req.method, 'POST')
    assertEquals(req.headers.get('X-Goog-Api-Key'), 'test-key')
    assertEquals(req.headers.get('X-Goog-FieldMask')?.includes('places.id'), true)
    assertEquals(await req.json(), {
      textQuery: 'quiet cafe',
      pageSize: 5,
      locationBias: { circle: { center: { latitude: 42.34, longitude: -71.09 }, radius: 1000 } },
    })
  })

  await t.step('omits location bias without coordinates and defaults page size', async () => {
    using fetch = stubFetch(() => Response.json({}))
    assertEquals(await searchText('k', { query: 'library' }), [])
    assertEquals(await fetch.requests[0].json(), { textQuery: 'library', pageSize: 10 })
  })

  await t.step('throws GooglePlacesError on failure', async () => {
    using _fetch = stubFetch(() => new Response('quota exceeded', { status: 429 }))
    const err = await assertRejects(() => searchText('k', { query: 'x' }), GooglePlacesError)
    assertEquals(err.status, 429)
  })
})

Deno.test('getPlace', async (t) => {
  await t.step('requests the place with the detail field mask', async () => {
    using fetch = stubFetch(() => Response.json({ id: 'ChIJ/abc' }))
    assertEquals(await getPlace('k', 'ChIJ/abc'), { id: 'ChIJ/abc' })
    const [req] = fetch.requests
    assertEquals(req.url, 'https://places.googleapis.com/v1/places/ChIJ%2Fabc')
    assertEquals(req.headers.get('X-Goog-FieldMask')?.includes('regularOpeningHours'), true)
  })

  await t.step('throws GooglePlacesError with the Google status', async () => {
    using _fetch = stubFetch(() => new Response('not found', { status: 404 }))
    const err = await assertRejects(() => getPlace('k', 'missing'), GooglePlacesError)
    assertEquals(err.status, 404)
  })
})
