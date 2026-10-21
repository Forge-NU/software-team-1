// Pure filtering and ranking for Explore. Only type imports, so the backend tests can run it.

import type { Address, Location } from '../types/location.ts'

export const RECENT_MINUTES = 90

export interface ExploreFilters {
  quiet?: boolean
  groupStudy?: boolean
  locationTypes?: string[]
  chargers?: boolean
  priceRangeIds?: number[]
}

export interface RankOptions {
  latitude: number
  longitude: number
  radiusMeters: number
  filters?: ExploreFilters
  sort?: 'best' | 'distance'
  limit?: number
  now?: Date
}

type LocationFields = Pick<
  Location,
  'location_id' | 'name' | 'location_type' | 'campus' | 'price_range_id' | 'latitude' | 'longitude'
>

export interface PostRow {
  created_at: string
  crowd_level_id: number
  noise_level_id: number | null
  crowd_level: { label: string } | null
  noise_level: { label: string } | null
  post_photo: { storage_path: string; created_at: string }[]
}

export interface LocationRow extends LocationFields {
  address: Pick<Address, 'street_one' | 'city'> | null
  area: { noise_policy: string | null }[]
  seating_area: {
    seat_type: string
    capacity_id: number
    outlet_level_id: number
  }[]
  post: PostRow[]
}

export interface ExploreSpot extends LocationFields, Pick<Address, 'street_one' | 'city'> {
  distance_meters: number
  /** False means "no recent updates": crowd and noise are null. */
  is_current: boolean
  crowd_level_id: number | null
  crowd_level: string | null
  noise_level_id: number | null
  noise_level: string | null
  /** Most recent post, even if it is no longer current. */
  last_updated_at: string | null
  /** Path in the private post-photos bucket; exploreSpots signs it into latest_photo_url. */
  latest_photo_path: string | null
  latest_photo_url: string | null
  score: number
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(a))
}

function latest<T>(items: T[], time: (item: T) => string): T | null {
  let best: T | null = null
  for (const item of items) if (!best || time(item) > time(best)) best = item
  return best
}

/**
 * Filter definitions:
 *   quiet        latest current post is Silent/Quiet (<= 2); with no current noise
 *                report, an area whose noise_policy mentions quiet or silent
 *   groupStudy   a seating area for 2+ people, or a study room
 *   chargers     a seating area with Some or Plenty outlets (>= 2)
 *   price        locations with unknown price are excluded
 *
 * "Current" means a post within RECENT_MINUTES; the latest one wins.
 * 'best' scores lower crowd (50%), freshness (20%) and closeness (30%), so spots without
 * a current post only score on closeness. 'distance' is nearest first.
 */
export function rankSpots(rows: LocationRow[], opts: RankOptions): ExploreSpot[] {
  const f = opts.filters ?? {}
  const now = (opts.now ?? new Date()).getTime()
  const windowMs = RECENT_MINUTES * 60_000
  const spots: ExploreSpot[] = []

  for (const row of rows) {
    // The radius is applied server side by nearby_locations, which does not return the
    // distance itself. This is only for display and the closeness score.
    const distance = distanceMeters(opts.latitude, opts.longitude, row.latitude, row.longitude)
    if (f.locationTypes?.length && !f.locationTypes.includes(row.location_type)) continue
    if (f.priceRangeIds?.length && (row.price_range_id == null || !f.priceRangeIds.includes(row.price_range_id))) continue
    if (f.groupStudy && !row.seating_area.some((s) => s.capacity_id >= 2 || s.seat_type === 'study_room')) continue
    if (f.chargers && !row.seating_area.some((s) => s.outlet_level_id >= 2)) continue

    const post = latest(row.post.filter((p) => Date.parse(p.created_at) <= now), (p) => p.created_at)
    const age = post ? now - Date.parse(post.created_at) : Infinity
    const current = post && age < windowMs ? post : null

    if (f.quiet) {
      const quietPolicy = row.area.some((a) => /quiet|silent/i.test(a.noise_policy ?? ''))
      const noise = current?.noise_level_id ?? null
      if (noise == null ? !quietPolicy : noise > 2) continue
    }

    const photo = latest(row.post.flatMap((p) => p.post_photo), (p) => p.created_at)
    const score =
      0.3 * Math.max(0, 1 - distance / Math.max(opts.radiusMeters, 1)) +
      (current ? (0.5 * (5 - current.crowd_level_id)) / 4 + 0.2 * (1 - age / windowMs) : 0)

    spots.push({
      location_id: row.location_id,
      name: row.name,
      location_type: row.location_type,
      campus: row.campus,
      price_range_id: row.price_range_id,
      latitude: row.latitude,
      longitude: row.longitude,
      street_one: row.address?.street_one ?? null,
      city: row.address?.city ?? null,
      distance_meters: distance,
      is_current: current != null,
      crowd_level_id: current?.crowd_level_id ?? null,
      crowd_level: current?.crowd_level?.label ?? null,
      noise_level_id: current?.noise_level_id ?? null,
      noise_level: current?.noise_level?.label ?? null,
      last_updated_at: post?.created_at ?? null,
      latest_photo_path: photo?.storage_path ?? null,
      latest_photo_url: null,
      score,
    })
  }

  spots.sort((a, b) =>
    (opts.sort === 'distance' ? 0 : b.score - a.score) || a.distance_meters - b.distance_meters || a.location_id - b.location_id,
  )
  return spots.slice(0, Math.min(Math.max(opts.limit ?? 20, 1), 50))
}
