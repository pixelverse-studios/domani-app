import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

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
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  const iconColor = theme.colors.text.secondary

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
            className="w-[48%] p-4 rounded-xl border"
            style={
              isSelected
                ? { backgroundColor: brandColor, borderColor: brandColor }
                : {
                    backgroundColor: theme.colors.interactive.hover,
                    borderColor: theme.colors.border.primary,
                  }
            }
          >
            <View className="flex-row items-center">
              <IconComponent size={20} color={isSelected ? '#ffffff' : iconColor} />
              <Text
                className={`text-sm font-medium ml-2 ${
                  isSelected ? 'text-white' : 'text-content-secondary'
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
