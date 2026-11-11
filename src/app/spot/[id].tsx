import { useLocalSearchParams, useRouter } from 'expo-router';

import { openDirections } from '@/lib/openDirections';
import SpotDetailScreen from '@/screens/SpotDetailScreen';

// Open a spot from anywhere with:
//   router.push({ pathname: '/spot/[id]', params: { id: String(locationId) } })
export default function SpotRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const locationId = Number(id);

  return (
    <SpotDetailScreen
      locationId={locationId}
      onBack={router.back}
      onSeeAllPhotos={() =>
        router.push({ pathname: '/spot/photos/[id]', params: { id: String(locationId) } })
      }
      // Check in skips search and starts at this spot, showing its name
      onCheckIn={(_, name) =>
        router.navigate({ pathname: '/check-in', params: { locationId: String(locationId), name } })
      }
      onGetDirections={(location) => openDirections(location.latitude, location.longitude)}
    />
  );
}
