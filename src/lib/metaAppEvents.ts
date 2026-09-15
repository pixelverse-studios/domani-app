import Constants from 'expo-constants'
import {
  getTrackingPermissionsAsync,
  isAvailable as isTrackingTransparencyAvailable,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency'
import { Platform } from 'react-native'
import { Settings } from 'react-native-fbsdk-next'

export type MetaTrackingPermissionResult =
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'not_configured'
  | 'error'

let initializationPromise: Promise<boolean> | null = null

function isMetaAppEventsConfigured() {
  return Constants.expoConfig?.extra?.metaAppEventsConfigured === true
}

async function disableAdvertiserTracking() {
  Settings.setAdvertiserIDCollectionEnabled(false)
  if (Platform.OS === 'ios') {
    await Settings.setAdvertiserTrackingEnabled(false)
  }
}

async function safelyDisableAdvertiserTracking() {
  try {
    await disableAdvertiserTracking()
  } catch (error) {
    console.warn('[Meta App Events] Failed to disable advertiser tracking', error)
  }
}

export function initializeMetaAppEvents() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      if (!isMetaAppEventsConfigured()) return false

      Settings.initializeSDK()
      await disableAdvertiserTracking()
      return true
    })().catch((error) => {
      console.warn('[Meta App Events] SDK initialization failed', error)
      return false
    })
  }

  return initializationPromise
}

export async function requestMetaTrackingPermission(): Promise<MetaTrackingPermissionResult> {
  if (!isMetaAppEventsConfigured()) return 'not_configured'

  const initialized = await initializeMetaAppEvents()
  if (!initialized) return 'error'

  if (Platform.OS !== 'ios' || !isTrackingTransparencyAvailable()) {
    await safelyDisableAdvertiserTracking()
    return 'unavailable'
  }

  try {
    let permission = await getTrackingPermissionsAsync()
    if (permission.status === PermissionStatus.UNDETERMINED) {
      permission = await requestTrackingPermissionsAsync()
    }

    const granted = permission.status === PermissionStatus.GRANTED
    Settings.setAdvertiserIDCollectionEnabled(granted)
    await Settings.setAdvertiserTrackingEnabled(granted)
    return granted ? 'granted' : 'denied'
  } catch (error) {
    await safelyDisableAdvertiserTracking()
    console.warn('[Meta App Events] ATT permission request failed', error)
    return 'error'
  }
}
