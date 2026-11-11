import { router, Stack } from 'expo-router';

import { useFilters } from '@/context/FiltersContext';
import { NU_CAMPUS } from '@/lib/exploreSource';
import FiltersScreen from '@/screens/FiltersScreen';

// Filters route: opened from Explore, closes after "Show results".
export default function FiltersRoute() {
  const { filters, applyFilters } = useFilters();

  return (
    <>
      <Stack.Screen options={{ title: 'Filters' }} />
      <FiltersScreen
        initialFilters={filters}
        latitude={NU_CAMPUS.latitude}
        longitude={NU_CAMPUS.longitude}
        onApply={(next) => {
          applyFilters(next);
          router.back();
        }}
      />
    </>
  );
}
