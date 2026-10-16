import { supabase } from './supabase'

export interface PlaceSearchResult {
  googlePlaceId: string
  name: string | null
  formattedAddress: string | null
  latitude: number | null
  longitude: number | null
  primaryType: string | null
  /** Set when this place has already been imported into Spotted. */
  locationId: number | null
}

export interface PlaceSearchParams {
  query: string
  latitude?: number
  longitude?: number
  radiusMeters?: number
  pageSize?: number
}

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
  name: string
  latitude: number
  longitude: number
  location_type: string
  campus: string | null
  price_range_id: number | null
  address: Address | null
  day_hours: DayHours[]
}

export type LocationUpdate = Partial<
  Pick<Location, 'name' | 'latitude' | 'longitude' | 'location_type' | 'campus' | 'price_range_id'>
>

const LOCATION_SELECT = `
  location_id, google_place_id, name, latitude, longitude, location_type, campus, price_range_id,
  address ( street_one, street_two, city, region, postal_code, country_code ),
  day_hours ( day, open_time, close_time )
`

async function invokePlaces<T>(path: string, body?: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(path, { method: 'POST', body })
  if (error) throw error
  return data as T
}

/** Searches Google Places. Results are not saved. */
export async function searchPlaces(params: PlaceSearchParams): Promise<PlaceSearchResult[]> {
  const { results } = await invokePlaces<{ results: PlaceSearchResult[] }>('places/search', params)
  return results
}

/** Imports a Google place as a location (admin only). Re-importing refreshes it. */
export async function importPlace(params: {
  googlePlaceId: string
  locationType?: string
  campus?: string
}): Promise<number> {
  const { locationId } = await invokePlaces<{ locationId: number }>('places', params)
  return locationId
}

/** Re-fetches name, coordinates, price, address and hours from Google (admin only). */
export async function syncLocation(locationId: number): Promise<void> {
  await invokePlaces(`places/${locationId}/sync`)
}

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

/** Manually edits a location (admin only). A later sync overwrites name, coordinates and price. */
export async function updateLocation(locationId: number, changes: LocationUpdate): Promise<void> {
  const { error } = await supabase.from('location').update(changes).eq('location_id', locationId)
  if (error) throw error
}

/** Deletes a location and everything under it (admin only). */
export async function deleteLocation(locationId: number): Promise<void> {
  const { error } = await supabase.from('location').delete().eq('location_id', locationId)
  if (error) throw error
}
