import { useRouter } from 'expo-router';

import { spotHref } from '@/navigation/SpotRoutes';
import SavedScreen from '@/screens/SavedScreen';

export default function SavedRoute() {
  const router = useRouter();

  return (
    <SavedScreen
      onOpenSpot={(id) => router.push(spotHref('/saved', id))}
      onFindSpots={() => router.navigate('/')}
    />
  );
}
