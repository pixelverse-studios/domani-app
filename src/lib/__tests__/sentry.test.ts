import * as Application from 'expo-application'
import { Platform } from 'react-native'

import { getSentryRelease } from '../sentry'

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  })
}

function setApplicationIdentity(applicationId: string, version: string, build: string) {
  Object.defineProperties(Application, {
    applicationId: { configurable: true, value: applicationId },
    nativeApplicationVersion: { configurable: true, value: version },
    nativeBuildVersion: { configurable: true, value: build },
  })
}

describe('Sentry release identity', () => {
  const originalPlatform = Platform.OS
  const originalApplicationId = Application.applicationId
  const originalVersion = Application.nativeApplicationVersion
  const originalBuild = Application.nativeBuildVersion

  afterEach(() => {
    setPlatform(originalPlatform)
    setApplicationIdentity(
      originalApplicationId ?? '',
      originalVersion ?? '',
      originalBuild ?? '',
    )
  })

  it('matches the installed Android application and version code', () => {
    setPlatform('android')
    setApplicationIdentity('com.baitedz.domaniapp', '1.1.3', '126')

    expect(getSentryRelease()).toEqual({
      appVersion: '1.1.3',
      release: 'com.baitedz.domaniapp@1.1.3+126',
    })
  })

  it('matches the installed iOS bundle and build number', () => {
    setPlatform('ios')
    setApplicationIdentity('com.baitedz.domani-app', '1.1.3', '13')

    expect(getSentryRelease()).toEqual({
      appVersion: '1.1.3',
      release: 'com.baitedz.domani-app@1.1.3+13',
    })
  })
})
