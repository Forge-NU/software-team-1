import { router } from 'expo-router';

import ExploreScreen from '@/screens/ExploreScreen';

export default function ExploreRoute() {
  return (
    <ExploreScreen
      onOpenFilters={() => router.push('/filters')}
      onOpenSearch={() => router.push('/search')}
      onOpenSpot={(id) =>
        router.push({
          pathname: '/spot/[id]',
          params: { id: String(id) },
        })
      }
      onOpenSpot={(locationId) => router.push({ pathname: '/spot/[id]', params: { id: String(locationId) } })}
    />
  );
}
