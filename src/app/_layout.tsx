import '../../global.css'

// Initialize Sentry before any other code runs
import { initSentry } from '~/lib/sentry'
initSentry()

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
import { AnalyticsProvider, useAnalytics } from '~/providers/AnalyticsProvider'
import { useNotificationObserver } from '~/hooks/useNotifications'
import { useAnalyticsIdentify } from '~/hooks/useAnalyticsIdentify'
import { useSentryIdentify } from '~/hooks/useSentryIdentify'
import { useAuthAnalytics } from '~/hooks/useAuthAnalytics'
import { useAuth } from '~/hooks/useAuth'
import { useAppConfigStore } from '~/stores/appConfigStore'
import { useTutorialStore } from '~/stores/tutorialStore'
import { useRolloverTasks } from '~/hooks/useRolloverTasks'
import { useCarryForwardTasks } from '~/hooks/useCarryForwardTasks'
import { useTodayPlan } from '~/hooks/usePlans'
import { AccountConfirmationOverlay } from '~/components/AccountConfirmationOverlay'
import { RolloverModal, CelebrationModal } from '~/components/planning'
import { ErrorBoundary } from '~/components/ErrorBoundary'

const queryClient = new QueryClient()

function RootLayoutContent() {
  // Initialize notification observer for deep linking
  useNotificationObserver()

  // Initialize analytics user identification
  useAnalyticsIdentify()

  // Initialize Sentry user identification
  useSentryIdentify()

  // Track auth events (sign in, sign out)
  useAuthAnalytics()

  // Analytics tracking
  const { track } = useAnalytics()

  // Fetch app config on mount
  const fetchConfig = useAppConfigStore((state) => state.fetchConfig)
  React.useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const { accountReactivated, clearAccountReactivated, loading } = useAuth()

  // Rollover tasks detection and celebration
  const {
    shouldShowPrompt,
    shouldShowCelebration,
    yesterdayTaskCount,
    mitTask,
    otherTasks,
    isLoading: rolloverLoading,
    markPrompted,
    markCelebrated,
  } = useRolloverTasks()
  const { isActive: tutorialActive } = useTutorialStore()
  const { data: todayPlan } = useTodayPlan()
  const { mutateAsync: carryForwardTasks, isPending: _isCarryingForward } = useCarryForwardTasks()

  // Show celebration modal if:
  // - User should be celebrated (all tasks from yesterday completed & not already celebrated)
  // - Tutorial is not active (don't conflict with tutorial)
  // - Not loading
  // - Auth is complete
  // Celebration takes precedence over rollover
  const showCelebration = shouldShowCelebration && !tutorialActive && !rolloverLoading && !loading

  // Show rollover modal if:
  // - User should be prompted (has incomplete tasks from yesterday & not already prompted today)
  // - Tutorial is not active (don't conflict with tutorial)
  // - Not already loading rollover data
  // - Auth is complete
  // - Celebration is NOT showing (celebration takes precedence)
  const showRollover = shouldShowPrompt && !tutorialActive && !rolloverLoading && !loading && !showCelebration

  // Debug: log rollover state on every change (DEV only)
  React.useEffect(() => {
    if (__DEV__) {
      console.log('[Rollover Debug]', {
        shouldShowPrompt,
        tutorialActive,
        rolloverLoading,
        authLoading: loading,
        showCelebration,
        showRollover,
        incompleteTasks: otherTasks.length + (mitTask ? 1 : 0),
        hasMit: !!mitTask,
      })
    }
  }, [shouldShowPrompt, tutorialActive, rolloverLoading, loading, showCelebration, showRollover, otherTasks.length, mitTask])

  // Track when rollover prompt is shown
  React.useEffect(() => {
    if (showRollover && mitTask) {
      track('rollover_prompt_shown', {
        task_count: (mitTask ? 1 : 0) + otherTasks.length,
        has_mit: !!mitTask,
      })
    }
  }, [showRollover, mitTask, otherTasks.length, track])

  // Track when celebration modal is shown
  React.useEffect(() => {
    if (showCelebration) {
      track('celebration_shown', {
        celebration_type: 'daily_completion',
        task_count: yesterdayTaskCount,
      })
    }
  }, [showCelebration, yesterdayTaskCount, track])

  // Handle celebration dismissal
  const handleCelebrationDismiss = React.useCallback(async () => {
    await markCelebrated()
  }, [markCelebrated])

  // Handle carrying forward selected tasks to today
  const handleCarryForward = React.useCallback(
    async (params: { selectedTaskIds: string[]; makeMitToday: boolean; keepReminderTimes: boolean }) => {
      if (!todayPlan) {
        console.error('[Rollover] No today plan available')
        return
      }

      try {
        await carryForwardTasks({
          selectedTaskIds: params.selectedTaskIds,
          targetPlanId: todayPlan.id,
          shouldMakeMIT: params.makeMitToday,
          keepReminderTimes: params.keepReminderTimes,
        })

        // Track analytics
        track('rollover_carried_forward', {
          task_count: params.selectedTaskIds.length,
          mit_carried: !!mitTask && params.selectedTaskIds.includes(mitTask.id),
          mit_made_today: params.makeMitToday,
          kept_reminders: params.keepReminderTimes,
        })

        // Mark as prompted so modal doesn't show again today
        await markPrompted()
      } catch (error) {
        console.error('[Rollover] Failed to carry forward tasks:', error)
        // Let the modal handle displaying the error
        throw error
      }
    },
    [todayPlan, carryForwardTasks, markPrompted, track, mitTask]
  )

  // Handle user choosing to start fresh (no task rollover)
  const handleStartFresh = React.useCallback(async () => {
    // Track analytics
    track('rollover_started_fresh', {
      task_count: (mitTask ? 1 : 0) + otherTasks.length,
      had_mit: !!mitTask,
    })

    // Mark as prompted so modal doesn't show again today
    await markPrompted()
  }, [markPrompted, track, mitTask, otherTasks.length])

  // Wait for auth to initialize before rendering routes
  // This prevents the race condition where (tabs) renders before auth check completes
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#FAF8F5' }}>
        <ActivityIndicator size="large" color="#7D9B8A" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
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

      {/* Celebration modal for completing all tasks from yesterday */}
      <CelebrationModal
        visible={showCelebration}
        taskCount={yesterdayTaskCount}
        onDismiss={handleCelebrationDismiss}
      />

      {/* Rollover prompt for incomplete tasks from yesterday */}
      <RolloverModal
        visible={showRollover}
        mitTask={mitTask}
        otherTasks={otherTasks}
        onCarryForward={handleCarryForward}
        onStartFresh={handleStartFresh}
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
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#FAF8F5' }}>
        <ActivityIndicator size="large" color="#7D9B8A" />
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
