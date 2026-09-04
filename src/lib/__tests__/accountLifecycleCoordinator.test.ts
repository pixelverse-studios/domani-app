import { waitFor } from '~/test/test-utils'
import {
  canRunAccountOperation,
  captureAccountOperationToken,
  getAccountLifecycleSnapshot,
  isAccountOperationTokenCurrent,
  reconcileAccountOperation,
  registerAccountTransitionRecovery,
  resetAccountLifecycleCoordinatorForTests,
  retryAccountTransitionRecovery,
  runAccountOwnedOperation,
  runAccountTransition,
  setActiveAccount,
  setTransitionOutgoingUser,
} from '../accountLifecycleCoordinator'

describe('accountLifecycleCoordinator', () => {
  beforeEach(() => {
    resetAccountLifecycleCoordinatorForTests()
    setActiveAccount('user-1')
  })

  it('blocks newly requested account work for the complete transition', async () => {
    let finishTransition!: () => void
    const transition = runAccountTransition(
      'user-1',
      () =>
        new Promise<void>((resolve) => {
          finishTransition = resolve
        }),
    )

    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'transitioning',
      generation: 1,
      outgoingUserId: 'user-1',
    })
    expect(canRunAccountOperation('user-1')).toBe(false)
    expect(canRunAccountOperation('user-2')).toBe(false)

    const staleOperation = jest.fn().mockResolvedValue('unsafe')
    await expect(runAccountOwnedOperation('user-1', 'blocked', staleOperation)).resolves.toBe(
      'blocked',
    )
    expect(staleOperation).not.toHaveBeenCalled()

    finishTransition()
    await transition
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      generation: 1,
      activeUserId: 'user-1',
      outgoingUserId: null,
      recoveryError: null,
    })
  })

  it('drains started work before the transition and invalidates its late result', async () => {
    let finishOperation!: () => void
    let operationStarted!: () => void
    const started = new Promise<void>((resolve) => {
      operationStarted = resolve
    })

    const operation = runAccountOwnedOperation(
      'user-1',
      'blocked',
      (isCurrent) =>
        new Promise<string>((resolve) => {
          operationStarted()
          finishOperation = () => resolve(isCurrent() ? 'unsafe' : 'stale')
        }),
    )
    await started

    const events: string[] = []
    const transition = runAccountTransition('user-1', async () => {
      events.push('transition')
    })
    finishOperation()

    await expect(operation).resolves.toBe('stale')
    await transition
    expect(events).toEqual(['transition'])
  })

  it('returns to a stable generation after a retryable transition failure', async () => {
    await expect(
      runAccountTransition('user-1', async (generation) => {
        setTransitionOutgoingUser(generation, 'user-1')
        throw new Error('network unavailable')
      }),
    ).rejects.toThrow('network unavailable')

    expect(getAccountLifecycleSnapshot()).toEqual({
      phase: 'stable',
      generation: 1,
      activeUserId: 'user-1',
      outgoingUserId: null,
      recoveryError: null,
    })
    expect(canRunAccountOperation('user-1')).toBe(true)
  })

  it('blocks a stale owner after a completed account replacement', async () => {
    await runAccountTransition('user-1', async () => {
      setActiveAccount('user-2')
    })

    const staleOperation = jest.fn().mockResolvedValue('unsafe')
    await expect(runAccountOwnedOperation('user-1', 'blocked', staleOperation)).resolves.toBe(
      'blocked',
    )
    expect(staleOperation).not.toHaveBeenCalled()
    expect(canRunAccountOperation('user-2')).toBe(true)
  })

  it('keeps failed rollback gated until its registered recovery succeeds', async () => {
    let recoveryShouldFail = true
    const recovery = jest.fn(async () => {
      if (recoveryShouldFail) throw new Error('reminders unavailable')
      setActiveAccount('user-1')
    })

    await expect(
      runAccountTransition('user-1', async (transitionId) => {
        registerAccountTransitionRecovery(
          transitionId,
          'user-1',
          recovery,
          new Error('reminders unavailable'),
        )
        throw new Error('logout failed')
      }),
    ).rejects.toThrow('logout failed')

    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'recovering',
      activeUserId: 'user-1',
      outgoingUserId: 'user-1',
      recoveryError: 'reminders unavailable',
    })
    expect(canRunAccountOperation('user-1')).toBe(false)
    await expect(retryAccountTransitionRecovery()).resolves.toBe(false)

    recoveryShouldFail = false
    await expect(retryAccountTransitionRecovery()).resolves.toBe(true)
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      activeUserId: 'user-1',
      outgoingUserId: null,
      recoveryError: null,
    })
  })

  it('invalidates callback tokens as soon as a transition is requested', async () => {
    const token = captureAccountOperationToken('user-1')
    expect(isAccountOperationTokenCurrent(token)).toBe(true)

    const transition = runAccountTransition('user-1', async () => {
      setActiveAccount('user-2')
    })
    expect(isAccountOperationTokenCurrent(token)).toBe(false)
    await transition
    expect(isAccountOperationTokenCurrent(token)).toBe(false)
  })

  it('reconciles a stale generation when a failed transition retains the same account', async () => {
    const token = captureAccountOperationToken('user-1')
    const callback = jest.fn()
    let failTransition!: () => void

    const transition = runAccountTransition(
      'user-1',
      () =>
        new Promise<void>((_resolve, reject) => {
          failTransition = () => reject(new Error('replacement failed'))
        }),
    )

    reconcileAccountOperation(token, callback)
    expect(callback).not.toHaveBeenCalled()

    await waitFor(() => expect(failTransition).toEqual(expect.any(Function)))
    failTransition()
    await expect(transition).rejects.toThrow('replacement failed')
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('retained')
  })

  it('discards a stale operation after a different account becomes active', async () => {
    const token = captureAccountOperationToken('user-1')
    const callback = jest.fn()
    const transition = runAccountTransition('user-1', async () => setActiveAccount('user-2'))

    reconcileAccountOperation(token, callback)
    await transition

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('changed')
  })

  it('serializes overlapping account replacements in request order', async () => {
    const events: string[] = []
    let finishFirst!: () => void
    const first = runAccountTransition(
      'user-1',
      (transitionId) =>
        new Promise<string>((resolve) => {
          setTransitionOutgoingUser(transitionId, 'verified-user-1')
          expect(getAccountLifecycleSnapshot()).toMatchObject({
            phase: 'transitioning',
            generation: 2,
            activeUserId: 'user-1',
            outgoingUserId: 'verified-user-1',
          })
          events.push('first-start')
          finishFirst = () => {
            events.push('first-finish')
            setActiveAccount('user-2')
            resolve('user-2')
          }
        }),
    )
    const second = runAccountTransition('user-2', async (transitionId) => {
      setTransitionOutgoingUser(transitionId, 'verified-user-2')
      expect(getAccountLifecycleSnapshot()).toMatchObject({
        phase: 'transitioning',
        generation: 2,
        activeUserId: 'user-2',
        outgoingUserId: 'verified-user-2',
      })
      events.push('second')
      setActiveAccount('user-3')
      return 'user-3'
    })

    await waitFor(() => expect(events).toEqual(['first-start']))
    finishFirst()

    await expect(Promise.all([first, second])).resolves.toEqual(['user-2', 'user-3'])
    expect(events).toEqual(['first-start', 'first-finish', 'second'])
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      generation: 2,
      activeUserId: 'user-3',
      outgoingUserId: null,
    })
  })
})
