import { NotificationService } from './notifications'
import {
  blockAccountNotificationOperations,
  queueAccountNotificationPurge,
  resetAccountNotificationCoordinatorForTests,
  unblockAccountNotificationOperations,
} from './accountNotificationCoordinator'
import { queuePushTokenOperation } from './pushTokenCoordinator'
import { supabase } from './supabase'

const NOTIFICATION_PURGE_ATTEMPTS = 3
const NOTIFICATION_PURGE_RETRY_DELAY_MS = 250
const PUSH_TOKEN_RELEASE_ATTEMPTS = 3

let accountTransitionQueue: Promise<void> = Promise.resolve()
const blockedPushTokenUsers = new Map<string, number>()

const wait = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs))

export function queueAccountNotificationReset(): Promise<boolean> {
  const resetAttempt = queueAccountNotificationPurge(() => NotificationService.cancelAllReminders())
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

const blockPushTokenRegistration = (userId: string | null) => {
  if (!userId) return
  blockedPushTokenUsers.set(userId, (blockedPushTokenUsers.get(userId) ?? 0) + 1)
}

const blockAccountNativeState = (userId: string | null) => {
  blockPushTokenRegistration(userId)
  blockAccountNotificationOperations(userId)
}

const unblockAccountNativeState = (userId: string | null) => {
  unblockPushTokenRegistration(userId)
  unblockAccountNotificationOperations(userId)
}

const unblockPushTokenRegistration = (userId: string | null) => {
  if (!userId) return
  const remainingBlocks = (blockedPushTokenUsers.get(userId) ?? 1) - 1
  if (remainingBlocks > 0) blockedPushTokenUsers.set(userId, remainingBlocks)
  else blockedPushTokenUsers.delete(userId)
}

export const canRegisterPushTokenForUser = (userId: string): boolean =>
  !blockedPushTokenUsers.has(userId)

const queueAccountTransition = <T>(operation: () => Promise<T>): Promise<T> => {
  const queuedOperation = accountTransitionQueue.catch(() => undefined).then(operation)
  accountTransitionQueue = queuedOperation.then(
    () => undefined,
    () => undefined,
  )
  return queuedOperation
}

async function releaseCurrentPushToken(
  expectedUserId: string,
  options: { allowReleaseFailure?: boolean; action: 'sign out' | 'change accounts' },
): Promise<boolean> {
  return queuePushTokenOperation(async () => {
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
  })
}

export async function securelyReplaceSession<T>(operation: () => Promise<T>): Promise<T> {
  return queueAccountTransition(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    if (sessionError) throw new Error('Unable to inspect the current session before sign-in.')

    if (!session?.user) {
      await requireAccountNotificationReset('change accounts')
      return operation()
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || user?.id !== session.user.id) {
      throw new Error('Unable to verify the current account before sign-in.')
    }

    blockAccountNativeState(user.id)
    try {
      await requireAccountNotificationReset('change accounts')
      if (!(await releaseCurrentPushToken(user.id, { action: 'change accounts' }))) {
        throw new Error('The authenticated account changed before secure cleanup completed.')
      }
      return operation()
    } finally {
      unblockAccountNativeState(user.id)
    }
  })
}

export async function securelySignOut(
  expectedUserId: string | null,
  options: { allowReleaseFailure?: boolean } = {},
): Promise<boolean> {
  return queueAccountTransition(async () => {
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

    blockAccountNativeState(resolvedUserId)
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
      return true
    } finally {
      unblockAccountNativeState(resolvedUserId)
    }
  })
}

export function resetAccountTransitionSecurityForTests() {
  accountTransitionQueue = Promise.resolve()
  blockedPushTokenUsers.clear()
  resetAccountNotificationCoordinatorForTests()
}
