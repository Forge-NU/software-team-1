import '../../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  useFonts,
} from '@expo-google-fonts/outfit';

import { AuthProvider } from '@/providers/AuthProvider';
import { useAuth } from '@/providers/auth-context';
import { colors } from '@/theme/tokens';

// Keep the splash screen up until fonts and the saved session are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { isSignedIn, isLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  // If fonts fail to load, carry on with the system font rather than hang on the splash
  const ready = !isLoading && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  // AUTH GATE: screens inside a guard that's false can't be reached, even by deep link.
  // Signing in/out flips the guards and Expo Router moves the user automatically.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface.canvas },
      }}
    >
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="spot/[id]"
          options={{
            headerShown: true,
            title: '',
            headerBackTitle: 'Back',
            headerTintColor: colors.primary.DEFAULT,
            headerTitleStyle: { fontFamily: 'Outfit_500Medium', color: colors.ink.DEFAULT },
          }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
