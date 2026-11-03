import { supabase } from './supabase'
import { type ExploreFilters, type ExploreSpot, type LocationRow, rankSpots } from './exploreRanking'

export type { ExploreFilters, ExploreSpot } from './exploreRanking'

export interface ExploreParams {
  latitude: number
  longitude: number
  radiusMeters?: number
  filters?: ExploreFilters
  search?: string
  sort?: 'best' | 'distance'
  limit?: number
}

const PHOTO_BUCKET = 'post-photos'
const SIGNED_URL_SECONDS = 60 * 60
// The most nearby_locations allows. Ranking needs every spot in the radius, not just the first page.
const NEARBY_PAGE_SIZE = 100

const EXPLORE_SELECT = `
  location_id, name, location_type, campus, price_range_id, latitude, longitude,
  address ( street_one, city ),
  area ( noise_policy ),
  seating_area ( seat_type, capacity_id, outlet_level_id ),
  post (
    created_at, crowd_level_id, noise_level_id, crowd_level ( label ), noise_level ( label ),
    post_photo ( storage_path, created_at )
  )
`

/** Nearby spots for Explore, ranked for "Best options right now" by default. */
export async function exploreSpots(params: ExploreParams): Promise<ExploreSpot[]> {
  const radiusMeters = params.radiusMeters ?? 2000
  const f = params.filters ?? {}

  // nearby_locations (B-1) keeps locations inside the radius and sorts them nearest first,
  // server side with PostGIS. The nested select still brings back posts and photos.
  const { data, error } = await supabase
    .rpc('nearby_locations', {
      lat: params.latitude,
      lon: params.longitude,
      radius_m: radiusMeters,
      name_filter: params.search?.trim() || null,
      // nearby_locations takes one type and one price; with several, rankSpots filters them.
      location_type_filter: f.locationTypes?.length === 1 ? f.locationTypes[0] : null,
      price_range_filter: f.priceRangeIds?.length === 1 ? f.priceRangeIds[0] : null,
      page_size: NEARBY_PAGE_SIZE,
    })
    .select(EXPLORE_SELECT)
    // Only the latest post and its newest photo are needed. Every post has a photo,
    // so that is also the location's latest photo.
    .order('created_at', { referencedTable: 'post', ascending: false })
    .limit(1, { referencedTable: 'post' })
    .order('created_at', { referencedTable: 'post.post_photo', ascending: false })
    .limit(1, { referencedTable: 'post.post_photo' })
  if (error) throw error
  const spots = rankSpots(data as unknown as LocationRow[], { ...params, radiusMeters })

  const paths = spots.flatMap((s) => (s.latest_photo_path ? [s.latest_photo_path] : []))
  if (paths.length === 0) return spots
  const { data: signed, error: signError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS)
  if (signError) throw signError
  const urls = new Map(signed.map((item) => [item.path, item.signedUrl]))
  return spots.map((s) => ({ ...s, latest_photo_url: s.latest_photo_path ? urls.get(s.latest_photo_path) ?? null : null }))
}
