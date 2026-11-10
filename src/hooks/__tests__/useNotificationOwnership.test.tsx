import { act, renderHook } from '@testing-library/react-native'
import { useNotificationObserver } from '../useNotifications'
import { useAuth } from '~/hooks/useAuth'
import { claimCurrentUserPushToken } from '~/lib/pushTokenOwnership'

jest.mock('expo-constants', () => ({ appOwnership: 'standalone' }))
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: () => ({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: () => ({ remove: jest.fn() }),
  getLastNotificationResponseAsync: () => Promise.resolve(null),
}))
jest.mock('~/hooks/useAuth', () => ({ useAuth: jest.fn() }))
jest.mock('~/lib/pushTokenOwnership', () => ({ claimCurrentUserPushToken: jest.fn() }))
jest.mock('~/lib/notifications', () => ({
  NotificationService: {
    initialize: jest.fn(),
    getPermissionStatus: jest.fn().mockResolvedValue('granted'),
  },
}))
jest.mock('~/lib/supabase', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}))
jest.mock('~/stores/notificationStore', () => ({
  useNotificationStore: Object.assign(jest.fn(), {
    getState: () => ({ hasValidatedIds: true }),
  }),
}))
beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  jest.mocked(useAuth).mockReturnValue({ user: { id: 'account-a' } } as never)
  jest.mocked(claimCurrentUserPushToken).mockResolvedValue(true)
})
afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})
it('registers after account switch and again after signing back into the same account', async () => {
  const hook = renderHook(() => useNotificationObserver())
  await act(async () => {
    await jest.advanceTimersByTimeAsync(2000)
  })
  expect(claimCurrentUserPushToken).toHaveBeenLastCalledWith('account-a')
  jest.mocked(useAuth).mockReturnValue({ user: null } as never)
  hook.rerender({})
  jest.mocked(useAuth).mockReturnValue({ user: { id: 'account-a' } } as never)
  hook.rerender({})
  await act(async () => {
    await jest.advanceTimersByTimeAsync(2000)
  })
  expect(claimCurrentUserPushToken).toHaveBeenCalledTimes(2)
  jest.mocked(useAuth).mockReturnValue({ user: { id: 'account-b' } } as never)
  hook.rerender({})
  await act(async () => {
    await jest.advanceTimersByTimeAsync(2000)
  })
  expect(claimCurrentUserPushToken).toHaveBeenLastCalledWith('account-b')
})
it('keeps an in-flight retry bound to the original account after switching', async () => {
  jest
    .mocked(claimCurrentUserPushToken)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(false)
  const hook = renderHook(() => useNotificationObserver())
  await act(async () => {
    await jest.advanceTimersByTimeAsync(2000)
  })
  jest.mocked(useAuth).mockReturnValue({ user: { id: 'account-b' } } as never)
  hook.rerender({})
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000)
  })
  expect(jest.mocked(claimCurrentUserPushToken).mock.calls.slice(0, 2)).toEqual([
    ['account-a'],
    ['account-a'],
  ])
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000)
  })
  expect(claimCurrentUserPushToken).toHaveBeenLastCalledWith('account-b')
})
