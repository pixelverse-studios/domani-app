import {
  getAccountLifecycleSnapshot,
  runAccountOwnedOperation,
} from './accountLifecycleCoordinator'

export class RevenueCatAccountChangedError extends Error {
  constructor() {
    super('RevenueCat operation was cancelled because the authenticated account changed.')
    this.name = 'RevenueCatAccountChangedError'
  }
}

type RevenueCatUserId = string | null

let operationQueue: Promise<unknown> = Promise.resolve()
let requestedUserId: RevenueCatUserId | undefined
let activeUserId: RevenueCatUserId | undefined
let transitionGeneration = 0
let pendingTransition: Promise<boolean> | null = null

const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
  const queued = operationQueue.catch(() => undefined).then(operation)
  operationQueue = queued
  return queued
}

export const transitionRevenueCatIdentity = (
  userId: RevenueCatUserId,
  operation: () => Promise<void>,
): Promise<boolean> => {
  const lifecycleGeneration = getAccountLifecycleSnapshot().generation
  if (
    getAccountLifecycleSnapshot().phase !== 'stable' ||
    getAccountLifecycleSnapshot().activeUserId !== userId
  )
    return Promise.resolve(false)
  if (requestedUserId === userId && pendingTransition) return pendingTransition
  if (requestedUserId === userId && activeUserId === userId) return Promise.resolve(true)

  requestedUserId = userId
  const generation = ++transitionGeneration
  const blocked = Symbol('revenue-cat-identity-transition-blocked')

  const transition = runAccountOwnedOperation<boolean | typeof blocked>(userId, blocked, () =>
    enqueue(async () => {
      if (
        generation !== transitionGeneration ||
        getAccountLifecycleSnapshot().generation !== lifecycleGeneration
      )
        return false

      await operation()
      if (
        getAccountLifecycleSnapshot().phase !== 'stable' ||
        getAccountLifecycleSnapshot().activeUserId !== userId ||
        getAccountLifecycleSnapshot().generation !== lifecycleGeneration
      )
        return false
      activeUserId = userId

      return generation === transitionGeneration
    }),
  ).then((result) => result !== blocked && result)

  pendingTransition = transition
  void transition
    .finally(() => {
      if (pendingTransition === transition) pendingTransition = null
    })
    .catch(() => undefined)
  return transition
}

export const runRevenueCatUserOperation = <T>(
  userId: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const blocked = Symbol('revenue-cat-account-changed')
  return runAccountOwnedOperation<T | typeof blocked>(userId, blocked, () =>
    enqueue(async () => {
      const lifecycleGeneration = getAccountLifecycleSnapshot().generation
      if (requestedUserId !== userId || activeUserId !== userId) {
        throw new RevenueCatAccountChangedError()
      }
      if (getAccountLifecycleSnapshot().phase !== 'stable') {
        throw new RevenueCatAccountChangedError()
      }
      if (getAccountLifecycleSnapshot().activeUserId !== userId) {
        throw new RevenueCatAccountChangedError()
      }

      const result = await operation()

      if (
        requestedUserId !== userId ||
        activeUserId !== userId ||
        getAccountLifecycleSnapshot().phase !== 'stable' ||
        getAccountLifecycleSnapshot().activeUserId !== userId ||
        getAccountLifecycleSnapshot().generation !== lifecycleGeneration
      ) {
        throw new RevenueCatAccountChangedError()
      }

      return result
    }),
  ).then((result) => {
    if (result === blocked) throw new RevenueCatAccountChangedError()
    return result
  })
}

// Use only from inside an already-registered account lifecycle operation.
// Re-entering runAccountOwnedOperation from that position would queue behind
// the caller and deadlock. The RevenueCat queue and captured lifecycle
// generation still invalidate the result before the outer operation exits.
export const runRevenueCatUserOperationWithinAccountOperation = <T>(
  userId: string,
  operation: () => Promise<T>,
): Promise<T> =>
  enqueue(async () => {
    const lifecycle = getAccountLifecycleSnapshot()
    if (
      lifecycle.phase !== 'stable' ||
      lifecycle.activeUserId !== userId ||
      requestedUserId !== userId ||
      activeUserId !== userId
    ) {
      throw new RevenueCatAccountChangedError()
    }

    const result = await operation()
    const after = getAccountLifecycleSnapshot()
    if (
      after.phase !== 'stable' ||
      after.activeUserId !== userId ||
      after.generation !== lifecycle.generation ||
      requestedUserId !== userId ||
      activeUserId !== userId
    ) {
      throw new RevenueCatAccountChangedError()
    }

    return result
  })

export const isRevenueCatAccountChangedError = (
  error: unknown,
): error is RevenueCatAccountChangedError => error instanceof RevenueCatAccountChangedError

export const resetRevenueCatCoordinatorForTests = () => {
  operationQueue = Promise.resolve()
  requestedUserId = undefined
  activeUserId = undefined
  transitionGeneration = 0
  pendingTransition = null
}
