import { useState } from 'react';
import { useRouter } from 'expo-router';

import { markLocationPromptSeen, requestLocationPermission } from '@/lib/locationPermisson';
import LocationPermissionScreen from '@/screens/LocationPermissionScreen';

export default function LocationPermissionRoute() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  const close = () => {
    markLocationPromptSeen();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const onNext = async () => {
    setRequesting(true);
    try {
      await requestLocationPermission();
    } finally {
      close();
    }
  };

  return <LocationPermissionScreen onNext={onNext} onSkip={close} requesting={requesting} />;
}
