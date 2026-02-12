import React from 'react'
import { View } from 'react-native'

import { Text, Card } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import type { CategoryCompletionRate } from '~/lib/analytics-queries'
import { getCategoryIcon } from '~/utils/categoryIcons'

interface CategoryRowProps {
  category: CategoryCompletionRate
}

function CategoryRow({ category }: CategoryRowProps) {
  const theme = useAppTheme()

  return (
    <View className="flex-row items-center py-3">
      {/* Category icon */}
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: `${category.categoryColor}20` }}
      >
        {getCategoryIcon({
          categoryId: category.categoryIcon,
          color: category.categoryColor,
          size: 16,
          strokeWidth: 1.5,
        })}
      </View>

      {/* Category name and count */}
      <View className="flex-1">
        <Text className="text-sm font-medium text-content-primary">{category.categoryName}</Text>
        <Text className="text-xs text-content-secondary">
          {category.completed}/{category.total} tasks
        </Text>
      </View>

      {/* Progress bar and percentage */}
      <View className="items-end">
        <Text className="text-sm font-semibold text-content-primary mb-1">{category.rate}%</Text>
        <View
          className="w-16 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: theme.colors.border.primary }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${category.rate}%`,
              backgroundColor: category.categoryColor,
            }}
          />
        </View>
      </View>
    </View>
  )
}

interface CategoryBreakdownProps {
  categories: CategoryCompletionRate[]
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const theme = useAppTheme()

  if (categories.length === 0) {
    return null
  }

  return (
    <Card className="p-4">
      <Text className="text-sm font-medium text-content-secondary mb-2">By Category</Text>
      <View style={{ borderColor: theme.colors.border.divider }}>
        {categories.map((category) => (
          <CategoryRow key={category.categoryId} category={category} />
        ))}
      </View>
    </Card>
  )
}
