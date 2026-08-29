import { renderHook, waitFor } from '~/test/test-utils'
import { useNotificationObserver } from '../useNotifications'
import { NotificationService } from '~/lib/notifications'

const mockUseAuth = jest.fn()

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
}))

jest.mock('~/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('~/lib/notifications', () => ({
  NotificationService: {
    cancelAllReminders: jest.fn(() => Promise.resolve(true)),
    getPermissionStatus: jest.fn(() => Promise.resolve('granted')),
    initialize: jest.fn(() => Promise.resolve()),
  },
}))

const mockCancelAllReminders = NotificationService.cancelAllReminders as jest.Mock

describe('useNotificationObserver account scoping', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
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
})
