import React, { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'

import { Text } from '~/components/ui'
import { supabase } from '~/lib/supabase'

export default function AuthCallbackScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      console.log('[AuthCallback] Received params:', params)
      const { access_token, refresh_token } = params

      console.log('[AuthCallback] Tokens:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
      })

      // If we have tokens, set the session
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: access_token as string,
          refresh_token: refresh_token as string,
        })

        if (error) throw error

        console.log('[AuthCallback] Session set successfully')
        router.replace('/')
      } else {
        // No tokens in params - check if we already have a session
        // (OAuth may have been handled by AuthProvider already)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          console.log('[AuthCallback] Session already exists, redirecting to home')
          router.replace('/')
        } else {
          console.log('[AuthCallback] No session found, redirecting to login')
          router.replace('/login')
        }
      }
    } catch (error) {
      console.error('[AuthCallback] Error:', error)
      router.replace('/login')
    }
  }

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#FAF8F5' }}>
      <ActivityIndicator size="large" color="#7D9B8A" />
      <Text variant="body" className="mt-4">
        Completing sign in...
      </Text>
    </View>
  )
}
