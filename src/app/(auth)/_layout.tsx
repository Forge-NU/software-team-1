import { Redirect, Stack, useSegments } from 'expo-router';

import { useWelcomeSeen } from '@/lib/onboarding';

// Signed-out users land on sign up. On first launch they see the welcome carousel first (F-8).
export const unstable_settings = { anchor: 'sign-up' };

export default function AuthLayout() {
  const welcomeSeen = useWelcomeSeen();
  const segments = useSegments();

  // Covers every way into this group: app start, signing out, or a link to sign in
  if (welcomeSeen === false && segments.at(-1) !== 'welcome') return <Redirect href="/welcome" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
