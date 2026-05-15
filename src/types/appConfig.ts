/**
 * App Configuration Types
 *
 * These types define the structure of the app_config table in Supabase,
 * which controls app phase and feature flags dynamically.
 */

// App phases - matches the database enum
export type AppPhase = 'closed_beta' | 'open_beta' | 'production'
export type PublicPricingTier = 'early_adopter' | 'standard'

// Phase configuration (stored in app_config.value for key='phase')
export interface PhaseConfig {
  current: AppPhase
  show_badge: boolean
}

// Beta access configuration (stored in app_config.value for key='beta_access')
export interface BetaAccessConfig {
  legacy_beta_signup_cutoff: string
  beta_end_date: string
  grace_period_days: number
}

// Feature flags per phase (stored in app_config.value for key='feature_flags')
export interface FeatureFlags {
  feedback_enabled: boolean
  analytics_enabled: boolean
  invite_required: boolean
}

// Public login/signup pricing config (stored in app_config.value for key='public_pricing')
export interface PublicPricingConfig {
  tier: PublicPricingTier
}

export type FeatureFlagsByPhase = Record<AppPhase, FeatureFlags>

// Raw database row type
export interface AppConfigRow {
  key: string
  value: PhaseConfig | FeatureFlagsByPhase | PublicPricingConfig
  updated_at: string
}

// Parsed/resolved config for use in the app
export interface AppConfig {
  phase: AppPhase
  showBadge: boolean
  features: FeatureFlags
  publicPricing: PublicPricingTier
  betaAccess: BetaAccessConfig
  isLoading: boolean
  error: string | null
}

// Badge display info derived from phase
export const PHASE_DISPLAY: Record<AppPhase, { label: string; variant: 'beta' | 'default' }> = {
  closed_beta: { label: 'Beta', variant: 'beta' },
  open_beta: { label: 'Beta', variant: 'beta' },
  production: { label: '', variant: 'default' },
}

/**
 * True when the app is in a beta phase (closed or open). Single source
 * of truth for "is the user in beta" checks across the app, so adding a
 * new phase variant (e.g. a future 'private_beta') only requires
 * updating this function rather than hunting down scattered string
 * comparisons.
 */
export function isBetaPhase(phase: AppPhase): boolean {
  return phase === 'closed_beta' || phase === 'open_beta'
}
