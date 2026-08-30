import React, { useContext, useEffect } from 'react'
import { Alert } from 'react-native'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import { act, render } from '~/test/test-utils'
import { LocalizationProvider } from '~/providers/LocalizationProvider'
import { AuthContext, AuthProvider } from '../AuthProvider'
import { supabase } from '~/lib/supabase'
import {
  queuePushTokenOperation,
  resetPushTokenCoordinatorForTests,
} from '~/lib/pushTokenCoordinator'
import { resetAccountTransitionSecurityForTests } from '~/lib/accountTransitionSecurity'

const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock
const mockGetUser = supabase.auth.getUser as jest.Mock
const mockGetSession = supabase.auth.getSession as jest.Mock
const mockFrom = supabase.from as unknown as jest.Mock
const mockRpc = supabase.rpc as unknown as jest.Mock
const mockSignOut = supabase.auth.signOut as jest.Mock

function createProfileQuery(result: Promise<unknown> | unknown) {
  const query = {} as {
    select: jest.Mock
    eq: jest.Mock
    update: jest.Mock
    single: jest.Mock
    maybeSingle: jest.Mock
  }
  query.select = jest.fn(() => query)
  query.eq = jest.fn(() => query)
  query.update = jest.fn(() => query)
  query.single = jest.fn(() => Promise.resolve(result))
  query.maybeSingle = jest.fn(() => Promise.resolve(result))
  return query
}

describe('AuthProvider', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation()
    resetPushTokenCoordinatorForTests()
    resetAccountTransitionSecurityForTests()
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockSignOut.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    alertSpy.mockRestore()
    jest.useRealTimers()
  })

  it('returns from the auth listener before validating a cached session', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    render(
      <LocalizationProvider>
        <AuthProvider>
          <></>
        </AuthProvider>
      </LocalizationProvider>,
    )

    const session = {
      user: {
        id: 'user-1',
        email: 'one@example.com',
        identities: [],
        user_metadata: {},
        app_metadata: {},
      },
    } as unknown as Session
    mockGetUser.mockResolvedValue({ data: { user: session.user }, error: null })

    let listenerResult: void | Promise<void> | undefined
    act(() => {
      listenerResult = authListener?.('INITIAL_SESSION', session)
    })

    expect(listenerResult).toBeUndefined()
    expect(mockFrom).not.toHaveBeenCalled()

    await act(async () => {
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockFrom).toHaveBeenCalledWith('profiles')
  })

  it('settles loading with the cached session when server validation is unavailable', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    let authContext: React.ContextType<typeof AuthContext> | undefined
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })
    mockFrom.mockReturnValue(
      createProfileQuery({ data: null, error: { code: 'NETWORK_ERROR', message: 'offline' } }),
    )
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('offline') })
    const session = {
      user: {
        id: 'user-1',
        email: 'one@example.com',
        identities: [],
        user_metadata: {},
        app_metadata: {},
      },
    } as unknown as Session

    function Consumer() {
      const value = useContext(AuthContext)
      useEffect(() => {
        authContext = value
      }, [value])
      return null
    }

    render(
      <LocalizationProvider>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </LocalizationProvider>,
    )

    await act(async () => {
      authListener?.('INITIAL_SESSION', session)
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(authContext?.loading).toBe(false)
    expect(authContext?.user?.id).toBe('user-1')
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('settles loading when invalid-session cleanup fails', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    let authContext: React.ContextType<typeof AuthContext> | undefined
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })
    mockFrom.mockReturnValue(createProfileQuery({ data: null, error: null }))
    const session = {
      user: {
        id: 'user-1',
        email: 'one@example.com',
        identities: [],
        user_metadata: {},
        app_metadata: {},
      },
    } as unknown as Session
    mockGetUser
      .mockResolvedValueOnce({ data: { user: null }, error: null })
      .mockResolvedValue({ data: { user: session.user }, error: null })
    mockSignOut.mockResolvedValue({ error: new Error('sign out unavailable') })

    function Consumer() {
      const value = useContext(AuthContext)
      useEffect(() => {
        authContext = value
      }, [value])
      return null
    }

    render(
      <LocalizationProvider>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </LocalizationProvider>,
    )

    await act(async () => {
      authListener?.('INITIAL_SESSION', session)
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(authContext?.loading).toBe(false)
    expect(authContext?.user?.id).toBe('user-1')
    expect(alertSpy).toHaveBeenCalled()
  })

  it('settles loading when invalid-session cleanup declines to sign out', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    let authContext: React.ContextType<typeof AuthContext> | undefined
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })
    mockFrom.mockReturnValue(createProfileQuery({ data: null, error: null }))
    const session = {
      user: {
        id: 'user-1',
        email: 'one@example.com',
        identities: [],
        user_metadata: {},
        app_metadata: {},
      },
    } as unknown as Session
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'replacement-user' } } },
      error: null,
    })

    function Consumer() {
      const value = useContext(AuthContext)
      useEffect(() => {
        authContext = value
      }, [value])
      return null
    }

    render(
      <LocalizationProvider>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </LocalizationProvider>,
    )

    await act(async () => {
      authListener?.('INITIAL_SESSION', session)
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(authContext?.loading).toBe(false)
    expect(authContext?.user?.id).toBe('user-1')
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(alertSpy).toHaveBeenCalled()
  })

  it('ignores pending-deletion actions from an account after a direct switch', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    const pendingDeletionResult = {
      data: {
        deleted_at: '2026-08-29T00:00:00.000Z',
        deletion_scheduled_for: '2026-09-05T00:00:00.000Z',
      },
      error: null,
    }
    const noPendingDeletionResult = { data: { deleted_at: null }, error: null }
    const existingProfileResult = {
      data: {
        id: 'profile',
        timezone: 'America/New_York',
        created_at: '2025-01-01T00:00:00.000Z',
      },
      error: null,
    }
    mockFrom
      .mockReturnValueOnce(createProfileQuery(pendingDeletionResult))
      .mockReturnValueOnce(createProfileQuery(existingProfileResult))
      .mockReturnValueOnce(createProfileQuery(noPendingDeletionResult))
      .mockReturnValueOnce(createProfileQuery(existingProfileResult))

    render(
      <LocalizationProvider>
        <AuthProvider>
          <></>
        </AuthProvider>
      </LocalizationProvider>,
    )

    const buildSession = (id: string) =>
      ({
        user: {
          id,
          email: `${id}@example.com`,
          identities: [],
          user_metadata: {},
          app_metadata: {},
        },
      }) as unknown as Session

    await act(async () => {
      authListener?.('SIGNED_IN', buildSession('user-1'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(alertSpy).toHaveBeenCalledTimes(1)
    const reactivationAction = alertSpy.mock.calls[0][2][0]

    await act(async () => {
      authListener?.('SIGNED_IN', buildSession('user-2'))
      await Promise.resolve()
      await Promise.resolve()
      await reactivationAction.onPress()
    })

    expect(mockRpc).not.toHaveBeenCalledWith('cancel_current_user_account_deletion')
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('keeps the authenticated session when push-token release repeatedly fails', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    let authContext: React.ContextType<typeof AuthContext> | undefined
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })
    mockFrom.mockReturnValue(createProfileQuery({ data: null, error: null }))

    const session = {
      user: {
        id: 'user-1',
        email: 'one@example.com',
        identities: [],
        user_metadata: {},
        app_metadata: {},
      },
    } as unknown as Session

    function Consumer() {
      const value = useContext(AuthContext)
      useEffect(() => {
        authContext = value
      }, [value])
      return null
    }

    render(
      <LocalizationProvider>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </LocalizationProvider>,
    )

    await act(async () => {
      authListener?.('SIGNED_IN', session)
      await Promise.resolve()
      await Promise.resolve()
    })
    mockGetSession.mockResolvedValue({ data: { session }, error: null })
    mockGetUser.mockResolvedValue({ data: { user: session.user }, error: null })
    mockRpc.mockResolvedValue({ data: null, error: { code: 'NETWORK_ERROR' } })

    await expect(authContext!.signOut()).rejects.toThrow('Unable to securely sign out')
    expect(mockRpc).toHaveBeenCalledTimes(3)
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(authContext!.user?.id).toBe('user-1')
  })

  it('does not sign out a replacement account when orphan cleanup was already queued', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    let releaseQueue!: () => void
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    const buildSession = (id: string) =>
      ({
        user: {
          id,
          email: `${id}@example.com`,
          identities: [],
          user_metadata: {},
          app_metadata: {},
        },
      }) as unknown as Session
    const userTwoSession = buildSession('user-2')
    mockGetSession.mockResolvedValue({
      data: { session: buildSession('user-1') },
      error: null,
    })

    mockFrom
      .mockReturnValueOnce(
        createProfileQuery({ data: null, error: { code: 'NETWORK_ERROR', message: 'offline' } }),
      )
      .mockReturnValueOnce(createProfileQuery({ data: { deleted_at: null }, error: null }))
      .mockReturnValueOnce(
        createProfileQuery({
          data: {
            id: 'user-2',
            timezone: 'America/New_York',
            created_at: '2025-01-01T00:00:00.000Z',
          },
          error: null,
        }),
      )

    render(
      <LocalizationProvider>
        <AuthProvider>
          <></>
        </AuthProvider>
      </LocalizationProvider>,
    )

    void queuePushTokenOperation(
      () =>
        new Promise<void>((resolve) => {
          releaseQueue = resolve
        }),
    )

    await act(async () => {
      authListener?.('INITIAL_SESSION', buildSession('user-1'))
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      await Promise.resolve()
    })

    mockGetUser.mockResolvedValue({ data: { user: userTwoSession.user }, error: null })
    await act(async () => {
      authListener?.('SIGNED_IN', userTwoSession)
      releaseQueue()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('abandons stale profile recovery after a direct account switch', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    let resolveFirstProfile!: (value: unknown) => void
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    const firstProfileResult = new Promise((resolve) => {
      resolveFirstProfile = resolve
    })
    const existingSecondProfile = {
      data: {
        id: 'user-2',
        timezone: 'America/New_York',
        created_at: '2025-01-01T00:00:00.000Z',
      },
      error: null,
    }
    mockFrom
      .mockReturnValueOnce(createProfileQuery({ data: { deleted_at: null }, error: null }))
      .mockReturnValueOnce(createProfileQuery(firstProfileResult))
      .mockReturnValueOnce(createProfileQuery({ data: { deleted_at: null }, error: null }))
      .mockReturnValueOnce(createProfileQuery(existingSecondProfile))

    const buildSession = (id: string) =>
      ({
        user: {
          id,
          email: `${id}@example.com`,
          identities: [],
          user_metadata: {},
          app_metadata: {},
        },
      }) as unknown as Session

    render(
      <LocalizationProvider>
        <AuthProvider>
          <></>
        </AuthProvider>
      </LocalizationProvider>,
    )

    await act(async () => {
      authListener?.('SIGNED_IN', buildSession('user-1'))
      await Promise.resolve()
      authListener?.('SIGNED_IN', buildSession('user-2'))
      resolveFirstProfile({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockRpc).not.toHaveBeenCalledWith('ensure_current_user_profile')
  })
})
