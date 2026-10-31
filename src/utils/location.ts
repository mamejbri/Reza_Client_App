import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

import { translate } from '../i18n/LocaleProvider';

export type Coords = { lat: number; lng: number };

/** Android asks at runtime; iOS shows its own prompt on the first position request. */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
    title: translate('search.locationTitle'),
    message: translate('search.locationMessage'),
    buttonPositive: translate('common.ok'),
    buttonNegative: translate('common.cancel'),
  });
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function getCurrentCoords(): Promise<Coords> {
  return new Promise((resolve, reject) =>
    Geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
  );
}
