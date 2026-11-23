import { useEffect, useState } from 'react';
import * as ExpoLocation from 'expo-location';

import type { Address, Location } from '../types/location';

export type SpotAddressStatus = 'ready' | 'loading' | 'unavailable';

/**
 * The spot's address. Many spots imported from OpenStreetMap have none saved, so for those
 * it's looked up from the coordinates on the device (Apple's or Google's geocoder).
 */
export function useSpotAddress(location: Location | null): {
  address: Address | null;
  status: SpotAddressStatus;
} {
  const saved = location?.address ?? null;
  const [looked, setLooked] = useState<{ address: Address | null; status: SpotAddressStatus }>({
    address: null,
    status: 'loading',
  });

  const needsLookup = location !== null && !saved?.street_one;
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  useEffect(() => {
    if (!needsLookup || latitude === undefined || longitude === undefined) return;
    let cancelled = false;

    setLooked({ address: null, status: 'loading' });
    ExpoLocation.reverseGeocodeAsync({ latitude, longitude })
      .then(([result]) => {
        if (cancelled) return;
        const address = result ? toAddress(result) : null;
        setLooked({ address, status: address ? 'ready' : 'unavailable' });
      })
      // Fails without a connection, and on some Android devices without location permission
      .catch(() => {
        if (!cancelled) setLooked({ address: null, status: 'unavailable' });
      });

    return () => {
      cancelled = true;
    };
  }, [needsLookup, latitude, longitude]);

  if (!location) return { address: null, status: 'loading' };
  if (!needsLookup) return { address: saved, status: 'ready' };
  return looked;
}

function toAddress(result: ExpoLocation.LocationGeocodedAddress): Address | null {
  const street = [result.streetNumber, result.street].filter(Boolean).join(' ') || null;
  if (!street && !result.city) return null;

  return {
    street_one: street,
    street_two: null,
    city: result.city,
    region: result.region,
    postal_code: result.postalCode,
    country_code: result.isoCountryCode,
  };
}
