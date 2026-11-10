import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';

export const MAP_CHOICE_KEY ='preferredMapApp';

// Opens walking directions to a spot in a map app.
export async function openDirections(latitude: number, longitude: number) {
  const appleUrl = `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=w`;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;

  if (Platform.OS === 'ios') {
  // IOS: First use prompts the user if they'd want Apple Maps or Google Maps directions, 
  // and then all future uses will open in the preferred app 
    const saved = await AsyncStorage.getItem(MAP_CHOICE_KEY).catch(() => null);
    if (saved === 'apple') return Linking.openURL(appleUrl);
    if (saved === 'google') return Linking.openURL(googleUrl);

    const choose = (choice: 'apple' | 'google') => {
      AsyncStorage.setItem(MAP_CHOICE_KEY, choice).catch(() => {});
      return Linking.openURL(choice === 'apple' ? appleUrl : googleUrl);
    };

    Alert.alert('Get directions', 'Choose a default map app', [
      { text: 'Apple Maps', onPress: () => choose('apple') },
      { text: 'Google Maps', onPress: () => choose('google') },
      { text: 'Cancel', style: 'cancel' },
    ]);
    return;
  }

  //Android: a geo: link opens the user's default map app
  return Linking.openURL(
    Platform.OS === 'android' ? `geo:0,0?q=${latitude},${longitude}` : googleUrl,
  );
}
