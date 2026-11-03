// Pure mapping for saved spots. Only type imports and constants, so the backend
// tests can run it (same approach as exploreRanking.ts).

import { RECENT_MINUTES } from './exploreRanking.ts'

export interface SavedSpot {
  location_id: number
  name: string
  location_type: string
  campus: string | null
  latitude: number
  longitude: number
  street_one: string | null
  city: string | null
  /** When the user saved it. */
  saved_at: string
  /** False means "no recent updates": crowd and noise are null. Same rule as Explore. */
  is_current: boolean
  crowd_level_id: number | null
  crowd_level: string | null
  noise_level_id: number | null
  noise_level: string | null
  /** Time of the most recent report, even if it's no longer current (freshness timestamp). */
  last_updated_at: string | null
}

export interface SavedSpotPost {
  created_at: string
  crowd_level_id: number
  noise_level_id: number | null
  crowd_level: { label: string } | null
  noise_level: { label: string } | null
}

export interface SavedSpotRow {
  created_at: string
  location: {
    location_id: number
    name: string
    location_type: string
    campus: string | null
    latitude: number
    longitude: number
    address: { street_one: string | null; city: string | null } | null
    post: SavedSpotPost[]
  } | null
}

function latest(posts: SavedSpotPost[]): SavedSpotPost | null {
  let best: SavedSpotPost | null = null
  for (const p of posts) if (!best || p.created_at > best.created_at) best = p
  return best
}

/**
 * Turns saved_spot rows into SavedSpots. Posts after `now` are ignored, and a
 * post only counts as current within RECENT_MINUTES (the same rule as Explore).
 */
export function toSavedSpots(rows: SavedSpotRow[], now: Date): SavedSpot[] {
  const nowMs = now.getTime()
  const windowMs = RECENT_MINUTES * 60_000

  return rows.flatMap((row) => {
    const loc = row.location
    if (!loc) return []
    const post = latest(loc.post.filter((p) => Date.parse(p.created_at) <= nowMs))
    const current = post && nowMs - Date.parse(post.created_at) < windowMs ? post : null

    return [
      {
        location_id: loc.location_id,
        name: loc.name,
        location_type: loc.location_type,
        campus: loc.campus,
        latitude: loc.latitude,
        longitude: loc.longitude,
        street_one: loc.address?.street_one ?? null,
        city: loc.address?.city ?? null,
        saved_at: row.created_at,
        is_current: current != null,
        crowd_level_id: current?.crowd_level_id ?? null,
        crowd_level: current?.crowd_level?.label ?? null,
        noise_level_id: current?.noise_level_id ?? null,
        noise_level: current?.noise_level?.label ?? null,
        last_updated_at: post?.created_at ?? null,
      },
    ]
  })
}
