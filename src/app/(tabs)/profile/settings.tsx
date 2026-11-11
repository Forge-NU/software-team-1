import { Stack, useRouter } from 'expo-router';

import SettingsScreen from '@/screens/SettingsScreen';

export default function SettingsRoute() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <SettingsScreen onOpenPreferences={() => router.push('/profile/preferences')} />
    </>
  );
}
