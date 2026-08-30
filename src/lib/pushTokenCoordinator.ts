let pushTokenOperationQueue: Promise<void> = Promise.resolve()

export function queuePushTokenOperation<T>(operation: () => Promise<T>): Promise<T> {
  const queuedOperation = pushTokenOperationQueue.catch(() => undefined).then(operation)
  pushTokenOperationQueue = queuedOperation.then(
    () => undefined,
    () => undefined,
  )
  return queuedOperation
}

export function resetPushTokenCoordinatorForTests() {
  pushTokenOperationQueue = Promise.resolve()
}
