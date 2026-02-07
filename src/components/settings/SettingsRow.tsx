import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { ChevronRight, type LucideIcon } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

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
  const theme = useAppTheme()
  const iconColor = theme.colors.text.tertiary

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between py-3.5 px-4 rounded-xl mb-2"
      style={{ backgroundColor: theme.colors.card }}
    >
      <View className="flex-row items-center flex-1">
        {Icon && (
          <View className="mr-3">
            <Icon size={20} color={iconColor} />
          </View>
        )}
        <Text className="text-base text-content-primary">{label}</Text>
      </View>
      <View className="flex-row items-center">
        {value && <Text className="text-sm text-content-secondary mr-2">{value}</Text>}
        {showChevron && onPress && <ChevronRight size={18} color={iconColor} />}
      </View>
    </TouchableOpacity>
  )
}
