import '../../global.css'

import React from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
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
import { AnalyticsProvider } from '~/providers/AnalyticsProvider'
import { useNotificationObserver } from '~/hooks/useNotifications'
import { useAnalyticsIdentify } from '~/hooks/useAnalyticsIdentify'
import { useAuthAnalytics } from '~/hooks/useAuthAnalytics'
import { useAuth } from '~/hooks/useAuth'
import { useAppConfigStore } from '~/stores/appConfigStore'
import { AccountConfirmationOverlay } from '~/components/AccountConfirmationOverlay'
import { ErrorBoundary } from '~/components/ErrorBoundary'

const queryClient = new QueryClient()

function RootLayoutContent() {
  // Initialize notification observer for deep linking
  useNotificationObserver()

  // Initialize analytics user identification
  useAnalyticsIdentify()

  // Track auth events (sign in, sign out)
  useAuthAnalytics()

  // Fetch app config on mount
  const fetchConfig = useAppConfigStore((state) => state.fetchConfig)
  React.useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const { accountReactivated, clearAccountReactivated, loading } = useAuth()

  // Wait for auth to initialize before rendering routes
  // This prevents the race condition where (tabs) renders before auth check completes
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="notification-setup" />
        <Stack.Screen name="contact-support" />
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AnalyticsProvider>
            <AuthProvider>
              <ThemeProvider>
                <QueryClientProvider client={queryClient}>
                  <RootLayoutContent />
                </QueryClientProvider>
              </ThemeProvider>
            </AuthProvider>
          </AnalyticsProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
