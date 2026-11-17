import type { ReactNode } from 'react';
import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme/navigation';

/**
 * A tab's own stack, so its root screen gets the native header (Liquid Glass on iOS 26).
 * Use it as the tab folder's _layout.tsx; the folder's index.tsx is the tab's screen.
 * Pass extra <Stack.Screen> entries as children to give other screens options, e.g. a sheet.
 */
export function TabStack({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerShown: true }}>
      <Stack.Screen name="index" options={{ title }} />
      {children}
    </Stack>
  );
}
