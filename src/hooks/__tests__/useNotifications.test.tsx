import { act, renderHook, waitFor } from '~/test/test-utils'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useNotificationObserver } from '../useNotifications'
import { NotificationService } from '~/lib/notifications'
import { supabase } from '~/lib/supabase'
import { resetPushTokenCoordinatorForTests } from '~/lib/pushTokenCoordinator'
import { resetAccountTransitionSecurityForTests } from '~/lib/accountTransitionSecurity'

const mockUseAuth = jest.fn()

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  clearLastNotificationResponseAsync: jest.fn(() => Promise.resolve()),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
}))

jest.mock('~/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('~/lib/notifications', () => ({
  NotificationService: {
    cancelAllReminders: jest.fn(() => Promise.resolve(true)),
    getExpoPushToken: jest.fn(() => Promise.resolve('ExponentPushToken[test-device]')),
    getPermissionStatus: jest.fn(() => Promise.resolve('granted')),
    initialize: jest.fn(() => Promise.resolve()),
  },
}))

const mockCancelAllReminders = NotificationService.cancelAllReminders as jest.Mock
const mockGetExpoPushToken = NotificationService.getExpoPushToken as jest.Mock
const mockGetLastNotificationResponse = Notifications.getLastNotificationResponseAsync as jest.Mock
const mockClearLastNotificationResponse =
  Notifications.clearLastNotificationResponseAsync as jest.Mock
const mockGetUser = supabase.auth.getUser as jest.Mock
const mockRpc = supabase.rpc as unknown as jest.Mock
const mockFrom = supabase.from as unknown as jest.Mock

describe('useNotificationObserver account scoping', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    resetPushTokenCoordinatorForTests()
    resetAccountTransitionSecurityForTests()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
    mockGetLastNotificationResponse.mockResolvedValue(null)
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('clears scheduled account notifications on switch and logout', async () => {
    const { rerender, unmount } = renderHook(() => useNotificationObserver())

    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(1))

    mockUseAuth.mockReturnValue({ user: { id: 'user-2' } })
    rerender(undefined)
    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(2))

    mockUseAuth.mockReturnValue({ user: null })
    rerender(undefined)
    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(3))

    unmount()
  })

  it('serializes destructive notification resets across auth transitions', async () => {
    let resolveFirstReset!: (value: boolean) => void
    mockCancelAllReminders
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            resolveFirstReset = resolve
          }),
      )
      .mockResolvedValueOnce(true)
    mockUseAuth.mockReturnValue({ user: null })

    const { rerender, unmount } = renderHook(() => useNotificationObserver())
    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(1))

    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
    rerender(undefined)
    await Promise.resolve()
    expect(mockCancelAllReminders).toHaveBeenCalledTimes(1)

    resolveFirstReset(true)
    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(2))

    unmount()
  })

  it('retries a failed notification purge while signed out', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockCancelAllReminders.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

    const { unmount } = renderHook(() => useNotificationObserver())
    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(1))

    await act(async () => {
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(2))
    unmount()
  })

  it('does not rebuild account reminders until notification cleanup is verified', async () => {
    mockCancelAllReminders.mockResolvedValue(false)

    const { unmount } = renderHook(() => useNotificationObserver())

    await act(async () => {
      jest.advanceTimersByTime(4000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockFrom).not.toHaveBeenCalled()
    unmount()
  })

  it('claims the device push token through the current-user RPC', async () => {
    const { unmount } = renderHook(() => useNotificationObserver())

    await act(async () => {
      jest.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('set_current_user_expo_push_token', {
        p_token: 'ExponentPushToken[test-device]',
      }),
    )

    unmount()
  })

  it('transfers a stale completed token claim to the replacement account', async () => {
    let resolveFirstClaim!: (value: { data: null; error: null }) => void
    mockRpc
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstClaim = resolve
          }),
      )
      .mockResolvedValueOnce({ data: null, error: null })
    mockGetExpoPushToken
      .mockResolvedValueOnce('ExponentPushToken[shared-device]')
      .mockResolvedValueOnce(null)

    const { rerender, unmount } = renderHook(() => useNotificationObserver())

    await act(async () => {
      jest.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(1))

    mockUseAuth.mockReturnValue({ user: { id: 'user-2' } })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null })
    rerender(undefined)

    resolveFirstClaim({ data: null, error: null })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      jest.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(2))
    expect(mockRpc).toHaveBeenLastCalledWith('set_current_user_expo_push_token', {
      p_token: 'ExponentPushToken[shared-device]',
    })

    unmount()
  })

  it('consumes a cold-start notification response only once across account changes', async () => {
    const response = {
      notification: {
        date: 1000,
        request: {
          identifier: 'response-1',
          content: { data: { url: '/(tabs)' } },
        },
      },
    }
    mockGetLastNotificationResponse.mockResolvedValue(response)

    const { rerender, unmount } = renderHook(() => useNotificationObserver())
    await waitFor(() => expect(mockClearLastNotificationResponse).toHaveBeenCalledTimes(1))

    await act(async () => {
      jest.advanceTimersByTime(500)
    })
    expect(router.push).toHaveBeenCalledTimes(1)

    mockUseAuth.mockReturnValue({ user: { id: 'user-2' } })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null })
    rerender(undefined)
    await Promise.resolve()

    await act(async () => {
      jest.advanceTimersByTime(500)
    })
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(mockClearLastNotificationResponse).toHaveBeenCalledTimes(2)

    unmount()
  })

  it('handles later deliveries from a repeating notification identifier', async () => {
    const { unmount } = renderHook(() => useNotificationObserver())
    const addResponseListener = Notifications.addNotificationResponseReceivedListener as jest.Mock
    await waitFor(() => expect(addResponseListener).toHaveBeenCalled())
    const listener = addResponseListener.mock.calls[0][0]
    const buildResponse = (date: number) => ({
      notification: {
        date,
        request: {
          identifier: 'daily-planning-reminder',
          content: { data: { url: '/(tabs)' } },
        },
      },
    })

    act(() => {
      listener(buildResponse(1000))
      listener(buildResponse(1000))
      jest.advanceTimersByTime(100)
    })
    expect(router.push).toHaveBeenCalledTimes(1)

    act(() => {
      listener(buildResponse(2000))
      jest.advanceTimersByTime(100)
    })
    expect(router.push).toHaveBeenCalledTimes(2)

    unmount()
  })
})
