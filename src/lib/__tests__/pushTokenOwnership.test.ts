jest.mock('../supabase', () => ({ supabase: { auth: { getSession: jest.fn() }, rpc: jest.fn() } }))
jest.mock('../notifications', () => ({ NotificationService: { getExpoPushToken: jest.fn() } }))
import { supabase } from '../supabase'
import { NotificationService } from '../notifications'
import { claimCurrentUserPushToken, unclaimCurrentUserPushToken } from '../pushTokenOwnership'
const token = 'ExponentPushToken[device-token]'
beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(supabase.auth.getSession)
    .mockResolvedValue({ data: { session: { user: { id: 'account-a' } } }, error: null } as never)
  jest.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
  jest.mocked(NotificationService.getExpoPushToken).mockResolvedValue(token)
})
it('claims and unclaims the device token through expected-user RPCs', async () => {
  expect(await claimCurrentUserPushToken('account-a')).toBe(true)
  expect(supabase.rpc).toHaveBeenCalledWith('claim_current_user_push_token', {
    p_expected_user_id: 'account-a',
    p_push_token: token,
  })
  await unclaimCurrentUserPushToken('account-a')
  expect(supabase.rpc).toHaveBeenCalledWith('unclaim_current_user_push_token', {
    p_expected_user_id: 'account-a',
    p_push_token: token,
  })
})
it('does not register or revoke whichever account replaced the captured account', async () => {
  jest
    .mocked(supabase.auth.getSession)
    .mockResolvedValue({ data: { session: { user: { id: 'account-b' } } }, error: null } as never)
  expect(await claimCurrentUserPushToken('account-a')).toBe(false)
  await unclaimCurrentUserPushToken('account-a')
  expect(supabase.rpc).not.toHaveBeenCalled()
})
it('preserves the expected ID when the account changes during native token lookup', async () => {
  jest.mocked(NotificationService.getExpoPushToken).mockImplementationOnce(async () => {
    jest
      .mocked(supabase.auth.getSession)
      .mockResolvedValue({ data: { session: { user: { id: 'account-b' } } }, error: null } as never)
    jest.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { code: '42501' } } as never)
    return token
  })
  expect(await claimCurrentUserPushToken('account-a')).toBe(false)
  expect(supabase.rpc).toHaveBeenCalledWith('claim_current_user_push_token', {
    p_expected_user_id: 'account-a',
    p_push_token: token,
  })
})
it('returns unavailable without a device token and surfaces retryable provider errors', async () => {
  jest.mocked(NotificationService.getExpoPushToken).mockResolvedValueOnce(null)
  expect(await claimCurrentUserPushToken('account-a')).toBe(false)
  jest
    .mocked(supabase.rpc)
    .mockResolvedValueOnce({ data: null, error: { code: 'NETWORK' } } as never)
  await expect(claimCurrentUserPushToken('account-a')).rejects.toEqual({ code: 'NETWORK' })
})
