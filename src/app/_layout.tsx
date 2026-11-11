
import '../../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  Afacad_400Regular,
  Afacad_500Medium,
  Afacad_600SemiBold,
  Afacad_700Bold,
  useFonts,
} from '@expo-google-fonts/afacad';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FiltersProvider } from '@/context/FiltersContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { useWelcomeSeen } from '@/lib/onboarding';
import { stackScreenOptions } from '@/theme/navigation';

// Keep the splash screen up until the fonts and saved session are ready
SplashScreen.preventAutoHideAsync();

// Dev only: EXPO_PUBLIC_DEV_SKIP_AUTH=true in .env opens the tabs without signing in, for working
// on screens that run on mock data. __DEV__ is false in real builds, so this can never ship.
const DEV_SKIP_AUTH = __DEV__ && process.env.EXPO_PUBLIC_DEV_SKIP_AUTH === 'true';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <FiltersProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </FiltersProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { isSignedIn: hasSession, isLoading } = useAuth();
  const isSignedIn = hasSession || DEV_SKIP_AUTH;
  const welcomeSeen = useWelcomeSeen();

  const [fontsLoaded, fontError] = useFonts({
    Afacad_400Regular,
    Afacad_500Medium,
    Afacad_600SemiBold,
    Afacad_700Bold,
  });

  const ready =
    !isLoading && welcomeSeen !== null && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    // Every signed-in screen lives in a tab's own stack (app/(tabs)/*/_layout.tsx), so the tab bar
    // stays visible and the native header adds the back button. Only full-screen flows with no tab
    // bar (auth, password reset, onboarding) are here. Auth keeps its TopBar.
    <Stack screenOptions={{ ...stackScreenOptions, headerShown: false }}>
      {/* B-13: Authentication links and password reset */}
      {/* Accessible regardless of sign-in status */}
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="reset-password" />

      {/* Screens for signed-in users. Signed-out users see the welcome carousel once (F-8), then sign up */}
      <Stack.Protected guard={isSignedIn} redirectTo={welcomeSeen ? '/sign-up' : '/welcome'}>
        <Stack.Screen name="(tabs)" />
        {/* Onboarding step after sign up, under the location prompt. Skip or Save leaves it.
            From Settings, the same screen opens inside the Profile tab instead. */}
        <Stack.Screen
          name="preferences"
          options={{ headerShown: true, title: 'Study preferences', headerBackVisible: false, gestureEnabled: false }}
        />
        {/* Full-screen prompt with its own buttons, so no header or swipe-back */}
        <Stack.Screen name="location-permission" options={{ gestureEnabled: false }} />
      </Stack.Protected>

      {/* Screens for signed-out users */}
      <Stack.Protected guard={!isSignedIn} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
