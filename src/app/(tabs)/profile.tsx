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
      onSignedOut={() => router.navigate('/')}
    />
  );
}
