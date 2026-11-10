import { supabase } from '~/lib/supabase'
import { NotificationService } from '~/lib/notifications'

let devicePushToken: string | null = null

export async function claimCurrentUserPushToken(expectedUserId: string): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  if (data.session?.user.id !== expectedUserId) return false
  const token = await NotificationService.getExpoPushToken()
  if (!token) return false
  devicePushToken = token
  const { error } = await supabase.rpc('claim_current_user_push_token', {
    p_expected_user_id: expectedUserId,
    p_push_token: token,
  })
  if (error?.code === '42501') return false
  if (error) throw error
  return true
}

export async function unclaimCurrentUserPushToken(expectedUserId: string): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session?.user.id !== expectedUserId) return
  const token = devicePushToken ?? (await NotificationService.getExpoPushToken())
  if (!token) return
  const { error } = await supabase.rpc('unclaim_current_user_push_token', {
    p_expected_user_id: expectedUserId,
    p_push_token: token,
  })
  if (error?.code === '42501') return
  if (error) throw error
}
