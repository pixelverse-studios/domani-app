import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { X } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

interface SubjectFieldProps {
  icon: LucideIcon
  label: string
  onClear: () => void
}

export function SubjectField({ icon: IconComponent, label, onClear }: SubjectFieldProps) {
  const theme = useAppTheme()

  const iconColor = theme.colors.text.secondary

  return (
    <View className="mb-6">
      <Text className="text-sm text-content-secondary mb-2">Subject</Text>
      <View
        className="rounded-xl px-4 py-3 flex-row items-center justify-between border"
        style={{ backgroundColor: theme.colors.interactive.hover, borderColor: theme.colors.border.primary }}
      >
        <View className="flex-row items-center flex-1">
          <IconComponent size={18} color={iconColor} />
          <Text className="text-base text-content-primary ml-2">{label}</Text>
        </View>
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={18} color={iconColor} />
        </TouchableOpacity>
      </View>
    </View>
  )
}
