import { router, Stack } from 'expo-router';

import { spotHref } from '@/navigation/SpotRoutes';
import ExploreScreen from '@/screens/ExploreScreen';

export default function ExploreRoute() {
  return (
    <>
      {/* No header: the map fills the screen, and search and Filters live in the results sheet */}
      <Stack.Screen options={{ headerShown: false }} />
      <ExploreScreen
        onOpenSearch={() => router.push('/search')}
        onOpenFilters={() => router.push('/filters')}
        onOpenSpot={(id) => router.push(spotHref('', id))}
      />
    </>
  );
}
