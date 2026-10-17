import { assertEquals } from 'jsr:@std/assert@1'
import { type LocationRow, type PostRow, rankSpots } from '../../../src/lib/exploreRanking.ts'

const NOW = new Date('2026-10-13T15:00:00Z')
const HERE = { latitude: 42.3381, longitude: -71.0881, radiusMeters: 2000, now: NOW }
const CROWD = ['', 'Empty', 'Quiet', 'Moderate', 'Busy', 'Packed']
const NOISE = ['', 'Silent', 'Quiet', 'Moderate', 'Loud', 'Very loud']

let nextId = 1

function post(minutesAgo: number, crowd: number, noise: number | null, photo = 'photo.jpg'): PostRow {
  const created_at = new Date(NOW.getTime() - minutesAgo * 60_000).toISOString()
  return {
    created_at,
    crowd_level_id: crowd,
    noise_level_id: noise,
    crowd_level: { label: CROWD[crowd] },
    noise_level: noise ? { label: NOISE[noise] } : null,
    post_photo: [{ storage_path: photo, created_at }],
  }
}

function spot(
  name: string,
  opts: {
    lat?: number
    lng?: number
    type?: string
    price?: number | null
    outlets?: number
    capacity?: number
    seatType?: string
    noisePolicy?: string
    posts?: PostRow[]
  } = {},
): LocationRow {
  return {
    location_id: nextId++,
    name,
    location_type: opts.type ?? 'cafe',
    campus: null,
    price_range_id: opts.price ?? null,
    latitude: opts.lat ?? 42.339,
    longitude: opts.lng ?? -71.089,
    address: null,
    area: [{ noise_policy: opts.noisePolicy ?? null }],
    seating_area: [{
      seat_type: opts.seatType ?? 'table',
      capacity_id: opts.capacity ?? 1,
      outlet_level_id: opts.outlets ?? 0,
    }],
    post: opts.posts ?? [],
  }
}

const names = (spots: { name: string }[]) => spots.map((s) => s.name)

Deno.test('rankSpots', async (t) => {
  await t.step('quiet + chargers returns only matching spots', () => {
    const rows = [
      spot('Quiet Cafe', { outlets: 3, posts: [post(10, 2, 2)] }),
      spot('Loud Cafe', { outlets: 3, posts: [post(10, 2, 4)] }),
      spot('No Outlets', { outlets: 0, posts: [post(10, 1, 1)] }),
      spot('Policy Quiet', { outlets: 2, noisePolicy: 'Quiet study' }),
      spot('Policy Quiet But Loud Now', { outlets: 2, noisePolicy: 'Quiet study', posts: [post(10, 2, 5)] }),
      spot('Unknown Noise', { outlets: 3 }),
    ]
    const result = rankSpots(rows, { ...HERE, filters: { quiet: true, chargers: true } })
    assertEquals(names(result).sort(), ['Policy Quiet', 'Quiet Cafe'])
  })

  await t.step('a 3-hour-old packed post is not current', () => {
    const [result] = rankSpots([spot('Snell', { posts: [post(180, 5, 5)] })], HERE)
    assertEquals(result.is_current, false)
    assertEquals(result.crowd_level, null)
    assertEquals(result.noise_level, null)
    assertEquals(result.last_updated_at, post(180, 5, 5).created_at)
  })

  await t.step('latest recent post wins and spots without posts still appear', () => {
    const rows = [
      spot('Snell', { lat: 42.3381, lng: -71.0881, posts: [post(60, 5, 5), post(5, 2, 1)] }),
      spot('Empty Cafe'),
    ]
    const result = rankSpots(rows, HERE)
    assertEquals(result.map((s) => [s.name, s.is_current, s.crowd_level, s.noise_level]), [
      ['Snell', true, 'Quiet', 'Silent'],
      ['Empty Cafe', false, null, null],
    ])
  })

  await t.step('best options ranks uncrowded fresh spots above packed or stale ones', () => {
    const rows = [
      spot('Packed', { lat: 42.3381, lng: -71.0881, posts: [post(5, 5, 4)] }),
      spot('Calm', { lat: 42.342, lng: -71.092, posts: [post(5, 1, 1)] }),
      spot('Unknown', { lat: 42.3382, lng: -71.0882 }),
    ]
    assertEquals(names(rankSpots(rows, HERE)), ['Calm', 'Packed', 'Unknown'])
    assertEquals(names(rankSpots(rows, { ...HERE, sort: 'distance' })), ['Packed', 'Unknown', 'Calm'])
  })

  await t.step('radius, type, price, group study, limit and latest photo', () => {
    const rows = [
      spot('Far Cafe', { lat: 42.5, lng: -71.0 }),
      spot('Snell', {
        type: 'library',
        price: 0,
        seatType: 'study_room',
        posts: [post(3000, 3, 3, 'old.jpg'), post(1500, 3, 3, 'new.jpg')],
      }),
      spot('Tatte', { price: 2, capacity: 1 }),
      spot('No Price'),
    ]
    assertEquals(names(rankSpots(rows, HERE)).sort(), ['No Price', 'Snell', 'Tatte'])
    assertEquals(names(rankSpots(rows, { ...HERE, filters: { locationTypes: ['library'] } })), ['Snell'])
    assertEquals(names(rankSpots(rows, { ...HERE, filters: { priceRangeIds: [0, 1] } })), ['Snell'])
    assertEquals(names(rankSpots(rows, { ...HERE, filters: { groupStudy: true } })), ['Snell'])
    assertEquals(rankSpots(rows, { ...HERE, limit: 1 }).length, 1)
    assertEquals(rankSpots(rows, { ...HERE, filters: { locationTypes: ['library'] } })[0].latest_photo_path, 'new.jpg')
  })
})
