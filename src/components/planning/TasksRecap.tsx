import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { Briefcase, Heart, User, BookOpen, Star } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import type { TaskWithCategory } from '~/types'

interface TasksRecapProps {
  tasks: TaskWithCategory[]
}

interface CategoryCount {
  name: string
  count: number
  icon: React.ReactNode
}

export function TasksRecap({ tasks }: TasksRecapProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const iconColor = theme.colors.text.tertiary
  const cardBg = theme.colors.card
  const borderColor = theme.colors.border.primary
  const badgeBg = theme.colors.background
  const badgeBorderColor = theme.colors.border.primary

  // Count tasks by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { count: number; isSystem: boolean }> = {}

    tasks.forEach((task) => {
      let categoryName: string

      if (task.system_category) {
        categoryName = task.system_category.name
        counts[categoryName] = counts[categoryName] || { count: 0, isSystem: true }
      } else if (task.user_category) {
        categoryName = task.user_category.name
        counts[categoryName] = counts[categoryName] || { count: 0, isSystem: false }
      } else {
        categoryName = 'Uncategorized'
        counts[categoryName] = counts[categoryName] || { count: 0, isSystem: false }
      }

      counts[categoryName].count++
    })

    return counts
  }, [tasks])

  // Get icon for category
  const getCategoryIcon = (name: string, isSystem: boolean) => {
    if (!isSystem) {
      return <Star size={14} color={iconColor} />
    }

    switch (name.toLowerCase()) {
      case 'work':
        return <Briefcase size={14} color={iconColor} />
      case 'health':
      case 'wellness':
        return <Heart size={14} color={iconColor} />
      case 'personal':
        return <User size={14} color={iconColor} />
      case 'other':
      case 'education':
        return <BookOpen size={14} color={iconColor} />
      default:
        return <Star size={14} color={iconColor} />
    }
  }

  // Convert to array for rendering
  const categoryList: CategoryCount[] = Object.entries(categoryCounts).map(
    ([name, { count, isSystem }]) => ({
      name,
      count,
      icon: getCategoryIcon(name, isSystem),
    }),
  )

  if (tasks.length === 0) return null

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: cardBg,
          borderColor: borderColor,
        },
      ]}
    >
      {/* Left side - Task count */}
      <View style={styles.taskCountSection}>
        <Text className="font-sans-medium text-sm text-content-secondary">
          Tasks Planned
        </Text>
        <Text
          className="font-sans-bold"
          style={{ fontSize: 32, lineHeight: 40, color: brandColor }}
        >
          {tasks.length}
        </Text>
      </View>

      {/* Right side - Category badges */}
      <View style={styles.categorySection}>
        {categoryList.map((category) => (
          <View
            key={category.name}
            style={[
              styles.categoryBadge,
              {
                backgroundColor: badgeBg,
                borderColor: badgeBorderColor,
              },
            ]}
          >
            {category.icon}
            <Text className="font-sans-medium text-sm text-content-secondary ml-1.5">
              {category.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskCountSection: {
    flexDirection: 'column',
  },
  categorySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
})
