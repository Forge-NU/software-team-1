
import type { ExploreFilters } from './exploreRanking';
import type { Filters } from '../screens/FiltersScreen';

// Converts frontend location labels to database values
const locationTypeMap: Record<string, string[]> = {
  Campus: ['campus_building'],
  Library: ['library'],
  'Café': ['cafe'],

  // Proposed grouping for Public Space
  // Confirm these types with the F-2/B-5 team
  'Public Space': [
    'coworking',
    'restaurant',
    'park',
    'other',
  ],
};

// Converts F-4 selections into B-5 filters
export function toExploreFilters(
  filters: Filters
): ExploreFilters {
  return {
    // "Any noise level" means no restriction
    quiet: filters.atmosphere === 'Quiet',

    // Outlets are supported by B-5
    chargers: filters.amenities.includes('Outlets'),

    // Convert location labels into backend types
    locationTypes: filters.locationTypes.length > 0
      ? [
        ...new Set(
          filters.locationTypes.flatMap(
            (item: string) =>
              locationTypeMap[item] ?? []
          )
        ),
      ]
      : undefined,

    // B-5 supports these price categories
    priceRangeIds: filters.priceRangeIds.length > 0
      ? filters.priceRangeIds
      : undefined,
  };
}
