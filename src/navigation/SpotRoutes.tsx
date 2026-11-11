import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { openDirections } from '@/lib/openDirections';
import PhotoGalleryScreen from '@/screens/PhotoGalleryScreen';
import SpotDetailScreen from '@/screens/SpotDetailScreen';

/**
 * Spot detail and its photos, shared by every tab that opens a spot, so the spot is
 * pushed in the tab you're in and the tab bar stays visible. Each tab's stack has thin
 * route files (spot/[id].tsx, spot/photos/[id].tsx) that render these with its `base`.
 */
export type TabBase = '' | '/feed' | '/saved' | '/check-in' | '/profile';

/** Path to a spot inside a tab, e.g. spotHref('/profile', 3) → "/profile/spot/3". */
export function spotHref(base: TabBase, locationId: number) {
  return `${base}/spot/${locationId}` as const;
}

export function SpotDetailRoute({ base }: { base: TabBase }) {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const locationId = Number(id);

  return (
    <>
      <Stack.Screen options={{ title: 'Spot detail' }} />
      <SpotDetailScreen
        locationId={locationId}
        onBack={router.back}
        onSeeAllPhotos={() => router.push(`${base}/spot/photos/${locationId}`)}
        // Check in skips search and starts at this spot, showing its name
        onCheckIn={(_, name) =>
          router.navigate({ pathname: '/check-in', params: { locationId: String(locationId), name } })
        }
        onGetDirections={(location) => openDirections(location.latitude, location.longitude)}
      />
    </>
  );
}

export function SpotPhotosRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Recent photos' }} />
      <PhotoGalleryScreen locationId={Number(id)} onBack={router.back} />
    </>
  );
}
