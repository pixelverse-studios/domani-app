import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Sparkles, HelpCircle } from 'lucide-react-native'
import { useRouter } from 'expo-router'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'
import { SectionHeader } from './SectionHeader'
import { SettingsRow } from './SettingsRow'

interface SupportSectionProps {
  onReplayTutorial: () => void
  disableTutorialReplay?: boolean
}

/**
 * Support section with tutorial replay and contact options
 */
export function SupportSection({
  onReplayTutorial,
  disableTutorialReplay = false,
}: SupportSectionProps) {
  const router = useRouter()
  const theme = useAppTheme()
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)

  return (
    <>
      <SectionHeader title={copy.settings.supportSection} />
      <View className="mb-6">
        <SettingsRow
          label={copy.settings.replayTutorial}
          onPress={onReplayTutorial}
          icon={Sparkles}
          showChevron={false}
          disabled={disableTutorialReplay}
        />
        <TouchableOpacity
          onPress={() => router.push('/contact-support')}
          activeOpacity={0.7}
          className="flex-row items-center justify-center py-3.5 rounded-xl"
          style={{
            borderWidth: 1,
            borderColor: theme.colors.brand.primary,
            backgroundColor: theme.colors.interactive.activeShadow,
          }}
        >
          <HelpCircle size={18} color={theme.colors.brand.primary} />
          <Text style={{ color: theme.colors.brand.primary, fontWeight: '600', marginLeft: 8 }}>
            {copy.settings.contactSupport}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  )
}
