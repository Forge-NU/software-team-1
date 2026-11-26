import { router, Stack } from 'expo-router';

import HeaderFilterButton from '@/components/HeaderFilterButton';
import { useFilters } from '@/context/FiltersContext';
import { spotHref } from '@/navigation/SpotRoutes';
import ExploreScreen from '@/screens/ExploreScreen';

export default function ExploreRoute() {
  const { activeChips } = useFilters();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderFilterButton
              activeCount={activeChips.length}
              onPress={() => router.push('/filters')}
            />
          ),
        }}
      />
      <ExploreScreen
        onOpenSearch={() => router.push('/search')}
        onOpenSpot={(id) => router.push(spotHref('', id))}
      />
    </>
  );
}
