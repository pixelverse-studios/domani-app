import {
  getPostHogOptions,
  isPostHogSessionReplayEnabled,
  POSTHOG_SESSION_REPLAY_SAMPLE_RATE,
} from '../posthog'

describe('PostHog configuration', () => {
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
    const options = getPostHogOptions(true)

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
  })
})
