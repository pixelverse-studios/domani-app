import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Database } from '../types/supabase'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // CRITICAL: Must be false for React Native
  },
})

// Helper to send account-related emails via Edge Function
export async function sendAccountEmail(params: {
  type: 'account_deletion' | 'account_reactivation'
  email: string
  name?: string
  deletionDate?: string
}) {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    const response = await fetch(`${supabaseUrl}/functions/v1/send-account-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      console.warn('[sendAccountEmail] Failed to send email:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.warn('[sendAccountEmail] Error:', error)
    return { success: false, error }
  }
}
