import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Sparkles, HelpCircle } from 'lucide-react-native'
import { useRouter } from 'expo-router'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { SectionHeader } from './SectionHeader'
import { SettingsRow } from './SettingsRow'

interface SupportSectionProps {
  onReplayTutorial: () => void
}

/**
 * Support section with tutorial replay and contact options
 */
export function SupportSection({ onReplayTutorial }: SupportSectionProps) {
  const router = useRouter()
  const theme = useAppTheme()

  return (
    <>
      <SectionHeader title="Support" />
      <View className="mb-6">
        <SettingsRow
          label="Replay Tutorial"
          onPress={onReplayTutorial}
          icon={Sparkles}
          showChevron={false}
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
            Contact for Support
          </Text>
        </TouchableOpacity>
      </View>
    </>
  )
}
