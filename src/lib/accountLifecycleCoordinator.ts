export type AccountLifecyclePhase = 'stable' | 'transitioning' | 'recovering'

// `stable + null` is signed out, while `stable + userId` is an active account.
// A transition advances the generation synchronously, invalidates late results,
// drains already-started account work, and does not become stable again until
// replacement commits or the retained account has been restored.

export interface AccountLifecycleSnapshot {
  phase: AccountLifecyclePhase
  generation: number
  activeUserId: string | null
  outgoingUserId: string | null
  recoveryError: string | null
}

export interface AccountOperationToken {
  userId: string | null
  generation: number
}

export type AccountOperationDisposition = 'current' | 'retained' | 'changed'

interface PendingRecovery {
  transitionId: number
  outgoingUserId: string | null
  retry: () => Promise<void>
}

let operationQueue: Promise<void> = Promise.resolve()
let transitionSequence = 0
let activeTransitionId: number | null = null
let pendingTransitionCount = 0
let pendingRecovery: PendingRecovery | null = null
let snapshot: AccountLifecycleSnapshot = {
  phase: 'stable',
  generation: 0,
  activeUserId: null,
  outgoingUserId: null,
  recoveryError: null,
}
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((listener) => listener())

const updateSnapshot = (next: AccountLifecycleSnapshot) => {
  snapshot = next
  emit()
}

const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
  const queued = operationQueue.catch(() => undefined).then(operation)
  operationQueue = queued.then(
    () => undefined,
    () => undefined,
  )
  return queued
}

export const getAccountLifecycleSnapshot = (): AccountLifecycleSnapshot => snapshot

export const subscribeToAccountLifecycle = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const canRunAccountOperation = (userId: string | null): boolean =>
  snapshot.phase === 'stable' && snapshot.activeUserId === userId

export const captureAccountOperationToken = (
  userId: string | null,
): AccountOperationToken | null =>
  canRunAccountOperation(userId) ? { userId, generation: snapshot.generation } : null

export const isAccountOperationTokenCurrent = (
  token: AccountOperationToken | null | undefined,
): token is AccountOperationToken =>
  !!token &&
  snapshot.phase === 'stable' &&
  snapshot.activeUserId === token.userId &&
  snapshot.generation === token.generation

export const reconcileAccountOperation = (
  token: AccountOperationToken | null | undefined,
  callback: (disposition: AccountOperationDisposition) => void,
): (() => void) => {
  if (!token) return () => undefined

  const getDisposition = (): AccountOperationDisposition | null => {
    if (snapshot.phase !== 'stable') return null
    if (snapshot.activeUserId !== token.userId) return 'changed'
    return snapshot.generation === token.generation ? 'current' : 'retained'
  }

  const immediateDisposition = getDisposition()
  if (immediateDisposition) {
    callback(immediateDisposition)
    return () => undefined
  }

  const unsubscribe = subscribeToAccountLifecycle(() => {
    const disposition = getDisposition()
    if (!disposition) return
    unsubscribe()
    callback(disposition)
  })
  return unsubscribe
}

export const runAccountOwnedOperation = <T>(
  userId: string | null,
  blockedValue: T,
  operation: (isCurrent: () => boolean) => Promise<T>,
): Promise<T> => {
  const generation = snapshot.generation
  const isCurrent = () =>
    snapshot.phase === 'stable' &&
    snapshot.generation === generation &&
    snapshot.activeUserId === userId

  if (!isCurrent()) return Promise.resolve(blockedValue)
  return enqueue(() => (isCurrent() ? operation(isCurrent) : Promise.resolve(blockedValue)))
}

export const requireAccountOwnedOperation = async <T>(
  userId: string,
  operation: (isCurrent: () => boolean) => Promise<T>,
): Promise<T> => {
  const blocked = Symbol('account-operation-blocked')
  const result = await runAccountOwnedOperation<T | typeof blocked>(userId, blocked, operation)
  if (result === blocked) {
    throw new Error('The operation was cancelled because the authenticated account changed.')
  }
  return result
}

export const runAccountTransition = <T>(
  outgoingUserId: string | null,
  operation: (transitionId: number) => Promise<T>,
): Promise<T> => {
  if (pendingRecovery || snapshot.phase === 'recovering') {
    return Promise.reject(new Error('Account recovery must complete before trying again.'))
  }
  const transitionId = ++transitionSequence
  const generation = snapshot.generation + 1
  pendingTransitionCount += 1
  updateSnapshot({
    phase: 'transitioning',
    generation,
    activeUserId: snapshot.activeUserId,
    outgoingUserId: pendingTransitionCount === 1 ? outgoingUserId : snapshot.outgoingUserId,
    recoveryError: null,
  })

  return enqueue(async () => {
    if (pendingRecovery && pendingRecovery.transitionId !== transitionId) {
      pendingTransitionCount -= 1
      updateSnapshot({
        ...snapshot,
        phase: 'recovering',
        outgoingUserId: pendingRecovery.outgoingUserId,
      })
      throw new Error('Account recovery must complete before trying again.')
    }
    activeTransitionId = transitionId
    updateSnapshot({
      ...snapshot,
      phase: 'transitioning',
      outgoingUserId,
      recoveryError: null,
    })
    try {
      return await operation(transitionId)
    } catch (error) {
      updateSnapshot({
        ...snapshot,
        phase: pendingRecovery?.transitionId === transitionId ? 'recovering' : 'transitioning',
        outgoingUserId,
      })
      throw error
    } finally {
      pendingTransitionCount -= 1
      activeTransitionId = null
      const recovery = pendingRecovery?.transitionId === transitionId ? pendingRecovery : null
      updateSnapshot({
        ...snapshot,
        phase: recovery ? 'recovering' : pendingTransitionCount === 0 ? 'stable' : 'transitioning',
        outgoingUserId: recovery ? recovery.outgoingUserId : null,
      })
    }
  })
}

export const registerAccountTransitionRecovery = (
  transitionId: number,
  outgoingUserId: string | null,
  retry: () => Promise<void>,
  error: unknown,
) => {
  if (activeTransitionId !== transitionId) return
  pendingRecovery = { transitionId, outgoingUserId, retry }
  updateSnapshot({
    ...snapshot,
    phase: 'recovering',
    outgoingUserId,
    recoveryError:
      error instanceof Error
        ? error.message
        : 'Account recovery could not be completed. Please try again.',
  })
}

export const retryAccountTransitionRecovery = (): Promise<boolean> => {
  const recovery = pendingRecovery
  if (!recovery) return Promise.resolve(snapshot.phase === 'stable')

  return enqueue(async () => {
    if (pendingRecovery !== recovery) return snapshot.phase === 'stable'
    try {
      await recovery.retry()
      if (pendingRecovery === recovery) pendingRecovery = null
      updateSnapshot({
        ...snapshot,
        phase: pendingTransitionCount === 0 ? 'stable' : 'transitioning',
        outgoingUserId: null,
        recoveryError: null,
      })
      return true
    } catch (error) {
      updateSnapshot({
        ...snapshot,
        phase: 'recovering',
        outgoingUserId: recovery.outgoingUserId,
        recoveryError:
          error instanceof Error
            ? error.message
            : 'Account recovery could not be completed. Please try again.',
      })
      return false
    }
  })
}

export const setTransitionOutgoingUser = (transitionId: number, userId: string | null) => {
  if (activeTransitionId !== transitionId || snapshot.phase === 'stable') return
  updateSnapshot({ ...snapshot, outgoingUserId: userId })
}

export const setActiveAccount = (userId: string | null) => {
  if (snapshot.activeUserId === userId) return
  updateSnapshot({ ...snapshot, activeUserId: userId })
}

export const resetAccountLifecycleCoordinatorForTests = () => {
  operationQueue = Promise.resolve()
  transitionSequence = 0
  activeTransitionId = null
  pendingTransitionCount = 0
  pendingRecovery = null
  snapshot = {
    phase: 'stable',
    generation: 0,
    activeUserId: null,
    outgoingUserId: null,
    recoveryError: null,
  }
  listeners.clear()
}
