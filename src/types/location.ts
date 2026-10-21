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
  name: string
  latitude: number
  longitude: number
  location_type: string
  campus: string | null
  price_range_id: number | null
  address: Address | null
  day_hours: DayHours[]
}
