import '../../global.css'

import React from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import { View, ActivityIndicator } from 'react-native'

import { ThemeProvider } from '~/providers/ThemeProvider'
import { AuthProvider } from '~/providers/AuthProvider'
import { useNotificationObserver } from '~/hooks/useNotifications'
import { useAuth } from '~/hooks/useAuth'
import { useAppConfigStore } from '~/stores/appConfigStore'
import { AccountConfirmationOverlay } from '~/components/AccountConfirmationOverlay'

const queryClient = new QueryClient()

function RootLayoutContent() {
  // Initialize notification observer for deep linking
  useNotificationObserver()

  // Fetch app config on mount
  const fetchConfig = useAppConfigStore((state) => state.fetchConfig)
  React.useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const { accountReactivated, clearAccountReactivated } = useAuth()

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="notification-setup" />
        <Stack.Screen name="auth/callback" options={{ presentation: 'modal' }} />
      </Stack>

      {/* Account reactivation celebration overlay */}
      <AccountConfirmationOverlay
        visible={accountReactivated}
        type="reactivated"
        onDismiss={clearAccountReactivated}
      />
    </>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <RootLayoutContent />
          </QueryClientProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
