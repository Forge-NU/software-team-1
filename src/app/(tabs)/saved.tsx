import { useRouter } from 'expo-router';

import SavedScreen from '@/screens/SavedScreen';

export default function SavedRoute() {
  const router = useRouter();

  return (
    <SavedScreen
      onOpenSpot={(id) => router.push({ pathname: '/spot/[id]', params: { id: String(id) } })}
      onFindSpots={() => router.navigate('/')}
    />
  );
}
