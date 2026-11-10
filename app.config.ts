import { ConfigContext, ExpoConfig } from 'expo/config'
import { AndroidConfig, ConfigPlugin, withAndroidManifest } from 'expo/config-plugins'
import appJson from './app.json'

const META_APP_ID = '1378815353582072'
const META_DISPLAY_NAME = 'Domani'
const META_SCHEME = `fb${META_APP_ID}`
const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

const withAndroidMetaAutoInitialization: ConfigPlugin = (config) =>
  withAndroidManifest(config, (androidConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      androidConfig.modResults,
    )
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      'com.facebook.sdk.AutoInitEnabled',
      'true',
    )
    return androidConfig
  })

function resolveAnalyticsEnvironment(
  easBuildProfile: string | undefined,
  configuredEnvironment: string | undefined,
  supabaseUrl: string | undefined,
) {
  if (easBuildProfile === 'production') return 'production'
  if (easBuildProfile === 'preview') return 'staging'
  if (easBuildProfile === 'development') return 'development'
  if (
    configuredEnvironment === 'production' ||
    configuredEnvironment === 'staging' ||
    configuredEnvironment === 'development'
  ) {
    return configuredEnvironment
  }
  if (
    supabaseUrl?.includes('domani.supabase.co') ||
    supabaseUrl?.includes('exxnnlhxcjujxnnwwrxv.supabase.co')
  ) {
    return 'production'
  }
  if (supabaseUrl?.includes('ftgltnzejaxasdvfkqut.supabase.co')) return 'staging'
  return 'development'
}

function isValidPostHogProjectKey(value: string | undefined) {
  return /^phc_[A-Za-z0-9_-]{20,}$/.test(value?.trim() ?? '')
}

function getBooleanEnv(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase()
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

export function getPostHogBuildConfig(env: Record<string, string | undefined>) {
  const environment = resolveAnalyticsEnvironment(
    env.EAS_BUILD_PROFILE,
    env.EXPO_PUBLIC_ANALYTICS_ENVIRONMENT,
    env.EXPO_PUBLIC_SUPABASE_URL,
  )
  const releaseChannel =
    env.EAS_BUILD_PROFILE?.trim() ||
    (environment === 'staging' ? 'internal' : environment === 'production' ? 'production' : 'local')
  const apiKey =
    environment === 'production'
      ? env.EXPO_PUBLIC_POSTHOG_PRODUCTION_KEY?.trim() || env.EXPO_PUBLIC_POSTHOG_KEY?.trim()
      : environment === 'staging'
        ? env.EXPO_PUBLIC_POSTHOG_STAGING_KEY?.trim()
        : undefined
  const host = env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST

  if (environment === 'production' && !isValidPostHogProjectKey(apiKey)) {
    throw new Error(
      'A valid EXPO_PUBLIC_POSTHOG_PRODUCTION_KEY (or legacy EXPO_PUBLIC_POSTHOG_KEY) is required for production builds',
    )
  }
  if (env.EAS_BUILD_PROFILE === 'preview' && !isValidPostHogProjectKey(apiKey)) {
    throw new Error('A valid EXPO_PUBLIC_POSTHOG_STAGING_KEY is required for preview builds')
  }
  if (!/^https:\/\//.test(host)) {
    throw new Error('EXPO_PUBLIC_POSTHOG_HOST must be an HTTPS URL')
  }

  return { apiKey, environment, host, releaseChannel }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  process.env.EXPO_ROUTER_APP_ROOT = 'src/app'

  const clientToken = process.env.META_CLIENT_TOKEN?.trim()
  const trackingPermission = process.env.META_IOS_TRACKING_USAGE_DESCRIPTION?.trim()
  const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production'
  const autoLogAppEventsEnabled = getBooleanEnv('META_AUTO_LOG_APP_EVENTS_ENABLED', false)
  const posthog = getPostHogBuildConfig(process.env)

  if (isProductionBuild && !clientToken) {
    throw new Error('META_CLIENT_TOKEN is required for production builds')
  }
  if (isProductionBuild && !trackingPermission) {
    throw new Error('META_IOS_TRACKING_USAGE_DESCRIPTION is required for production builds')
  }

  const plugins = [
    ...(appJson.expo.plugins ?? []),
    // Expo applies same-platform mods inside-out. Register this before the
    // Facebook plugin so its Android-only override runs after that plugin.
    withAndroidMetaAutoInitialization,
    [
      'react-native-fbsdk-next',
      {
        appID: META_APP_ID,
        ...(clientToken ? { clientToken } : {}),
        displayName: META_DISPLAY_NAME,
        scheme: META_SCHEME,
        advertiserIDCollectionEnabled: false,
        // Keep automatic telemetry disabled in the native manifests so checked-in
        // projects cannot bypass the selected build environment. JS enables it
        // after reading the environment-specific Expo configuration.
        autoLogAppEventsEnabled: false,
        // iOS remains manually initialized. The Android-only plugin above
        // overrides this native value because Expo Router can load Facebook
        // native modules before the JS initializer executes on Android.
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
      analyticsEnvironment: posthog.environment,
      analyticsReleaseChannel: posthog.releaseChannel,
      posthogApiKey: posthog.apiKey,
      posthogHost: posthog.host,
    },
  } as ExpoConfig
}
