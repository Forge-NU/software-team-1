import { useRouter } from 'expo-router';

import ExploreScreen from '@/screens/ExploreScreen';

export default function ExploreRoute() {
  const router = useRouter();

  return (
    <ExploreScreen
      onOpenSpot={(locationId) => router.push({ pathname: '/spot/[id]', params: { id: String(locationId) } })}
    />
  );
}
