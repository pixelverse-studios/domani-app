const mockUseAuth = jest.fn()
const mockTrack = jest.fn()
const mockLogMetaCompletedRegistration = jest.fn()

jest.mock('~/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('~/providers/AnalyticsProvider', () => ({
  useAnalytics: () => ({ track: mockTrack }),
}))
jest.mock('~/lib/metaAcquisitionEvents', () => ({
  logMetaCompletedRegistration: (...args: unknown[]) => mockLogMetaCompletedRegistration(...args),
}))

import { renderHook } from '@testing-library/react-native'
import { useAuthAnalytics } from '../useAuthAnalytics'

describe('useAuthAnalytics Meta registration event', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date('2026-08-17T12:00:00.000Z'))
  })

  afterEach(() => jest.useRealTimers())

  it('logs Completed Registration for a newly created account', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        created_at: '2026-08-17T11:59:30.000Z',
        last_sign_in_at: '2026-08-17T11:59:30.000Z',
        identities: [{ provider: 'google' }],
      },
    })

    renderHook(() => useAuthAnalytics())

    expect(mockLogMetaCompletedRegistration).toHaveBeenCalledWith({
      userId: 'user-1',
      method: 'google',
    })
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

    renderHook(() => useAuthAnalytics())

    expect(mockTrack).toHaveBeenCalledWith('signed_in', { provider: 'apple' })
    expect(mockLogMetaCompletedRegistration).not.toHaveBeenCalled()
  })
})
