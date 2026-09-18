import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react'
import { PostHogProvider, PostHogPersistedProperty, usePostHog } from 'posthog-react-native'
import Constants from 'expo-constants'
import { resetAnalyticsClient } from '~/lib/resetAnalyticsClient'
import {
  analyticsStorage,
  clearAccountAnalytics,
  registerAnalyticsCleanup,
} from '~/lib/analyticsStorage'
import { filterAnalyticsEvent, structuralProperties, identityTraits } from '~/lib/telemetryPrivacy'

const POSTHOG_API_KEY =
  Constants.expoConfig?.extra?.posthogApiKey || process.env.EXPO_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = 'https://us.i.posthog.com'

// Event types for type-safe tracking
export type AnalyticsEvent =
  // Plan events
  | {
      name: 'plan_created'
      properties: { task_count: number; has_mit: boolean; plan_date: string }
    }
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
  const identityUpdate = useRef(0)
  const cleanup = useRef<Promise<void> | null>(null)

  useEffect(() => {
    if (!posthog) return
    return registerAnalyticsCleanup(() => {
      if (cleanup.current) return cleanup.current
      identityUpdate.current += 1
      const pending = resetAnalyticsClient(posthog).finally(() => {
        cleanup.current = null
      })
      cleanup.current = pending
      return pending
    })
  }, [posthog])

  const track = useCallback(
    <T extends AnalyticsEvent>(eventName: T['name'], properties?: T['properties']) => {
      if (!posthog) {
        console.warn('[Analytics] Cannot track event, PostHog not initialized:', eventName)
        return
      }
      console.log('[Analytics] Tracking event:', eventName, properties)
      if (cleanup.current) return
      posthog.capture(eventName, structuralProperties(properties, eventName))
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
      const update = ++identityUpdate.current
      void posthog
        .ready()
        .then(async () => {
          await cleanup.current
          if (identityUpdate.current !== update) return
          if (
            posthog.getPersistedProperty(PostHogPersistedProperty.PersonMode) === 'identified' &&
            posthog.getDistinctId() !== userId
          ) {
            await clearAccountAnalytics()
            // clearAccountAnalytics invalidates earlier identity callbacks.
            if (identityUpdate.current !== update + 1) return
          }
          posthog.identify(userId, identityTraits(traits))
        })
        .catch(() => {
          console.warn('[Analytics] Identity reconciliation failed')
        })
    },
    [posthog],
  )

  const reset = useCallback(() => {
    if (!posthog) {
      console.warn('[Analytics] Cannot reset, PostHog not initialized')
      return
    }
    console.log('[Analytics] Resetting user session')
    const update = ++identityUpdate.current
    void posthog
      .ready()
      .then(async () => {
        if (identityUpdate.current !== update) return
        if (posthog.getPersistedProperty(PostHogPersistedProperty.PersonMode) === 'identified') {
          await clearAccountAnalytics()
        }
      })
      .catch(() => {
        console.warn('[Analytics] Account reset failed')
      })
  }, [posthog])

  const screen = useCallback(
    (screenName: string) => {
      if (!posthog) {
        console.warn('[Analytics] Cannot track screen, PostHog not initialized:', screenName)
        return
      }
      console.log('[Analytics] Tracking screen:', screenName)
      if (cleanup.current) return
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
        persistence: 'file',
        customStorage: analyticsStorage,
        before_send: filterAnalyticsEvent,
        errorTracking: { autocapture: false },
        // Capture app lifecycle events automatically
        captureAppLifecycleEvents: true,
        // Disable session replay for now (requires custom dev build, not Expo Go)
        enableSessionReplay: false,
      }}
      // Explicit screen events use fixed names; automatic routes can contain private parameters.
      autocapture={{
        captureScreens: false,
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
