import { useRouter } from 'expo-router';

import { useCheckIn } from '@/context/CheckInContext';
import { useProfile } from '@/context/ProfileContext';
import ConfirmationStep from '@/screens/checkIn/ConfirmationStep';
import { useLeaveCheckIn } from '@/screens/checkIn/useLeaveCheckIn';

export default function CheckInDoneRoute() {
  const router = useRouter();
  const { posted } = useCheckIn();
  const { profile } = useProfile();
  const leave = useLeaveCheckIn();

  // No post while the flow is being reset and this screen pops away
  if (!posted) return null;

  return (
    <ConfirmationStep
      posted={posted}
      displayName={profile?.displayName ?? null}
      onViewSpot={() =>
        leave(() =>
          router.push({ pathname: '/spot/[id]', params: { id: String(posted.location.locationId) } })
        )
      }
      onBackToExplore={() => leave(() => router.navigate('/'))}
    />
  );
}
