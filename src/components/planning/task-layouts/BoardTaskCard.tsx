import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native'
import {
  Pencil,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle,
  Bell,
  Crown,
} from 'lucide-react-native'

import { Text } from '~/components/ui'
import { getCategoryIcon } from '~/utils/categoryIcons'
import { useTaskCardData, type TaskCardProps } from './shared'

export function BoardTaskCard({
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

  const [isNotesExpanded, setIsNotesExpanded] = useState(false)

  const handleToggleNotes = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsNotesExpanded((prev) => !prev)
  }

  const tintBg = `${priorityColor}0D` // 5% opacity tint

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tintBg,
          borderColor: `${priorityColor}33`,
        },
      ]}
    >
      {/* Colored top bar */}
      <View style={[styles.topBar, { backgroundColor: priorityColor }]} />

      <View style={styles.inner}>
        <View style={styles.headerRow}>
          {showCheckbox && (
            <TouchableOpacity
              onPress={() => onToggleComplete?.(task.id, !isCompleted)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.checkbox}
            >
              {isCompleted ? (
                <CheckCircle size={22} color={theme.colors.brand.primary} />
              ) : (
                <Circle size={22} color={theme.colors.text.tertiary} />
              )}
            </TouchableOpacity>
          )}

          <View style={styles.titleBlock}>
            <Text
              className={`font-sans-semibold text-base ${
                isCompleted ? 'text-content-muted line-through' : 'text-content-primary'
              }`}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>
        </View>

        {/* Category + Priority row */}
        <View style={styles.metaRow}>
          <View style={styles.categoryChip}>
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
          </View>

          <View style={styles.rightMeta}>
            {reminderInfo && (
              <View style={styles.reminderChip}>
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
              </View>
            )}

            <View style={styles.priorityLabel}>
              {priority === 'top' && (
                <Crown size={10} color={priorityColor} style={{ marginRight: 2 }} />
              )}
              <Text
                className="font-sans-medium text-xs capitalize"
                style={{ color: priorityColor }}
              >
                {priority}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes preview */}
        {hasNotes && (
          <TouchableOpacity onPress={handleToggleNotes} activeOpacity={0.7}>
            <View style={[styles.notesPreview, { backgroundColor: `${priorityColor}0A` }]}>
              <FileText size={11} color={iconColor} style={{ marginTop: 1 }} />
              <Text
                className="font-sans text-xs text-content-secondary ml-1 flex-1"
                numberOfLines={isNotesExpanded ? undefined : 1}
              >
                {task.notes}
              </Text>
              {isNotesExpanded ? (
                <ChevronUp size={11} color={iconColor} />
              ) : (
                <ChevronDown size={11} color={iconColor} />
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Actions row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => onEdit?.(task.id)}
            style={[styles.actionButton, { backgroundColor: buttonBg }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Pencil size={14} color={theme.colors.brand.light} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete?.(task.id)}
            style={[styles.actionButton, { backgroundColor: buttonBg }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Trash2 size={14} color={theme.colors.accent.brick} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  topBar: {
    height: 4,
  },
  inner: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 10,
    marginTop: 1,
  },
  titleBlock: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  rightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
