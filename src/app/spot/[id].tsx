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
      // F-6 reads locationId to pre-select this spot
      onCheckIn={() => router.navigate({ pathname: '/check-in', params: { locationId: String(locationId) } })}
      onGetDirections={(location) => openDirections(location.latitude, location.longitude)}
    />
  );
}
