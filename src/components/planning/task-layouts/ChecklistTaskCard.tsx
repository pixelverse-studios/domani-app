import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Circle, CheckCircle, Pencil, Trash2, Bell, Crown } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTaskCardData, type TaskCardProps } from './shared'

export function ChecklistTaskCard({
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
    reminderInfo,
    buttonBg,
  } = useTaskCardData(task)

  return (
    <View style={styles.row}>
      {/* Checkbox or priority indicator */}
      {showCheckbox ? (
        <TouchableOpacity
          onPress={() => onToggleComplete?.(task.id, !isCompleted)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.leading}
        >
          {isCompleted ? (
            <CheckCircle size={20} color={theme.colors.brand.primary} />
          ) : (
            <Circle size={20} color={priorityColor} />
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.leading}>
          {priority === 'top' ? (
            <Crown size={16} color={priorityColor} />
          ) : (
            <View style={[styles.bullet, { backgroundColor: priorityColor }]} />
          )}
        </View>
      )}

      {/* Title */}
      <Text
        className={`font-sans text-sm flex-1 ${
          isCompleted ? 'text-content-muted line-through' : 'text-content-primary'
        }`}
        numberOfLines={1}
        style={styles.title}
      >
        {task.title}
      </Text>

      {/* Reminder badge */}
      {reminderInfo && !reminderInfo.isPast && (
        <View style={styles.reminderBadge}>
          <Bell size={9} color={theme.colors.brand.primary} />
          <Text
            className="font-sans text-xs ml-0.5"
            style={{ color: theme.colors.brand.primary }}
          >
            {reminderInfo.time}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onEdit?.(task.id)}
          style={[styles.actionButton, { backgroundColor: buttonBg }]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Pencil size={11} color={theme.colors.brand.light} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete?.(task.id)}
          style={[styles.actionButton, { backgroundColor: buttonBg }]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Trash2 size={11} color={theme.colors.accent.brick} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  leading: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    marginRight: 8,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionButton: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
