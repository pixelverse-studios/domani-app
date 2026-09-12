import { supabase } from '~/lib/supabase'
import { deliverPostHogTrialStarted } from '../posthogTrialEvents'

const mockRpc = supabase.rpc as unknown as jest.Mock
const clientProperties = {
  platform: 'ios' as const,
  app_version: '1.1.3',
  app_build: '113',
  country: 'US',
}
const claim = {
  claim_token: 'claim-1',
  event_uuid: '11111111-1111-4111-8111-111111111111',
  event_timestamp: '2026-09-12T12:00:00.000Z',
  event_properties: {
    ...clientProperties,
    offer: 'general',
    signup_cohort: 'general',
    trial_expires_at: '2026-09-26T12:00:00.000Z',
  },
}

describe('PostHog trial events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('captures and completes a server-confirmed trial with stable identity and timestamp', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: [claim], error: null })
      .mockResolvedValueOnce({ data: true, error: null })
    const capture = jest.fn().mockResolvedValue(true)

    await expect(deliverPostHogTrialStarted('user-1', clientProperties, capture)).resolves.toBe(
      'delivered',
    )

    expect(capture).toHaveBeenCalledWith(
      'user-1',
      claim.event_properties,
      claim.event_uuid,
      claim.event_timestamp,
    )
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'complete_posthog_trial_started', {
      p_claim_token: claim.claim_token,
      p_user_id: 'user-1',
    })
  })

  it('does not capture when another device already owns or delivered the claim', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null })
    const capture = jest.fn().mockResolvedValue(true)

    await expect(deliverPostHogTrialStarted('user-1', clientProperties, capture)).resolves.toBe(
      'not_claimed',
    )

    expect(capture).not.toHaveBeenCalled()
    expect(mockRpc).toHaveBeenCalledTimes(1)
  })

  it('leaves the durable claim pending when capture fails so a stale claim can retry', async () => {
    mockRpc.mockResolvedValueOnce({ data: [claim], error: null })
    const capture = jest.fn().mockRejectedValue(new Error('offline'))

    await expect(deliverPostHogTrialStarted('user-1', clientProperties, capture)).resolves.toBe(
      'error',
    )

    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).not.toHaveBeenCalledWith('complete_posthog_trial_started', expect.anything())
  })

  it('leaves the claim pending if the analytics identity changes before capture', async () => {
    mockRpc.mockResolvedValueOnce({ data: [claim], error: null })
    const capture = jest
      .fn()
      .mockImplementation(async (expectedUserId: string) => expectedUserId === 'user-b')

    await expect(deliverPostHogTrialStarted('user-a', clientProperties, capture)).resolves.toBe(
      'error',
    )

    expect(capture).toHaveBeenCalledWith(
      'user-a',
      claim.event_properties,
      claim.event_uuid,
      claim.event_timestamp,
    )
    expect(mockRpc).not.toHaveBeenCalledWith('complete_posthog_trial_started', expect.anything())
  })

  it('coalesces simultaneous cached and multi-device-style calls in one runtime', async () => {
    let resolveClaim: ((value: unknown) => void) | undefined
    mockRpc.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveClaim = resolve
        }),
    )
    const capture = jest.fn().mockResolvedValue(true)

    const first = deliverPostHogTrialStarted('user-1', clientProperties, capture)
    const second = deliverPostHogTrialStarted('user-1', clientProperties, capture)
    expect(first).toBe(second)

    resolveClaim?.({ data: [], error: null })
    await first
    expect(mockRpc).toHaveBeenCalledTimes(1)
  })
})
