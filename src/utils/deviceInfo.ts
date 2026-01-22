import { Platform, Dimensions } from 'react-native'

// Dynamic imports with try/catch for native modules that may not be available
let Device: typeof import('expo-device') | null = null
let Application: typeof import('expo-application') | null = null

try {
   
  Device = require('expo-device')
} catch {
  // expo-device not available (e.g., Expo Go)
}

try {
   
  Application = require('expo-application')
} catch {
  // expo-application not available (e.g., Expo Go)
}

export interface DeviceMetadata {
  platform: 'ios' | 'android'
  os_version: string
  device_brand: string | null
  device_model: string | null
  app_version: string | null
  app_build: string | null
  screen_width: number
  screen_height: number
}

/**
 * Collect device and app metadata for support requests and feedback
 * Does NOT include device name (PII) - only technical metadata
 * Returns fallback values when native modules unavailable
 */
export function getDeviceMetadata(): DeviceMetadata {
  const { width, height } = Dimensions.get('window')

  return {
    platform: Platform.OS as 'ios' | 'android',
    os_version: String(Platform.Version),
    device_brand: Device?.brand ?? null,
    device_model: Device?.modelName ?? null,
    app_version: Application?.nativeApplicationVersion ?? null,
    app_build: Application?.nativeBuildVersion ?? null,
    screen_width: Math.round(width),
    screen_height: Math.round(height),
  }
}
