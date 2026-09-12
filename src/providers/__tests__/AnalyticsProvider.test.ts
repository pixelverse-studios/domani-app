const { captureTrialStartedForIdentity } = jest.requireActual(
  '../AnalyticsProvider',
) as typeof import('../AnalyticsProvider')

const properties = {
  platform: 'ios' as const,
  app_version: '1.1.3',
  app_build: '13',
  country: 'US',
  offer: 'general',
  signup_cohort: 'general',
  trial_expires_at: '2026-09-26T12:00:00.000Z',
}

describe('captureTrialStartedForIdentity', () => {
  it('does not capture or flush after the PostHog identity changes', async () => {
    const posthog = {
      getDistinctId: jest.fn(() => 'user-b'),
      capture: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
    }

    await expect(
      captureTrialStartedForIdentity(
        posthog as never,
        'user-a',
        properties,
        '11111111-1111-4111-8111-111111111111',
        '2026-09-12T12:00:00.000Z',
      ),
    ).resolves.toBe(false)

    expect(posthog.capture).not.toHaveBeenCalled()
    expect(posthog.flush).not.toHaveBeenCalled()
  })

  it('captures and flushes with the server event identity and timestamp', async () => {
    const posthog = {
      getDistinctId: jest.fn(() => 'user-a'),
      capture: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
    }

    await expect(
      captureTrialStartedForIdentity(
        posthog as never,
        'user-a',
        properties,
        '11111111-1111-4111-8111-111111111111',
        '2026-09-12T12:00:00.000Z',
      ),
    ).resolves.toBe(true)

    expect(posthog.capture).toHaveBeenCalledWith('trial_started', properties, {
      uuid: '11111111-1111-4111-8111-111111111111',
      timestamp: new Date('2026-09-12T12:00:00.000Z'),
    })
    expect(posthog.flush).toHaveBeenCalledTimes(1)
  })
})
