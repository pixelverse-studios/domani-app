import React from 'react'
import { View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Crown, Sparkles, RotateCcw } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { SectionHeader } from './SectionHeader'
import { SubscriptionSkeleton } from './SettingsSkeletons'
import type { SubscriptionStatus } from '~/hooks/useSubscription'

// Subscription status display config. Every status in the exhaustive union
// must have an entry; TypeScript enforces this via `Record<SubscriptionStatus, …>`.
const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bgColor: string }> =
  {
    beta: { label: 'Beta Tester', color: '#f59e0b', bgColor: 'bg-amber-500/20' },
    pre_trial: { label: 'No Active Plan', color: '#94a3b8', bgColor: 'bg-slate-500/20' },
    expired: { label: 'Trial Ended', color: '#94a3b8', bgColor: 'bg-slate-500/20' },
    trialing: { label: 'Trial', color: '#22c55e', bgColor: 'bg-green-500/20' },
    lifetime: { label: 'Lifetime', color: '#f59e0b', bgColor: 'bg-amber-500/20' },
  }

interface SubscriptionSectionProps {
  isLoading: boolean
  status: SubscriptionStatus
  isStartingTrial: boolean
  isRestoring: boolean
  trialDaysRemaining: number | null
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
  onStartTrial,
  onRestore,
  onUpgrade,
}: SubscriptionSectionProps) {
  const theme = useAppTheme()
  const statusConfig = STATUS_CONFIG[status]

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
                <Crown size={20} color={statusConfig.color} />
                <Text className="text-base font-medium text-content-primary ml-2">
                  Current Plan
                </Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${statusConfig.bgColor}`}>
                <Text style={{ color: statusConfig.color }} className="text-sm font-semibold">
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            {/* Beta — full access, no CTAs */}
            {status === 'beta' && (
              <Text className="text-sm text-content-secondary">
                You have full access to everything during the beta. Thanks for helping test
                Domani!
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
                  className="bg-green-500 py-3 rounded-xl items-center flex-row justify-center mb-2"
                >
                  {isStartingTrial ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Sparkles size={18} color="#fff" />
                      <Text className="text-white font-semibold ml-2">
                        Start 14-Day Free Trial
                      </Text>
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

            {/* Trialing — show days remaining + Upgrade CTA */}
            {status === 'trialing' && (
              <>
                <View className="flex-row items-center mb-3">
                  <Sparkles size={16} color="#22c55e" />
                  <Text className="text-sm text-green-500 font-medium ml-2">
                    {trialDaysRemaining} days remaining in trial
                  </Text>
                </View>
                <Text className="text-sm text-content-secondary mb-3">
                  Unlimited tasks - All features unlocked
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
              could plausibly exist (expired or trialing). Beta/pre_trial have
              nothing to restore; lifetime already has the purchase applied. */}
          {(status === 'expired' || status === 'trialing') && (
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
