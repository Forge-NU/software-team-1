import { router, Stack } from 'expo-router';

import { sheetCloseOptions } from '@/components/SheetCloseButton';
import { useFilters } from '@/context/FiltersContext';
import { NU_CAMPUS } from '@/lib/exploreSource';
import FiltersScreen from '@/screens/FiltersScreen';

// Filters sheet: opened from Explore. "Show results" applies and closes;
// the X (or Android back) closes without applying, since edits stay local to the sheet.
export default function FiltersRoute() {
  const { filters, applyFilters } = useFilters();

  return (
    <>
      <Stack.Screen options={{ title: 'Filters', ...sheetCloseOptions(() => router.back()) }} />
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
