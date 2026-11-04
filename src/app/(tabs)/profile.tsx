import { useRouter } from 'expo-router';

import ProfileScreen from '@/screens/ProfileScreen';

export default function ProfileRoute() {
  const router = useRouter();

  return (
    <ProfileScreen
      onOpenSpot={(locationId) => router.push({ pathname: '/spot/[id]', params: { id: String(locationId) } })}
      onOpenSettings={() => router.push('/settings')}
      onOpenPreferences={() => router.push('/preferences')}
      onFindSpot={() => router.navigate('/')}
      // Signing out ends the session; the auth gate in app/_layout.tsx then shows sign in
      onSignedOut={() => {}}
    />
  );
}
