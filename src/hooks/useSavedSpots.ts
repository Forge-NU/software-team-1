import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getSearchOrigin } from '@/lib/checkIn';
import { distanceMeters } from '@/lib/exploreRanking';
import { listSavedSpots, type SavedSpot } from '@/lib/savedSpots';

type SavedSpotWithDistance = SavedSpot & { distance_meters: number };

// The user's saved spots, it reloads whenever the tab is focused, so a save or unsave made on Spot Detail shows instantly
export function useSavedSpots() {
  const [spots, setSpots] = useState<SavedSpotWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // The saved list has no distance, so measure it from the user (or the campus fallback)
      const [saved, origin] = await Promise.all([listSavedSpots(), getSearchOrigin()]);
      setSpots(
        saved.map((spot) => ({
          ...spot,
          distance_meters: distanceMeters(origin.latitude, origin.longitude, spot.latitude, spot.longitude),
        })),
      );
      setError(null);
    } catch (e) {
      console.error('Could not load saved spots:', e);
      setError("Couldn't load your saved spots. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { spots, loading, error, refresh: load };
}
