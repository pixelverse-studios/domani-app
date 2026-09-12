import type { PostHogOptions } from 'posthog-react-native'

export const POSTHOG_SESSION_REPLAY_SAMPLE_RATE = 0.1

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

export function getPostHogOptions(enableSessionReplay: boolean): PostHogOptions {
  return {
    host: 'https://us.i.posthog.com',
    captureAppLifecycleEvents: true,
    enableSessionReplay,
    sessionReplayConfig: {
      maskAllTextInputs: true,
      maskAllImages: true,
      maskAllSandboxedViews: true,
      captureLog: false,
      captureNetworkTelemetry: true,
      sampleRate: POSTHOG_SESSION_REPLAY_SAMPLE_RATE,
      throttleDelayMs: 1000,
      screenshotScale: 0.5,
      screenshotColorMode: 'RGB_565',
      screenshotCompressionQuality: 30,
    },
  }
}
