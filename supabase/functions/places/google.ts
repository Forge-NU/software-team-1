// Google Places API (New) client and normalization into the Spotted schema.
// https://developers.google.com/maps/documentation/places/web-service/op-overview

const PLACES_BASE_URL = 'https://places.googleapis.com/v1'

const SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryType',
].join(',')

const DETAIL_FIELDS = [
  'id',
  'displayName',
  'location',
  'primaryType',
  'types',
  'priceLevel',
  'addressComponents',
  'regularOpeningHours',
].join(',')

interface LocalizedText {
  text: string
}

interface LatLng {
  latitude: number
  longitude: number
}

interface AddressComponent {
  longText: string
  shortText: string
  types: string[]
}

interface OpeningPoint {
  day: number
  hour: number
  minute: number
}

interface OpeningPeriod {
  open: OpeningPoint
  close?: OpeningPoint
}

export interface GooglePlace {
  id: string
  displayName?: LocalizedText
  formattedAddress?: string
  location?: LatLng
  primaryType?: string
  types?: string[]
  priceLevel?: string
  addressComponents?: AddressComponent[]
  regularOpeningHours?: { periods?: OpeningPeriod[] }
}

export class GooglePlacesError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export interface SearchParams {
  query: string
  latitude?: number
  longitude?: number
  radiusMeters?: number
  pageSize?: number
}

export async function searchText(apiKey: string, params: SearchParams): Promise<GooglePlace[]> {
  const body: Record<string, unknown> = {
    textQuery: params.query,
    pageSize: params.pageSize ?? 10,
  }
  if (params.latitude !== undefined && params.longitude !== undefined) {
    body.locationBias = {
      circle: {
        center: { latitude: params.latitude, longitude: params.longitude },
        radius: params.radiusMeters ?? 5000,
      },
    }
  }

  const res = await fetch(`${PLACES_BASE_URL}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': SEARCH_FIELDS,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new GooglePlacesError(await res.text(), res.status)
  const json = await res.json()
  return json.places ?? []
}

export async function getPlace(apiKey: string, placeId: string): Promise<GooglePlace> {
  const res = await fetch(`${PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': DETAIL_FIELDS,
    },
  })
  if (!res.ok) throw new GooglePlacesError(await res.text(), res.status)
  return await res.json()
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const PRICE_LEVELS: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

// Checked in order, so more specific types come first.
const LOCATION_TYPE_RULES: [string, string[]][] = [
  ['library', ['library']],
  ['cafe', ['cafe', 'coffee_shop', 'tea_house', 'bakery']],
  ['coworking', ['coworking_space']],
  ['campus_building', ['university', 'school', 'secondary_school', 'primary_school']],
  ['park', ['park', 'garden']],
  ['restaurant', ['restaurant', 'food_court', 'meal_takeaway']],
]

export function deriveLocationType(place: GooglePlace): string {
  const types = new Set([place.primaryType, ...(place.types ?? [])].filter(Boolean))
  for (const [locationType, googleTypes] of LOCATION_TYPE_RULES) {
    if (googleTypes.some((t) => types.has(t))) return locationType
  }
  return 'other'
}

export interface NormalizedAddress {
  street_one: string | null
  street_two: string | null
  city: string | null
  region: string | null
  postal_code: string | null
  country_code: string | null
}

export function normalizeAddress(components: AddressComponent[] | undefined): NormalizedAddress | null {
  if (!components?.length) return null
  const find = (...types: string[]) =>
    components.find((c) => types.some((t) => c.types.includes(t)))

  const streetNumber = find('street_number')?.longText
  const route = find('route')?.longText
  const streetOne = [streetNumber, route].filter(Boolean).join(' ') || find('premise')?.longText

  return {
    street_one: streetOne || null,
    street_two: find('subpremise')?.longText ?? null,
    city: find('locality', 'postal_town', 'sublocality')?.longText ?? null,
    region: find('administrative_area_level_1')?.shortText ?? null,
    postal_code: find('postal_code')?.longText ?? null,
    country_code: find('country')?.shortText ?? null,
  }
}

export interface NormalizedHours {
  day: string
  open_time: string
  close_time: string
}

const MINUTES_PER_DAY = 24 * 60

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// day_hours holds one row per day, so multiple periods on the same day (e.g. a
// lunch break) collapse to the earliest open and the latest close.
export function normalizeHours(periods: OpeningPeriod[] | undefined): NormalizedHours[] | null {
  if (!periods?.length) return null

  if (periods.length === 1 && !periods[0].close) {
    return DAY_NAMES.map((day) => ({ day, open_time: '00:00', close_time: '24:00' }))
  }

  const byDay = new Map<number, { open: number; close: number }>()
  for (const { open, close } of periods) {
    if (!close) continue
    const openMinutes = open.hour * 60 + open.minute
    const dayOffset = (close.day - open.day + 7) % 7
    const closeMinutes = dayOffset * MINUTES_PER_DAY + close.hour * 60 + close.minute

    const existing = byDay.get(open.day)
    byDay.set(open.day, {
      open: Math.min(existing?.open ?? openMinutes, openMinutes),
      close: Math.max(existing?.close ?? closeMinutes, closeMinutes),
    })
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, { open, close }]) => ({
      day: DAY_NAMES[day],
      open_time: formatTime(open),
      close_time: close === MINUTES_PER_DAY ? '24:00' : formatTime(close % MINUTES_PER_DAY),
    }))
}

export interface PlaceOverrides {
  locationType?: string | null
  campus?: string | null
}

export function toUpsertPayload(place: GooglePlace, overrides: PlaceOverrides = {}) {
  if (!place.location) throw new GooglePlacesError(`Place ${place.id} has no coordinates`, 422)

  return {
    google_place_id: place.id,
    name: place.displayName?.text ?? place.id,
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    default_location_type: deriveLocationType(place),
    location_type: overrides.locationType ?? null,
    campus: overrides.campus ?? null,
    price_range_id: place.priceLevel ? PRICE_LEVELS[place.priceLevel] ?? null : null,
    address: normalizeAddress(place.addressComponents),
    hours: normalizeHours(place.regularOpeningHours?.periods),
  }
}
