import { useLocalSearchParams, useRouter } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { getMockLocation } from '@/mocks';

// Open a spot from anywhere with:
//   router.push({ pathname: '/spot/[id]', params: { id: String(locationId) } })
// F-5 replaces this file's contents with the Spot Detail screen.
export default function SpotRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const spot = getMockLocation(Number(id));

  return <PlaceholderScreen title={spot?.name ?? `Spot ${id}`} ticket="F-5" onBack={router.back} />;
}
