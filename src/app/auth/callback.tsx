import React, { useCallback, useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'

import { Text } from '~/components/ui'
import { supabase } from '~/lib/supabase'
import {
  parseOAuthTokensFromParams,
  parseOAuthTokensFromUrl,
  waitForAuthSession,
} from '~/lib/authSession'

export default function AuthCallbackScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()

  const handleCallback = useCallback(async () => {
    try {
      console.log('[AuthCallback] Received params:', params)
      const paramTokens = parseOAuthTokensFromParams(params)
      const initialUrl =
        typeof window !== 'undefined' && typeof window.location?.href === 'string'
          ? window.location.href
          : null
      const urlTokens = initialUrl ? parseOAuthTokensFromUrl(initialUrl) : null
      const tokens = paramTokens ?? urlTokens

      console.log('[AuthCallback] Tokens:', {
        hasAccessToken: !!tokens?.access_token,
        hasRefreshToken: !!tokens?.refresh_token,
      })

      // If we have tokens, set the session
      if (tokens) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        })

        if (error) throw error

        console.log('[AuthCallback] Session set successfully')
        router.replace('/')
      } else {
        // No tokens in route params. On Android, the native browser handler can
        // receive fragment tokens while this route mounts from the deep link, so
        // wait briefly for AuthProvider.openAuthSessionAsync to persist them.
        const session = await waitForAuthSession(() => supabase.auth.getSession(), {
          attempts: 12,
          intervalMs: 200,
        })

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
  }, [params, router])

  useEffect(() => {
    handleCallback()
  }, [handleCallback])

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#FAF8F5' }}>
      <ActivityIndicator size="large" color="#7D9B8A" />
      <Text variant="body" className="mt-4">
        Completing sign in...
      </Text>
    </View>
  )
}
