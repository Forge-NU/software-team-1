import * as ExpoLocation from 'expo-location'
import { Linking } from 'react-native'

/**
 * The type of location permission that the user has granted to the app. This can be one of the following:
 * - 'precise': The user has granted precise location permission
 * - 'approximate': The user has granted approximate location permission, and therefore is only in the general area
 * - 'denied': The user has denied location permission, but can be prompted to grant it
 * - 'blocked': The user has blocked location permission, and will need to go to settings to enable it
 */
export type LocationPermission = 'precise' | 'approximate' | 'denied' | 'blocked'

/**
 * Converts an Expo Location permission response to a LocationPermission type
 * 
 * @param status The Expo Location permission response
 * 
 * @returns The corresponding ``LocationPermission`` type
 */
function toLocationPermission(status: ExpoLocation.LocationPermissionResponse): LocationPermission {
    if (status.granted) {
        const aproximate = status.ios?.accuracy === 'reduced' || status.android?.accuracy === 'coarse'
        return aproximate ? 'precise' : 'approximate'
    }
    // NOTE: Android, a user can be asked up to 2 times before blocked, iOS is only once
    return status.canAskAgain ? 'denied' : 'blocked'
}

/** 
 * Checks the current status of location permissions
 * 
 * @returns The current ``LocationPermission``
 */
export async function getLocationPermission(): Promise<LocationPermission> {
  return toLocationPermission(await ExpoLocation.getForegroundPermissionsAsync())
}

/**
 * Prompts the user to grant location permission if the OS will allow it
 * 
 * @returns The current ``LocationPermission`` after the prompt
 */
export async function requestLocationPermission(): Promise<LocationPermission> {
  const current = await ExpoLocation.getForegroundPermissionsAsync()
  if (current.granted || !current.canAskAgain) return toLocationPermission(current)
  return toLocationPermission(await ExpoLocation.requestForegroundPermissionsAsync())
}

/**
 * Opens the settings app, allowing the user to manually change location permissions
 */
export function openAppSettings(): Promise<void> {
  return Linking.openSettings()
}
