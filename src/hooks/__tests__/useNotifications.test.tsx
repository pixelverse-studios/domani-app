import { act, renderHook, waitFor } from '~/test/test-utils'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useNotificationObserver, useNotifications } from '../useNotifications'
import { NotificationService } from '~/lib/notifications'
import { supabase } from '~/lib/supabase'
import {
  resetAccountLifecycleCoordinatorForTests,
  runAccountTransition,
  setActiveAccount,
} from '~/lib/accountLifecycleCoordinator'
import {
  canRegisterPushTokenForUser,
  resetAccountTransitionSecurityForTests,
  securelySignOut,
} from '~/lib/accountTransitionSecurity'

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
    getScheduledNotifications: jest.fn(() => Promise.resolve([])),
    restoreScheduledNotifications: jest.fn(() => Promise.resolve(true)),
    cancelPlanningReminders: jest.fn(() => Promise.resolve(true)),
    getScheduledNotificationsByType: jest.fn(() => Promise.resolve([])),
    schedulePlanningReminder: jest.fn(() => Promise.resolve('planning-1')),
    getExpoPushToken: jest.fn(() => Promise.resolve('ExponentPushToken[test-device]')),
    getPermissionStatus: jest.fn(() => Promise.resolve('granted')),
    requestPermissions: jest.fn(() => Promise.resolve(true)),
    initialize: jest.fn(() => Promise.resolve()),
  },
}))

const mockCancelAllReminders = NotificationService.cancelAllReminders as jest.Mock
const mockCancelPlanningReminders = NotificationService.cancelPlanningReminders as jest.Mock
const mockSchedulePlanningReminder = NotificationService.schedulePlanningReminder as jest.Mock
const mockGetExpoPushToken = NotificationService.getExpoPushToken as jest.Mock
const mockRequestPermissions = NotificationService.requestPermissions as jest.Mock
const mockGetLastNotificationResponse = Notifications.getLastNotificationResponseAsync as jest.Mock
const mockClearLastNotificationResponse =
  Notifications.clearLastNotificationResponseAsync as jest.Mock
const mockGetUser = supabase.auth.getUser as jest.Mock
const mockGetSession = supabase.auth.getSession as jest.Mock
const mockRpc = supabase.rpc as unknown as jest.Mock
const mockSignOut = supabase.auth.signOut as jest.Mock
const mockFrom = supabase.from as unknown as jest.Mock

describe('useNotificationObserver account scoping', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    resetAccountLifecycleCoordinatorForTests()
    resetAccountTransitionSecurityForTests()
    setActiveAccount('user-1')
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
    mockGetLastNotificationResponse.mockResolvedValue(null)
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockSignOut.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not destructively purge notifications when the observer mounts or rerenders', async () => {
    const { rerender, unmount } = renderHook(() => useNotificationObserver())

    mockUseAuth.mockReturnValue({ user: { id: 'user-2' } })
    rerender(undefined)

    mockUseAuth.mockReturnValue({ user: null })
    rerender(undefined)

    expect(mockCancelAllReminders).not.toHaveBeenCalled()

    unmount()
  })

  it('preserves scheduled reminders on a same-account offline cold launch', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('offline') })

    const { unmount } = renderHook(() => useNotificationObserver())

    await act(async () => {
      jest.advanceTimersByTime(4000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockCancelAllReminders).not.toHaveBeenCalled()
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
      expect(mockRpc).toHaveBeenCalledWith('set_expected_user_expo_push_token', {
        p_expected_user_id: 'user-1',
        p_token: 'ExponentPushToken[test-device]',
      }),
    )

    unmount()
  })

  it('does not reclaim the outgoing token through the permission action', async () => {
    let finishPurge!: (value: boolean) => void
    mockCancelAllReminders.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishPurge = resolve
        }),
    )
    const signOut = securelySignOut('user-1')
    await waitFor(() => expect(canRegisterPushTokenForUser('user-1')).toBe(false))

    const { result } = renderHook(() => useNotifications())
    await act(async () => {
      await result.current.requestPermissions()
    })

    // Push ownership rollback snapshots the server-side claim; the blocked
    // permission action must not start a device-token registration attempt.
    expect(mockGetExpoPushToken).not.toHaveBeenCalled()

    finishPurge(true)
    await signOut
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('set_expected_user_expo_push_token', {
      p_expected_user_id: 'user-1',
      p_token: null,
    })
  })

  it('does not register account B from a permission prompt opened by account A', async () => {
    let resolvePermission!: (granted: boolean) => void
    mockRequestPermissions.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          resolvePermission = resolve
        }),
    )
    const { result, rerender } = renderHook(() => useNotifications())

    let permissionRequest!: Promise<boolean>
    act(() => {
      permissionRequest = result.current.requestPermissions()
    })

    await act(async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-2' } })
      setActiveAccount('user-2')
      rerender(undefined)
      resolvePermission(true)
      await expect(permissionRequest).resolves.toBe(true)
    })
    expect(mockGetExpoPushToken).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('does not schedule account A planning state after an account transition begins', async () => {
    let finishCancellation!: (value: boolean) => void
    mockCancelPlanningReminders.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishCancellation = resolve
        }),
    )
    const { result } = renderHook(() => useNotifications())

    let reminderUpdate!: Promise<string>
    act(() => {
      reminderUpdate = result.current.schedulePlanningReminder(21, 0)
    })
    await waitFor(() => expect(mockCancelPlanningReminders).toHaveBeenCalledTimes(1))

    const transition = runAccountTransition('user-1', async () => undefined)
    finishCancellation(true)

    await expect(reminderUpdate).rejects.toThrow(
      'The authenticated account changed while updating reminders.',
    )
    await transition
    expect(mockSchedulePlanningReminder).not.toHaveBeenCalled()
  })

  it('finishes account A cancellation before an account replacement can proceed', async () => {
    const events: string[] = []
    let finishCancellation!: (value: boolean) => void
    mockCancelPlanningReminders.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          events.push('cancel-started')
          finishCancellation = (value) => {
            events.push('cancel-finished')
            resolve(value)
          }
        }),
    )
    const { result } = renderHook(() => useNotifications())

    let cancellation!: Promise<void>
    act(() => {
      cancellation = result.current.cancelPlanningReminder()
    })
    await waitFor(() => expect(events).toEqual(['cancel-started']))

    const transition = runAccountTransition('user-1', async () => {
      events.push('transition')
      setActiveAccount('user-2')
    })
    expect(events).toEqual(['cancel-started'])

    finishCancellation(true)
    await expect(cancellation).rejects.toThrow(
      'The authenticated account changed while updating reminders.',
    )
    await transition
    expect(events).toEqual(['cancel-started', 'cancel-finished', 'transition'])
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
    mockGetExpoPushToken.mockResolvedValue('ExponentPushToken[shared-device]')

    const { rerender, unmount } = renderHook(() => useNotificationObserver())

    await act(async () => {
      jest.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(1))

    mockUseAuth.mockReturnValue({ user: { id: 'user-2' } })
    setActiveAccount('user-2')
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
    expect(mockRpc).toHaveBeenLastCalledWith('set_expected_user_expo_push_token', {
      p_expected_user_id: 'user-2',
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
