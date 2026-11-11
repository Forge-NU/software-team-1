import { SpotDetailRoute } from '@/navigation/SpotRoutes';

// /profile/spot/[id], shared with the other tabs (see src/navigation/SpotRoutes.tsx)
export default function ProfileSpotRoute() {
  return <SpotDetailRoute base="/profile" />;
}
