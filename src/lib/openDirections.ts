import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';

import type { Location } from '../types/location';
import { formatAddress } from './spot';

export const MAP_CHOICE_KEY ='preferredMapApp';

export type DirectionsDestination = Pick<
  Location,
  'name' | 'latitude' | 'longitude' | 'address' | 'google_place_id'
>;

/**
 * Map links for a spot. Coordinates alone make the map app label the pin with the
 * surrounding area (e.g. "Downtown Crossing" instead of the cafe), so we send the
 * spot's name and street address when we have them, plus Google's place id.
 */
export function directionsUrls(spot: DirectionsDestination) {
  const coords = `${spot.latitude},${spot.longitude}`;
  const address = formatAddress(spot.address)?.full;
  const query = address ? `${spot.name}, ${address}` : null;
  const encode = encodeURIComponent;

  // sll biases Apple's search toward the spot, so a common name finds this branch
  const apple = query
    ? `http://maps.apple.com/?daddr=${encode(query)}&sll=${coords}&dirflg=w`
    : `http://maps.apple.com/?daddr=${coords}&dirflg=w`;

  // Without an address, coordinates are more reliable than searching the name alone
  const google =
    'https://www.google.com/maps/dir/?api=1' +
    `&destination=${encode(query ?? coords)}` +
    (spot.google_place_id ? `&destination_place_id=${encode(spot.google_place_id)}` : '') +
    '&travelmode=walking';

  // The pin stays on the exact coordinates, labeled with the spot's name
  const geo = `geo:0,0?q=${coords}(${encode(spot.name)})`;

  return { apple, google, geo };
}

// Opens walking directions to a spot in a map app.
export async function openDirections(spot: DirectionsDestination) {
  const { apple: appleUrl, google: googleUrl, geo: geoUrl } = directionsUrls(spot);

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
  return Linking.openURL(Platform.OS === 'android' ? geoUrl : googleUrl);
}
