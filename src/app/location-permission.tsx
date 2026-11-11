import { useState } from 'react';
import { useRouter } from 'expo-router';

import { requestLocationPermission } from '@/lib/locationPermisson';
import LocationPermissionScreen from '@/screens/LocationPermissionScreen';

export default function LocationPermissionRoute() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

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
