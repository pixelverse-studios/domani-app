import React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'

import { useAuth } from '~/hooks/useAuth'
import { useTheme } from '~/hooks/useTheme'
import { useProfile } from '~/hooks/useProfile'

export default function IndexScreen() {
  const { user, loading: authLoading } = useAuth()
  const { activeTheme } = useTheme()
  const { profile, isLoading: profileLoading } = useProfile()

  // Show loading while auth or profile is loading
  if (authLoading || (user && profileLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <ActivityIndicator size="large" color={activeTheme === 'dark' ? '#a855f7' : '#9333ea'} />
      </View>
    )
  }

  // Unauthenticated users go to welcome page (landing/splash)
  if (!user) {
    return <Redirect href="/welcome" />
  }

  // Authenticated users who haven't completed notification setup go there
  if (!profile?.notification_onboarding_completed) {
    return <Redirect href="/notification-setup" />
  }

  // Authenticated users who completed onboarding go to main app
  return <Redirect href="/(tabs)" />
}
