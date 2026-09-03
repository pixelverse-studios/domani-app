import {
  RevenueCatAccountChangedError,
  resetRevenueCatCoordinatorForTests,
  runRevenueCatUserOperation,
  transitionRevenueCatIdentity,
} from '../revenuecatCoordinator'
import {
  resetAccountLifecycleCoordinatorForTests,
  runAccountTransition,
  setActiveAccount,
} from '../accountLifecycleCoordinator'

describe('RevenueCat account coordinator', () => {
  beforeEach(() => {
    resetAccountLifecycleCoordinatorForTests()
    setActiveAccount('user-1')
    resetRevenueCatCoordinatorForTests()
  })

  it('deduplicates the same requested identity across hook instances', async () => {
    const transition = jest.fn(() => Promise.resolve())

    const first = transitionRevenueCatIdentity('user-1', transition)
    const second = transitionRevenueCatIdentity('user-1', transition)

    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    expect(transition).toHaveBeenCalledTimes(1)
  })

  it('finishes an active operation before applying the next identity', async () => {
    let finishOperation!: () => void
    let markOperationStarted!: () => void
    const events: string[] = []
    const operationStarted = new Promise<void>((resolve) => {
      markOperationStarted = resolve
    })

    await transitionRevenueCatIdentity('user-1', async () => {
      events.push('login-1')
    })

    const operation = runRevenueCatUserOperation(
      'user-1',
      () =>
        new Promise<string>((resolve) => {
          events.push('operation-1')
          finishOperation = () => resolve('finished')
          markOperationStarted()
        }),
    )
    await operationStarted

    setActiveAccount('user-2')
    const transition = transitionRevenueCatIdentity('user-2', async () => {
      events.push('login-2')
    })

    finishOperation()

    await expect(operation).rejects.toBeInstanceOf(RevenueCatAccountChangedError)
    await expect(transition).resolves.toBe(true)
    expect(events).toEqual(['login-1', 'operation-1', 'login-2'])
  })

  it('skips an obsolete queued transition', async () => {
    const blocker = transitionRevenueCatIdentity('user-1', async () => undefined)
    setActiveAccount('user-2')
    const obsolete = transitionRevenueCatIdentity('user-2', async () => {
      throw new Error('obsolete transition should not run')
    })
    setActiveAccount('user-3')
    const latest = transitionRevenueCatIdentity('user-3', async () => undefined)

    await blocker
    await expect(obsolete).resolves.toBe(false)
    await expect(latest).resolves.toBe(true)
  })

  it('fails closed and allows retry when an identity transition fails', async () => {
    await transitionRevenueCatIdentity('user-1', async () => undefined)
    setActiveAccount('user-2')
    await expect(
      transitionRevenueCatIdentity('user-2', async () => {
        throw new Error('login failed')
      }),
    ).rejects.toThrow('login failed')

    await expect(
      runRevenueCatUserOperation('user-2', async () => 'unsafe result'),
    ).rejects.toBeInstanceOf(RevenueCatAccountChangedError)

    const retry = jest.fn(() => Promise.resolve())
    await expect(transitionRevenueCatIdentity('user-2', retry)).resolves.toBe(true)
    await expect(runRevenueCatUserOperation('user-2', async () => 'safe result')).resolves.toBe(
      'safe result',
    )
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('drains a purchase before account replacement mutates auth identity', async () => {
    await transitionRevenueCatIdentity('user-1', async () => undefined)
    let finishPurchase!: () => void
    let markPurchaseStarted!: () => void
    const purchaseStarted = new Promise<void>((resolve) => {
      markPurchaseStarted = resolve
    })
    const purchase = runRevenueCatUserOperation(
      'user-1',
      () =>
        new Promise<string>((resolve) => {
          finishPurchase = () => resolve('customer-info-for-user-1')
          markPurchaseStarted()
        }),
    )
    await purchaseStarted

    let transitionStarted = false
    const transition = runAccountTransition('user-1', async () => {
      transitionStarted = true
      setActiveAccount('user-2')
    })
    await Promise.resolve()
    expect(transitionStarted).toBe(false)
    finishPurchase()

    await expect(purchase).rejects.toBeInstanceOf(RevenueCatAccountChangedError)
    await transition
    expect(transitionStarted).toBe(true)
  })

  it('drains an in-flight identity change before auth replacement begins', async () => {
    let finishIdentity!: () => void
    let markIdentityStarted!: () => void
    const identityStarted = new Promise<void>((resolve) => {
      markIdentityStarted = resolve
    })
    const identity = transitionRevenueCatIdentity(
      'user-1',
      () =>
        new Promise<void>((resolve) => {
          markIdentityStarted()
          finishIdentity = resolve
        }),
    )
    await identityStarted

    let authTransitionStarted = false
    const authTransition = runAccountTransition('user-1', async () => {
      authTransitionStarted = true
      setActiveAccount('user-2')
    })
    expect(authTransitionStarted).toBe(false)

    finishIdentity()
    await expect(identity).resolves.toBe(false)
    await authTransition
    expect(authTransitionStarted).toBe(true)
  })
})
