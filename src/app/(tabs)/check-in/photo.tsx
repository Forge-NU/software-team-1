import { Stack, useRouter } from 'expo-router';

import HeaderTextButton from '@/components/HeaderTextButton';
import { useCheckIn } from '@/context/CheckInContext';
import PhotoStep from '@/screens/checkIn/PhotoStep';
import { useCancelCheckIn } from '@/screens/checkIn/useLeaveCheckIn';

export default function CheckInPhotoRoute() {
  const router = useRouter();
  const { spot, setPhoto } = useCheckIn();
  const cancel = useCancelCheckIn();

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <HeaderTextButton label="Cancel" onPress={cancel} /> }} />
      {/* No spot while the flow is being reset and this screen pops away */}
      {spot && (
        <PhotoStep
          spotName={spot.name}
          onPhoto={(photo) => {
            setPhoto(photo);
            router.push('/check-in/details');
          }}
        />
      )}
    </>
  );
}
