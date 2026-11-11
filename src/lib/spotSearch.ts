
import { supabase } from './supabase'
import { mockExploreRows } from './mocks/exploreMocks'
import {
    rankSpots,
    type ExploreSpot,
    type LocationRow,
} from './exploreRanking'
import {
    CROWDING_OPTIONS,
    type SearchOrigin,
    type SpotSummary,
} from './checkIn'

// Keep mock search enabled until real Supabase search is tested.
export const USE_MOCK_SEARCH = true

const SEARCH_LIMIT = 50
const WALKING_METERS_PER_MINUTE = 80

// Use the same database relationships as Explore.
const SEARCH_SELECT = `
  location_id,
  name,
  location_type,
  campus,
  price_range_id,
  latitude,
  longitude,
  address ( street_one, city ),
  area ( noise_policy ),
  seating_area (
    seat_type,
    capacity_id,
    outlet_level_id
  ),
  post (
    created_at,
    crowd_level_id,
    noise_level_id,
    crowd_level ( label ),
    noise_level ( label ),
    post_photo ( storage_path, created_at )
  )
`

// Reuse the shared crowding labels from checkIn.ts.
function getStatus(crowdLevelId: number | null): {
    label: string
    tone: 'highlight' | 'neutral'
} | null {
    if (crowdLevelId == null) return null

    const option = CROWDING_OPTIONS.find(
        (item) => item.dbId === crowdLevelId
    )

    if (option) {
        return {
            label: option.label,
            tone: option.value === 'busy'
                ? 'highlight'
                : 'neutral',
        }
    }

    // The database has five crowd levels, but the check-in
    // form currently only exposes three of them.
    // Handle the remaining levels until the shared options
    // are expanded.
    if (crowdLevelId === 2) {
        return {
            label: 'Some seats',
            tone: 'neutral',
        }
    }

    if (crowdLevelId === 5) {
        return {
            label: 'Packed',
            tone: 'highlight',
        }
    }

    return null
}

// Convert an Explore spot into a shared search result.
function toSummary(
    spot: ExploreSpot,
    row: LocationRow,
    origin: SearchOrigin
): SpotSummary {
    // Only display crowding and noise from recent reports.
    const status = spot.is_current
        ? getStatus(spot.crowd_level_id)
        : null

    const outlets = row.seating_area.some(
        (area) =>
            area.outlet_level_id != null &&
            area.outlet_level_id >= 2
    )

    return {
        locationId: spot.location_id,
        seatingId: null,
        name: spot.name,
        locationName: spot.name,

        status: status?.label ?? null,
        statusTone: status?.tone,

        reportedAt: spot.is_current
            ? spot.last_updated_at
            : null,

        noiseLabel: spot.is_current
            ? spot.noise_level
            : null,

        outlets,

        // Hide walking time when actual location is unavailable.
        walkMinutes: origin.isFallback
            ? null
            : Math.max(
                1,
                Math.round(
                    spot.distance_meters / WALKING_METERS_PER_MINUTE
                )
            ),
    }
}

// Search actual locations from Supabase.
async function searchSupabase(
    query: string
): Promise<LocationRow[]> {
    // Escape special characters used by SQL LIKE.
    const escaped = query
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')

    const { data, error } = await supabase
        .from('location')
        .select(SEARCH_SELECT)
        .ilike('name', `%${escaped}%`)
        .order('name', { ascending: true })
        .limit(SEARCH_LIMIT)

    if (error) {
        console.error('Supabase spot search error:', error)
        throw error
    }

    return (data ?? []) as unknown as LocationRow[]
}

// Shared search function for Explore and Check-in.
export async function searchLocations(
    searchText: string,
    origin: SearchOrigin
): Promise<SpotSummary[]> {
    const query = searchText.trim()

    if (!query) return []

    let rows: LocationRow[]

    if (USE_MOCK_SEARCH) {
        const lower = query.toLowerCase()

        rows = mockExploreRows().filter((spot) =>
            spot.name.toLowerCase().includes(lower)
        )
    } else {
        rows = await searchSupabase(query)
    }

    if (rows.length === 0) return []

    // Reuse existing Explore ranking and freshness logic.
    const ranked = rankSpots(rows, {
        latitude: origin.latitude,
        longitude: origin.longitude,
        radiusMeters: 1_000_000,
        sort: 'distance',
        limit: SEARCH_LIMIT,
    })

    const rowById = new Map(
        rows.map((row) => [row.location_id, row])
    )

    return ranked.flatMap((spot) => {
        const row = rowById.get(spot.location_id)

        if (!row) return []

        return [toSummary(spot, row, origin)]
    })
}
