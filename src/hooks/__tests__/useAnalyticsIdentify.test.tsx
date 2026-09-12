const mockUseAuth = jest.fn()
const mockIdentify = jest.fn()
const mockReset = jest.fn()

jest.mock('~/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('~/providers/AnalyticsProvider', () => ({
  useAnalytics: () => ({ identify: mockIdentify, reset: mockReset }),
}))

import { renderHook } from '@testing-library/react-native'
import { useAnalyticsIdentify } from '../useAnalyticsIdentify'

describe('useAnalyticsIdentify', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-a',
        email: 'a@example.com',
        created_at: '2026-09-01T00:00:00.000Z',
        identities: [{ provider: 'apple' }],
      },
    })
  })

  it('resets anonymous identity before a direct account A to B switch', () => {
    const { rerender } = renderHook(() => useAnalyticsIdentify())
    expect(mockIdentify).toHaveBeenLastCalledWith(
      'user-a',
      expect.objectContaining({ auth_provider: 'apple' }),
    )

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-b',
        email: 'b@example.com',
        identities: [{ provider: 'google' }],
      },
    })
    rerender(undefined)

    expect(mockReset).toHaveBeenCalledTimes(1)
    expect(mockReset.mock.invocationCallOrder[0]).toBeLessThan(
      mockIdentify.mock.invocationCallOrder[1],
    )
    expect(mockIdentify).toHaveBeenLastCalledWith(
      'user-b',
      expect.objectContaining({ auth_provider: 'google' }),
    )
  })
})
