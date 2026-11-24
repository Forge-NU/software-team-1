import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCheckIn } from '@/context/CheckInContext';
import SearchStep from '@/screens/checkIn/SearchStep';

// Open a check-in for a specific spot (skipping search) with:
//   router.navigate({ pathname: '/check-in', params: { locationId: String(id), name } })
export default function CheckInSearchRoute() {
  const router = useRouter();
  const { chooseSpot, startAt } = useCheckIn();
  const { locationId, name } = useLocalSearchParams<{ locationId?: string; name?: string }>();

  useEffect(() => {
    if (!locationId) return;
    startAt({ locationId: Number(locationId), name: name ?? 'This spot', seatingId: null });
    // Clear the params so coming back to search doesn't start over
    router.setParams({ locationId: undefined, name: undefined });
    router.push('/check-in/photo');
  }, [locationId, name, router, startAt]);

  return (
    <SearchStep
      onPick={(spot) => {
        chooseSpot(spot);
        router.push('/check-in/photo');
      }}
    />
  );
}
