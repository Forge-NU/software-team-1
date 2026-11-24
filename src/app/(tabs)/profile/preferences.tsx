import { Stack } from 'expo-router';

import PreferencesScreen from '@/screens/PreferencesScreen';

// From Settings, inside the Profile tab. After sign up it opens full screen instead (app/preferences.tsx).
export default function ProfilePreferencesRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Study preferences' }} />
      <PreferencesScreen />
    </>
  );
}
