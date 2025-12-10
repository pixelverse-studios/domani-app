import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { X } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'

interface SubjectFieldProps {
  icon: LucideIcon
  label: string
  onClear: () => void
}

export function SubjectField({ icon: IconComponent, label, onClear }: SubjectFieldProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const iconColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <View className="mb-6">
      <Text className="text-sm text-slate-600 dark:text-slate-300 mb-2">Subject</Text>
      <View className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 flex-row items-center justify-between border border-slate-200 dark:border-slate-700">
        <View className="flex-row items-center flex-1">
          <IconComponent size={18} color={iconColor} />
          <Text className="text-base text-slate-900 dark:text-white ml-2">{label}</Text>
        </View>
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={18} color={iconColor} />
        </TouchableOpacity>
      </View>
    </View>
  )
}
