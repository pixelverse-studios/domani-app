import { ConfigContext, ExpoConfig } from 'expo/config'
import appJson from './app.json'

const META_APP_ID = '1378815353582072'
const META_DISPLAY_NAME = 'Domani'
const META_SCHEME = `fb${META_APP_ID}`

function getBooleanEnv(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase()
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

export default ({ config }: ConfigContext): ExpoConfig => {
  process.env.EXPO_ROUTER_APP_ROOT = 'src/app'

  const clientToken = process.env.META_CLIENT_TOKEN?.trim()
  const trackingPermission = process.env.META_IOS_TRACKING_USAGE_DESCRIPTION?.trim()
  const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production'
  const autoLogAppEventsEnabled = getBooleanEnv('META_AUTO_LOG_APP_EVENTS_ENABLED', false)

  if (isProductionBuild && !clientToken) {
    throw new Error('META_CLIENT_TOKEN is required for production builds')
  }
  if (isProductionBuild && !trackingPermission) {
    throw new Error('META_IOS_TRACKING_USAGE_DESCRIPTION is required for production builds')
  }

  const plugins = [
    ...(appJson.expo.plugins ?? []),
    [
      'react-native-fbsdk-next',
      {
        appID: META_APP_ID,
        ...(clientToken ? { clientToken } : {}),
        displayName: META_DISPLAY_NAME,
        scheme: META_SCHEME,
        advertiserIDCollectionEnabled: false,
        autoLogAppEventsEnabled,
        isAutoInitEnabled: false,
        iosUserTrackingPermission: trackingPermission || false,
      },
    ],
    ...(trackingPermission
      ? [
          [
            'expo-tracking-transparency',
            {
              userTrackingPermission: trackingPermission,
            },
          ],
        ]
      : []),
  ] as ExpoConfig['plugins']

  return {
    ...config,
    ...appJson.expo,
    plugins,
    extra: {
      ...appJson.expo.extra,
      metaAppEventsConfigured: !!clientToken,
      metaAutoLogAppEventsEnabled: autoLogAppEventsEnabled,
    },
  } as ExpoConfig
}
