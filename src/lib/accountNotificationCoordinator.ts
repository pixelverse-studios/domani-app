let accountNotificationOperationQueue: Promise<void> = Promise.resolve()
const blockedAccountNotificationUsers = new Map<string, number>()

const enqueueAccountNotificationOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  const queuedOperation = accountNotificationOperationQueue.catch(() => undefined).then(operation)
  accountNotificationOperationQueue = queuedOperation.then(
    () => undefined,
    () => undefined,
  )
  return queuedOperation
}

export const blockAccountNotificationOperations = (userId: string | null) => {
  if (!userId) return
  blockedAccountNotificationUsers.set(
    userId,
    (blockedAccountNotificationUsers.get(userId) ?? 0) + 1,
  )
}

export const unblockAccountNotificationOperations = (userId: string | null) => {
  if (!userId) return
  const remainingBlocks = (blockedAccountNotificationUsers.get(userId) ?? 1) - 1
  if (remainingBlocks > 0) blockedAccountNotificationUsers.set(userId, remainingBlocks)
  else blockedAccountNotificationUsers.delete(userId)
}

export const queueAccountNotificationOperation = <T>(
  userId: string,
  blockedValue: T,
  operation: () => Promise<T>,
): Promise<T> => {
  if (blockedAccountNotificationUsers.has(userId)) return Promise.resolve(blockedValue)

  return enqueueAccountNotificationOperation(() =>
    blockedAccountNotificationUsers.has(userId) ? Promise.resolve(blockedValue) : operation(),
  )
}

export const queueAccountNotificationPurge = (
  operation: () => Promise<boolean>,
): Promise<boolean> => enqueueAccountNotificationOperation(operation)

export const resetAccountNotificationCoordinatorForTests = () => {
  accountNotificationOperationQueue = Promise.resolve()
  blockedAccountNotificationUsers.clear()
}
