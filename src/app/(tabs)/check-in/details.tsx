import { Stack, useRouter } from 'expo-router';

import HeaderTextButton from '@/components/HeaderTextButton';
import { useCheckIn } from '@/context/CheckInContext';
import DetailsStep from '@/screens/checkIn/DetailsStep';
import { useCancelCheckIn } from '@/screens/checkIn/useLeaveCheckIn';

export default function CheckInDetailsRoute() {
  const router = useRouter();
  const checkIn = useCheckIn();
  const cancel = useCancelCheckIn();
  const { spot, photo, submitting } = checkIn;

  return (
    <>
      <Stack.Screen
        options={{
          // No leaving mid-upload
          headerBackVisible: !submitting,
          gestureEnabled: !submitting,
          headerRight: () => (submitting ? null : <HeaderTextButton label="Cancel" onPress={cancel} />),
        }}
      />
      {/* No answers while the flow is being reset and this screen pops away */}
      {spot && photo && (
        <DetailsStep
          spotName={spot.name}
          photo={photo}
          crowding={checkIn.crowding}
          noise={checkIn.noise}
          outlets={checkIn.outlets}
          note={checkIn.note}
          onCrowding={checkIn.setCrowding}
          onNoise={checkIn.setNoise}
          onOutlets={checkIn.setOutlets}
          onNote={checkIn.setNote}
          // The photo step is right below this one
          onRetake={() => router.back()}
          onSubmit={async () => {
            if (await checkIn.submit()) router.push('/check-in/done');
          }}
          submitting={submitting}
          progress={checkIn.progress}
          submitError={checkIn.submitError}
        />
      )}
    </>
  );
}
