import { assertEquals } from 'jsr:@std/assert@1'
import type { LocationRow, PostRow } from '../../../src/lib/exploreRanking.ts'
import { toSearchSpots } from '../../../src/lib/searchRanking.ts'

const NOW = new Date('2026-11-10T12:00:00Z')
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString()

const post = (createdAt: string, crowd = 2, photo?: string): PostRow => ({
  created_at: createdAt,
  crowd_level_id: crowd,
  noise_level_id: 2,
  crowd_level: { label: `crowd ${crowd}` },
  noise_level: { label: 'Quiet' },
  post_photo: photo ? [{ storage_path: photo, created_at: createdAt }] : [],
})

const row = (id: number, name: string, posts: PostRow[] = []): LocationRow => ({
  location_id: id,
  name,
  location_type: 'library',
  campus: 'Northeastern University',
  price_range_id: null,
  latitude: 42.3388,
  longitude: -71.0882,
  address: { street_one: '360 Huntington Ave', city: 'Boston' },
  area: [],
  seating_area: [],
  post: posts,
})

Deno.test('toSearchSpots', async (t) => {
  await t.step('without a location, distance is null', () => {
    const [spot] = toSearchSpots([row(1, 'Snell Library')], null, NOW)
    assertEquals(spot.distance_meters, null)
  })

  await t.step('with a location, distance is filled in', () => {
    const [spot] = toSearchSpots([row(1, 'Snell Library')], { latitude: 42.3398, longitude: -71.0892 }, NOW)
    assertEquals(typeof spot.distance_meters, 'number')
    assertEquals(spot.distance_meters! > 0, true)
  })

  await t.step('a recent post is current, with its status and freshness timestamp', () => {
    const [spot] = toSearchSpots([row(1, 'Snell Library', [post(minutesAgo(10), 4, 'a.jpg')])], null, NOW)
    assertEquals(
      [spot.is_current, spot.crowd_level_id, spot.last_updated_at, spot.latest_photo_path],
      [true, 4, minutesAgo(10), 'a.jpg'],
    )
  })

  await t.step('an old post is "no recent updates", but keeps its freshness timestamp', () => {
    const [spot] = toSearchSpots([row(1, 'Snell Library', [post(minutesAgo(200))])], null, NOW)
    assertEquals([spot.is_current, spot.crowd_level, spot.last_updated_at], [false, null, minutesAgo(200)])
  })

  await t.step('a spot with no posts has no status and no timestamp', () => {
    const [spot] = toSearchSpots([row(1, 'Snell Library')], null, NOW)
    assertEquals([spot.is_current, spot.last_updated_at], [false, null])
  })

  await t.step("keeps the database's order", () => {
    const spots = toSearchSpots([row(2, 'B'), row(1, 'A'), row(3, 'C')], null, NOW)
    assertEquals(spots.map((s) => s.location_id), [2, 1, 3])
  })
})
