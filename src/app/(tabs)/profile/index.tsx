import { useRouter } from 'expo-router';

import { spotHref } from '@/navigation/SpotRoutes';
import ProfileScreen from '@/screens/ProfileScreen';

export default function ProfileRoute() {
  const router = useRouter();

  return (
    <ProfileScreen
      onOpenSpot={(locationId) => router.push(spotHref('/profile', locationId))}
      onOpenSettings={() => router.push('/profile/settings')}
      onOpenPreferences={() => router.push('/profile/preferences')}
      onFindSpot={() => router.navigate('/')}
      // Signing out ends the session; the auth gate in app/_layout.tsx then shows sign in
      onSignedOut={() => {}}
    />
  );
}
