import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || ''

/**
 * Initialize Sentry for error monitoring.
 * Only enabled in production builds (not in development or Expo Go).
 */
export function initSentry() {
  // Skip initialization if no DSN configured
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.log('[Sentry] Skipping initialization - no DSN configured')
    }
    return
  }

  // Skip in development mode
  if (__DEV__) {
    console.log('[Sentry] Skipping initialization in development mode')
    return
  }

  const appVersion = Constants.expoConfig?.version || '1.0.0'
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode?.toString() ||
    '1'

  Sentry.init({
    dsn: SENTRY_DSN,

    // Release tracking for correlating errors with versions
    release: `com.baitedz.domani-app@${appVersion}+${buildNumber}`,

    // Environment differentiation
    environment: __DEV__ ? 'development' : 'production',

    // Sample rate for performance monitoring (0.0 to 1.0)
    // Start with 20% to balance insights vs cost
    tracesSampleRate: 0.2,

    // Enable native crash reporting
    enableNative: true,

    // Attach stack traces to all messages
    attachStacktrace: true,

    // Breadcrumb configuration
    maxBreadcrumbs: 50,

    // Don't send PII by default
    sendDefaultPii: false,

    // Filter out known non-actionable errors
    beforeSend(event) {
      // Filter out network errors that are user-side issues
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null
      }

      return event
    },

    // Add app context
    initialScope: {
      tags: {
        appVersion,
        platform: Constants.platform?.ios ? 'ios' : 'android',
      },
    },
  })
}

/**
 * Set the current user for Sentry error tracking.
 * Call this after authentication to associate errors with users.
 */
export function setSentryUser(userId: string | null, email?: string) {
  if (!SENTRY_DSN || __DEV__) return

  if (userId) {
    Sentry.setUser({
      id: userId,
      email: email,
    })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Capture an exception and send to Sentry.
 * Use this for caught errors that should still be tracked.
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN || __DEV__) {
    console.error('[Sentry] Would capture:', error, context)
    return
  }

  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Capture a message for tracking non-error events.
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!SENTRY_DSN || __DEV__) {
    console.log(`[Sentry] Would capture message (${level}):`, message)
    return
  }

  Sentry.captureMessage(message, level)
}

/**
 * Add a breadcrumb for debugging context.
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  if (!SENTRY_DSN || __DEV__) return

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  })
}

// Re-export Sentry for advanced usage
export { Sentry }
