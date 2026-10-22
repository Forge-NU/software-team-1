// OpenStreetMap Overpass API client and normalization into the Spotted schema.
// https://wiki.openstreetmap.org/wiki/Overpass_API
// OSM data is © OpenStreetMap contributors, available under the ODbL.

import OpeningHours from 'npm:opening_hours@3.15.0'

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// The public Overpass servers ask clients to identify themselves.
export const USER_AGENT = 'Spotted-importer/1.0 (+https://github.com/Forge-NU/software-team-1)'

export type OsmType = 'node' | 'way' | 'relation'

export interface OsmElement {
  type: OsmType
  id: number
  lat?: number
  lon?: number
  /** Set for ways and relations when queried with `out center`. */
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/**
 * A bounding box: the rectangle of map to search, given by its edges in degrees.
 * south/north are the bottom and top latitudes, west/east the left and right longitudes.
 */
export interface Bbox {
  south: number
  west: number
  north: number
  east: number
}

/** Boston, Cambridge, Brookline, Somerville and Chestnut Hill. */
export const BOSTON: Bbox = { south: 42.3, west: -71.19, north: 42.42, east: -71.02 }

/** Location types the importer can fetch, with the Overpass filters that find them. */
export const TYPE_FILTERS = {
  library: ['["amenity"="library"]'],
  cafe: ['["amenity"="cafe"]'],
  coworking: ['["amenity"="coworking_space"]', '["office"="coworking"]'],
  park: ['["leisure"="park"]["name"]'],
  restaurant: ['["amenity"~"^(restaurant|fast_food)$"]'],
  // Only fetched inside campus grounds, otherwise every dorm and office in the city matches.
  campus_building: ['["building"~"^(university|college)$"]["name"]'],
} as const

export type ImportType = keyof typeof TYPE_FILTERS

export const DEFAULT_TYPES: ImportType[] = ['library', 'cafe', 'coworking', 'campus_building']

/** OSM names of the university grounds for each row in public.campus. */
export const CAMPUS_AREAS: Record<string, string> = {
  'Northeastern University': 'Northeastern University',
  'Boston University': 'Boston University',
  'Harvard University': 'Harvard University',
  'MIT': 'Massachusetts Institute of Technology',
  'Boston College': 'Boston College',
  'Tufts University': 'Tufts University',
  'Emerson College': 'Emerson College',
  'Suffolk University': 'Suffolk University',
  'Berklee College of Music': 'Berklee College of Music',
  'UMass Boston': 'University of Massachusetts Boston',
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

/** Payload for public.upsert_osm_places. */
export interface OsmPlacePayload {
  osm_type: OsmType
  osm_id: number
  name: string
  latitude: number
  longitude: number
  default_location_type: string
  campus: string | null
  address: Address | null
  hours: DayHours[] | null
}

export class OverpassError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// --- Queries ---------------------------------------------------------------

const quote = (value: string) => `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`

function union(filters: string[], scope: string): string {
  return `(${filters.map((f) => `nwr${f}${scope};`).join('')});out center tags;`
}

/** Places of the given types anywhere in the bounding box. */
export function buildBboxQuery(types: ImportType[], bbox: Bbox, timeout = 180): string {
  const filters = types.filter((t) => t !== 'campus_building').flatMap((t) => TYPE_FILTERS[t])
  const scope = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`
  return `[out:json][timeout:${timeout}];${union(filters, scope)}`
}

/**
 * Places of the given types on each campus's grounds, in one request. Each campus's results are
 * preceded by a derived `campus_marker` element naming it (see parseCampusResults).
 * Grounds are the university's mapped area, plus the buildings of its site relation for schools
 * like Emerson whose buildings are spread out rather than inside one boundary.
 */
export function buildCampusQuery(types: ImportType[], campuses: string[], timeout = 180): string {
  const filters = types.flatMap((t) => TYPE_FILTERS[t])
  const blocks = campuses.map((campus) => {
    const tags = `["amenity"~"^(university|college)$"]["name"=${quote(CAMPUS_AREAS[campus] ?? campus)}]`
    return `make campus_marker name=${quote(campus)};out;` +
      `area${tags}->.grounds;` +
      `rel["type"="site"]${tags};way(r);map_to_area->.buildings;` +
      `(.grounds;.buildings;)->.campus;` +
      union(filters, '(area.campus)')
  })
  return `[out:json][timeout:${timeout}];${blocks.join('')}`
}

/** Splits a buildCampusQuery response into the campus each element was found on. */
export function parseCampusResults(elements: OsmElement[]): { campus: string; element: OsmElement }[] {
  const results: { campus: string; element: OsmElement }[] = []
  let campus: string | null = null
  for (const e of elements) {
    if ((e.type as string) === 'campus_marker') campus = e.tags?.name ?? null
    else if (campus) results.push({ campus, element: e })
  }
  return results
}

export interface OverpassOptions {
  fetch?: typeof fetch
  /** Retries, with exponential backoff, when the server is busy. */
  retries?: number
  sleep?: (ms: number) => Promise<void>
}

const BUSY_STATUSES = [429, 502, 503, 504]

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function overpass(query: string, options: OverpassOptions = {}): Promise<OsmElement[]> {
  const { fetch: fetchFn = fetch, retries = 4, sleep = defaultSleep } = options
  for (let attempt = 0; ; attempt++) {
    const res = await fetchFn(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: new URLSearchParams({ data: query }),
    })
    if (res.ok) {
      const body = (await res.json()) as { elements?: OsmElement[] }
      return body.elements ?? []
    }
    const text = await res.text()
    if (BUSY_STATUSES.includes(res.status) && attempt < retries) {
      await sleep(15_000 * 2 ** attempt)
      continue
    }
    throw new OverpassError(`Overpass request failed (${res.status}): ${text.slice(0, 200)}`, res.status)
  }
}

// --- Normalization ---------------------------------------------------------

/** Maps OSM tags onto public.location_type. */
export function deriveLocationType(tags: Record<string, string>): string {
  const amenity = tags.amenity
  if (amenity === 'library') return 'library'
  if (amenity === 'coworking_space' || tags.office === 'coworking') return 'coworking'
  if (amenity === 'cafe') return 'cafe'
  if (amenity === 'restaurant' || amenity === 'fast_food') return 'restaurant'
  if (tags.leisure === 'park') return 'park'
  if (tags.building === 'university' || tags.building === 'college') return 'campus_building'
  return 'other'
}

/** Builds an address from addr:* tags. Most US places omit addr:country, so it defaults to US. */
export function normalizeAddress(tags: Record<string, string>, defaultCountry = 'US'): Address | null {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  const address: Omit<Address, 'country_code'> = {
    street_one: street || null,
    street_two: tags['addr:unit'] ?? null,
    city: tags['addr:city'] ?? null,
    region: tags['addr:state'] ?? null,
    postal_code: tags['addr:postcode'] ?? null,
  }
  if (Object.values(address).every((v) => v === null)) return null
  const country = tags['addr:country'] ?? defaultCountry
  return { ...address, country_code: /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null }
}

// A week with no US public holidays or daylight saving change, starting on a Sunday.
const REFERENCE_WEEK = new Date(2026, 8, 13)
const DAY_MS = 24 * 60 * 60 * 1000

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const hhmm = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

/**
 * Converts an OSM opening_hours value into one row per open day. Returns null when the value
 * can't be parsed. Days with several openings (e.g. a lunch break) become first open to last
 * close, since day_hours holds one range per day. Hours past midnight belong to the day they
 * opened, with close_time earlier than open_time.
 */
export function normalizeHours(value: string, latitude: number, longitude: number): DayHours[] | null {
  let oh: OpeningHours
  try {
    oh = new OpeningHours(value, {
      lat: latitude,
      lon: longitude,
      address: { country_code: 'us', state: 'Massachusetts' },
    })
  } catch {
    return null
  }

  // Start a day early so Saturday-night hours that run into Sunday aren't read as Sunday opening.
  const intervals: { start: Date; end: Date }[] = []
  for (const [start, end] of oh.getOpenIntervals(addDays(REFERENCE_WEEK, -1), addDays(REFERENCE_WEEK, 8))) {
    const last = intervals[intervals.length - 1]
    if (last && start.getTime() <= last.end.getTime()) {
      if (end > last.end) last.end = end
    } else {
      intervals.push({ start, end })
    }
  }

  const hours: DayHours[] = []
  for (let d = 0; d < 7; d++) {
    const dayStart = addDays(REFERENCE_WEEK, d)
    const dayEnd = addDays(REFERENCE_WEEK, d + 1)
    if (intervals.some((i) => i.start <= dayStart && i.end >= dayEnd)) {
      hours.push({ day: DAYS[d], open_time: '00:00', close_time: '24:00' })
      continue
    }
    const opening = intervals.filter((i) => i.start >= dayStart && i.start < dayEnd)
    if (opening.length === 0) continue
    const open = opening[0].start
    const close = opening[opening.length - 1].end
    hours.push({
      day: DAYS[d],
      open_time: hhmm(open),
      close_time: close.getTime() === dayEnd.getTime() || close.getTime() - open.getTime() >= DAY_MS
        ? '24:00'
        : hhmm(close),
    })
  }
  return hours
}

/** Converts an Overpass element into an upsert payload, or null when it has no name or position. */
export function toPayload(element: OsmElement, campus: string | null = null): OsmPlacePayload | null {
  const tags = element.tags ?? {}
  const name = tags.name?.trim()
  const latitude = element.lat ?? element.center?.lat
  const longitude = element.lon ?? element.center?.lon
  if (!name || latitude === undefined || longitude === undefined) return null
  return {
    osm_type: element.type,
    osm_id: element.id,
    name,
    latitude,
    longitude,
    default_location_type: deriveLocationType(tags),
    campus,
    address: normalizeAddress(tags),
    hours: tags.opening_hours ? normalizeHours(tags.opening_hours, latitude, longitude) : null,
  }
}

// --- Collecting ------------------------------------------------------------

export interface CollectOptions extends OverpassOptions {
  types?: ImportType[]
  bbox?: Bbox
  /** Campus names from public.campus to look up, defaults to all of CAMPUS_AREAS. */
  campuses?: string[]
  /** Pause between requests to stay within the public server's rate limit. */
  delayMs?: number
  onProgress?: (message: string) => void
}

/**
 * Fetches places in the bounding box, then on each campus's grounds so they get a campus and
 * campus buildings are included. Each element appears once.
 */
export async function collectPlaces(options: CollectOptions = {}): Promise<OsmPlacePayload[]> {
  const {
    types = DEFAULT_TYPES,
    bbox = BOSTON,
    campuses = Object.keys(CAMPUS_AREAS),
    delayMs = 5000,
    onProgress = () => {},
    sleep = defaultSleep,
  } = options

  const elements = new Map<string, OsmElement>()
  const campusOf = new Map<string, string>()
  const key = (e: OsmElement) => `${e.type}/${e.id}`

  if (types.some((t) => t !== 'campus_building')) {
    const found = await overpass(buildBboxQuery(types, bbox), options)
    for (const e of found) elements.set(key(e), e)
    onProgress(`Boston area: ${found.length} elements`)
    if (campuses.length) await sleep(delayMs)
  }

  if (campuses.length) {
    const perCampus = new Map<string, number>(campuses.map((c) => [c, 0]))
    for (const { campus, element } of parseCampusResults(await overpass(buildCampusQuery(types, campuses), options))) {
      elements.set(key(element), element)
      if (!campusOf.has(key(element))) campusOf.set(key(element), campus)
      perCampus.set(campus, (perCampus.get(campus) ?? 0) + 1)
    }
    onProgress(`Campuses: ${[...perCampus].map(([c, n]) => `${c} ${n}`).join(', ')}`)
  }

  const places: OsmPlacePayload[] = []
  for (const [k, e] of elements) {
    const place = toPayload(e, campusOf.get(k) ?? null)
    if (place) places.push(place)
  }
  return places
}
