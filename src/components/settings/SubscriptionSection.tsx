import React from 'react'
import { View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Crown, Sparkles, RotateCcw } from 'lucide-react-native'
import { format } from 'date-fns'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { SectionHeader } from './SectionHeader'
import { SubscriptionSkeleton } from './SettingsSkeletons'
import type { SubscriptionStatus } from '~/hooks/useSubscription'

interface SubscriptionSectionProps {
  isLoading: boolean
  status: SubscriptionStatus
  isStartingTrial: boolean
  isRestoring: boolean
  trialDaysRemaining: number | null
  trialExpirationDate: Date | null
  onStartTrial: () => void
  onRestore: () => void
  onUpgrade: () => void
}

/**
 * Subscription section shown on the Settings screen. Branches explicitly on
 * the discriminated `SubscriptionStatus` — there is no `canStartTrial` boolean,
 * since eligibility is now encoded directly in the status (`pre_trial` means
 * eligible to start, `expired` means not).
 */
export function SubscriptionSection({
  isLoading,
  status,
  isStartingTrial,
  isRestoring,
  trialDaysRemaining,
  trialExpirationDate,
  onStartTrial,
  onRestore,
  onUpgrade,
}: SubscriptionSectionProps) {
  const theme = useAppTheme()

  // Subscription status display config. Lives inside the component so it can
  // reference theme colors. `Record<SubscriptionStatus, …>` enforces an entry
  // for every status in the union at compile time.
  //
  // The trial state uses `theme.colors.accent.trial` (brand primary sage at
  // 70% opacity) for the label/icon color, with a lighter sage-derived bg for
  // the badge pill.
  const statusConfig: Record<
    SubscriptionStatus,
    { label: string; color: string; bgStyle: { backgroundColor: string } }
  > = {
    beta: {
      label: 'Beta Tester',
      color: '#f59e0b',
      bgStyle: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
    },
    pre_trial: {
      label: 'No Active Plan',
      color: '#94a3b8',
      bgStyle: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
    },
    expired: {
      label: 'Trial Ended',
      color: '#94a3b8',
      bgStyle: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
    },
    refunded: {
      label: 'Refunded',
      color: '#94a3b8',
      bgStyle: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
    },
    trialing: {
      label: 'Trial',
      color: theme.colors.accent.trial,
      // Brand primary sage at ~15% opacity for the badge pill bg — pairs
      // with the 70% accent.trial foreground for contrast.
      bgStyle: { backgroundColor: `${theme.colors.brand.primary}26` },
    },
    lifetime: {
      label: 'Lifetime',
      color: '#f59e0b',
      bgStyle: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
    },
  }
  const currentStatusConfig = statusConfig[status]

  // Type-level exhaustiveness nudge: the JSX branches below
  // ({status === 'beta' && …}, etc.) are NOT individually type-checked by
  // TypeScript — a new SubscriptionStatus could be added without rendering
  // anything for it and tsc would stay silent. This Record forces the
  // author to at least touch this file when adding a status, which should
  // prompt them to update the branches as well.
  //
  // Keep this in sync with every case in the JSX below.
  const _exhaustiveStatusCheck: Record<SubscriptionStatus, true> = {
    beta: true,
    lifetime: true,
    trialing: true,
    pre_trial: true,
    expired: true,
    refunded: true,
  }
  void _exhaustiveStatusCheck

  return (
    <>
      <SectionHeader title="Your Plan" />
      {isLoading ? (
        <SubscriptionSkeleton />
      ) : (
        <View className="mb-6">
          <View className="rounded-xl p-4 mb-2" style={{ backgroundColor: theme.colors.card }}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Crown size={20} color={currentStatusConfig.color} />
                <Text className="text-base font-medium text-content-primary ml-2">
                  Current Plan
                </Text>
              </View>
              <View className="px-3 py-1 rounded-full" style={currentStatusConfig.bgStyle}>
                <Text
                  style={{ color: currentStatusConfig.color }}
                  className="text-sm font-semibold"
                >
                  {currentStatusConfig.label}
                </Text>
              </View>
            </View>

            {/* Beta — full access, no CTAs */}
            {status === 'beta' && (
              <Text className="text-sm text-content-secondary">
                You have full access to everything during the beta. Thanks for helping test Domani!
              </Text>
            )}

            {/* Pre-trial — user has never started a trial, offer Start Trial CTA */}
            {status === 'pre_trial' && (
              <>
                <Text className="text-sm text-content-secondary mb-3">
                  Explore everything Domani has to offer
                </Text>
                <TouchableOpacity
                  onPress={onStartTrial}
                  disabled={isStartingTrial}
                  activeOpacity={0.8}
                  className="py-3 rounded-xl items-center flex-row justify-center mb-2"
                  style={{
                    backgroundColor: theme.colors.accent.trial,
                    opacity: isStartingTrial ? 0.5 : 1,
                  }}
                >
                  {isStartingTrial ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Sparkles size={18} color="#fff" />
                      <Text className="text-white font-semibold ml-2">Start 14-Day Free Trial</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Expired — trial was used and ended, offer Upgrade CTA */}
            {status === 'expired' && (
              <>
                <Text className="text-sm text-content-secondary mb-3">
                  Your trial has ended — upgrade to keep using Domani
                </Text>
                <TouchableOpacity
                  onPress={onUpgrade}
                  disabled={isRestoring}
                  activeOpacity={0.8}
                  className="py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: theme.colors.brand.primary,
                    opacity: isRestoring ? 0.5 : 1,
                  }}
                >
                  <Text className="text-white font-semibold">Get Lifetime Access</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Refunded — purchase was refunded, offer re-purchase CTA */}
            {status === 'refunded' && (
              <>
                <Text className="text-sm text-content-secondary mb-3">
                  Your purchase was refunded — get lifetime access to continue using Domani
                </Text>
                <TouchableOpacity
                  onPress={onUpgrade}
                  disabled={isRestoring}
                  activeOpacity={0.8}
                  className="py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: theme.colors.brand.primary,
                    opacity: isRestoring ? 0.5 : 1,
                  }}
                >
                  <Text className="text-white font-semibold">Get Lifetime Access</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Trialing — show days remaining + Upgrade CTA */}
            {status === 'trialing' && (
              <>
                <View className="flex-row items-center mb-3">
                  <Sparkles size={16} color={theme.colors.accent.trial} />
                  <Text
                    className="text-sm font-medium ml-2"
                    style={{ color: theme.colors.accent.trial }}
                  >
                    {trialDaysRemaining} days remaining in trial
                  </Text>
                </View>
                <Text className="text-sm text-content-secondary mb-3">
                  {trialExpirationDate
                    ? `Unlimited tasks - All features unlocked through ${format(trialExpirationDate, 'MMMM d')}`
                    : 'Unlimited tasks - All features unlocked'}
                </Text>
                <TouchableOpacity
                  onPress={onUpgrade}
                  disabled={isRestoring}
                  activeOpacity={0.8}
                  className="py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: theme.colors.brand.primary,
                    opacity: isRestoring ? 0.5 : 1,
                  }}
                >
                  <Text className="text-white font-semibold">Get Lifetime Access</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Lifetime — purchased, no CTAs */}
            {status === 'lifetime' && (
              <Text className="text-sm text-content-secondary">
                Unlimited tasks - All features unlocked forever
              </Text>
            )}
          </View>

          {/* Restore purchases — only shown for states where a prior purchase
              could plausibly exist (expired, refunded, or trialing). Beta/pre_trial
              have nothing to restore; lifetime already has the purchase applied. */}
          {(status === 'expired' || status === 'refunded' || status === 'trialing') && (
            <TouchableOpacity
              onPress={onRestore}
              disabled={isRestoring}
              activeOpacity={0.7}
              className="flex-row items-center justify-center py-2"
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
              ) : (
                <>
                  <RotateCcw size={14} color={theme.colors.text.tertiary} />
                  <Text className="text-sm text-content-secondary ml-1.5">Restore Purchases</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  )
}
