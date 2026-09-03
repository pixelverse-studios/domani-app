import { waitFor } from '~/test/test-utils'
import { NotificationService } from '../notifications'
import {
  getAccountLifecycleSnapshot,
  resetAccountLifecycleCoordinatorForTests,
  runAccountOwnedOperation,
  retryAccountTransitionRecovery,
  setActiveAccount,
} from '../accountLifecycleCoordinator'
import { supabase } from '../supabase'
import {
  canRegisterPushTokenForUser,
  resetAccountTransitionSecurityForTests,
  securelyHandleExternalSessionLoss,
  securelyReplaceSession,
  securelySignOut,
} from '../accountTransitionSecurity'

jest.mock('../notifications', () => ({
  NotificationService: {
    cancelAllReminders: jest.fn(() => Promise.resolve(true)),
    getScheduledNotifications: jest.fn(() => Promise.resolve([])),
    restoreScheduledNotifications: jest.fn(() => Promise.resolve(true)),
  },
}))

const mockCancelAllReminders = NotificationService.cancelAllReminders as jest.Mock
const mockGetScheduledNotifications = NotificationService.getScheduledNotifications as jest.Mock
const mockRestoreScheduledNotifications =
  NotificationService.restoreScheduledNotifications as jest.Mock
const mockGetUser = supabase.auth.getUser as jest.Mock
const mockGetSession = supabase.auth.getSession as jest.Mock
const mockFrom = supabase.from as unknown as jest.Mock
const mockRpc = supabase.rpc as unknown as jest.Mock
const mockSignOut = supabase.auth.signOut as jest.Mock
const mockSetSession = supabase.auth.setSession as jest.Mock

function createPushTokenQuery(result: unknown) {
  const query = {} as {
    select: jest.Mock
    eq: jest.Mock
    maybeSingle: jest.Mock
  }
  query.select = jest.fn(() => query)
  query.eq = jest.fn(() => query)
  query.maybeSingle = jest.fn(() => Promise.resolve(result))
  return query
}

describe('accountTransitionSecurity', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    resetAccountLifecycleCoordinatorForTests()
    resetAccountTransitionSecurityForTests()
    setActiveAccount('user-1')
    mockCancelAllReminders.mockResolvedValue(true)
    mockGetScheduledNotifications.mockResolvedValue([])
    mockRestoreScheduledNotifications.mockResolvedValue(true)
    mockFrom.mockImplementation(() => createPushTokenQuery({ data: null, error: null }))
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockSignOut.mockResolvedValue({ error: null })
    mockSetSession.mockResolvedValue({ data: { session: null }, error: null })
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

  it('keeps external session loss gated until reminder cleanup can be retried', async () => {
    mockCancelAllReminders.mockResolvedValue(false)

    const cleanup = expect(securelyHandleExternalSessionLoss('user-1')).rejects.toThrow(
      'Unable to securely sign out because existing reminders could not be removed',
    )
    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(1))
    await jest.advanceTimersByTimeAsync(1000)
    await cleanup

    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'recovering',
      activeUserId: 'user-1',
      outgoingUserId: 'user-1',
    })
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()

    mockCancelAllReminders.mockResolvedValue(true)
    await expect(retryAccountTransitionRecovery()).resolves.toBe(true)
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      activeUserId: null,
      recoveryError: null,
    })
  })

  it('does not replace account A when notification purge cannot be verified', async () => {
    const reminders = [{ identifier: 'planning-1', content: {}, trigger: {} }]
    mockGetScheduledNotifications.mockResolvedValue(reminders)
    mockCancelAllReminders.mockResolvedValue(false)
    const replacement = jest.fn()

    const replacing = expect(securelyReplaceSession(replacement)).rejects.toThrow(
      'Unable to securely change accounts because existing reminders could not be removed',
    )
    await waitFor(() => expect(mockCancelAllReminders).toHaveBeenCalledTimes(1))
    await jest.advanceTimersByTimeAsync(1000)
    await replacing

    expect(replacement).not.toHaveBeenCalled()
    expect(mockRestoreScheduledNotifications).toHaveBeenCalledWith(reminders)
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      activeUserId: 'user-1',
    })
  })

  it('restores account reminders when sign-out fails after cleanup', async () => {
    const reminders = [{ identifier: 'planning-1', content: {}, trigger: {} }]
    mockGetScheduledNotifications.mockResolvedValue(reminders)
    mockSignOut.mockResolvedValue({ error: new Error('network unavailable') })

    await expect(securelySignOut('user-1')).rejects.toThrow('network unavailable')

    expect(mockRestoreScheduledNotifications).toHaveBeenCalledWith(reminders)
  })

  it('stays fail-closed and retries when reminder restoration initially fails', async () => {
    const reminders = [{ identifier: 'planning-1', content: {}, trigger: {} }]
    mockGetScheduledNotifications.mockResolvedValue(reminders)
    mockSignOut.mockResolvedValue({ error: new Error('network unavailable') })
    mockRestoreScheduledNotifications.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

    await expect(securelySignOut('user-1')).rejects.toThrow(
      'existing reminders could not be restored',
    )
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'recovering',
      activeUserId: 'user-1',
      recoveryError: expect.stringContaining('existing reminders could not be restored'),
    })
    expect(canRegisterPushTokenForUser('user-1')).toBe(false)

    await expect(retryAccountTransitionRecovery()).resolves.toBe(true)
    expect(mockRestoreScheduledNotifications).toHaveBeenCalledTimes(2)
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      activeUserId: 'user-1',
      recoveryError: null,
    })
  })

  it('reclaims the outgoing push token when sign-out fails', async () => {
    mockFrom.mockImplementation(() =>
      createPushTokenQuery({
        data: { expo_push_token: 'ExponentPushToken[user-1-device]' },
        error: null,
      }),
    )
    mockSignOut.mockResolvedValue({ error: new Error('network unavailable') })

    await expect(securelySignOut('user-1')).rejects.toThrow('network unavailable')

    expect(mockRpc).toHaveBeenNthCalledWith(1, 'set_current_user_expo_push_token', {
      p_token: null,
    })
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'set_current_user_expo_push_token', {
      p_token: 'ExponentPushToken[user-1-device]',
    })
  })

  it('restores a locally-cleared session when Supabase sign-out fails', async () => {
    const session = {
      user: { id: 'user-1' },
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    }
    mockGetSession
      .mockResolvedValueOnce({ data: { session }, error: null })
      .mockResolvedValueOnce({ data: { session: null }, error: null })
    mockSignOut.mockResolvedValue({ error: new Error('network unavailable') })
    mockSetSession.mockResolvedValue({ data: { session }, error: null })

    await expect(securelySignOut('user-1')).rejects.toThrow('network unavailable')

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    })
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      activeUserId: 'user-1',
    })
  })

  it('drains stale claims, releases the old token, and only then replaces the session', async () => {
    const events: string[] = []
    let resolveStaleClaim!: () => void
    void runAccountOwnedOperation(
      'user-1',
      undefined,
      () =>
        new Promise<void>((resolve) => {
          events.push('stale-claim-started')
          resolveStaleClaim = () => {
            events.push('stale-claim-finished')
            resolve()
          }
        }),
    )
    await waitFor(() => expect(events).toEqual(['stale-claim-started']))

    const replacement = jest.fn(async () => {
      events.push('session-replaced')
      const session = { user: { id: 'user-2' } }
      mockGetSession.mockResolvedValue({ data: { session }, error: null })
      return { data: { session }, error: null }
    })
    const transition = securelyReplaceSession(replacement)

    expect(canRegisterPushTokenForUser('user-1')).toBe(false)
    expect(replacement).not.toHaveBeenCalled()
    expect(mockCancelAllReminders).not.toHaveBeenCalled()

    resolveStaleClaim()
    mockRpc.mockImplementation(async () => {
      events.push('old-token-released')
      return { data: null, error: null }
    })

    await expect(transition).resolves.toMatchObject({
      data: { session: { user: { id: 'user-2' } } },
    })
    expect(mockCancelAllReminders).toHaveBeenCalledTimes(1)
    expect(events).toEqual([
      'stale-claim-started',
      'stale-claim-finished',
      'old-token-released',
      'session-replaced',
    ])
    expect(canRegisterPushTokenForUser('user-1')).toBe(false)
    expect(canRegisterPushTokenForUser('user-2')).toBe(true)
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

  it('restores account A when OAuth exchange fails after cleanup', async () => {
    const reminders = [{ identifier: 'planning-1', content: {}, trigger: {} }]
    mockGetScheduledNotifications.mockResolvedValue(reminders)
    mockFrom.mockImplementation(() =>
      createPushTokenQuery({
        data: { expo_push_token: 'ExponentPushToken[user-1-device]' },
        error: null,
      }),
    )

    await expect(
      securelyReplaceSession(async () => {
        throw new Error('sanitized OAuth failure')
      }),
    ).rejects.toThrow('sanitized OAuth failure')

    expect(mockRestoreScheduledNotifications).toHaveBeenCalledWith(reminders)
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'set_current_user_expo_push_token', {
      p_token: 'ExponentPushToken[user-1-device]',
    })
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      activeUserId: 'user-1',
    })
  })

  it('allows a verified signed-out login without attempting token release', async () => {
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValue({ data: { session: { user: { id: 'user-2' } } }, error: null })
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
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      activeUserId: 'user-2',
    })
  })

  it('drains an active notification schedule, purges it, and blocks later schedules', async () => {
    const events: string[] = []
    let finishSchedule!: () => void
    const activeSchedule = runAccountOwnedOperation(
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
    await waitFor(() => expect(events).toEqual(['schedule-started']))
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
      runAccountOwnedOperation('user-1', null, blockedScheduleOperation),
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
