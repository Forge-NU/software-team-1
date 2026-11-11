import { useRouter } from 'expo-router';

import FeedScreen from '@/screens/FeedScreen';

export default function FeedRoute() {
  const router = useRouter();

  return (
    <FeedScreen
      onOpenSpot={(locationId) => router.push({ pathname: '/spot/[id]', params: { id: String(locationId) } })}
    />
  );
}
