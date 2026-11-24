import { SpotDetailRoute } from '@/navigation/SpotRoutes';

// /saved/spot/[id], shared with the other tabs (see src/navigation/SpotRoutes.tsx)
export default function SavedSpotRoute() {
  return <SpotDetailRoute base="/saved" />;
}
