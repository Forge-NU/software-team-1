import { Stack } from 'expo-router';

import { TabStack } from '@/components/TabStack';

export default function ExploreLayout() {
  return (
    <TabStack title="Explore">
      {/* Filters opens as a sheet. Swipe-down is off so the only ways out are the
          close button (discard) and "Show results" (apply). Android's back button
          still closes it, which also discards. */}
      <Stack.Screen
        name="filters"
        options={{ presentation: 'modal', gestureEnabled: false, headerBackVisible: false }}
      />
    </TabStack>
  );
}
