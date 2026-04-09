import React, { useState } from 'react'
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useAppConfigStore } from '~/stores/appConfigStore'
import { useAuth } from '~/hooks/useAuth'
import { supabase } from '~/lib/supabase'
import type { AppPhase } from '~/types/appConfig'

interface DevToolsSectionProps {
  onOpenPaywall?: () => void
}

export function DevToolsSection({ onOpenPaywall }: DevToolsSectionProps) {
  const theme = useAppTheme()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const phase = useAppConfigStore((s) => s.phase)
  const setPhaseOverride = useAppConfigStore((s) => s.setPhaseOverride)
  const isBetaPhase = phase === 'closed_beta' || phase === 'open_beta'

  const [isResettingTrial, setIsResettingTrial] = useState(false)

  const buttonStyle = {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 12,
    padding: 14,
  }

  const handleResetTrial = () => {
    if (!user?.id) return
    Alert.alert(
      'Reset Trial State',
      "This clears your profile's tier, trial_started_at, and trial_ends_at. You will be returned to the pre_trial state and can start a fresh trial. Continue?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResettingTrial(true)
            try {
              const { error } = await supabase
                .from('profiles')
                .update({
                  tier: 'none',
                  trial_started_at: null,
                  trial_ends_at: null,
                })
                .eq('id', user.id)
              if (error) throw error
              await queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
            } catch (err) {
              Alert.alert(
                'Reset Failed',
                err instanceof Error ? err.message : 'Could not reset trial state.',
              )
            } finally {
              setIsResettingTrial(false)
            }
          },
        },
      ],
    )
  }

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        className="text-xs font-sans-bold text-content-tertiary mb-3"
        style={{ letterSpacing: 1 }}
      >
        DEV TOOLS
      </Text>

      {/* Phase Override Toggle */}
      <TouchableOpacity
        onPress={() => {
          const nextPhase: AppPhase = isBetaPhase ? 'production' : 'open_beta'
          setPhaseOverride(nextPhase)
        }}
        activeOpacity={0.7}
        style={buttonStyle}
      >
        <Text className="font-sans-semibold text-sm" style={{ color: theme.colors.text.primary }}>
          {isBetaPhase ? 'Switch to Production Mode' : 'Switch to Beta Mode'}
        </Text>
        <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
          Current: {phase} — {isBetaPhase ? 'subscription UI hidden' : 'subscription UI visible'}
        </Text>
      </TouchableOpacity>

      {/* Reset Trial — clears the profile's tier and trial columns, then
          invalidates the profile query. Once the refetch completes, the
          state machine recomputes: with trial_started_at null, the user
          resolves to pre_trial (not expired), so the full trial-start
          flow can be exercised again without manual DB edits. */}
      <TouchableOpacity
        onPress={handleResetTrial}
        disabled={isResettingTrial || !user?.id}
        activeOpacity={0.7}
        style={{ ...buttonStyle, marginTop: 8, opacity: isResettingTrial || !user?.id ? 0.5 : 1 }}
      >
        <View className="flex-row items-center justify-between">
          <View style={{ flex: 1 }}>
            <Text
              className="font-sans-semibold text-sm"
              style={{ color: theme.colors.text.primary }}
            >
              Reset Trial State
            </Text>
            <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
              Clear tier / trial_started_at / trial_ends_at → pre_trial
            </Text>
          </View>
          {isResettingTrial && (
            <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Open Paywall Modal */}
      {onOpenPaywall && (
        <TouchableOpacity
          onPress={onOpenPaywall}
          activeOpacity={0.7}
          style={{ ...buttonStyle, marginTop: 8 }}
        >
          <Text
            className="font-sans-semibold text-sm"
            style={{ color: theme.colors.text.primary }}
          >
            Open Paywall Modal
          </Text>
          <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
            Preview paywall regardless of subscription state
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
