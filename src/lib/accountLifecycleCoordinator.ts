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
}

let operationQueue: Promise<void> = Promise.resolve()
let transitionSequence = 0
let activeTransitionId: number | null = null
let pendingTransitionCount = 0
let snapshot: AccountLifecycleSnapshot = {
  phase: 'stable',
  generation: 0,
  activeUserId: null,
  outgoingUserId: null,
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

export const canRunAccountOperation = (userId: string): boolean =>
  snapshot.phase === 'stable' && snapshot.activeUserId === userId

export const runAccountOwnedOperation = <T>(
  userId: string,
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

export const runAccountTransition = <T>(
  outgoingUserId: string | null,
  operation: (transitionId: number) => Promise<T>,
): Promise<T> => {
  const transitionId = ++transitionSequence
  const generation = snapshot.generation + 1
  pendingTransitionCount += 1
  updateSnapshot({
    phase: 'transitioning',
    generation,
    activeUserId: snapshot.activeUserId,
    outgoingUserId: pendingTransitionCount === 1 ? outgoingUserId : snapshot.outgoingUserId,
  })

  return enqueue(async () => {
    activeTransitionId = transitionId
    updateSnapshot({
      ...snapshot,
      phase: 'transitioning',
      outgoingUserId,
    })
    try {
      return await operation(transitionId)
    } catch (error) {
      updateSnapshot({ ...snapshot, phase: 'recovering', outgoingUserId })
      throw error
    } finally {
      pendingTransitionCount -= 1
      activeTransitionId = null
      updateSnapshot({
        ...snapshot,
        phase: pendingTransitionCount === 0 ? 'stable' : 'transitioning',
        outgoingUserId: null,
      })
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
  snapshot = { phase: 'stable', generation: 0, activeUserId: null, outgoingUserId: null }
  listeners.clear()
}
