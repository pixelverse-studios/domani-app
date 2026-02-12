import React from 'react'
import { View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Trash2, AlertTriangle, ChevronRight } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
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
  const theme = useAppTheme()

  return (
    <>
      <SectionHeader title="Danger Zone" />
      <View
        className="mb-8 border rounded-xl overflow-hidden"
        style={{ borderColor: `${theme.colors.accent.brick}4D` }}
      >
        {isPendingDeletion ? (
          // Pending deletion state
          <View className="p-4" style={{ backgroundColor: `${theme.colors.accent.brick}0D` }}>
            <View className="flex-row items-center mb-3">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${theme.colors.accent.brick}33` }}
              >
                <AlertTriangle size={20} color={theme.colors.accent.brick} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-medium"
                  style={{ color: theme.colors.accent.brick }}
                >
                  Account Scheduled for Deletion
                </Text>
                <Text className="text-sm text-content-secondary">
                  {daysRemaining} days remaining
                </Text>
              </View>
            </View>
            <Text className="text-sm text-content-secondary mb-4">
              Your account will be permanently deleted on{' '}
              <Text className="font-medium text-content-primary">{deletionDate}</Text>. Sign in
              anytime before then to reactivate.
            </Text>
            <TouchableOpacity
              onPress={onCancelDeletion}
              disabled={isCancelling}
              activeOpacity={0.8}
              className="py-3 rounded-xl items-center"
              style={{ backgroundColor: theme.colors.interactive.hover }}
            >
              {isCancelling ? (
                <ActivityIndicator color={theme.colors.text.tertiary} />
              ) : (
                <Text className="text-content-primary font-semibold">Cancel Deletion</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Normal state - show delete option
          <TouchableOpacity
            onPress={onOpenDeleteModal}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3.5 px-4"
            style={{ backgroundColor: `${theme.colors.accent.brick}0D` }}
          >
            <View className="flex-row items-center">
              <Trash2 size={20} color={theme.colors.accent.brick} />
              <Text className="text-base ml-3" style={{ color: theme.colors.accent.brick }}>
                Delete Account
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.accent.brick} />
          </TouchableOpacity>
        )}
      </View>
    </>
  )
}
