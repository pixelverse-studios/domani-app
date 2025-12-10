import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'

interface Category {
  id: string
  label: string
  icon: LucideIcon
}

interface CategoryGridProps {
  categories: readonly Category[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function CategoryGrid({ categories, selectedId, onSelect }: CategoryGridProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const iconColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <View className="flex-row flex-wrap gap-3">
      {categories.map((category) => {
        const isSelected = selectedId === category.id
        const IconComponent = category.icon

        return (
          <TouchableOpacity
            key={category.id}
            onPress={() => onSelect(category.id)}
            activeOpacity={0.7}
            className={`w-[48%] p-4 rounded-xl border ${
              isSelected
                ? 'bg-purple-500 border-purple-500'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <View className="flex-row items-center">
              <IconComponent size={20} color={isSelected ? '#ffffff' : iconColor} />
              <Text
                className={`text-sm font-medium ml-2 ${
                  isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {category.label}
              </Text>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
