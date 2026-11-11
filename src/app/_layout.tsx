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
import { colors } from '@/theme';

// Keep the splash screen up until the fonts and the saved session are ready
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
  const [fontsLoaded, fontError] = useFonts({
    Afacad_400Regular,
    Afacad_500Medium,
    Afacad_600SemiBold,
    Afacad_700Bold,
  });
  // If the fonts fail to load, carry on with the system font rather than hang on the splash
  const ready = !isLoading && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  // Auth gate: a screen inside a guard that is false can't be opened, not even by a deep link.
  // Signing in or out flips the guards, and Expo Router sends the user to that guard's `redirectTo`.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={isSignedIn} redirectTo="/sign-up">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="spot/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="filters" />
        <Stack.Screen name="search" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}