import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Circle, CheckCircle, Pencil, Trash2, Bell, Crown, FileText } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { getCategoryIcon } from '~/utils/categoryIcons'
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
    category,
    categoryName,
    isUserCategory,
    hasNotes,
    reminderInfo,
    iconColor,
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

      {/* Title + meta */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          {priority === 'top' && (
            <Crown size={12} color={priorityColor} style={styles.titleCrown} />
          )}
          <Text
            className={`font-sans text-sm flex-1 ${
              isCompleted ? 'text-content-muted line-through' : 'text-content-primary'
            }`}
            numberOfLines={1}
          >
            {task.title}
          </Text>
        </View>

        <View style={styles.meta}>
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
          >
            {categoryName}
          </Text>

          {hasNotes && (
            <>
              <View style={[styles.metaSeparator, { backgroundColor: theme.colors.border.primary }]} />
              <FileText size={10} color={iconColor} />
            </>
          )}

          {reminderInfo && !reminderInfo.isPast && (
            <>
              <View style={[styles.metaSeparator, { backgroundColor: theme.colors.border.primary }]} />
              <Bell size={9} color={theme.colors.brand.primary} />
              <Text
                className="font-sans text-xs ml-0.5"
                style={{ color: theme.colors.brand.primary }}
              >
                {reminderInfo.time}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onEdit?.(task.id)}
          style={[styles.actionButton, { backgroundColor: buttonBg }]}
          hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}
        >
          <Pencil size={11} color={theme.colors.brand.light} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete?.(task.id)}
          style={[styles.actionButton, { backgroundColor: buttonBg }]}
          hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}
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
  content: {
    flex: 1,
    marginRight: 8,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleCrown: {
    marginRight: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaSeparator: {
    width: 1,
    height: 10,
    marginHorizontal: 8,
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
