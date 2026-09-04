import React, { useContext, useEffect } from 'react'
import { Alert } from 'react-native'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import * as AppleAuthentication from 'expo-apple-authentication'

import { act, render, waitFor } from '~/test/test-utils'
import { LocalizationProvider } from '~/providers/LocalizationProvider'
import { AuthContext, AuthProvider } from '../AuthProvider'
import { supabase } from '~/lib/supabase'
import { NotificationService } from '~/lib/notifications'
import {
  getAccountLifecycleSnapshot,
  resetAccountLifecycleCoordinatorForTests,
  runAccountOwnedOperation,
  setActiveAccount,
} from '~/lib/accountLifecycleCoordinator'
import { resetAccountTransitionSecurityForTests } from '~/lib/accountTransitionSecurity'
import { resetOAuthCallbackStateForTests } from '~/lib/authSession'

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}))

jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
}))

const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock
const mockGetUser = supabase.auth.getUser as jest.Mock
const mockGetSession = supabase.auth.getSession as jest.Mock
const mockFrom = supabase.from as unknown as jest.Mock
const mockRpc = supabase.rpc as unknown as jest.Mock
const mockSignOut = supabase.auth.signOut as jest.Mock
const mockSignInWithOAuth = supabase.auth.signInWithOAuth as jest.Mock
const mockSignInWithIdToken = supabase.auth.signInWithIdToken as jest.Mock
const mockExchangeCodeForSession = supabase.auth.exchangeCodeForSession as jest.Mock
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock
const mockAppleSignIn = AppleAuthentication.signInAsync as jest.Mock
const mockCancelAllReminders = jest.spyOn(NotificationService, 'cancelAllReminders')

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
    resetAccountLifecycleCoordinatorForTests()
    resetAccountTransitionSecurityForTests()
    resetOAuthCallbackStateForTests()
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockSignOut.mockResolvedValue({ error: null })
    mockCancelAllReminders.mockResolvedValue(true)
  })

  afterEach(() => {
    alertSpy.mockRestore()
    jest.useRealTimers()
  })

  it('replaces account A with Google under the account lifecycle', async () => {
    let authContext: React.ContextType<typeof AuthContext> | undefined
    const accountA = { user: { id: 'user-1' } } as unknown as Session
    const accountB = { user: { id: 'user-2' } } as unknown as Session
    setActiveAccount('user-1')
    mockGetSession.mockResolvedValue({ data: { session: accountA }, error: null })
    mockGetUser.mockResolvedValue({ data: { user: accountA.user }, error: null })
    mockFrom.mockReturnValue(createProfileQuery({ data: { expo_push_token: null }, error: null }))
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://provider.example/login' },
      error: null,
    })
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'domani://auth/callback?code=google-code',
    })
    mockExchangeCodeForSession.mockResolvedValue({ data: { session: accountB }, error: null })

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
      await expect(authContext!.signInWithGoogle()).resolves.toBe(true)
    })

    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('set_expected_user_expo_push_token', {
      p_expected_user_id: 'user-1',
      p_token: null,
    })
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      activeUserId: 'user-2',
    })
  })

  it('replaces account A with Apple under the account lifecycle', async () => {
    let authContext: React.ContextType<typeof AuthContext> | undefined
    const accountA = { user: { id: 'user-1' } } as unknown as Session
    const accountB = { user: { id: 'user-2' } } as unknown as Session
    setActiveAccount('user-1')
    mockGetSession.mockResolvedValue({ data: { session: accountA }, error: null })
    mockGetUser.mockResolvedValue({ data: { user: accountA.user }, error: null })
    mockFrom.mockReturnValue(createProfileQuery({ data: { expo_push_token: null }, error: null }))
    mockAppleSignIn.mockResolvedValue({
      identityToken: 'opaque-apple-token',
      fullName: null,
    })
    mockSignInWithIdToken.mockResolvedValue({ data: { session: accountB }, error: null })

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
      await expect(authContext!.signInWithApple()).resolves.toBe(true)
    })

    expect(mockSignInWithIdToken).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('set_expected_user_expo_push_token', {
      p_expected_user_id: 'user-1',
      p_token: null,
    })
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      activeUserId: 'user-2',
    })
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

  it('purges account reminders before applying an external SIGNED_OUT event', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    let authContext: React.ContextType<typeof AuthContext> | undefined
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })
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
      authListener?.('TOKEN_REFRESHED', session)
      await Promise.resolve()
    })
    expect(authContext?.user?.id).toBe('user-1')

    let listenerResult: void | Promise<void> | undefined
    act(() => {
      listenerResult = authListener?.('SIGNED_OUT', null)
      authListener?.('SIGNED_OUT', null)
    })
    expect(listenerResult).toBeUndefined()
    expect(authContext?.loading).toBe(true)
    expect(mockCancelAllReminders).not.toHaveBeenCalled()

    await act(async () => {
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockCancelAllReminders).toHaveBeenCalledTimes(1)
    expect(authContext?.loading).toBe(false)
    expect(authContext?.user).toBeNull()
    expect(getAccountLifecycleSnapshot()).toMatchObject({
      phase: 'stable',
      activeUserId: null,
    })
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

    expect(mockRpc).not.toHaveBeenCalledWith('cancel_account_deletion', {
      p_user_id: 'user-1',
    })
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('binds an in-flight reactivation RPC to the account that opened the prompt', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    let authContext: React.ContextType<typeof AuthContext> | undefined
    let finishReactivation!: (value: { data: null; error: { code: string } }) => void
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })
    mockRpc.mockImplementation((name: string) => {
      if (name !== 'cancel_account_deletion') return Promise.resolve({ data: null, error: null })
      return new Promise((resolve) => {
        finishReactivation = resolve
      })
    })

    const pendingDeletionResult = {
      data: {
        deleted_at: '2026-08-29T00:00:00.000Z',
        deletion_scheduled_for: '2026-09-05T00:00:00.000Z',
      },
      error: null,
    }
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
      .mockReturnValueOnce(createProfileQuery({ data: { deleted_at: null }, error: null }))
      .mockReturnValueOnce(createProfileQuery(existingProfileResult))

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
    const reactivationAction = alertSpy.mock.calls[0][2][0]
    let reactivation!: Promise<void>
    act(() => {
      reactivation = reactivationAction.onPress()
    })
    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('cancel_account_deletion', {
        p_user_id: 'user-1',
      }),
    )

    act(() => {
      authListener?.('SIGNED_IN', buildSession('user-2'))
    })
    finishReactivation({ data: null, error: { code: '42501' } })
    await act(async () => {
      await reactivation
    })

    expect(authContext?.user?.id).toBe('user-2')
    expect(authContext?.accountReactivated).toBe(false)
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

    await act(async () => {
      await expect(authContext!.signOut()).rejects.toThrow('Unable to securely sign out')
    })
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

    act(() => {
      setActiveAccount('user-1')
      void runAccountOwnedOperation(
        'user-1',
        undefined,
        () =>
          new Promise<void>((resolve) => {
            releaseQueue = resolve
          }),
      )
    })

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

    expect(mockRpc).not.toHaveBeenCalledWith('ensure_expected_user_profile', {
      p_expected_user_id: 'user-1',
    })
  })
})
