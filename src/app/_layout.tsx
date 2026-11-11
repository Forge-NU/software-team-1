
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

  const [fontsLoaded, fontError] = useFonts({
    Afacad_400Regular,
    Afacad_500Medium,
    Afacad_600SemiBold,
    Afacad_700Bold,
  });

  const ready =
    !isLoading && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      {/* B-13: Authentication links and password reset */}
      {/* Accessible regardless of sign-in status */}
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="reset-password" />

      {/* Screens for signed-in users */}
      <Stack.Protected
        guard={isSignedIn}
        redirectTo="/sign-up"
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="spot/[id]" />
        <Stack.Screen name="spot/photos/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="filters" />
      </Stack.Protected>

      {/* Screens for signed-out users */}
      <Stack.Protected
        guard={!isSignedIn}
        redirectTo="/"
      >
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
