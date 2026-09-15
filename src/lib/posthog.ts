import type { PostHogCustomAppProperties, PostHogOptions } from 'posthog-react-native'

export const POSTHOG_SESSION_REPLAY_SAMPLE_RATE = 0.1
export const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

export type AnalyticsEnvironment = 'development' | 'staging' | 'production'

export interface PostHogRuntimeConfig {
  apiKey: string
  enabled: boolean
  environment: AnalyticsEnvironment
  host: string
  releaseChannel: string
}

export function isValidPostHogProjectKey(value: string | undefined) {
  return /^phc_[A-Za-z0-9_-]{20,}$/.test(value?.trim() ?? '')
}

export function getPostHogRuntimeConfig({
  apiKey,
  environment,
  host = DEFAULT_POSTHOG_HOST,
  isDevelopment,
  releaseChannel,
}: {
  apiKey: string | undefined
  environment: AnalyticsEnvironment
  host?: string
  isDevelopment: boolean
  releaseChannel: string
}): PostHogRuntimeConfig {
  const normalizedKey = apiKey?.trim() ?? ''
  return {
    apiKey: normalizedKey,
    enabled: !isDevelopment && isValidPostHogProjectKey(normalizedKey),
    environment: isDevelopment ? 'development' : environment,
    host,
    releaseChannel,
  }
}

export function isPostHogSessionReplayEnabled(
  isDevelopment: boolean,
  configuredValue: string | undefined,
  platform: string,
  platformVersion: string | number,
) {
  if (isDevelopment || configuredValue !== 'true') return false
  if (platform === 'ios') return true
  if (platform === 'android') return Number(platformVersion) >= 26
  return false
}

export function getPostHogOptions(
  enableSessionReplay: boolean,
  runtime?: Pick<PostHogRuntimeConfig, 'environment' | 'host' | 'releaseChannel'>,
): PostHogOptions {
  return {
    host: runtime?.host ?? DEFAULT_POSTHOG_HOST,
    captureAppLifecycleEvents: true,
    ...(runtime
      ? {
          customAppProperties: (properties: PostHogCustomAppProperties) => ({
            ...properties,
            app_environment: runtime.environment,
            release_channel: runtime.releaseChannel,
          }),
        }
      : {}),
    enableSessionReplay,
    sessionReplayConfig: {
      maskAllTextInputs: true,
      maskAllImages: true,
      maskAllSandboxedViews: true,
      captureLog: false,
      captureNetworkTelemetry: false,
      sampleRate: POSTHOG_SESSION_REPLAY_SAMPLE_RATE,
      throttleDelayMs: 1000,
      screenshotScale: 0.5,
      screenshotColorMode: 'RGB_565',
      screenshotCompressionQuality: 30,
    },
  }
}
