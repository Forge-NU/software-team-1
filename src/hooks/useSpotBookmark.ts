import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { isSpotSaved, saveSpot, unsaveSpot } from '@/lib/savedSpots';

// Mangages if a one spot is saved. The toggle is for updates and will cancel if the request fails.
export function useSpotBookmark(locationId: number) {
  // Null until we know, so the button doesn't flash the wrong state.
  const [saved, setSaved] = useState<boolean | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    isSpotSaved(locationId)
      .then((value) => !cancelled && setSaved(value))
      .catch((e) => console.error('Could not check if spot is saved:', e));
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  async function toggle() {
    // Ignore taps while a request is in progress 
    if (saved === null || pending.current) return;
    pending.current = true;
    const previous = saved;
    setSaved(!previous);

    try {
      await (previous ? unsaveSpot : saveSpot)(locationId);
    } catch (e) {
      console.error('Could not update saved spot:', e);
      setSaved(previous);
      Alert.alert(previous ? 'Could not remove spot' : 'Could not save spot', 'Please try again.');
    } finally {
      pending.current = false;
    }
  }

  return { saved, toggle };
}
