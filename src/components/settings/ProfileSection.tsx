import React from 'react'
import { View } from 'react-native'
import { User, Sparkles } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { SectionHeader } from './SectionHeader'
import { SettingsRow } from './SettingsRow'
import { ProfileSkeleton } from './SettingsSkeletons'

interface ProfileSectionProps {
  isLoading: boolean
  fullName: string | null | undefined
  email: string | undefined
  isBeta: boolean
  onEditName: () => void
}

/**
 * Profile section with name, email, and beta badge
 */
export function ProfileSection({
  isLoading,
  fullName,
  email,
  isBeta,
  onEditName,
}: ProfileSectionProps) {
  return (
    <>
      <SectionHeader title="Profile" />
      {isLoading ? (
        <ProfileSkeleton />
      ) : (
        <View className="mb-6">
          <SettingsRow
            label="Name"
            value={fullName || 'Not set'}
            onPress={onEditName}
            icon={User}
          />
          <SettingsRow label="Email" value={email} icon={User} showChevron={false} />

          {/* Beta Tester Badge - compact inline badge shown during beta phases */}
          {isBeta && (
            <View className="flex-row items-center mt-1 px-1">
              <Sparkles size={14} color="#f59e0b" />
              <Text className="text-sm text-amber-600 ml-1.5 font-medium">Beta Tester</Text>
              <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-amber-700 font-semibold">Full Access</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </>
  )
}
