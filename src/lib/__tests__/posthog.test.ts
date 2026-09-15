import {
  DEFAULT_POSTHOG_HOST,
  getPostHogOptions,
  getPostHogRuntimeConfig,
  isPostHogSessionReplayEnabled,
  isValidPostHogProjectKey,
  POSTHOG_SESSION_REPLAY_SAMPLE_RATE,
} from '../posthog'

describe('PostHog configuration', () => {
  it('disables local development even if a production project key is present', () => {
    const runtime = getPostHogRuntimeConfig({
      apiKey: 'phc_abcdefghijklmnopqrstuvwxyz',
      environment: 'production',
      isDevelopment: true,
      releaseChannel: 'local',
    })

    expect(runtime).toEqual({
      apiKey: 'phc_abcdefghijklmnopqrstuvwxyz',
      enabled: false,
      environment: 'development',
      host: DEFAULT_POSTHOG_HOST,
      releaseChannel: 'local',
    })
  })

  it('enables non-development builds only with a valid public project key', () => {
    expect(isValidPostHogProjectKey('phc_abcdefghijklmnopqrstuvwxyz')).toBe(true)
    expect(isValidPostHogProjectKey('phx_personal_secret')).toBe(false)
    expect(
      getPostHogRuntimeConfig({
        apiKey: 'invalid',
        environment: 'production',
        isDevelopment: false,
        releaseChannel: 'production',
      }).enabled,
    ).toBe(false)
  })

  it('enables replay only for an explicit non-development build', () => {
    expect(isPostHogSessionReplayEnabled(false, 'true', 'ios', '15.1')).toBe(true)
    expect(isPostHogSessionReplayEnabled(false, 'true', 'android', 26)).toBe(true)
    expect(isPostHogSessionReplayEnabled(false, 'true', 'android', 25)).toBe(false)
    expect(isPostHogSessionReplayEnabled(true, 'true', 'ios', '15.1')).toBe(false)
    expect(isPostHogSessionReplayEnabled(false, 'false', 'ios', '15.1')).toBe(false)
    expect(isPostHogSessionReplayEnabled(false, undefined, 'ios', '15.1')).toBe(false)
    expect(isPostHogSessionReplayEnabled(false, 'true', 'web', '1')).toBe(false)
  })

  it('uses privacy-safe replay defaults and a bounded performance budget', () => {
    const options = getPostHogOptions(true, {
      environment: 'production',
      host: DEFAULT_POSTHOG_HOST,
      releaseChannel: 'production',
    })

    expect(options.enableSessionReplay).toBe(true)
    expect(options.sessionReplayConfig).toEqual({
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
    })
    expect(
      typeof options.customAppProperties === 'function'
        ? options.customAppProperties({ $app_version: '1.1.3' })
        : options.customAppProperties,
    ).toEqual({
      $app_version: '1.1.3',
      app_environment: 'production',
      release_channel: 'production',
    })
  })
})
