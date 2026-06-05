import React from 'react'
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native'
import { Pencil, Trash2, Circle, CheckCircle, Crown } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { getCategoryIcon } from '~/utils/categoryIcons'
import { useTaskCardData, type TaskCardProps } from './shared'
import { TaskNotesPreviewButton } from './TaskNotesModal'

const CARD_GAP = 8
const CARD_MARGIN = 20 // matches parent mx-5 (20px)

export function GridTaskCard({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  showCheckbox = false,
}: TaskCardProps) {
  const {
    theme,
    isCompleted,
    priority,
    priorityColor,
    priorityBadgeBg,
    category,
    categoryName,
    isUserCategory,
    hasNotes,
    iconColor,
    buttonBg,
  } = useTaskCardData(task)

  const { width: windowWidth } = useWindowDimensions()
  const cardWidth = (windowWidth - CARD_MARGIN * 2 - CARD_GAP) / 2

  return (
    <View
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border.primary,
        },
      ]}
    >
      {/* Priority accent bar */}
      <View style={[styles.accentBar, { backgroundColor: priorityColor }]} />

      <View style={styles.inner}>
        {/* Top: checkbox + priority */}
        <View style={styles.topRow}>
          {showCheckbox && (
            <TouchableOpacity
              onPress={() => onToggleComplete?.(task.id, !isCompleted)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isCompleted ? (
                <CheckCircle size={18} color={theme.colors.brand.primary} />
              ) : (
                <Circle size={18} color={theme.colors.text.tertiary} />
              )}
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <View style={[styles.priorityPill, { backgroundColor: priorityBadgeBg }]}>
            {priority === 'top' && (
              <Crown size={9} color={priorityColor} style={{ marginRight: 2 }} />
            )}
            <Text
              className="font-sans-medium capitalize"
              style={{ color: priorityColor, fontSize: 10 }}
            >
              {priority}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text
          className={`font-sans-semibold text-sm mt-1.5 ${
            isCompleted ? 'text-content-muted line-through' : 'text-content-primary'
          }`}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        {/* Notes indicator */}
        {hasNotes && (
          <TaskNotesPreviewButton
            notes={task.notes ?? ''}
            taskTitle={task.title}
            iconColor={iconColor}
          />
        )}

        <View style={{ flex: 1 }} />

        {/* Bottom: category + actions */}
        <View style={styles.bottomRow}>
          <View style={styles.categoryChip}>
            {getCategoryIcon({
              category: category
                ? { name: categoryName, icon: category.icon || undefined }
                : null,
              color: isUserCategory ? theme.colors.brand.light : iconColor,
              size: 11,
            })}
            <Text
              className="font-sans text-xs text-content-tertiary ml-1"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {categoryName}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => onEdit?.(task.id)}
              style={[styles.actionButton, { backgroundColor: buttonBg }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Pencil size={13} color={theme.colors.brand.light} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete?.(task.id)}
              style={[styles.actionButton, { backgroundColor: buttonBg }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={13} color={theme.colors.accent.brick} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}

export { CARD_GAP }

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: CARD_GAP,
    overflow: 'hidden',
    minHeight: 110,
  },
  accentBar: {
    height: 3,
  },
  inner: {
    padding: 10,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
