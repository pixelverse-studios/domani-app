import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Sparkles, HelpCircle } from 'lucide-react-native'
import { useRouter } from 'expo-router'

import { Text } from '~/components/ui'
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
          className="flex-row items-center justify-center py-3.5 rounded-xl border border-purple-500 bg-purple-500/10"
        >
          <HelpCircle size={18} color="#a855f7" />
          <Text className="text-purple-500 font-semibold ml-2">Contact for Support</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}
