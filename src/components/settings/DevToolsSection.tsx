import React, { useState } from 'react'
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useAppConfigStore } from '~/stores/appConfigStore'
import { useAuth } from '~/hooks/useAuth'
import { supabase } from '~/lib/supabase'
import { isBetaPhase, type AppPhase } from '~/types/appConfig'

interface DevToolsSectionProps {
  onOpenPaywall?: () => void
}

export function DevToolsSection({ onOpenPaywall }: DevToolsSectionProps) {
  const theme = useAppTheme()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const phase = useAppConfigStore((s) => s.phase)
  const setPhaseOverride = useAppConfigStore((s) => s.setPhaseOverride)
  const ignoreRevenueCatForDebug = useAppConfigStore((s) => s.ignoreRevenueCatForDebug)
  const setIgnoreRevenueCatForDebug = useAppConfigStore((s) => s.setIgnoreRevenueCatForDebug)
  const inBetaPhase = isBetaPhase(phase)

  const [isResettingTrial, setIsResettingTrial] = useState(false)
  const [isResettingPreTrial, setIsResettingPreTrial] = useState(false)

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

  const handleResetToPreTrial = () => {
    if (!user?.id) return
    Alert.alert(
      'Reset To Pre-Trial',
      "This clears refunded and trial state, moves created_at to now, and enables a local dev override to ignore RevenueCat entitlements so the account can exercise the pre-trial flow again. Continue?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResettingPreTrial(true)
            try {
              const { error } = await supabase
                .from('profiles')
                .update({
                  tier: 'none',
                  trial_started_at: null,
                  trial_ends_at: null,
                  refunded_at: null,
                  created_at: new Date().toISOString(),
                })
                .eq('id', user.id)

              if (error) throw error

              setIgnoreRevenueCatForDebug(true)

              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['profile', user.id] }),
                queryClient.invalidateQueries({ queryKey: ['customerInfo', user.id] }),
              ])
            } catch (err) {
              Alert.alert(
                'Reset Failed',
                err instanceof Error
                  ? err.message
                  : 'Could not reset account to pre-trial eligibility.',
              )
            } finally {
              setIsResettingPreTrial(false)
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
          const nextPhase: AppPhase = inBetaPhase ? 'production' : 'open_beta'
          setPhaseOverride(nextPhase)
        }}
        activeOpacity={0.7}
        style={buttonStyle}
      >
        <Text className="font-sans-semibold text-sm" style={{ color: theme.colors.text.primary }}>
          {inBetaPhase ? 'Switch to Production Mode' : 'Switch to Beta Mode'}
        </Text>
        <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
          Current: {phase} — {inBetaPhase ? 'subscription UI hidden' : 'subscription UI visible'}
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

      <TouchableOpacity
        onPress={handleResetToPreTrial}
        disabled={isResettingPreTrial || !user?.id}
        activeOpacity={0.7}
        style={{
          ...buttonStyle,
          marginTop: 8,
          opacity: isResettingPreTrial || !user?.id ? 0.5 : 1,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View style={{ flex: 1 }}>
            <Text
              className="font-sans-semibold text-sm"
              style={{ color: theme.colors.text.primary }}
            >
              Reset To Pre-Trial
            </Text>
            <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
              Clear refunded state / trial state and ignore RevenueCat → start trial again
            </Text>
          </View>
          {isResettingPreTrial && (
            <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIgnoreRevenueCatForDebug(!ignoreRevenueCatForDebug)}
        activeOpacity={0.7}
        style={{ ...buttonStyle, marginTop: 8 }}
      >
        <Text
          className="font-sans-semibold text-sm"
          style={{ color: theme.colors.text.primary }}
        >
          {ignoreRevenueCatForDebug ? 'Use Live RevenueCat State' : 'Ignore RevenueCat State'}
        </Text>
        <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
          {ignoreRevenueCatForDebug
            ? 'Local override is ON — subscription state comes from your profile only'
            : 'Use this to test pre-trial and trial flows without active entitlements'}
        </Text>
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
