import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'
import { secureStorage } from './secureStorage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    flowType: 'pkce',
    detectSessionInUrl: false, // CRITICAL: Must be false for React Native
  },
})

// Helper to send account-related emails via Edge Function
export async function sendAccountEmail(params: {
  type: 'account_deletion' | 'account_reactivation'
}) {
  try {
    const { data, error } = await supabase.functions.invoke('send-account-email', {
      body: { type: params.type },
    })

    if (error) {
      console.warn('[sendAccountEmail] Failed to send email:', error)
      return { success: false, error }
    }

    return { success: data?.success === true }
  } catch (error) {
    console.warn('[sendAccountEmail] Error:', error)
    return { success: false, error }
  }
}
