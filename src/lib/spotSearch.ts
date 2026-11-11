
import { supabase } from './supabase'
import { USE_MOCK_DATA } from './exploreSource'
import { mockExploreRows } from './mocks/exploreMocks'
import {
    rankSpots,
    type ExploreSpot,
    type LocationRow,
} from './exploreRanking'
import type { SearchOrigin, SpotSummary } from './checkIn'

const SEARCH_LIMIT = 50
const WALKING_METERS_PER_MINUTE = 80

// Same relationships Explore uses for live spot information.
const SEARCH_SELECT = `
  location_id, name, location_type, campus,
  price_range_id, latitude, longitude,
  address ( street_one, city ),
  area ( noise_policy ),
  seating_area ( seat_type, capacity_id, outlet_level_id ),
  post (
    created_at, crowd_level_id, noise_level_id,
    crowd_level ( label ),
    noise_level ( label ),
    post_photo ( storage_path, created_at )
  )
`

function getStatus(crowdLevelId: number | null) {
    if (crowdLevelId == null) return null

    if (crowdLevelId <= 2) {
        return { label: 'Nearly empty', tone: 'neutral' as const }
    }

    if (crowdLevelId === 3) {
        return { label: 'Some seats', tone: 'neutral' as const }
    }

    if (crowdLevelId === 4) {
        return { label: 'Busy', tone: 'highlight' as const }
    }

    return { label: 'Packed', tone: 'highlight' as const }
}

function toSummary(
    spot: ExploreSpot,
    row: LocationRow,
    origin: SearchOrigin
): SpotSummary {
    // Don't show old crowding as if it were current.
    const status = spot.is_current
        ? getStatus(spot.crowd_level_id)
        : null

    const hasOutlets = row.seating_area.some(
        (area) => area.outlet_level_id >= 2
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
        outlets: hasOutlets,
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

export async function searchLocations(
    searchText: string,
    origin: SearchOrigin
): Promise<SpotSummary[]> {
    const query = searchText.trim()

    if (!query) return []

    let rows: LocationRow[]

    if (USE_MOCK_DATA) {
        // Search the same mock spots Explore displays.
        const lower = query.toLowerCase()

        rows = mockExploreRows().filter((row) =>
            row.name.toLowerCase().includes(lower)
        )
    } else {
        // Escape LIKE wildcards so user input is treated literally.
        const escaped = query
            .replace(/\\/g, '\\\\')
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_')

        const { data, error } = await supabase
            .from('location')
            .select(SEARCH_SELECT)
            .ilike('name', `%${escaped}%`)
            .order('name')
            .limit(SEARCH_LIMIT)

        if (error) throw error

        rows = (data ?? []) as unknown as LocationRow[]
    }

    if (rows.length === 0) return []

    // Reuse Explore's logic for fresh crowding/noise status.
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

        return row ? [toSummary(spot, row, origin)] : []
    })
}
