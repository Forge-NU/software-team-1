import { exploreSpots, type ExploreParams, type ExploreSpot } from './explore'
import { rankSpots } from './exploreRanking'
import { mockExploreRows } from './mocks/exploreMocks'
/**
 * true: Explore uses mock spots from src/lib/mocks/explore.ts.
 * Set to false once real locations and posts are in the database.
 */
export const USE_MOCK_DATA = false

/** Default map center until location permission (Logan's branch) is wired in. */
export const NU_CAMPUS = { latitude: 42.3398, longitude: -71.0892 }

/**
 * Use this instead of calling exploreSpots() directly, so every screen
 * switches between mock and real data in one place. Mock spots still go
 * through B-5's rankSpots, so filters and sorting behave the same.
 */
export async function getExploreSpots(params: ExploreParams): Promise<ExploreSpot[]> {
  if (!USE_MOCK_DATA) return exploreSpots(params)
  const radiusMeters = params.radiusMeters ?? 2000
  return rankSpots(mockExploreRows(), { ...params, radiusMeters })
}