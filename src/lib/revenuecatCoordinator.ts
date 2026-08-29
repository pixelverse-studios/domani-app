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
  if (requestedUserId === userId && pendingTransition) return pendingTransition
  if (requestedUserId === userId && activeUserId === userId) return Promise.resolve(true)

  requestedUserId = userId
  const generation = ++transitionGeneration

  const transition = enqueue(async () => {
    if (generation !== transitionGeneration) return false

    await operation()
    activeUserId = userId

    return generation === transitionGeneration
  })

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
): Promise<T> =>
  enqueue(async () => {
    if (requestedUserId !== userId || activeUserId !== userId) {
      throw new RevenueCatAccountChangedError()
    }

    const result = await operation()

    if (requestedUserId !== userId || activeUserId !== userId) {
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
