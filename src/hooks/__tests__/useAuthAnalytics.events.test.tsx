const mockUseAuth = jest.fn()
const mockUseProfile = jest.fn()
const mockTrack = jest.fn()
const mockLogMetaCompletedRegistration = jest.fn()
const mockLogMetaStartTrial = jest.fn()
const mockRequestMetaTrackingPermission = jest.fn()

jest.mock('~/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('~/hooks/useProfile', () => ({ useProfile: () => mockUseProfile() }))
jest.mock('~/providers/AnalyticsProvider', () => ({
  useAnalytics: () => ({ track: mockTrack }),
}))
jest.mock('~/lib/metaAcquisitionEvents', () => ({
  logMetaCompletedRegistration: (...args: unknown[]) => mockLogMetaCompletedRegistration(...args),
  logMetaStartTrial: (...args: unknown[]) => mockLogMetaStartTrial(...args),
}))
jest.mock('~/lib/metaAppEvents', () => ({
  requestMetaTrackingPermission: (...args: unknown[]) =>
    mockRequestMetaTrackingPermission(...args),
}))

import { renderHook, waitFor } from '@testing-library/react-native'
import { useAuthAnalytics } from '../useAuthAnalytics'

describe('useAuthAnalytics Meta registration event', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date('2026-08-17T12:00:00.000Z'))
    mockRequestMetaTrackingPermission.mockResolvedValue('granted')
    mockLogMetaCompletedRegistration.mockResolvedValue('logged')
    mockLogMetaStartTrial.mockResolvedValue('logged')
  })

  afterEach(() => jest.useRealTimers())

  it('logs registration and the automatically provisioned trial for a new account', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        created_at: '2026-08-17T11:59:30.000Z',
        last_sign_in_at: '2026-08-17T11:59:30.000Z',
        identities: [{ provider: 'google' }],
      },
    })
    mockUseProfile.mockReturnValue({
      profile: {
        id: 'user-1',
        tier: 'trialing',
        trial_started_at: '2026-08-17T11:59:30.000Z',
      },
    })

    const { unmount } = renderHook(() => useAuthAnalytics())

    await waitFor(() => {
      expect(mockRequestMetaTrackingPermission).toHaveBeenCalledTimes(1)
      expect(mockLogMetaCompletedRegistration).toHaveBeenCalledWith({
        userId: 'user-1',
        method: 'google',
      })
      expect(mockLogMetaStartTrial).toHaveBeenCalledWith({ userId: 'user-1' })
    })

    unmount()
  })

  it('does not log Completed Registration for an ordinary sign-in', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        created_at: '2026-08-01T12:00:00.000Z',
        last_sign_in_at: '2026-08-17T11:59:30.000Z',
        identities: [{ provider: 'apple' }],
      },
    })
    mockUseProfile.mockReturnValue({
      profile: {
        id: 'user-1',
        tier: 'trialing',
        trial_started_at: '2026-08-01T12:00:00.000Z',
      },
    })

    const { unmount } = renderHook(() => useAuthAnalytics())

    expect(mockTrack).toHaveBeenCalledWith('signed_in', { provider: 'apple' })
    expect(mockLogMetaCompletedRegistration).not.toHaveBeenCalled()
    expect(mockLogMetaStartTrial).not.toHaveBeenCalled()

    unmount()
  })

  it('waits for the automatic trial profile before logging Meta acquisition events', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        created_at: '2026-08-17T11:59:30.000Z',
        last_sign_in_at: '2026-08-17T11:59:30.000Z',
        identities: [{ provider: 'google' }],
      },
    })
    mockUseProfile.mockReturnValue({ profile: null })

    const { rerender, unmount } = renderHook(() => useAuthAnalytics())

    expect(mockLogMetaCompletedRegistration).not.toHaveBeenCalled()
    expect(mockLogMetaStartTrial).not.toHaveBeenCalled()

    mockUseProfile.mockReturnValue({
      profile: {
        id: 'user-1',
        tier: 'trialing',
        trial_started_at: '2026-08-17T11:59:30.000Z',
      },
    })
    rerender({})

    await waitFor(() => {
      expect(mockLogMetaCompletedRegistration).toHaveBeenCalledTimes(1)
      expect(mockLogMetaStartTrial).toHaveBeenCalledTimes(1)
    })

    unmount()
  })
})
