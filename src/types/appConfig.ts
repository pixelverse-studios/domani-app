/**
 * App Configuration Types
 *
 * These types define the structure of the app_config table in Supabase,
 * which controls app phase and feature flags dynamically.
 */

// App phases - matches the database enum
export type AppPhase = 'closed_beta' | 'open_beta' | 'production'

// Phase configuration (stored in app_config.value for key='phase')
export interface PhaseConfig {
  current: AppPhase
  show_badge: boolean
}

// Feature flags per phase (stored in app_config.value for key='feature_flags')
export interface FeatureFlags {
  feedback_enabled: boolean
  analytics_enabled: boolean
  invite_required: boolean
}

export type FeatureFlagsByPhase = Record<AppPhase, FeatureFlags>

// Raw database row type
export interface AppConfigRow {
  key: string
  value: PhaseConfig | FeatureFlagsByPhase
  updated_at: string
}

// Parsed/resolved config for use in the app
export interface AppConfig {
  phase: AppPhase
  showBadge: boolean
  features: FeatureFlags
  isLoading: boolean
  error: string | null
}

// Badge display info derived from phase
export const PHASE_DISPLAY: Record<AppPhase, { label: string; variant: 'beta' | 'default' }> = {
  closed_beta: { label: 'Beta', variant: 'beta' },
  open_beta: { label: 'Beta', variant: 'beta' },
  production: { label: '', variant: 'default' },
}
