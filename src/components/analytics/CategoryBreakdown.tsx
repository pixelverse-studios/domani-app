import React from 'react'
import { View } from 'react-native'
import { Briefcase, Heart, User, BookOpen, Tag, LucideIcon } from 'lucide-react-native'

import { Text, Card } from '~/components/ui'
import type { CategoryCompletionRate } from '~/lib/analytics-queries'

// Map category icons to Lucide components
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  heart: Heart,
  user: User,
  'book-open': BookOpen,
  tag: Tag,
}

interface CategoryRowProps {
  category: CategoryCompletionRate
}

function CategoryRow({ category }: CategoryRowProps) {
  const IconComponent = CATEGORY_ICON_MAP[category.categoryIcon] || Tag

  return (
    <View className="flex-row items-center py-3">
      {/* Category icon */}
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: `${category.categoryColor}20` }}
      >
        <IconComponent size={16} color={category.categoryColor} strokeWidth={1.5} />
      </View>

      {/* Category name and count */}
      <View className="flex-1">
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {category.categoryName}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-500">
          {category.completed}/{category.total} tasks
        </Text>
      </View>

      {/* Progress bar and percentage */}
      <View className="items-end">
        <Text className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
          {category.rate}%
        </Text>
        <View className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
  if (categories.length === 0) {
    return null
  }

  return (
    <Card className="p-4">
      <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
        By Category
      </Text>
      <View className="divide-y divide-slate-100 dark:divide-slate-800">
        {categories.map((category) => (
          <CategoryRow key={category.categoryId} category={category} />
        ))}
      </View>
    </Card>
  )
}
