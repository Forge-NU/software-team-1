import { Stack } from 'expo-router';

import { TabStack } from '@/components/TabStack';

export default function ExploreLayout() {
  return (
    <TabStack title="Explore">
      {/* No swipe-down, so closing is an explicit discard (X) or apply (Show spots) */}
      <Stack.Screen
        name="filters"
        options={{ presentation: 'modal', gestureEnabled: false, headerBackVisible: false }}
      />
    </TabStack>
  );
}
