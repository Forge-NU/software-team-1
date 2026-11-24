import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getLocationPermission, type LocationPermission } from '@/lib/locationPermisson';

/**
 * Tracks the user's current location permission.
 *
 * This never prompts for permission (the Location permission screen does that); it only reads
 * what has already been granted. It re-checks when the app returns to the foreground, so turning
 * location on in Settings is picked up without a restart.
 *
 * The position itself comes from the map's own user location dot (``showsUserLocation``), so
 * this hook doesn't read it.
 *
 * @returns The current ``LocationPermission`` (null while the first check is running), and
 * ``refresh`` to re-check on demand (e.g. after calling ``requestLocationPermission``)
 */
export function useLocationPermission(): { permission: LocationPermission | null, refresh: () => Promise<void> } {
  const [permission, setPermission] = useState<LocationPermission | null>(null);

  // Each check gets an id; results from an older check (or after unmount) are ignored
  const latestCheck = useRef(0);

  const refresh = useCallback(async () => {
    const checkId = ++latestCheck.current;
    const result = await getLocationPermission();
    if (checkId === latestCheck.current) setPermission(result);
  }, []);

  useEffect(() => {
    refresh();

    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') refresh();
    });

    return () => {
      subscription.remove();
      // Invalidate any check still in progress so it doesn't set state after unmount
      latestCheck.current++;
    };
  }, [refresh]);

  return { permission, refresh };
}

/** True when the user has granted location access, whether precise or approximate */
export function isLocationGranted(permission: LocationPermission | null): boolean {
  return permission === 'precise' || permission === 'approximate';
}
