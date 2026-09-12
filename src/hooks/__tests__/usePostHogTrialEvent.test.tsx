const mockUseAuth = jest.fn()
const mockUseProfile = jest.fn()
const mockCaptureTrialStarted = jest.fn()
const mockDeliver = jest.fn().mockResolvedValue('delivered')

jest.mock('~/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('~/hooks/useProfile', () => ({ useProfile: () => mockUseProfile() }))
jest.mock('~/providers/AnalyticsProvider', () => ({
  useAnalytics: () => ({ captureTrialStarted: mockCaptureTrialStarted }),
}))
jest.mock('~/lib/productAnalytics', () => ({
  getAnalyticsBaseProperties: () => ({
    platform: 'ios',
    app_version: '1.1.3',
    app_build: '113',
    country: 'US',
  }),
}))
jest.mock('~/lib/posthogTrialEvents', () => ({
  POSTHOG_TRIAL_REPLAY_INTERVAL_MS: 300_000,
  deliverPostHogTrialStarted: (...args: unknown[]) => mockDeliver(...args),
}))

import { act, renderHook } from '@testing-library/react-native'
import { AppState } from 'react-native'
import { usePostHogTrialEvent } from '../usePostHogTrialEvent'

describe('usePostHogTrialEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
    mockUseProfile.mockReturnValue({ profile: null })
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('claims an automatic trial already present when the profile loads', () => {
    mockUseProfile.mockReturnValue({
      profile: {
        trial_started_at: '2026-09-12T12:00:00.000Z',
        trial_ends_at: '2026-09-26T12:00:00.000Z',
        signup_cohort: 'early_adopter',
      },
    })

    renderHook(() => usePostHogTrialEvent())

    expect(mockDeliver).toHaveBeenCalledWith(
      'user-1',
      {
        platform: 'ios',
        app_version: '1.1.3',
        app_build: '113',
        country: 'US',
      },
      mockCaptureTrialStarted,
    )
  })

  it('claims a manual trial when the profile transitions and retries on the interval', () => {
    const { rerender } = renderHook(() => usePostHogTrialEvent())
    expect(mockDeliver).not.toHaveBeenCalled()

    mockUseProfile.mockReturnValue({
      profile: {
        trial_started_at: '2026-09-12T12:00:00.000Z',
        trial_ends_at: '2026-09-26T12:00:00.000Z',
        signup_cohort: 'general',
      },
    })
    rerender(undefined)
    expect(mockDeliver).toHaveBeenCalledTimes(1)

    act(() => jest.advanceTimersByTime(300_000))
    expect(mockDeliver).toHaveBeenCalledTimes(2)
  })
})
