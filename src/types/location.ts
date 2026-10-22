// Shared location types. Kept free of imports so the backend tests can use them too.

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
  /**
   * The kind of OpenStreetMap element this location was imported from, or null if it wasn't:
   * - node: a single point, e.g. a cafe mapped as a pin
   * - way: an outline, e.g. a building or park drawn as a shape
   * - relation: a group of elements, e.g. a building made of several outlines or a campus
   * Locations imported from OSM must be credited "© OpenStreetMap contributors".
   */
  osm_type: 'node' | 'way' | 'relation' | null
  /** The element's id in OpenStreetMap. Only unique together with osm_type (node 1 and way 1 differ). */
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
