import { Stack } from 'expo-router';

import { CheckInProvider } from '@/context/CheckInContext';
import { stackScreenOptions } from '@/theme/navigation';

// Check in: search → photo → details → done, one stack screen per step, so the native back
// button and swipe-back move between steps. Answers live in CheckInProvider, so going back
// or switching tabs keeps them. Photo and details have a Cancel button in the header.
export default function CheckInLayout() {
  return (
    <CheckInProvider>
      <Stack screenOptions={{ ...stackScreenOptions, headerShown: true }}>
        <Stack.Screen name="index" options={{ title: 'Check in' }} />
        <Stack.Screen name="photo" options={{ title: 'Photo' }} />
        <Stack.Screen name="details" options={{ title: 'Conditions' }} />
        {/* Already posted, so there's nothing to go back to */}
        <Stack.Screen
          name="done"
          options={{ title: 'Update posted', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack>
    </CheckInProvider>
  );
}
