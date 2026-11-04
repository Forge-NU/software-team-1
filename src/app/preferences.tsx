import { useRouter } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function PreferencesRoute() {
  const router = useRouter();

  return <PlaceholderScreen title="Study preferences" ticket="F-8" onBack={router.back} />;
}
