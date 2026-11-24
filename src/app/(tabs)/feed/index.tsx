import { useRouter } from 'expo-router';

import { spotHref } from '@/navigation/SpotRoutes';
import FeedScreen from '@/screens/FeedScreen';

export default function FeedRoute() {
  const router = useRouter();

  return (
    <FeedScreen
      onOpenSpot={(locationId) => router.push(spotHref('/feed', locationId))}
    />
  );
}
