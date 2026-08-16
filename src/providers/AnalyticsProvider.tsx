import React, { createContext, useContext, useCallback } from 'react'
import { PostHogProvider, usePostHog } from 'posthog-react-native'
import Constants from 'expo-constants'

export interface AnalyticsBaseProperties {
  platform: 'ios' | 'android'
  app_version: string | null
  app_build: string | null
  country: string | null
}

const POSTHOG_API_KEY =
  Constants.expoConfig?.extra?.posthogApiKey || process.env.EXPO_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = 'https://us.i.posthog.com'

// Event types for type-safe tracking
export type AnalyticsEvent =
  // Acquisition and lifecycle events
  | { name: 'first_open'; properties: AnalyticsBaseProperties }
  | {
      name: 'app_opened'
      properties: AnalyticsBaseProperties & { session_source: 'cold_start' | 'foreground' }
    }
  | {
      name: 'sign_in_completed'
      properties: AnalyticsBaseProperties & {
        provider: 'google' | 'apple'
        is_new_registration: boolean
      }
    }
  // Task events
  | {
      name: 'task_created'
      properties: AnalyticsBaseProperties & {
        priority: string
        has_duration: boolean
        has_notes: boolean
        has_reminder: boolean
        category_type: 'system' | 'custom' | 'none'
        system_category?: string
        scheduled_for: 'today' | 'tomorrow' | 'other'
        tutorial_active: boolean
      }
    }
  | {
      name: 'planning_activated'
      properties: AnalyticsBaseProperties & {
        priority: string
        has_reminder: boolean
        category_type: 'system' | 'custom' | 'none'
        scheduled_for: 'today' | 'tomorrow'
      }
    }
  | {
      name: 'task_edited'
      properties: AnalyticsBaseProperties & {
        changed_priority: boolean
        changed_category: boolean
        changed_notes: boolean
        changed_reminder: boolean
        moved_day: boolean
      }
    }
  | {
      name: 'task_completed'
      properties: AnalyticsBaseProperties & {
        is_mit: boolean
        priority: string
        time_to_complete_hours?: number
      }
    }
  | { name: 'task_uncompleted'; properties: { is_mit: boolean } }
  | { name: 'task_deleted'; properties: { was_completed: boolean } }
  | { name: 'task_reordered'; properties: { task_count: number } }
  | {
      name: 'task_rolled_forward'
      properties: AnalyticsBaseProperties & { task_count: number; kept_reminders: boolean }
    }
  // Auth events
  | { name: 'signed_in'; properties: { provider: 'google' | 'apple' } }
  | { name: 'signed_out'; properties?: Record<string, never> }
  // Subscription events
  | { name: 'subscription_started'; properties: { tier: string } }
  | {
      name: 'trial_started'
      properties: AnalyticsBaseProperties & {
        offer: string | null
        signup_cohort: string | null
        trial_expires_at: string
      }
    }
  | {
      name: 'lifetime_purchase_completed'
      properties: AnalyticsBaseProperties & {
        product_id: string
        store: string | null
        price: number | null
        currency: string | null
        offer: string | null
        purchase_timestamp: string | null
        campaign_id: string | null
        campaign_slug: string | null
        promo_outcome: 'free' | 'discounted' | null
      }
    }
  | {
      name: 'purchase_restored'
      properties: AnalyticsBaseProperties & { product_id: string; store: string | null }
    }
  | {
      name: 'access_revoked'
      properties: AnalyticsBaseProperties & { revoked_at: string }
    }
  // Promo events
  | { name: 'promo_entry_opened'; properties: Record<string, never> }
  | {
      name: 'promo_validation_attempted'
      properties: { platform: string; code_length: number }
    }
  | {
      name: 'promo_validation_succeeded'
      properties: {
        platform: string
        campaign_id?: string | null
        campaign_slug?: string | null
        campaign_type?: string | null
        code_id?: string | null
        redemption_attempt_id?: string | null
        discount_kind?: string | null
        promo_outcome?: 'free' | 'discounted' | 'unknown'
        store_action?: string | null
        product_id?: string | null
        revenuecat_offering_id?: string | null
        revenuecat_package_id?: string | null
        validation_status?: string | null
        fallback_available?: boolean
      }
    }
  | {
      name: 'promo_validation_failed'
      properties: {
        platform: string
        campaign_id?: string | null
        campaign_slug?: string | null
        campaign_type?: string | null
        code_id?: string | null
        redemption_attempt_id?: string | null
        validation_status?: string | null
        error_code?: string | null
      }
    }
  | {
      name: 'promo_applied' | 'promo_store_handoff_started'
      properties: {
        platform: string
        campaign_id?: string | null
        campaign_slug?: string | null
        campaign_type?: string | null
        code_id?: string | null
        redemption_attempt_id?: string | null
        discount_kind?: string | null
        promo_outcome?: 'free' | 'discounted' | 'unknown'
        store_action?: string | null
        product_id?: string | null
        revenuecat_offering_id?: string | null
        revenuecat_package_id?: string | null
        fallback_available?: boolean
        source?: string | null
      }
    }
  | {
      name:
        | 'promo_app_returned'
        | 'promo_sync_succeeded'
        | 'promo_sync_failed'
        | 'promo_redemption_completed'
      properties: {
        platform: string
        campaign_id?: string | null
        campaign_slug?: string | null
        campaign_type?: string | null
        code_id?: string | null
        redemption_attempt_id?: string | null
        discount_kind?: string | null
        promo_outcome?: 'free' | 'discounted' | 'unknown'
        sync_status?: string | null
        source?: string | null
        error_code?: string | null
      }
    }
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
  // Rollover events
  | { name: 'rollover_prompt_shown'; properties: { task_count: number; has_mit: boolean } }
  | {
      name: 'rollover_carried_forward'
      properties: {
        task_count: number
        mit_carried: boolean
        mit_made_today: boolean
        kept_reminders: boolean
      }
    }
  | { name: 'rollover_started_fresh'; properties: { task_count: number; had_mit: boolean } }
  // Evening rollover events (Flow 2 — notification-tap or app-open after reminder time)
  | {
      name: 'evening_rollover_carried_forward'
      properties: {
        task_count: number
        mit_carried: boolean
        mit_made_tomorrow: boolean
        kept_reminders: boolean
        source: 'notification' | 'app_open'
        mode?: 'morning' | 'evening'
      }
    }
  | {
      name: 'evening_rollover_started_fresh'
      properties: {
        task_count: number
        had_mit: boolean
        source: 'notification' | 'app_open'
        mode?: 'morning' | 'evening'
      }
    }
  // Celebration events
  | {
      name: 'celebration_shown'
      properties: { celebration_type: 'daily_completion'; task_count: number }
    }

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
      if (!posthog) {
        console.warn('[Analytics] Cannot track event, PostHog not initialized:', eventName)
        return
      }
      console.log('[Analytics] Tracking event:', eventName, properties)
      posthog.capture(eventName, properties as Parameters<typeof posthog.capture>[1])
    },
    [posthog],
  )

  const identify = useCallback(
    (userId: string, traits?: Record<string, string | number | boolean | null>) => {
      if (!posthog) {
        console.warn('[Analytics] Cannot identify user, PostHog not initialized')
        return
      }
      console.log('[Analytics] Identifying user:', userId, traits)
      posthog.identify(userId, traits)
    },
    [posthog],
  )

  const reset = useCallback(() => {
    if (!posthog) {
      console.warn('[Analytics] Cannot reset, PostHog not initialized')
      return
    }
    console.log('[Analytics] Resetting user session')
    posthog.reset()
  }, [posthog])

  const screen = useCallback(
    (screenName: string) => {
      if (!posthog) {
        console.warn('[Analytics] Cannot track screen, PostHog not initialized:', screenName)
        return
      }
      console.log('[Analytics] Tracking screen:', screenName)
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

  console.log(
    '[Analytics] Initializing PostHog with key:',
    POSTHOG_API_KEY.substring(0, 10) + '...',
  )
  console.log('[Analytics] PostHog host:', POSTHOG_HOST)

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
        // Capture app lifecycle events automatically
        captureAppLifecycleEvents: true,
        // Disable session replay for now (requires custom dev build, not Expo Go)
        enableSessionReplay: false,
        // Note: Uncomment below when using custom dev builds (not Expo Go)
        // enableSessionReplay: true,
        // sessionReplayConfig: {
        //   maskAllTextInputs: true,
        //   maskAllImages: false,
        //   captureNetworkTelemetry: true,
        // },
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
