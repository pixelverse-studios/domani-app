jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { metaAppEventsConfigured: true },
    },
  },
}))

import { Platform } from 'react-native'

type MetaAppEventsModule = typeof import('../metaAppEvents')

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  })
}

function loadModule() {
  let metaAppEvents: MetaAppEventsModule | undefined
  let fbsdk: typeof import('react-native-fbsdk-next') | undefined
  let trackingTransparency: typeof import('expo-tracking-transparency') | undefined

  jest.isolateModules(() => {
    fbsdk = require('react-native-fbsdk-next')
    trackingTransparency = require('expo-tracking-transparency')
    metaAppEvents = require('../metaAppEvents')
  })

  return {
    metaAppEvents: metaAppEvents!,
    Settings: fbsdk!.Settings,
    trackingTransparency: trackingTransparency!,
  }
}

describe('Meta App Events SDK privacy controls', () => {
  const originalPlatform = Platform.OS

  afterEach(() => {
    setPlatform(originalPlatform)
  })

  it('initializes once with advertiser tracking disabled', async () => {
    setPlatform('ios')
    const { metaAppEvents, Settings } = loadModule()

    await metaAppEvents.initializeMetaAppEvents()
    await metaAppEvents.initializeMetaAppEvents()

    expect(Settings.initializeSDK).toHaveBeenCalledTimes(1)
    expect(Settings.setAdvertiserIDCollectionEnabled).toHaveBeenCalledWith(false)
    expect(Settings.setAdvertiserTrackingEnabled).toHaveBeenCalledWith(false)
  })

  it('enables advertiser tracking only after ATT is granted', async () => {
    setPlatform('ios')
    const { metaAppEvents, Settings, trackingTransparency } = loadModule()
    ;(trackingTransparency.getTrackingPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    })
    ;(trackingTransparency.requestTrackingPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    })

    const result = await metaAppEvents.requestMetaTrackingPermission()

    expect(result).toBe('granted')
    expect(trackingTransparency.requestTrackingPermissionsAsync).toHaveBeenCalledTimes(1)
    expect(Settings.setAdvertiserIDCollectionEnabled).toHaveBeenLastCalledWith(true)
    expect(Settings.setAdvertiserTrackingEnabled).toHaveBeenLastCalledWith(true)
  })

  it('keeps advertiser tracking disabled after ATT is denied', async () => {
    setPlatform('ios')
    const { metaAppEvents, Settings, trackingTransparency } = loadModule()
    ;(trackingTransparency.getTrackingPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    })

    const result = await metaAppEvents.requestMetaTrackingPermission()

    expect(result).toBe('denied')
    expect(trackingTransparency.requestTrackingPermissionsAsync).not.toHaveBeenCalled()
    expect(Settings.setAdvertiserIDCollectionEnabled).toHaveBeenLastCalledWith(false)
    expect(Settings.setAdvertiserTrackingEnabled).toHaveBeenLastCalledWith(false)
  })

  it('does not prompt or enable tracking when ATT is unavailable', async () => {
    setPlatform('ios')
    const { metaAppEvents, Settings, trackingTransparency } = loadModule()
    ;(trackingTransparency.isAvailable as jest.Mock).mockReturnValue(false)

    const result = await metaAppEvents.requestMetaTrackingPermission()

    expect(result).toBe('unavailable')
    expect(trackingTransparency.getTrackingPermissionsAsync).not.toHaveBeenCalled()
    expect(trackingTransparency.requestTrackingPermissionsAsync).not.toHaveBeenCalled()
    expect(Settings.setAdvertiserIDCollectionEnabled).toHaveBeenLastCalledWith(false)
    expect(Settings.setAdvertiserTrackingEnabled).toHaveBeenLastCalledWith(false)
  })
})
