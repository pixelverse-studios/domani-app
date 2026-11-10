import React, { useEffect, useState } from 'react'
import { AppState, Linking, Text, View } from 'react-native'
import { Platform } from 'react-native'
import * as Application from 'expo-application'
import { useAuth } from '~/hooks/useAuth'
import { supabase } from '~/lib/supabase'
import { fetchVersionPolicy, requiresUpdate, type VersionPolicy } from '~/lib/rollout'
import { Button } from '~/components/ui/Button'

export function RolloutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [policy, setPolicy] = useState<VersionPolicy | null>(null)
  const [storeError, setStoreError] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const version = Application.nativeApplicationVersion

  useEffect(() => {
    let cancelled = false
    let lastObserved = 0
    let policyRequest = 0
    const check = async () => {
      const request = ++policyRequest
      const next = await fetchVersionPolicy(Platform.OS)
      if (!cancelled && request === policyRequest) setPolicy(next)
    }
    const observe = () => {
      if (!user?.id || Date.now() - lastObserved < 60 * 60 * 1000) return
      lastObserved = Date.now()
      void Promise.resolve(
        supabase.rpc('observe_current_user_client', {
          p_app_version: version,
          p_build: Application.nativeBuildVersion,
          p_platform:
            Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
              ? Platform.OS
              : 'unknown',
        }),
      ).catch(() => {
        /* Telemetry cannot interrupt normal activity. */
      })
    }
    void check()
    observe()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void check()
        observe()
      }
    })
    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [user?.id, version, refresh])

  if (requiresUpdate(version, policy)) {
    return (
      <View className="flex-1 justify-center bg-surface-bg px-6" accessibilityViewIsModal>
        <Text accessibilityRole="header" className="text-2xl font-semibold text-content-primary">
          Update Domani
        </Text>
        <Text className="mt-4 mb-6 text-base text-content-secondary">
          A newer version is required to continue. Your plans will be here after you update.
        </Text>
        <Button
          onPress={() => {
            setStoreError(false)
            void Linking.openURL(policy!.storeUrl).catch(() => setStoreError(true))
          }}
        >
          Open store
        </Button>
        {storeError && (
          <Text className="mt-4 text-content-secondary">
            The store could not open. Please try again.
          </Text>
        )}
        <Button variant="ghost" className="mt-4" onPress={() => setRefresh((value) => value + 1)}>
          Check again
        </Button>
      </View>
    )
  }
  return <>{children}</>
}
