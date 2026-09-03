import { NotificationService } from './notifications'
import type { Session } from '@supabase/supabase-js'
import {
  canRunAccountOperation,
  registerAccountTransitionRecovery,
  resetAccountLifecycleCoordinatorForTests,
  runAccountTransition,
  setActiveAccount,
  setTransitionOutgoingUser,
} from './accountLifecycleCoordinator'
import { supabase } from './supabase'

const NOTIFICATION_PURGE_ATTEMPTS = 3
const NOTIFICATION_PURGE_RETRY_DELAY_MS = 250
const PUSH_TOKEN_RELEASE_ATTEMPTS = 3

const wait = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs))

function queueAccountNotificationReset(): Promise<boolean> {
  const resetAttempt = NotificationService.cancelAllReminders()
  const settledReset = resetAttempt.catch((error) => {
    console.warn('[AccountTransition] Failed to reset account notifications:', error)
    return false
  })

  return settledReset
}

async function requireAccountNotificationReset(
  action: 'sign out' | 'change accounts',
): Promise<void> {
  for (let attempt = 1; attempt <= NOTIFICATION_PURGE_ATTEMPTS; attempt += 1) {
    if (await queueAccountNotificationReset()) return
    if (attempt < NOTIFICATION_PURGE_ATTEMPTS) {
      await wait(NOTIFICATION_PURGE_RETRY_DELAY_MS * attempt)
    }
  }

  throw new Error(
    `Unable to securely ${action} because existing reminders could not be removed. Please try again.`,
  )
}

export const canRegisterPushTokenForUser = (userId: string): boolean =>
  canRunAccountOperation(userId)

async function releaseCurrentPushToken(
  expectedUserId: string,
  options: { allowReleaseFailure?: boolean; action: 'sign out' | 'change accounts' },
): Promise<boolean> {
  return (async () => {
    const {
      data: { user: currentUser },
      error: currentUserError,
    } = await supabase.auth.getUser()

    if (currentUserError) {
      const {
        data: { session: localSession },
      } = await supabase.auth.getSession()
      if (localSession?.user.id && localSession.user.id !== expectedUserId) {
        if (options.allowReleaseFailure) return false
        throw new Error('The authenticated account changed before secure cleanup completed.')
      }
      if (options.allowReleaseFailure) return true
      throw new Error('Unable to verify the authenticated account before secure cleanup.')
    }

    if (currentUser?.id !== expectedUserId) {
      if (options.allowReleaseFailure && !currentUser) return true
      if (options.allowReleaseFailure) return false
      throw new Error('The authenticated account changed before secure cleanup completed.')
    }

    let releaseError: { code?: string; message?: string } | null = null
    for (let attempt = 1; attempt <= PUSH_TOKEN_RELEASE_ATTEMPTS; attempt += 1) {
      const result = await supabase.rpc('set_current_user_expo_push_token', {
        p_token: null,
      })
      releaseError = result.error
      if (!releaseError) break
      console.warn('[AccountTransition] Failed to release push token:', {
        attempt,
        code: releaseError.code,
      })
    }

    if (releaseError) {
      if (options.allowReleaseFailure) return true
      throw new Error(
        `Unable to securely ${options.action}. Please check your connection and try again.`,
      )
    }

    const {
      data: { user: userAfterRelease },
    } = await supabase.auth.getUser()
    if (userAfterRelease?.id !== expectedUserId) {
      if (options.allowReleaseFailure && !userAfterRelease) return true
      if (options.allowReleaseFailure) return false
      throw new Error('The authenticated account changed before secure cleanup completed.')
    }

    return true
  })()
}

async function restoreNotificationsAfterFailure(snapshot: unknown[]): Promise<void> {
  const restored = await NotificationService.restoreScheduledNotifications(snapshot)
  if (!restored) {
    throw new Error(
      'The account transition failed and existing reminders could not be restored. Please retry notification setup.',
    )
  }
}

async function restorePushTokenAfterFailure(token: string | null): Promise<void> {
  if (!token) return
  const { error } = await supabase.rpc('set_current_user_expo_push_token', { p_token: token })
  if (error) {
    throw new Error(
      'The account transition failed and push notifications could not be restored. Please retry notification setup.',
    )
  }
}

async function getStoredPushToken(
  expectedUserId: string,
  allowUnavailable: boolean = false,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', expectedUserId)
    .maybeSingle()

  if (error) {
    if (allowUnavailable) return null
    throw new Error('Unable to snapshot push notification ownership before account cleanup.')
  }

  return data?.expo_push_token ?? null
}

async function activateReplacementResult(result: unknown): Promise<void> {
  const returnedSession = (result as { data?: { session?: { user?: { id?: string } } | null } })
    ?.data?.session
  if (returnedSession?.user?.id) {
    setActiveAccount(returnedSession.user.id)
    return
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error || !session?.user.id) {
    throw new Error('Unable to verify the new authenticated session. Please try again.')
  }
  setActiveAccount(session.user.id)
}

async function restoreOutgoingSessionIfNeeded(session: Session): Promise<boolean> {
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession()
  if (currentSession?.user.id === session.user.id) return true
  if (currentSession) return false
  if (!session.access_token || !session.refresh_token) return false

  const { data, error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (error || data.session?.user.id !== session.user.id) {
    throw new Error(
      'The account transition failed and the previous session could not be restored. Please sign in again.',
    )
  }
  return true
}

async function restoreOutgoingAccount(
  session: Session,
  notificationSnapshot: unknown[],
  pushTokenSnapshot: string | null,
): Promise<void> {
  const restored = await restoreOutgoingSessionIfNeeded(session)
  if (!restored) {
    throw new Error(
      'The account transition failed and the previous session could not be restored. Please sign in again.',
    )
  }
  setActiveAccount(session.user.id)
  await restoreNotificationsAfterFailure(notificationSnapshot)
  await restorePushTokenAfterFailure(pushTokenSnapshot)
}

async function recoverOutgoingAccountOrRequireRetry(
  transitionId: number,
  session: Session,
  notificationSnapshot: unknown[],
  pushTokenSnapshot: string | null,
): Promise<void> {
  const retry = () => restoreOutgoingAccount(session, notificationSnapshot, pushTokenSnapshot)
  try {
    await retry()
  } catch (recoveryError) {
    registerAccountTransitionRecovery(transitionId, session.user.id, retry, recoveryError)
    throw recoveryError
  }
}

export async function securelyReplaceSession<T>(operation: () => Promise<T>): Promise<T> {
  return runAccountTransition(null, async (transitionId) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    if (sessionError) throw new Error('Unable to inspect the current session before sign-in.')
    setTransitionOutgoingUser(transitionId, session?.user.id ?? null)

    if (!session?.user) {
      await requireAccountNotificationReset('change accounts')
      const result = await operation()
      await activateReplacementResult(result)
      return result
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || user?.id !== session.user.id) {
      throw new Error('Unable to verify the current account before sign-in.')
    }

    const notificationSnapshot = await NotificationService.getScheduledNotifications()
    const pushTokenSnapshot = await getStoredPushToken(user.id)
    try {
      await requireAccountNotificationReset('change accounts')
      if (!(await releaseCurrentPushToken(user.id, { action: 'change accounts' }))) {
        throw new Error('The authenticated account changed before secure cleanup completed.')
      }
      const result = await operation()
      await activateReplacementResult(result)
      return result
    } catch (error) {
      await recoverOutgoingAccountOrRequireRetry(
        transitionId,
        session,
        notificationSnapshot,
        pushTokenSnapshot,
      )
      throw error
    }
  })
}

export async function securelySignOut(
  expectedUserId: string | null,
  options: { allowReleaseFailure?: boolean } = {},
): Promise<boolean> {
  return runAccountTransition(expectedUserId, async (transitionId) => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    if (error) throw new Error('Unable to inspect the current session before sign-out.')

    const resolvedUserId = session?.user.id ?? null
    if (expectedUserId && resolvedUserId && expectedUserId !== resolvedUserId) {
      if (options.allowReleaseFailure) return false
      throw new Error('The authenticated account changed before secure cleanup completed.')
    }

    const notificationSnapshot = resolvedUserId
      ? await NotificationService.getScheduledNotifications()
      : []
    const pushTokenSnapshot = resolvedUserId
      ? await getStoredPushToken(resolvedUserId, options.allowReleaseFailure)
      : null
    try {
      await requireAccountNotificationReset('sign out')
      if (resolvedUserId) {
        const released = await releaseCurrentPushToken(resolvedUserId, {
          ...options,
          action: 'sign out',
        })
        if (!released) return false
      }

      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      setActiveAccount(null)
      return true
    } catch (transitionError) {
      if (resolvedUserId && session) {
        await recoverOutgoingAccountOrRequireRetry(
          transitionId,
          session,
          notificationSnapshot,
          pushTokenSnapshot,
        )
      }
      throw transitionError
    }
  })
}

export function resetAccountTransitionSecurityForTests() {
  resetAccountLifecycleCoordinatorForTests()
}
