import '../../global.css'

// Initialize Sentry before any other code runs
import { initSentry } from '~/lib/sentry'
initSentry()

import React from 'react'
import { Stack, useRouter } from 'expo-router'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
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
import { View, ActivityIndicator, Alert } from 'react-native'

import { supabase } from '~/lib/supabase'
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
import { useEveningRolloverOnAppOpen } from '~/hooks/useEveningRolloverOnAppOpen'
import { useTomorrowPlan } from '~/hooks/usePlans'
import { AccountConfirmationOverlay } from '~/components/AccountConfirmationOverlay'
import { RolloverModal, CelebrationModal } from '~/components/planning'
import { ErrorBoundary } from '~/components/ErrorBoundary'

const queryClient = new QueryClient()

function RootLayoutContent() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Clear React Query cache on sign out to prevent stale data leaking into new accounts.
  // Without this, cached plan IDs from the previous user cause task creation to fail
  // on the first attempt after switching accounts (RLS rejects the stale plan_id).
  // Note: queryClient is stable for the lifetime of the provider — [] is intentional.
  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (__DEV__) console.log('[RootLayout] Clearing React Query cache on SIGNED_OUT')
        queryClient.clear()
      }
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Celebration detection (morning rollover prompt removed — evening flow handles rollover)
  const {
    shouldShowCelebration,
    yesterdayTaskCount,
    isLoading: rolloverLoading,
    markCelebrated,
  } = useRolloverTasks()
  const { isActive: tutorialActive } = useTutorialStore()

  // Evening rollover on app open — triggers when user opens app at/after their reminder time
  const {
    shouldShow: eveningAppOpenShouldShow,
    isLoading: eveningAppOpenLoading,
    mitTask: eveningAppOpenMitTask,
    otherTasks: eveningAppOpenOtherTasks,
    markEveningPrompted: markEveningAppOpenPrompted,
  } = useEveningRolloverOnAppOpen()

  const { data: tomorrowPlan } = useTomorrowPlan({ enabled: eveningAppOpenShouldShow })
  const { mutateAsync: carryForwardTasks } = useCarryForwardTasks()

  // Scalar id used in useCallback dep arrays to avoid referencing the full task object
  const eveningAppOpenMitTaskId = eveningAppOpenMitTask?.id ?? null

  // Show celebration modal if:
  // - User should be celebrated (all tasks from yesterday completed & not already celebrated)
  // - Tutorial is not active (don't conflict with tutorial)
  // - Not loading
  // - Auth is complete
  // Celebration takes precedence over evening rollover
  const showCelebration = shouldShowCelebration && !tutorialActive && !rolloverLoading && !loading

  // Evening rollover (app-open path)
  // Note: !!tomorrowPlan gates display until the plan upsert completes after eveningAppOpenShouldShow
  // flips true. There is no loading indicator for this window — the modal simply hasn't appeared yet.
  const showEveningAppOpenRollover =
    eveningAppOpenShouldShow &&
    !tutorialActive &&
    !eveningAppOpenLoading &&
    !loading &&
    !!tomorrowPlan &&
    !showCelebration

  // Debug: log rollover state on every change (DEV only)
  React.useEffect(() => {
    if (__DEV__) {
      console.log('[Rollover Debug]', {
        tutorialActive,
        rolloverLoading,
        authLoading: loading,
        showCelebration,
        showEveningAppOpenRollover,
        eveningAppOpenShouldShow,
        eveningAppOpenLoading,
      })
    }
  }, [
    tutorialActive,
    rolloverLoading,
    loading,
    showCelebration,
    showEveningAppOpenRollover,
    eveningAppOpenShouldShow,
    eveningAppOpenLoading,
  ])

  // Track when celebration modal is shown
  React.useEffect(() => {
    if (showCelebration) {
      track('celebration_shown', {
        celebration_type: 'daily_completion',
        task_count: yesterdayTaskCount,
      })
    }
  }, [showCelebration, yesterdayTaskCount, track])

  // Handle carrying forward today's incomplete tasks to tomorrow (app-open evening path)
  const handleEveningAppOpenCarryForward = React.useCallback(
    async (params: {
      selectedTaskIds: string[]
      makeMitToday: boolean
      keepReminderTimes: boolean
    }) => {
      if (!tomorrowPlan) {
        console.error('[EveningRollover] No tomorrow plan available')
        await markEveningAppOpenPrompted() // swallows errors internally — safe to await without try/catch
        return
      }

      try {
        await carryForwardTasks({
          selectedTaskIds: params.selectedTaskIds,
          targetPlanId: tomorrowPlan.id,
          shouldMakeMIT: params.makeMitToday,
          keepReminderTimes: params.keepReminderTimes,
        })

        track('evening_rollover_carried_forward', {
          task_count: params.selectedTaskIds.length,
          mit_carried:
            !!eveningAppOpenMitTaskId &&
            params.selectedTaskIds.includes(eveningAppOpenMitTaskId),
          mit_made_tomorrow: params.makeMitToday,
          kept_reminders: params.keepReminderTimes,
          source: 'app_open',
        })

        await markEveningAppOpenPrompted()
        router.push('/(tabs)/planning?defaultPlanningFor=tomorrow&openForm=true')
      } catch (error) {
        console.error('[EveningRollover] Failed to carry forward tasks:', error)
        Alert.alert(
          'Something went wrong',
          "We couldn't carry your tasks forward. Please try again.",
        )
        // Don't re-throw — RolloverModal.onCarryForward is not awaited (typed as void)
        // Modal stays open so the user can retry or choose start fresh
      }
    },
    [
      tomorrowPlan,
      carryForwardTasks,
      markEveningAppOpenPrompted,
      track,
      eveningAppOpenMitTaskId,
      router,
    ],
  )

  // Handle user dismissing evening rollover without carrying tasks forward
  const handleEveningAppOpenStartFresh = React.useCallback(async () => {
    track('evening_rollover_started_fresh', {
      task_count: (eveningAppOpenMitTaskId ? 1 : 0) + eveningAppOpenOtherTasks.length,
      had_mit: !!eveningAppOpenMitTaskId,
      source: 'app_open',
    })

    try {
      await markEveningAppOpenPrompted()
      // Note: markEveningAppOpenPrompted swallows errors internally (see useEveningRolloverOnAppOpen.ts)
      // This catch is a safety net in case the internal behaviour changes
    } catch (error) {
      if (__DEV__)
        console.error('[EveningRollover] Failed to mark as prompted:', error)
      // Non-fatal — proceed so user is not stuck
    }
    router.push('/(tabs)/planning?defaultPlanningFor=tomorrow&openForm=true')
  }, [
    markEveningAppOpenPrompted,
    track,
    eveningAppOpenMitTaskId,
    eveningAppOpenOtherTasks.length,
    router,
  ])

  // Handle celebration dismissal
  const handleCelebrationDismiss = React.useCallback(async () => {
    try {
      await markCelebrated()
    } catch (error) {
      if (__DEV__) console.error('[Celebration] Failed to mark as celebrated:', error)
      // Non-fatal — modal still closes
    }
  }, [markCelebrated])

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

      {/* Evening rollover — app-open path (time-based, no notification tap required) */}
      <RolloverModal
        visible={showEveningAppOpenRollover}
        mitTask={eveningAppOpenMitTask}
        otherTasks={eveningAppOpenOtherTasks}
        title="Today's Unfinished Tasks"
        subtitle="Before you plan tomorrow, wrap up today"
        onCarryForward={handleEveningAppOpenCarryForward}
        onStartFresh={handleEveningAppOpenStartFresh}
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
