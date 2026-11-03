import { Stack } from 'expo-router';

// Signed-out users land on sign up. F-8 adds the first-launch welcome carousel in front of it.
export const unstable_settings = { initialRouteName: 'sign-up' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
