import { useRouter } from 'expo-router';

import SettingsScreen from '@/screens/SettingsScreen';

export default function SettingsRoute() {
  const router = useRouter();

  return <SettingsScreen onOpenPreferences={() => router.push('/preferences')} />;
}
