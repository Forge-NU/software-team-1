import { supabase } from './supabase'

export interface Address {
  street_one: string | null
  street_two: string | null
  city: string | null
  region: string | null
  postal_code: string | null
  country_code: string | null
}

export interface DayHours {
  day: string
  open_time: string
  close_time: string
}

export interface Location {
  location_id: number
  google_place_id: string | null
  /** Set when imported from OpenStreetMap; such locations must be credited "© OpenStreetMap contributors". */
  osm_type: 'node' | 'way' | 'relation' | null
  osm_id: number | null
  name: string
  latitude: number
  longitude: number
  location_type: string
  campus: string | null
  price_range_id: number | null
  address: Address | null
  day_hours: DayHours[]
}

export interface NearbyLocationFilters {
  campus?: string
  locationType?: string
  name?: string
  priceRange?: number
}

export interface NearbyLocationsPage {
  locations: Location[]
  nextCursor: string | null
  hasMore: boolean
}

export type LocationUpdate = Partial<
  Pick<Location, 'name' | 'latitude' | 'longitude' | 'location_type' | 'campus' | 'price_range_id'>
>

const LOCATION_SELECT = `
  location_id, google_place_id, osm_type, osm_id, name, latitude, longitude, location_type, campus, price_range_id,
  address ( street_one, street_two, city, region, postal_code, country_code ),
  day_hours ( day, open_time, close_time )
`

export async function getLocation(locationId: number): Promise<Location | null> {
  const { data, error } = await supabase
    .from('location')
    .select(LOCATION_SELECT)
    .eq('location_id', locationId)
    .maybeSingle()
  if (error) throw error
  return data as Location | null
}

export async function listLocations(filters: { campus?: string; locationType?: string } = {}) {
  let query = supabase.from('location').select(LOCATION_SELECT).order('name')
  if (filters.campus) query = query.eq('campus', filters.campus)
  if (filters.locationType) query = query.eq('location_type', filters.locationType)
  const { data, error } = await query
  if (error) throw error
  return data as unknown as Location[]
}

/** Gets a page of locations near a given point, ordered by distance. */
export async function getNearbyLocations(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  filters: NearbyLocationFilters = {},
  cursor?: string,
  pageSize = 30,
): Promise<NearbyLocationsPage> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 99) {
    throw new RangeError('pageSize must be an integer between 1 and 99')
  }

  // Cursor format: "<latitude>,<longitude>,<location_id>" of the previous page's last location
  let after: { latitude: number; longitude: number; locationId: number } | null = null
  if (cursor !== undefined) {
    const [lat, lng, id] = cursor.split(',').map(Number)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isSafeInteger(id) || id < 1) {
      throw new RangeError('cursor is invalid')
    }
    after = { latitude: lat, longitude: lng, locationId: id }
  }

  const { data, error } = await supabase.rpc('nearby_locations', {
    lat: latitude,
    lon: longitude,
    radius_m: radiusMeters,
    campus_filter: filters.campus ?? null,
    location_type_filter: filters.locationType ?? null,
    name_filter: filters.name || null,
    price_range_filter: filters.priceRange ?? null,
    after_latitude: after?.latitude ?? null,
    after_longitude: after?.longitude ?? null,
    after_location_id: after?.locationId ?? null,
    page_size: pageSize + 1,
  }).select(LOCATION_SELECT)
  if (error) throw error

  const locations = (data ?? []) as unknown as Location[]
  const hasMore = locations.length > pageSize
  const page = hasMore ? locations.slice(0, pageSize) : locations
  const last = page[page.length - 1]

  return {
    locations: page,
    nextCursor: hasMore ? `${last.latitude},${last.longitude},${last.location_id}` : null,
    hasMore,
  }
}

/** Manually edits a location (admin only). Re-running the OpenStreetMap import overwrites name and coordinates. */
export async function updateLocation(locationId: number, changes: LocationUpdate): Promise<void> {
  const { error } = await supabase.from('location').update(changes).eq('location_id', locationId)
  if (error) throw error
}

/** Deletes a location and everything under it (admin only). */
export async function deleteLocation(locationId: number): Promise<void> {
  const { error } = await supabase.from('location').delete().eq('location_id', locationId)
  if (error) throw error
}
