import { useLocalSearchParams, useRouter } from 'expo-router';

import PhotoGalleryScreen from '@/screens/PhotoGalleryScreen';

export default function SpotPhotosRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PhotoGalleryScreen locationId={Number(id)} onBack={router.back} />;
}
