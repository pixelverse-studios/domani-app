import React, { useCallback, useEffect, useRef } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'

import { Text } from '~/components/ui'
import { completeOAuthCallback, waitForAuthSession } from '~/lib/authSession'
import { securelyReplaceSession } from '~/lib/accountTransitionSecurity'
import { supabase } from '~/lib/supabase'

export default function AuthCallbackScreen() {
  const router = useRouter()
  const callbackUrl = Linking.useLinkingURL()
  const hasCompletedRef = useRef(false)

  const handleCallback = useCallback(async () => {
    if (!callbackUrl || hasCompletedRef.current) return
    hasCompletedRef.current = true

    try {
      await completeOAuthCallback(
        callbackUrl,
        (code) =>
          securelyReplaceSession(async () => {
            const result = await supabase.auth.exchangeCodeForSession(code)
            if (result.error || !result.data.session) {
              throw new Error('OAuth sign in could not be completed. Please try again.')
            }
            return result
          }),
        () => supabase.auth.getSession(),
      )
      router.replace('/')
    } catch {
      const session = await waitForAuthSession(() => supabase.auth.getSession(), {
        attempts: 8,
        intervalMs: 150,
      })
      router.replace(session ? '/' : '/login')
    }
  }, [callbackUrl, router])

  useEffect(() => {
    void handleCallback()
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
