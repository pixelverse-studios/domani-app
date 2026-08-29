import { renderHook, waitFor } from '@testing-library/react-native'
import type { User } from '@supabase/supabase-js'

import { useAnalyticsIdentify } from '../useAnalyticsIdentify'
import { useAuth } from '~/hooks/useAuth'
import { useAnalytics } from '~/providers/AnalyticsProvider'

jest.mock('~/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

jest.mock('~/providers/AnalyticsProvider', () => ({
  useAnalytics: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>
const identify = jest.fn()
const reset = jest.fn()
const track = jest.fn()
const screen = jest.fn()

function mockUser(id: string | null) {
  mockUseAuth.mockReturnValue({
    user: id ? ({ id, email: `${id}@example.com` } as User) : null,
  } as ReturnType<typeof useAuth>)
}

describe('useAnalyticsIdentify', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAnalytics.mockReturnValue({
      identify,
      reset,
      track,
      screen,
    } as ReturnType<typeof useAnalytics>)
  })

  it('resets analytics before identifying a different authenticated account', async () => {
    mockUser('user-1')
    const { rerender } = renderHook(() => useAnalyticsIdentify())

    await waitFor(() => expect(identify).toHaveBeenCalledWith('user-1', expect.any(Object)))
    expect(reset).not.toHaveBeenCalled()

    mockUser('user-2')
    rerender(undefined)

    await waitFor(() => expect(identify).toHaveBeenCalledWith('user-2', expect.any(Object)))
    expect(reset).toHaveBeenCalledTimes(1)
    expect(reset.mock.invocationCallOrder[0]).toBeLessThan(identify.mock.invocationCallOrder[1])
  })
})
