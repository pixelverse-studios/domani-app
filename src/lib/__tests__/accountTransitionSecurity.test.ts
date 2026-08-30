import { waitFor } from '~/test/test-utils'
import { NotificationService } from '../notifications'
import { queuePushTokenOperation, resetPushTokenCoordinatorForTests } from '../pushTokenCoordinator'
import { supabase } from '../supabase'
import {
  canRegisterPushTokenForUser,
  resetAccountTransitionSecurityForTests,
  securelyReplaceSession,
  securelySignOut,
} from '../accountTransitionSecurity'
import { queueAccountNotificationOperation } from '../accountNotificationCoordinator'

jest.mock('../notifications', () => ({
  NotificationService: {
    cancelAllReminders: jest.fn(() => Promise.resolve(true)),
  },
}))

const mockCancelAllReminders = NotificationService.cancelAllReminders as jest.Mock
const mockGetUser = supabase.auth.getUser as jest.Mock
const mockGetSession = supabase.auth.getSession as jest.Mock
const mockRpc = supabase.rpc as unknown as jest.Mock
const mockSignOut = supabase.auth.signOut as jest.Mock

describe('accountTransitionSecurity', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    resetPushTokenCoordinatorForTests()
    resetAccountTransitionSecurityForTests()
    mockCancelAllReminders.mockResolvedValue(true)
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

  it('keeps the current session active when reminder cleanup cannot be verified', async () => {
    mockCancelAllReminders.mockResolvedValue(false)

    const signOut = expect(securelySignOut('user-1')).rejects.toThrow(
      'Unable to securely sign out because existing reminders could not be removed',
    )
    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(1))

    await jest.advanceTimersByTimeAsync(1000)

    await signOut
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('drains stale claims, releases the old token, and only then replaces the session', async () => {
    const events: string[] = []
    let resolveStaleClaim!: () => void
    void queuePushTokenOperation(
      () =>
        new Promise<void>((resolve) => {
          events.push('stale-claim-started')
          resolveStaleClaim = () => {
            events.push('stale-claim-finished')
            resolve()
          }
        }),
    )

    const replacement = jest.fn(async () => {
      events.push('session-replaced')
      return 'replacement-session'
    })
    const transition = securelyReplaceSession(replacement)

    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(1))
    expect(canRegisterPushTokenForUser('user-1')).toBe(false)
    expect(replacement).not.toHaveBeenCalled()

    resolveStaleClaim()
    mockRpc.mockImplementation(async () => {
      events.push('old-token-released')
      return { data: null, error: null }
    })

    await expect(transition).resolves.toBe('replacement-session')
    expect(events).toEqual([
      'stale-claim-started',
      'stale-claim-finished',
      'old-token-released',
      'session-replaced',
    ])
    expect(canRegisterPushTokenForUser('user-1')).toBe(true)
  })

  it('does not replace the session when old-token release cannot be confirmed', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'NETWORK_ERROR' } })
    const replacement = jest.fn()

    await expect(securelyReplaceSession(replacement)).rejects.toThrow(
      'Unable to securely change accounts',
    )

    expect(mockRpc).toHaveBeenCalledTimes(3)
    expect(replacement).not.toHaveBeenCalled()
  })

  it('allows a verified signed-out login without attempting token release', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Auth session missing'),
    })
    const replacement = jest.fn().mockResolvedValue('new-session')

    await expect(securelyReplaceSession(replacement)).resolves.toBe('new-session')

    expect(mockCancelAllReminders).toHaveBeenCalledTimes(1)
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rechecks the active session inside the queue before a concurrent replacement', async () => {
    const events: string[] = []
    let currentUserId: string | null = null
    mockGetSession.mockImplementation(async () => ({
      data: {
        session: currentUserId ? { user: { id: currentUserId } } : null,
      },
      error: null,
    }))
    mockGetUser.mockImplementation(async () => ({
      data: { user: currentUserId ? { id: currentUserId } : null },
      error: null,
    }))
    mockCancelAllReminders.mockImplementation(async () => {
      events.push('notifications-purged')
      return true
    })
    mockRpc.mockImplementation(async () => {
      events.push(`token-released:${currentUserId}`)
      return { data: null, error: null }
    })

    const first = securelyReplaceSession(async () => {
      currentUserId = 'user-1'
      events.push('session-set:user-1')
      return 'user-1'
    })
    const second = securelyReplaceSession(async () => {
      currentUserId = 'user-2'
      events.push('session-set:user-2')
      return 'user-2'
    })

    await expect(Promise.all([first, second])).resolves.toEqual(['user-1', 'user-2'])
    expect(events).toEqual([
      'notifications-purged',
      'session-set:user-1',
      'notifications-purged',
      'token-released:user-1',
      'session-set:user-2',
    ])
  })

  it('drains an active notification schedule, purges it, and blocks later schedules', async () => {
    const events: string[] = []
    let finishSchedule!: () => void
    const activeSchedule = queueAccountNotificationOperation(
      'user-1',
      null,
      () =>
        new Promise<string>((resolve) => {
          events.push('schedule-started')
          finishSchedule = () => {
            events.push('schedule-finished')
            resolve('notification-1')
          }
        }),
    )
    mockCancelAllReminders.mockImplementation(async () => {
      events.push('notifications-purged')
      return true
    })
    mockRpc.mockImplementation(async () => {
      events.push('token-released')
      return { data: null, error: null }
    })
    mockSignOut.mockImplementation(async () => {
      events.push('signed-out')
      return { error: null }
    })

    const signOut = securelySignOut('user-1')
    await waitFor(() => expect(canRegisterPushTokenForUser('user-1')).toBe(false))

    const blockedScheduleOperation = jest.fn().mockResolvedValue('notification-2')
    await expect(
      queueAccountNotificationOperation('user-1', null, blockedScheduleOperation),
    ).resolves.toBeNull()
    expect(blockedScheduleOperation).not.toHaveBeenCalled()
    expect(mockCancelAllReminders).not.toHaveBeenCalled()

    finishSchedule()
    await expect(activeSchedule).resolves.toBe('notification-1')
    await expect(signOut).resolves.toBe(true)
    expect(events).toEqual([
      'schedule-started',
      'schedule-finished',
      'notifications-purged',
      'token-released',
      'signed-out',
    ])
  })

  it('purges reminders even when sign-out starts without a resolved user', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    await expect(securelySignOut(null)).resolves.toBe(true)

    expect(mockCancelAllReminders).toHaveBeenCalledTimes(1)
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
})
