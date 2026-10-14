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

const EXPLORE_SELECT = `
  location_id, name, location_type, campus, price_range_id, latitude, longitude,
  address ( street_one, city ),
  area ( noise_policy ),
  seating_area (
    seat_type, capacity_id, outlet_level_id,
    check_in ( checked_in_at, crowd_level_id, noise_level_id, crowd_level ( label ), noise_level ( label ) ),
    photo ( image_url, created_at )
  )
`

/** Nearby spots for Explore, ranked for "Best options right now" by default. */
export async function exploreSpots(params: ExploreParams): Promise<ExploreSpot[]> {
  const radiusMeters = params.radiusMeters ?? 2000
  const f = params.filters ?? {}

  // Bounding box around the user; rankSpots trims it to the exact radius.
  const dLat = (radiusMeters / 6371000) * (180 / Math.PI)
  const dLng = dLat / Math.cos((params.latitude * Math.PI) / 180)
  let query = supabase
    .from('location')
    .select(EXPLORE_SELECT)
    .gte('latitude', params.latitude - dLat)
    .lte('latitude', params.latitude + dLat)
    .gte('longitude', params.longitude - dLng)
    .lte('longitude', params.longitude + dLng)
    // Only the latest check-in and photo per seating area are needed.
    .order('checked_in_at', { referencedTable: 'seating_area.check_in', ascending: false })
    .limit(1, { referencedTable: 'seating_area.check_in' })
    .order('created_at', { referencedTable: 'seating_area.photo', ascending: false })
    .limit(1, { referencedTable: 'seating_area.photo' })

  if (f.locationTypes?.length) query = query.in('location_type', f.locationTypes)
  if (f.priceRangeIds?.length) query = query.in('price_range_id', f.priceRangeIds)
  const search = params.search?.trim()
  if (search) query = query.ilike('name', `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)

  const { data, error } = await query
  if (error) throw error
  return rankSpots(data as unknown as LocationRow[], { ...params, radiusMeters })
}
