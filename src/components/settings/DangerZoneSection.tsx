import React from 'react'
import { View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Trash2, AlertTriangle, ChevronRight } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { SectionHeader } from './SectionHeader'

interface DangerZoneSectionProps {
  isPendingDeletion: boolean
  daysRemaining: number | null
  deletionDate: string | null
  isCancelling: boolean
  onOpenDeleteModal: () => void
  onCancelDeletion: () => void
}

/**
 * Danger Zone section with account deletion
 */
export function DangerZoneSection({
  isPendingDeletion,
  daysRemaining,
  deletionDate,
  isCancelling,
  onOpenDeleteModal,
  onCancelDeletion,
}: DangerZoneSectionProps) {
  return (
    <>
      <SectionHeader title="Danger Zone" />
      <View className="mb-8 border border-red-500/30 rounded-xl overflow-hidden">
        {isPendingDeletion ? (
          // Pending deletion state
          <View className="bg-red-500/5 dark:bg-red-500/10 p-4">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center mr-3">
                <AlertTriangle size={20} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-red-500">
                  Account Scheduled for Deletion
                </Text>
                <Text className="text-sm text-slate-600 dark:text-slate-400">
                  {daysRemaining} days remaining
                </Text>
              </View>
            </View>
            <Text className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Your account will be permanently deleted on{' '}
              <Text className="font-medium text-slate-700 dark:text-slate-300">{deletionDate}</Text>.
              Sign in anytime before then to reactivate.
            </Text>
            <TouchableOpacity
              onPress={onCancelDeletion}
              disabled={isCancelling}
              activeOpacity={0.8}
              className="bg-slate-200 dark:bg-slate-700 py-3 rounded-xl items-center"
            >
              {isCancelling ? (
                <ActivityIndicator color="#64748b" />
              ) : (
                <Text className="text-slate-700 dark:text-slate-200 font-semibold">
                  Cancel Deletion
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Normal state - show delete option
          <TouchableOpacity
            onPress={onOpenDeleteModal}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3.5 px-4 bg-red-500/5 dark:bg-red-500/10"
          >
            <View className="flex-row items-center">
              <Trash2 size={20} color="#ef4444" />
              <Text className="text-base text-red-500 ml-3">Delete Account</Text>
            </View>
            <ChevronRight size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </>
  )
}
