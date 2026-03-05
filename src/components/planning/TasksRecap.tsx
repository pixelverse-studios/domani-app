import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import type { TaskWithCategory } from '~/types'
import { getCategoryIcon } from '~/utils/categoryIcons'
import type { RecapLayout } from '~/stores/uiStore'

interface TasksRecapProps {
  tasks: TaskWithCategory[]
  variant?: RecapLayout
}

interface CategoryCount {
  name: string
  count: number
  icon: React.ReactNode
}

function useCategoryCounts(tasks: TaskWithCategory[], iconColor: string, iconSize: number) {
  return useMemo(() => {
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

    const categoryList: CategoryCount[] = Object.entries(counts).map(
      ([name, { count, isSystem }]) => ({
        name,
        count,
        icon: getCategoryIcon({
          category: { name, isSystem },
          color: iconColor,
          size: iconSize,
        }),
      }),
    )

    return categoryList
  }, [tasks, iconColor, iconSize])
}

// ─── Card Layout (default) ───────────────────────────────────────────────────
function CardLayout({ tasks, categoryList }: { tasks: TaskWithCategory[]; categoryList: CategoryCount[] }) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border.primary,
        },
      ]}
    >
      <View style={styles.taskCountSection}>
        <Text className="font-sans-medium text-sm text-content-secondary">Tasks Planned</Text>
        <Text
          className="font-sans-bold"
          style={{ fontSize: 32, lineHeight: 40, color: brandColor }}
        >
          {tasks.length}
        </Text>
      </View>

      <View style={styles.categorySection}>
        {categoryList.map((category) => (
          <View
            key={category.name}
            style={[
              styles.categoryBadge,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border.primary,
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

// ─── Minimal Layout ──────────────────────────────────────────────────────────
function MinimalLayout({ tasks, categoryList }: { tasks: TaskWithCategory[]; categoryList: CategoryCount[] }) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  return (
    <View style={styles.minimalContainer}>
      <View style={styles.minimalLeft}>
        <Text
          className="font-sans-bold"
          style={{ fontSize: 18, color: brandColor }}
        >
          {tasks.length}
        </Text>
        <Text className="font-sans-medium text-sm text-content-tertiary ml-1.5">
          {tasks.length === 1 ? 'task' : 'tasks'}
        </Text>
      </View>

      <View style={styles.compactCategories}>
        {categoryList.map((category) => (
          <View key={category.name} style={styles.compactBadge}>
            {category.icon}
            <Text className="font-sans text-xs text-content-tertiary ml-1">
              {category.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Inline Layout ───────────────────────────────────────────────────────────
function InlineLayout({ tasks, categoryList }: { tasks: TaskWithCategory[]; categoryList: CategoryCount[] }) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  return (
    <View style={styles.inlineContainer}>
      <Text
        className="font-sans-semibold"
        style={{ fontSize: 15, color: brandColor }}
      >
        {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
      </Text>
      {categoryList.length > 0 && (
        <View style={styles.compactCategories}>
          {categoryList.map((category) => (
            <View key={category.name} style={styles.compactBadge}>
              {category.icon}
              <Text className="font-sans text-xs text-content-tertiary ml-0.5">
                {category.count}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function TasksRecap({ tasks, variant = 'card' }: TasksRecapProps) {
  const theme = useAppTheme()
  const iconColor = theme.colors.text.tertiary
  const iconSize = variant === 'card' ? 14 : 12

  const categoryList = useCategoryCounts(tasks, iconColor, iconSize)

  if (tasks.length === 0) return null

  switch (variant) {
    case 'inline':
      return <InlineLayout tasks={tasks} categoryList={categoryList} />
    case 'minimal':
      return <MinimalLayout tasks={tasks} categoryList={categoryList} />
    case 'card':
      return <CardLayout tasks={tasks} categoryList={categoryList} />
    default: {
      const _exhaustive: never = variant
      return <CardLayout tasks={tasks} categoryList={categoryList} />
    }
  }
}

const styles = StyleSheet.create({
  // Card layout styles
  cardContainer: {
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

  // Minimal layout styles
  minimalContainer: {
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minimalLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  // Shared compact styles (minimal + inline)
  compactCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Inline layout styles
  inlineContainer: {
    alignItems: 'flex-end',
  },
})
