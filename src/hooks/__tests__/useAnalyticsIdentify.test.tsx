import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { User } from '@supabase/supabase-js'

import {
  runAccountTransition,
  resetAccountLifecycleCoordinatorForTests,
} from '~/lib/accountLifecycleCoordinator'
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
    user: id
      ? ({ id, email: `${id}@example.com`, created_at: '2026-01-01T00:00:00Z' } as User)
      : null,
  } as ReturnType<typeof useAuth>)
}

describe('useAnalyticsIdentify', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetAccountLifecycleCoordinatorForTests()
    mockUseAnalytics.mockReturnValue({
      identify,
      reset,
      track,
      screen,
    } as ReturnType<typeof useAnalytics>)
  })

  it('reconciles a signed-out startup without waiting for a previous in-memory user', () => {
    mockUser(null)
    renderHook(() => useAnalyticsIdentify())
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('re-identifies the retained account after a transition clears analytics but sign-out fails', async () => {
    mockUser('user-1')
    renderHook(() => useAnalyticsIdentify())
    await act(async () => {
      await runAccountTransition('user-1', async () => {})
    })
    expect(identify).toHaveBeenCalledTimes(2)
    expect(identify).toHaveBeenLastCalledWith(
      'user-1',
      expect.objectContaining({ email: 'user-1@example.com' }),
    )
  })

  it('resets analytics before identifying a different authenticated account', async () => {
    mockUser('user-1')
    const { rerender } = renderHook(() => useAnalyticsIdentify())

    await waitFor(() => expect(identify).toHaveBeenCalledWith('user-1', expect.any(Object)))
    expect(reset).not.toHaveBeenCalled()
    expect(identify).toHaveBeenCalledWith('user-1', {
      email: 'user-1@example.com',
      created_at: '2026-01-01T00:00:00Z',
    })

    mockUser('user-2')
    rerender(undefined)

    await waitFor(() => expect(identify).toHaveBeenCalledWith('user-2', expect.any(Object)))
    expect(reset).toHaveBeenCalledTimes(1)
    expect(reset.mock.invocationCallOrder[0]).toBeLessThan(identify.mock.invocationCallOrder[1])
  })
})
