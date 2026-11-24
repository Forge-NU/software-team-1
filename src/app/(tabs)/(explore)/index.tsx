import { router } from 'expo-router';

import { spotHref } from '@/navigation/SpotRoutes';
import ExploreScreen from '@/screens/ExploreScreen';

export default function ExploreRoute() {
  return (
    <ExploreScreen
      onOpenFilters={() => router.push('/filters')}
      onOpenSearch={() => router.push('/search')}
      onOpenSpot={(id) => router.push(spotHref('', id))}
    />
  );
}
