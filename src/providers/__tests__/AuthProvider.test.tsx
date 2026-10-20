import React from 'react'
import { Alert, Text } from 'react-native'
import { act, render, renderHook, waitFor } from '@testing-library/react-native'
import { AuthProvider, AuthContext } from '../AuthProvider'
import { unclaimCurrentUserPushToken } from '~/lib/pushTokenOwnership'
import { supabase, sendAccountEmail } from '~/lib/supabase'

jest.mock('~/lib/pushTokenOwnership', () => ({
  unclaimCurrentUserPushToken: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }))
jest.mock('expo-auth-session', () => ({ makeRedirectUri: () => 'domani://auth/callback' }))
jest.mock('expo-apple-authentication', () => ({}))
jest.mock('~/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn(), onAuthStateChange: jest.fn(), signOut: jest.fn() },
    from: jest.fn(),
    rpc: jest.fn(),
  },
  sendAccountEmail: jest.fn(),
}))
jest.mock('~/lib/teamNotifications', () => ({ sendTeamNotification: jest.fn() }))
jest.mock('~/lib/sentry', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn() }))
jest.mock('~/hooks/useTranslation', () => {
  const t = (key: string) => key
  return { useTranslation: () => ({ locale: 'en', t }) }
})

let authChanged: (event: string, session: unknown) => Promise<void>
const accountA = {
  user: {
    id: 'account-a',
    email: 'a@example.test',
    identities: [],
    user_metadata: {},
    app_metadata: {},
  },
}
const accountB = { user: { ...accountA.user, id: 'account-b' } }
beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(supabase.auth.getSession)
    .mockResolvedValue({ data: { session: accountA }, error: null } as never)
  jest.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
    authChanged = callback as never
    return { data: { subscription: { unsubscribe: jest.fn() } } } as never
  })
  jest.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
  jest.mocked(supabase.from).mockImplementation(() => {
    const query: Record<string, unknown> = {}
    for (const name of ['select', 'eq', 'update']) query[name] = () => query
    query.single = async () => ({
      data: {
        id: 'account-a',
        deleted_at: '2026-10-01T00:00:00Z',
        deletion_scheduled_for: '2026-11-01T00:00:00Z',
        timezone: 'UTC',
      },
      error: null,
    })
    return query as never
  })
})
async function getPrompt() {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  render(
    <AuthProvider>
      <Text>Ready</Text>
    </AuthProvider>,
  )
  await act(async () => {
    await authChanged('SIGNED_IN', accountA)
  })
  await waitFor(() => expect(alert).toHaveBeenCalled())
  return alert.mock.calls.find((call) => call[0] === 'auth.pendingDeletion.title')![2]!
}
afterEach(() => {
  jest.restoreAllMocks()
})
it.each([0, 1])(
  'ignores stale pending deletion action %s after the persisted account changes',
  async (button) => {
    const buttons = await getPrompt()
    jest
      .mocked(supabase.auth.getSession)
      .mockResolvedValue({ data: { session: accountB }, error: null } as never)
    await act(async () => {
      await buttons[button].onPress?.()
    })
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
    expect(sendAccountEmail).not.toHaveBeenCalled()
  },
)
it('sends the captured expected account when confirming a current reactivation prompt', async () => {
  const buttons = await getPrompt()
  await act(async () => {
    await buttons[0].onPress?.()
  })
  expect(supabase.rpc).toHaveBeenCalledWith('cancel_current_user_account_deletion', {
    p_expected_user_id: 'account-a',
  })
  expect(sendAccountEmail).toHaveBeenCalledWith({ type: 'account_reactivation' })
})
it('suppresses delayed reactivation side effects after an account switch during the RPC', async () => {
  const buttons = await getPrompt()
  jest.mocked(supabase.rpc).mockImplementationOnce((async () => {
    jest
      .mocked(supabase.auth.getSession)
      .mockResolvedValue({ data: { session: accountB }, error: null } as never)
    return { data: null, error: null } as never
  }) as never)
  await act(async () => {
    await buttons[0].onPress?.()
  })
  expect(sendAccountEmail).not.toHaveBeenCalled()
})

it('unclaims the current device before explicit signout', async () => {
  jest.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })
  const { result } = renderHook(() => React.useContext(AuthContext), { wrapper: AuthProvider })
  await act(async () => {
    await result.current!.signOut()
  })
  expect(unclaimCurrentUserPushToken).toHaveBeenCalledWith('account-a')
  expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
})
it('does not sign out a replacement account after asynchronous token cleanup', async () => {
  jest.mocked(unclaimCurrentUserPushToken).mockImplementationOnce(async () => {
    jest
      .mocked(supabase.auth.getSession)
      .mockResolvedValue({ data: { session: accountB }, error: null } as never)
  })
  const { result } = renderHook(() => React.useContext(AuthContext), { wrapper: AuthProvider })
  await act(async () => {
    await result.current!.signOut()
  })
  expect(supabase.auth.signOut).not.toHaveBeenCalled()
})
