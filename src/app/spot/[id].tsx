import { useLocalSearchParams, useRouter } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

// Open a spot from anywhere with:
//   router.push({ pathname: '/spot/[id]', params: { id: String(locationId) } })
// F-5 replaces this file's contents with the Spot Detail screen.
export default function SpotRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PlaceholderScreen title={`Spot ${id}`} ticket="F-5" onBack={router.back} />;
}
