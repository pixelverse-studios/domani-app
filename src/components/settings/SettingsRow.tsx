import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { ChevronRight, type LucideIcon } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'

interface SettingsRowProps {
  label: string
  value?: string
  onPress?: () => void
  icon?: LucideIcon
  showChevron?: boolean
}

/**
 * Reusable settings row component with optional icon, value, and chevron
 */
export function SettingsRow({
  label,
  value,
  onPress,
  icon: Icon,
  showChevron = true,
}: SettingsRowProps) {
  const { activeTheme } = useTheme()
  const iconColor = activeTheme === 'dark' ? '#94a3b8' : '#64748b'

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-2"
    >
      <View className="flex-row items-center flex-1">
        {Icon && (
          <View className="mr-3">
            <Icon size={20} color={iconColor} />
          </View>
        )}
        <Text className="text-base text-slate-900 dark:text-slate-100">{label}</Text>
      </View>
      <View className="flex-row items-center">
        {value && <Text className="text-sm text-slate-600 dark:text-slate-400 mr-2">{value}</Text>}
        {showChevron && onPress && <ChevronRight size={18} color={iconColor} />}
      </View>
    </TouchableOpacity>
  )
}
