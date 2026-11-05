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
import { ProfileProvider } from '@/context/ProfileContext';
import { useWelcomeSeen } from '@/lib/onboarding';
import { colors } from '@/theme';

// Keep the splash screen up until the fonts and the saved session are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <RootNavigator />
        <StatusBar style="dark" />
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
  // If the fonts fail to load, carry on with the system font rather than hang on the splash
  const ready = !isLoading && welcomeSeen !== null && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  // Auth gate: a screen inside a guard that is false can't be opened, not even by a deep link.
  // Signing in or out flips the guards, and Expo Router sends the user to that guard's `redirectTo`.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      {/* Signed-out users see the welcome carousel once (F-8), then sign up */}
      <Stack.Protected guard={isSignedIn} redirectTo={welcomeSeen ? '/sign-up' : '/welcome'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="spot/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="preferences" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
