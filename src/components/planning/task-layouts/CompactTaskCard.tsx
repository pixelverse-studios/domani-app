import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Pencil, Trash2, Circle, CheckCircle, Bell, Crown, FileText } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { getCategoryIcon } from '~/utils/categoryIcons'
import { useTaskCardData, type TaskCardProps } from './shared'
import { TaskNotesIconButton } from './TaskNotesModal'

export function CompactTaskCard({
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
    category,
    categoryName,
    isUserCategory,
    hasNotes,
    reminderInfo,
    iconColor,
    buttonBg,
  } = useTaskCardData(task)

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border.primary,
          borderLeftColor: priorityColor,
        },
      ]}
    >
      <View style={styles.row}>
        {showCheckbox && (
          <TouchableOpacity
            onPress={() => onToggleComplete?.(task.id, !isCompleted)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.checkbox}
          >
            {isCompleted ? (
              <CheckCircle size={20} color={theme.colors.brand.primary} />
            ) : (
              <Circle size={20} color={theme.colors.text.tertiary} />
            )}
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          {/* Line 1: Title */}
          <Text
            className={`font-sans-semibold text-sm ${
              isCompleted ? 'text-content-muted line-through' : 'text-content-primary'
            }`}
            numberOfLines={1}
          >
            {task.title}
          </Text>

          {/* Line 2: Priority dot + Category + Reminder */}
          <View style={styles.meta}>
            {priority === 'top' ? (
              <Crown size={11} color={priorityColor} style={{ marginRight: 4 }} />
            ) : (
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            )}
            <Text className="font-sans text-xs text-content-tertiary capitalize">{priority}</Text>

            <View style={[styles.metaSeparator, { backgroundColor: theme.colors.border.primary }]} />

            {getCategoryIcon({
              category: category
                ? { name: categoryName, icon: category.icon || undefined }
                : null,
              color: isUserCategory ? theme.colors.brand.light : iconColor,
              size: 12,
            })}
            <Text className="font-sans text-xs text-content-secondary ml-1" numberOfLines={1}>
              {categoryName}
            </Text>

            {hasNotes && (
              <>
                <View style={[styles.metaSeparator, { backgroundColor: theme.colors.border.primary }]} />
                <FileText size={10} color={iconColor} />
              </>
            )}

            {reminderInfo && (
              <>
                <View style={[styles.metaSeparator, { backgroundColor: theme.colors.border.primary }]} />
                <Bell
                  size={10}
                  color={
                    reminderInfo.isPast ? theme.colors.text.tertiary : theme.colors.brand.primary
                  }
                />
                <Text
                  className="font-sans text-xs ml-0.5"
                  style={{
                    color: reminderInfo.isPast
                      ? theme.colors.text.tertiary
                      : theme.colors.brand.primary,
                  }}
                >
                  {reminderInfo.time}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Compact action buttons */}
        <View style={styles.actions}>
          {hasNotes && (
            <TaskNotesIconButton
              notes={task.notes ?? ''}
              taskTitle={task.title}
              backgroundColor={buttonBg}
              iconColor={iconColor}
              iconSize={13}
              buttonSize={28}
            />
          )}
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
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 10,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  metaSeparator: {
    width: 1,
    height: 10,
    marginHorizontal: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
