import React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'

import { useAuth } from '~/hooks/useAuth'
import { useTheme } from '~/hooks/useTheme'

export default function IndexScreen() {
  const { user, loading } = useAuth()
  const { activeTheme } = useTheme()

  if (loading) {
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

  // Authenticated users go to main app
  return <Redirect href="/(tabs)" />
}
