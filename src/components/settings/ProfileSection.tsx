import React from 'react'
import { View } from 'react-native'
import { User, Sparkles } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'
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
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)
  return (
    <>
      <SectionHeader title={copy.settings.profileSection} />
      {isLoading ? (
        <ProfileSkeleton />
      ) : (
        <View className="mb-6">
          <SettingsRow
            label={copy.settings.profileName}
            value={fullName || copy.settings.notSet}
            onPress={onEditName}
            icon={User}
          />
          <SettingsRow
            label={copy.settings.profileEmail}
            value={email}
            icon={User}
            showChevron={false}
          />

          {/* Beta Tester Badge - compact inline badge shown during beta phases */}
          {isBeta && (
            <View className="flex-row items-center mt-1 px-1">
              <Sparkles size={14} color="#f59e0b" />
              <Text className="text-sm text-amber-600 ml-1.5 font-medium">{copy.settings.betaTester}</Text>
              <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-amber-700 font-semibold">{copy.settings.fullAccess}</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </>
  )
}
