import { SpotDetailRoute } from '@/navigation/SpotRoutes';

// /check-in/spot/[id], shared with the other tabs (see src/navigation/SpotRoutes.tsx)
export default function CheckInSpotRoute() {
  return <SpotDetailRoute base="/check-in" />;
}
