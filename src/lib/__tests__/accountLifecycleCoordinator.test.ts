import { waitFor } from '~/test/test-utils'
import {
  canRunAccountOperation,
  getAccountLifecycleSnapshot,
  resetAccountLifecycleCoordinatorForTests,
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
