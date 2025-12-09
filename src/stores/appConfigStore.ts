import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { supabase } from '~/lib/supabase'
import type { AppPhase, PhaseConfig, FeatureFlags, FeatureFlagsByPhase } from '~/types/appConfig'

// Default feature flags (fallback when remote config unavailable)
const DEFAULT_FEATURES: FeatureFlags = {
  feedback_enabled: true,
  analytics_enabled: false,
  invite_required: false,
}

interface AppConfigState {
  // Config values
  phase: AppPhase
  showBadge: boolean
  features: FeatureFlags
  featureFlagsByPhase: FeatureFlagsByPhase | null

  // Loading state
  isLoading: boolean
  error: string | null
  lastFetchedAt: number | null

  // Actions
  fetchConfig: () => Promise<void>
  isFeatureEnabled: (feature: keyof FeatureFlags) => boolean
}

export const useAppConfigStore = create<AppConfigState>()(
  persist(
    (set, get) => ({
      // Initial state - defaults to closed_beta with badge shown
      phase: 'closed_beta',
      showBadge: true,
      features: DEFAULT_FEATURES,
      featureFlagsByPhase: null,
      isLoading: false,
      error: null,
      lastFetchedAt: null,

      fetchConfig: async () => {
        set({ isLoading: true, error: null })

        try {
          // Fetch all config rows in one query
          const { data, error } = await supabase.from('app_config').select('key, value')

          if (error) throw error

          let phase: AppPhase = 'closed_beta'
          let showBadge = true
          let featureFlagsByPhase: FeatureFlagsByPhase | null = null

          // Parse config rows
          for (const row of data || []) {
            if (row.key === 'phase') {
              const phaseConfig = row.value as unknown as PhaseConfig
              phase = phaseConfig.current
              showBadge = phaseConfig.show_badge
            } else if (row.key === 'feature_flags') {
              featureFlagsByPhase = row.value as unknown as FeatureFlagsByPhase
            }
          }

          // Resolve features for current phase
          const features = featureFlagsByPhase?.[phase] || DEFAULT_FEATURES

          set({
            phase,
            showBadge,
            features,
            featureFlagsByPhase,
            isLoading: false,
            lastFetchedAt: Date.now(),
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
    }),
    {
      name: 'app-config-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields (not loading state)
      partialize: (state) => ({
        phase: state.phase,
        showBadge: state.showBadge,
        features: state.features,
        featureFlagsByPhase: state.featureFlagsByPhase,
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
    isLoading: store.isLoading,
    error: store.error,
    fetchConfig: store.fetchConfig,
    isFeatureEnabled: store.isFeatureEnabled,
  }
}
