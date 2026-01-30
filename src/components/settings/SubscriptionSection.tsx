import React from 'react'
import { View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Crown, Sparkles, RotateCcw } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { SectionHeader } from './SectionHeader'
import { SubscriptionSkeleton } from './SettingsSkeletons'
import type { SubscriptionStatus } from '~/hooks/useSubscription'

// Subscription status display config
const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bgColor: string }> =
  {
    free: { label: 'Free', color: '#94a3b8', bgColor: 'bg-slate-500/20' },
    trialing: { label: 'Trial', color: '#22c55e', bgColor: 'bg-green-500/20' },
    premium: { label: 'Lifetime', color: '#f59e0b', bgColor: 'bg-amber-500/20' },
    lifetime: { label: 'Lifetime', color: '#f59e0b', bgColor: 'bg-amber-500/20' },
  }

interface SubscriptionSectionProps {
  isLoading: boolean
  status: SubscriptionStatus
  canStartTrial: boolean
  isStartingTrial: boolean
  isRestoring: boolean
  trialDaysRemaining: number | null
  onStartTrial: () => void
  onRestore: () => void
}

/**
 * Subscription section for production mode (not shown during beta)
 */
export function SubscriptionSection({
  isLoading,
  status,
  canStartTrial,
  isStartingTrial,
  isRestoring,
  trialDaysRemaining,
  onStartTrial,
  onRestore,
}: SubscriptionSectionProps) {
  const statusConfig = STATUS_CONFIG[status]

  return (
    <>
      <SectionHeader title="Subscription" />
      {isLoading ? (
        <SubscriptionSkeleton />
      ) : (
        <View className="mb-6">
          <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-2">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Crown size={20} color={statusConfig.color} />
                <Text className="text-base font-medium text-slate-900 dark:text-white ml-2">
                  Current Plan
                </Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${statusConfig.bgColor}`}>
                <Text style={{ color: statusConfig.color }} className="text-sm font-semibold">
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            {/* Free tier - show trial option */}
            {status === 'free' && (
              <>
                <Text className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  3 tasks per day - Basic features
                </Text>
                {canStartTrial ? (
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
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    className="bg-purple-500 py-3 rounded-xl items-center"
                  >
                    <Text className="text-white font-semibold">Upgrade to Pro</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Trialing - show days remaining */}
            {status === 'trialing' && (
              <>
                <View className="flex-row items-center mb-3">
                  <Sparkles size={16} color="#22c55e" />
                  <Text className="text-sm text-green-500 font-medium ml-2">
                    {trialDaysRemaining} days remaining in trial
                  </Text>
                </View>
                <Text className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Unlimited tasks - All features unlocked
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="bg-purple-500 py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-semibold">Get Lifetime Access</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Premium/Lifetime - no renewal, lifetime access */}
            {status === 'premium' && (
              <Text className="text-sm text-slate-600 dark:text-slate-400">
                Unlimited tasks - All features unlocked forever
              </Text>
            )}

            {/* Lifetime */}
            {status === 'lifetime' && (
              <Text className="text-sm text-slate-600 dark:text-slate-400">
                Unlimited tasks - All features unlocked forever
              </Text>
            )}
          </View>

          {/* Restore purchases - only show for free/trial users */}
          {(status === 'free' || status === 'trialing') && (
            <TouchableOpacity
              onPress={onRestore}
              disabled={isRestoring}
              activeOpacity={0.7}
              className="flex-row items-center justify-center py-2"
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#94a3b8" />
              ) : (
                <>
                  <RotateCcw size={14} color="#94a3b8" />
                  <Text className="text-sm text-slate-600 dark:text-slate-400 ml-1.5">
                    Restore Purchases
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  )
}
