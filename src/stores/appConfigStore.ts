import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { supabase } from '~/lib/supabase'
import type {
  AppPhase,
  BetaAccessConfig,
  PhaseConfig,
  FeatureFlags,
  FeatureFlagsByPhase,
  PublicPricingConfig,
  PublicPricingTier,
} from '~/types/appConfig'

const DEFAULT_PHASE_CONFIG: PhaseConfig = {
  current: 'production',
  show_badge: false,
}

// Default feature flags (fallback when remote config unavailable)
const DEFAULT_FEATURES: FeatureFlags = {
  feedback_enabled: true,
  analytics_enabled: false,
  invite_required: false,
}

const DEFAULT_BETA_ACCESS: BetaAccessConfig = {
  legacy_beta_signup_cutoff: '2026-04-01T00:00:00Z',
  beta_end_date: '2026-03-31T00:00:00Z',
  grace_period_days: 14,
}

interface AppConfigState {
  // Config values
  phase: AppPhase
  showBadge: boolean
  features: FeatureFlags
  featureFlagsByPhase: FeatureFlagsByPhase | null
  publicPricing: PublicPricingTier
  betaAccess: BetaAccessConfig

  // Loading state
  isLoading: boolean
  error: string | null
  lastFetchedAt: number | null
  hasFetchedConfigThisSession: boolean

  // Actions
  fetchConfig: () => Promise<void>
  isFeatureEnabled: (feature: keyof FeatureFlags) => boolean
  setPhaseOverride: (phase: AppPhase) => void
}

type PersistedAppConfigState = Partial<
  Pick<
    AppConfigState,
    | 'phase'
    | 'showBadge'
    | 'features'
    | 'featureFlagsByPhase'
    | 'publicPricing'
    | 'betaAccess'
    | 'lastFetchedAt'
  >
>

export const useAppConfigStore = create<AppConfigState>()(
  persist(
    (set, get) => ({
      // Default to production so stale or missing config does not grant beta mode.
      phase: DEFAULT_PHASE_CONFIG.current,
      showBadge: DEFAULT_PHASE_CONFIG.show_badge,
      features: DEFAULT_FEATURES,
      featureFlagsByPhase: null,
      publicPricing: 'early_adopter',
      betaAccess: DEFAULT_BETA_ACCESS,
      isLoading: false,
      error: null,
      lastFetchedAt: null,
      hasFetchedConfigThisSession: false,

      fetchConfig: async () => {
        set({ isLoading: true, error: null })

        try {
          // Fetch all config rows in one query
          const { data, error } = await supabase.from('app_config').select('key, value')

          if (error) throw error

          let phase: AppPhase = DEFAULT_PHASE_CONFIG.current
          let showBadge = DEFAULT_PHASE_CONFIG.show_badge
          let featureFlagsByPhase: FeatureFlagsByPhase | null = null
          let publicPricing: PublicPricingTier = 'early_adopter'
          let betaAccess: BetaAccessConfig = DEFAULT_BETA_ACCESS

          // Parse config rows
          for (const row of data || []) {
            if (row.key === 'phase') {
              const phaseConfig = row.value as unknown as PhaseConfig
              phase = phaseConfig.current
              showBadge = phaseConfig.show_badge
            } else if (row.key === 'feature_flags') {
              featureFlagsByPhase = row.value as unknown as FeatureFlagsByPhase
            } else if (row.key === 'public_pricing') {
              const publicPricingConfig = row.value as unknown as PublicPricingConfig
              if (
                publicPricingConfig.tier === 'early_adopter' ||
                publicPricingConfig.tier === 'standard'
              ) {
                publicPricing = publicPricingConfig.tier
              }
            } else if (row.key === 'beta_access') {
              const betaAccessConfig = row.value as unknown as Partial<BetaAccessConfig>
              if (
                typeof betaAccessConfig.legacy_beta_signup_cutoff === 'string' &&
                typeof betaAccessConfig.beta_end_date === 'string' &&
                typeof betaAccessConfig.grace_period_days === 'number'
              ) {
                betaAccess = {
                  legacy_beta_signup_cutoff: betaAccessConfig.legacy_beta_signup_cutoff,
                  beta_end_date: betaAccessConfig.beta_end_date,
                  grace_period_days: betaAccessConfig.grace_period_days,
                }
              }
            }
          }

          // Resolve features for current phase
          const features = featureFlagsByPhase?.[phase] || DEFAULT_FEATURES

          set({
            phase,
            showBadge,
            features,
            featureFlagsByPhase,
            publicPricing,
            betaAccess,
            isLoading: false,
            lastFetchedAt: Date.now(),
            hasFetchedConfigThisSession: true,
          })
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch app config'
          set({
            isLoading: false,
            error: errorMessage,
          })
          console.error('Error fetching app config:', err)
        }
      },

      isFeatureEnabled: (feature: keyof FeatureFlags) => {
        return get().features[feature] ?? false
      },

      setPhaseOverride: (phase: AppPhase) => {
        set({ phase })
      },
    }),
    {
      name: 'app-config-storage',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: unknown) => {
        const state = (persistedState ?? {}) as PersistedAppConfigState

        return {
          publicPricing: state.publicPricing ?? 'early_adopter',
          betaAccess: state.betaAccess ?? DEFAULT_BETA_ACCESS,
          lastFetchedAt: state.lastFetchedAt ?? null,
        }
      },
      // Persist only non-phase config. Phase and derived feature state must come
      // from a fresh fetch each launch so stale beta values cannot stick locally.
      partialize: (state) => ({
        publicPricing: state.publicPricing,
        betaAccess: state.betaAccess,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
)

// Hook for easy consumption with auto-fetch
export function useAppConfig() {
  const store = useAppConfigStore()

  return {
    phase: store.phase,
    showBadge: store.showBadge,
    features: store.features,
    publicPricing: store.publicPricing,
    betaAccess: store.betaAccess,
    hasFetchedConfig: store.hasFetchedConfigThisSession,
    isLoading: store.isLoading,
    error: store.error,
    fetchConfig: store.fetchConfig,
    isFeatureEnabled: store.isFeatureEnabled,
  }
}
