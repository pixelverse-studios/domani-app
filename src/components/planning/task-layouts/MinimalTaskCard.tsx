import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Pencil, Trash2, Circle, CheckCircle, Bell, Crown, FileText } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTaskCardData, type TaskCardProps } from './shared'
import { TaskNotesIconButton } from './TaskNotesModal'

export function MinimalTaskCard({
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
    categoryName,
    hasNotes,
    reminderInfo,
    iconColor,
    buttonBg,
  } = useTaskCardData(task)

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: `${theme.colors.border.primary}66` },
      ]}
    >
      {/* Priority indicator — crown for MIT, small colored square otherwise */}
      <View style={styles.priorityIndicator}>
        {priority === 'top' ? (
          <Crown size={14} color={priorityColor} />
        ) : (
          <View style={[styles.prioritySquare, { backgroundColor: priorityColor }]} />
        )}
      </View>

      {showCheckbox && (
        <TouchableOpacity
          onPress={() => onToggleComplete?.(task.id, !isCompleted)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.checkbox}
        >
          {isCompleted ? (
            <CheckCircle size={18} color={theme.colors.brand.primary} />
          ) : (
            <Circle size={18} color={theme.colors.text.tertiary} />
          )}
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        <Text
          className={`font-sans text-sm ${
            isCompleted ? 'text-content-muted line-through' : 'text-content-primary'
          }`}
          numberOfLines={1}
        >
          {task.title}
        </Text>
      </View>

      {/* Inline metadata — text only */}
      <View style={styles.meta}>
        {hasNotes && <FileText size={11} color={iconColor} />}
        <Text className="font-sans text-xs text-content-tertiary" numberOfLines={1}>
          {categoryName}
        </Text>
        {reminderInfo && (
          <View style={styles.reminderInline}>
            <Bell
              size={9}
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
          </View>
        )}
      </View>

      {/* Minimal action buttons */}
      <View style={styles.actions}>
        {hasNotes && (
          <TaskNotesIconButton
            notes={task.notes ?? ''}
            taskTitle={task.title}
            backgroundColor={buttonBg}
            iconColor={iconColor}
            iconSize={12}
            buttonSize={24}
          />
        )}
        <TouchableOpacity
          onPress={() => onEdit?.(task.id)}
          style={[styles.actionButton, { backgroundColor: buttonBg }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Pencil size={12} color={theme.colors.brand.light} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete?.(task.id)}
          style={[styles.actionButton, { backgroundColor: buttonBg }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={12} color={theme.colors.accent.brick} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  priorityIndicator: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prioritySquare: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  checkbox: {
    marginRight: 10,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
    flexShrink: 0,
  },
  reminderInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
