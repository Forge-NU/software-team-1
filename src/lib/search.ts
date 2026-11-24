import { supabase } from './supabase'
import { EXPLORE_SELECT } from './explore'
import type { LocationRow } from './exploreRanking'
import { type SearchSpot, toSearchSpots } from './searchRanking'

export type { SearchSpot } from './searchRanking'

const PHOTO_BUCKET = 'post-photos'
const SIGNED_URL_SECONDS = 60 * 60

export interface SearchParams {
  query: string
  /** Optional: with both, results include distance and equal matches are nearest first. */
  latitude?: number | null
  longitude?: number | null
  limit?: number
}

/**
 * Searches spots by name (B-11). Works with or without the user's location:
 * partial names ("sne" finds Snell) and small typos match, best match first.
 * Each result carries its latest status and freshness timestamp, like Explore.
 */
export async function searchSpots(params: SearchParams): Promise<SearchSpot[]> {
  const query = params.query.trim()
  if (!query) return []

  const origin =
    params.latitude != null && params.longitude != null
      ? { latitude: params.latitude, longitude: params.longitude }
      : null

  const { data, error } = await supabase
    .rpc('search_locations', {
      query,
      lat: origin?.latitude ?? null,
      lon: origin?.longitude ?? null,
      result_limit: params.limit ?? 20,
    })
    .select(EXPLORE_SELECT)
    // Only the latest post and its newest photo are needed (same as exploreSpots).
    .order('created_at', { referencedTable: 'post', ascending: false })
    .limit(1, { referencedTable: 'post' })
    .order('created_at', { referencedTable: 'post.post_photo', ascending: false })
    .limit(1, { referencedTable: 'post.post_photo' })
  if (error) throw error

  const spots = toSearchSpots(data as unknown as LocationRow[], origin, new Date())

  const paths = spots.flatMap((s) => (s.latest_photo_path ? [s.latest_photo_path] : []))
  if (paths.length === 0) return spots
  const { data: signed, error: signError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS)
  if (signError) throw signError
  const urls = new Map(signed.map((item) => [item.path, item.signedUrl]))
  return spots.map((s) => ({
    ...s,
    latest_photo_url: s.latest_photo_path ? urls.get(s.latest_photo_path) ?? null : null,
  }))
}
