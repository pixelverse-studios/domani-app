import type { PostHogOptions } from 'posthog-react-native'
import type { ErrorEvent } from '@sentry/react-native'

const EVENTS = new Set([
  'plan_created',
  'task_created',
  'task_completed',
  'task_uncompleted',
  'task_deleted',
  'task_reordered',
  'signed_in',
  'signed_out',
  'subscription_started',
  'trial_started',
  'promo_entry_opened',
  'promo_validation_attempted',
  'promo_validation_succeeded',
  'promo_validation_failed',
  'promo_applied',
  'promo_store_handoff_started',
  'promo_app_returned',
  'promo_sync_succeeded',
  'promo_sync_failed',
  'promo_redemption_completed',
  'screen_viewed',
  'feedback_submitted',
  'notifications_enabled',
  'notifications_skipped',
  'tutorial_started',
  'tutorial_step_viewed',
  'tutorial_skipped',
  'tutorial_completed',
  'tutorial_task_created',
  'tutorial_category_created',
  'rollover_prompt_shown',
  'rollover_carried_forward',
  'rollover_started_fresh',
  'evening_rollover_carried_forward',
  'evening_rollover_started_fresh',
  'celebration_shown',
  '$identify',
  '$create_alias',
  '$screen',
  'Application Installed',
  'Application Updated',
  'Application Opened',
  'Application Became Active',
  'Application Backgrounded',
])
const NUMBERS = new Set([
  'task_count',
  'time_to_complete_hours',
  'code_length',
  'step_number',
  'duration_seconds',
])
const BOOLEANS = new Set([
  'has_mit',
  'has_duration',
  'has_notes',
  'is_mit',
  'was_completed',
  'fallback_available',
  'mit_carried',
  'mit_made_today',
  'mit_made_tomorrow',
  'kept_reminders',
  'had_mit',
])
const SCREENS = [
  'welcome',
  'login',
  'today',
  'planning',
  'feedback',
  'settings',
  'progress',
  'notification_setup',
  'contact_support',
  'purchase_help',
]
const ENUMS: Record<string, readonly string[]> = {
  priority: ['top', 'high', 'medium', 'low'],
  provider: ['google', 'apple'],
  auth_provider: ['google', 'apple'],
  tier: ['trialing', 'lifetime', 'expired', 'refunded', 'pre_trial', 'beta'],
  platform: ['ios', 'android', 'web'],
  promo_outcome: ['free', 'discounted', 'unknown'],
  source: ['onboarding', 'settings', 'notification', 'app_open', 'purchase_help', 'redeem_code'],
  mode: ['morning', 'evening'],
  celebration_type: ['daily_completion'],
  screen: SCREENS,
  $screen_name: SCREENS,
}
const IDS = new Set([
  'distinct_id',
  '$anon_distinct_id',
  '$device_id',
  '$session_id',
  'campaign_id',
  'code_id',
  'redemption_attempt_id',
])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// An allowlist is intentional: arbitrary strings (including error messages,
// category names, route parameters and future task fields) are private by default.
export function structuralProperties(
  properties: Record<string, unknown> = {},
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) =>
        (NUMBERS.has(key) && typeof value === 'number' && Number.isFinite(value)) ||
        (BOOLEANS.has(key) && typeof value === 'boolean') ||
        (typeof value === 'string' &&
          ((Object.prototype.hasOwnProperty.call(ENUMS, key) && ENUMS[key].includes(value)) ||
            (IDS.has(key) && UUID.test(value)))),
    ),
  ) as Record<string, string | number | boolean>
}

export const filterAnalyticsEvent: NonNullable<PostHogOptions['before_send']> = (event) => {
  if (!event || !EVENTS.has(event.event)) return null
  const properties = structuralProperties(event.properties)
  // PostHog injects the public project token; ingestion requires it.
  if (typeof event.properties?.token === 'string') properties.token = event.properties.token
  return {
    event: event.event,
    uuid: event.uuid,
    timestamp: event.timestamp,
    properties,
    $set: structuralProperties(event.$set),
    $set_once: structuralProperties(event.$set_once),
  }
}

export function sanitizeErrorEvent(event: ErrorEvent): ErrorEvent | null {
  if (event.exception?.values?.[0]?.type === 'NetworkError') return null
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    release: event.release,
    environment: event.environment,
    level: event.level,
    message: event.exception?.values?.length ? undefined : '[private diagnostic message removed]',
    exception: {
      values: event.exception?.values?.map((exception) => ({
        type: ['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError'].includes(
          exception.type ?? '',
        )
          ? exception.type
          : 'Error',
        value: '[private error message removed]',
        stacktrace: {
          frames: exception.stacktrace?.frames?.map((frame) => ({
            // Strip URL queries/fragments and source snippets/locals.
            filename: frame.filename?.split(/[?#]/)[0],
            function: frame.function,
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
          })),
        },
      })),
    },
  }
}
