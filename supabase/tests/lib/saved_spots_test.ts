import { assertEquals } from 'jsr:@std/assert@1'
import { type SavedSpotPost, type SavedSpotRow, toSavedSpots } from '../../../src/lib/savedSpotRows.ts'

const NOW = new Date('2026-11-03T12:00:00Z')
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString()

const post = (createdAt: string, crowd = 2, noise: number | null = 2): SavedSpotPost => ({
  created_at: createdAt,
  crowd_level_id: crowd,
  noise_level_id: noise,
  crowd_level: { label: `crowd ${crowd}` },
  noise_level: noise == null ? null : { label: `noise ${noise}` },
})

const row = (posts: SavedSpotPost[], savedAt = minutesAgo(1000)): SavedSpotRow => ({
  created_at: savedAt,
  location: {
    location_id: 1,
    name: 'Snell Library',
    location_type: 'library',
    campus: 'Northeastern University',
    latitude: 42.338,
    longitude: -71.088,
    address: { street_one: '360 Huntington Ave', city: 'Boston' },
    post: posts,
  },
})

Deno.test('toSavedSpots', async (t) => {
  await t.step('a recent post is current, with its freshness timestamp', () => {
    const [spot] = toSavedSpots([row([post(minutesAgo(10), 4, 3)])], NOW)
    assertEquals(
      [spot.is_current, spot.crowd_level_id, spot.noise_level_id, spot.last_updated_at],
      [true, 4, 3, minutesAgo(10)],
    )
  })

  await t.step('an old post is not current, but still gives the freshness timestamp', () => {
    const [spot] = toSavedSpots([row([post(minutesAgo(200))])], NOW)
    assertEquals(
      [spot.is_current, spot.crowd_level, spot.noise_level, spot.last_updated_at],
      [false, null, null, minutesAgo(200)],
    )
  })

  await t.step('a spot with no posts has no status and no timestamp', () => {
    const [spot] = toSavedSpots([row([])], NOW)
    assertEquals([spot.is_current, spot.last_updated_at], [false, null])
  })

  await t.step('the latest post wins, and future posts are ignored', () => {
    const [spot] = toSavedSpots(
      [row([post(minutesAgo(60), 1), post(minutesAgo(5), 5), post(minutesAgo(-30), 3)])],
      NOW,
    )
    assertEquals([spot.crowd_level_id, spot.last_updated_at], [5, minutesAgo(5)])
  })

  await t.step('keeps saved_at and address, and skips rows whose location is gone', () => {
    const spots = toSavedSpots([row([], minutesAgo(30)), { created_at: minutesAgo(1), location: null }], NOW)
    assertEquals(spots.length, 1)
    assertEquals([spots[0].saved_at, spots[0].street_one], [minutesAgo(30), '360 Huntington Ave'])
  })
})
