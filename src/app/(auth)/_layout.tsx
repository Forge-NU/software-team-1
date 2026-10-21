import { Stack } from 'expo-router';

// Signed-out users land on the welcome screen first
export const unstable_settings = { initialRouteName: 'welcome' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
