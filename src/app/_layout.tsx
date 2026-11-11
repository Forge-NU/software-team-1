
import '../../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { getFocusedRouteNameFromRoute } from 'expo-router/react-navigation';
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
import { tabTitle } from '@/lib/tabs';
import { stackScreenOptions } from '@/theme/navigation';

// Keep the splash screen up until the fonts and saved session are ready
SplashScreen.preventAutoHideAsync();

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
  const { isSignedIn, isLoading } = useAuth();
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
    // Pushed screens use the native header, which adds the back button only when there is
    // somewhere to go back to (not after a deep link). Each tab has its own stack and header
    // (see app/(tabs)/*/_layout.tsx); auth keeps its TopBar.
    // A screen adds header buttons with <Stack.Screen options={{ headerRight }} />.
    <Stack screenOptions={{ ...stackScreenOptions, headerShown: false }}>
      {/* B-13: Authentication links and password reset */}
      {/* Accessible regardless of sign-in status */}
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="reset-password" />

      {/* Screens for signed-in users. Signed-out users see the welcome carousel once (F-8), then sign up */}
      <Stack.Protected guard={isSignedIn} redirectTo={welcomeSeen ? '/sign-up' : '/welcome'}>
        <Stack.Screen
          name="(tabs)"
          // Named after the open tab, so a pushed screen's back menu says e.g. "Profile"
          options={({ route }) => ({ title: tabTitle(getFocusedRouteNameFromRoute(route)) })}
        />
        <Stack.Screen name="spot/[id]" options={{ headerShown: true, title: 'Spot detail' }} />
        <Stack.Screen name="spot/photos/[id]" options={{ headerShown: true, title: 'Recent photos' }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
        <Stack.Screen name="preferences" options={{ headerShown: true, title: 'Study preferences' }} />
        <Stack.Screen name="filters" options={{ headerShown: true, title: 'Filters' }} />
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
