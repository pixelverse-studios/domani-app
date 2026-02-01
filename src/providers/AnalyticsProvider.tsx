import React, { createContext, useContext, useEffect, useCallback } from 'react'
import { PostHogProvider, usePostHog } from 'posthog-react-native'

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = 'https://us.i.posthog.com'

// Event types for type-safe tracking
export type AnalyticsEvent =
  // Plan events
  | {
      name: 'plan_created'
      properties: { task_count: number; has_mit: boolean; plan_date: string }
    }
  | { name: 'plan_locked'; properties: { task_count: number; plan_date: string } }
  | { name: 'plan_unlocked'; properties: { plan_date: string } }
  // Task events
  | {
      name: 'task_created'
      properties: { priority: string; has_duration: boolean; has_notes: boolean; category?: string }
    }
  | {
      name: 'task_completed'
      properties: { is_mit: boolean; priority: string; time_to_complete_hours?: number }
    }
  | { name: 'task_uncompleted'; properties: { is_mit: boolean } }
  | { name: 'task_deleted'; properties: { was_completed: boolean } }
  | { name: 'task_reordered'; properties: { task_count: number } }
  // Auth events
  | { name: 'signed_in'; properties: { provider: 'google' | 'apple' } }
  | { name: 'signed_out'; properties?: Record<string, never> }
  // Subscription events
  | { name: 'subscription_started'; properties: { tier: string } }
  | { name: 'trial_started'; properties?: Record<string, never> }
  // Screen views
  | { name: 'screen_viewed'; properties: { screen: string } }
  // Engagement
  | { name: 'feedback_submitted'; properties: { category: string } }
  | { name: 'notifications_enabled'; properties?: Record<string, never> }
  | { name: 'notifications_skipped'; properties?: Record<string, never> }
  // Tutorial events
  | { name: 'tutorial_started'; properties: { source: 'onboarding' | 'settings' } }
  | { name: 'tutorial_step_viewed'; properties: { step: string; step_number: number } }
  | { name: 'tutorial_skipped'; properties: { last_step: string; step_number: number } }
  | { name: 'tutorial_completed'; properties: { duration_seconds: number } }
  | { name: 'tutorial_task_created'; properties?: Record<string, never> }
  | { name: 'tutorial_category_created'; properties?: Record<string, never> }

interface AnalyticsContextValue {
  track: <T extends AnalyticsEvent>(eventName: T['name'], properties?: T['properties']) => void
  identify: (userId: string, traits?: Record<string, string | number | boolean | null>) => void
  reset: () => void
  screen: (screenName: string) => void
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined)

function AnalyticsContextProvider({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog()

  const track = useCallback(
    <T extends AnalyticsEvent>(eventName: T['name'], properties?: T['properties']) => {
      if (!posthog) return
      posthog.capture(eventName, properties)
    },
    [posthog],
  )

  const identify = useCallback(
    (userId: string, traits?: Record<string, string | number | boolean | null>) => {
      if (!posthog) return
      posthog.identify(userId, traits)
    },
    [posthog],
  )

  const reset = useCallback(() => {
    if (!posthog) return
    posthog.reset()
  }, [posthog])

  const screen = useCallback(
    (screenName: string) => {
      if (!posthog) return
      posthog.screen(screenName)
    },
    [posthog],
  )

  const value = { track, identify, reset, screen }

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  // Skip PostHog if no API key (e.g., in development without .env)
  if (!POSTHOG_API_KEY) {
    console.warn('[Analytics] No PostHog API key found, analytics disabled')
    const noopValue: AnalyticsContextValue = {
      track: () => {},
      identify: () => {},
      reset: () => {},
      screen: () => {},
    }
    return <AnalyticsContext.Provider value={noopValue}>{children}</AnalyticsContext.Provider>
  }

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
        // Capture app lifecycle events automatically
        captureAppLifecycleEvents: true,
        // Enable session replay (requires dev build)
        enableSessionReplay: true,
        sessionReplayConfig: {
          // Mask all text input for privacy
          maskAllTextInputs: true,
          // Mask all images for privacy
          maskAllImages: false,
          // Capture network requests
          captureNetworkTelemetry: true,
        },
      }}
      // Enable autocapture for screen views
      autocapture={{
        captureScreens: true,
        captureTouches: false,
      }}
    >
      <AnalyticsContextProvider>{children}</AnalyticsContextProvider>
    </PostHogProvider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}
