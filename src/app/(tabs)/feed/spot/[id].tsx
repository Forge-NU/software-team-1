import { SpotDetailRoute } from '@/navigation/SpotRoutes';

// /feed/spot/[id], shared with the other tabs (see src/navigation/SpotRoutes.tsx)
export default function FeedSpotRoute() {
  return <SpotDetailRoute base="/feed" />;
}
