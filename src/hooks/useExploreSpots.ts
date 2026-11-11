import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_EXPLORE_ORIGIN, EXPLORE_RADIUS_METERS } from '@/constants/explore';
import type { ExploreFilters, ExploreSpot } from '@/lib/exploreRanking';
import { getExploreSpots } from '@/lib/exploreSource';

export interface UseExploreSpotsOptions {
  filters?: ExploreFilters;
  sort?: 'best' | 'distance';
  latitude?: number;
  longitude?: number;
}

/**
 * The spots Explore shows. Call this once in the Explore screen and pass `spots` to both
 * the list (F-3) and the map (F-2), so the two always show the same spots.
 */
export function useExploreSpots({
  filters,
  sort = 'distance',
  latitude = DEFAULT_EXPLORE_ORIGIN.latitude,
  longitude = DEFAULT_EXPLORE_ORIGIN.longitude,
}: UseExploreSpotsOptions = {}) {
  const [spots, setSpots] = useState<ExploreSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  // Compare by value, so a new filters object with the same contents doesn't refetch
  const filtersKey = JSON.stringify(filters ?? {});

  const load = useCallback(async () => {
    // Only the newest request may update state, in case filters change mid-fetch
    const id = ++requestId.current;
    setLoading(true);
    try {
      const params = {
        latitude,
        longitude,
        radiusMeters: EXPLORE_RADIUS_METERS,
        filters: JSON.parse(filtersKey) as ExploreFilters,
        sort,
      };
      // Mock or live data, switched in one place by USE_MOCK_DATA in exploreSource
      const result = await getExploreSpots(params);
      if (id !== requestId.current) return;
      setSpots(result);
      setError(null);
    } catch {
      if (id !== requestId.current) return;
      setError("Couldn't load spots. Check your connection and try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [filtersKey, sort, latitude, longitude]);

  useEffect(() => {
    load();
  }, [load]);

  return { spots, loading, error, refresh: load };
}

/** True when any Explore filter is on. */
export function hasActiveFilters(filters?: ExploreFilters): boolean {
  if (!filters) return false;
  return Boolean(
    filters.quiet ||
      filters.groupStudy ||
      filters.chargers ||
      filters.locationTypes?.length ||
      filters.priceRangeIds?.length,
  );
}
