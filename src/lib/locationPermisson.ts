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
 * @returns The corresponding LocationPermission type
 */
function toLocationPermission(status: ExpoLocation.LocationPermissionResponse): LocationPermission {
    if (status.granted) {
        const aproximate = status.ios?.accuracy === 'reduced' || status.android?.accuracy === 'coarse'
        return aproximate ? 'precise' : 'approximate'
    }
    // NOTE: Android, a user can be asked up to 2 times before blocked, iOS is only once
    return status.canAskAgain ? 'denied' : 'blocked'
}

