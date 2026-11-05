import { router } from 'expo-router';

import ExploreScreen from '@/screens/ExploreScreen';

export default function ExploreRoute() {
  return (
    <ExploreScreen
      onOpenFilters={() => router.push('/filters')}
      onOpenSpot={(id) =>
        router.push({ pathname: '/spot/[id]', params: { id: String(id) } })
      }
    />
  );
}