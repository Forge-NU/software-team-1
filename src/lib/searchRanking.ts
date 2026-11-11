// Pure mapping for name search results. Only type imports and constants, so the
// backend tests can run it (same approach as exploreRanking.ts and savedSpotRows.ts).

import { distanceMeters, type ExploreSpot, type LocationRow, RECENT_MINUTES } from './exploreRanking.ts'

/** Same shape as an Explore spot, but distance is only known when the user's location is. */
export type SearchSpot = Omit<ExploreSpot, 'distance_meters' | 'score'> & {
  /** Null when searching without the user's location. */
  distance_meters: number | null
}

export interface SearchOrigin {
  latitude: number
  longitude: number
}

function latest<T>(items: T[], time: (item: T) => string): T | null {
  let best: T | null = null
  for (const item of items) if (!best || time(item) > time(best)) best = item
  return best
}

/**
 * Turns search_locations rows into SearchSpots, keeping the database's order
 * (best name match first, then nearest). A post only counts as current within
 * RECENT_MINUTES, the same rule as Explore.
 */
export function toSearchSpots(rows: LocationRow[], origin: SearchOrigin | null, now: Date): SearchSpot[] {
  const nowMs = now.getTime()
  const windowMs = RECENT_MINUTES * 60_000

  return rows.map((row) => {
    const post = latest(row.post.filter((p) => Date.parse(p.created_at) <= nowMs), (p) => p.created_at)
    const current = post && nowMs - Date.parse(post.created_at) < windowMs ? post : null
    const photo = latest(row.post.flatMap((p) => p.post_photo), (p) => p.created_at)

    return {
      location_id: row.location_id,
      name: row.name,
      location_type: row.location_type,
      campus: row.campus,
      price_range_id: row.price_range_id,
      latitude: row.latitude,
      longitude: row.longitude,
      street_one: row.address?.street_one ?? null,
      city: row.address?.city ?? null,
      distance_meters: origin
        ? distanceMeters(origin.latitude, origin.longitude, row.latitude, row.longitude)
        : null,
      is_current: current != null,
      crowd_level_id: current?.crowd_level_id ?? null,
      crowd_level: current?.crowd_level?.label ?? null,
      noise_level_id: current?.noise_level_id ?? null,
      noise_level: current?.noise_level?.label ?? null,
      last_updated_at: post?.created_at ?? null,
      latest_photo_path: photo?.storage_path ?? null,
      latest_photo_url: null,
    }
  })
}
