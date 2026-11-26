import { router, Stack } from 'expo-router';

import { sheetCloseOptions } from '@/components/SheetCloseButton';
import { useFilters } from '@/context/FiltersContext';
import FiltersScreen from '@/screens/FiltersScreen';

export default function FiltersRoute() {
  const { filters, applyFilters } = useFilters();

  return (
    <>
      <Stack.Screen options={{ title: 'Filters', ...sheetCloseOptions(() => router.back()) }} />
      <FiltersScreen
        initialFilters={filters}
        onApply={(next) => {
          applyFilters(next);
          router.back();
        }}
      />
    </>
  );
}
