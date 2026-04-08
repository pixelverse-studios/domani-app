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

export function DetailedTaskCard({
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
    reminderInfo,
    iconColor,
    dividerColor,
    buttonBg,
  } = useTaskCardData(task)

  const [isNotesExpanded, setIsNotesExpanded] = useState(false)

  const handleToggleNotes = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsNotesExpanded((prev) => !prev)
  }

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
      <View style={styles.cardLayout}>
        {showCheckbox && (
          <TouchableOpacity
            onPress={() => onToggleComplete?.(task.id, !isCompleted)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.checkbox}
          >
            {isCompleted ? (
              <CheckCircle size={24} color={theme.colors.brand.primary} />
            ) : (
              <Circle size={24} color={theme.colors.text.tertiary} />
            )}
          </TouchableOpacity>
        )}

        <View style={styles.contentBlock}>
          {/* Priority row */}
          <View style={styles.priorityRow}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityBadgeBg },
              ]}
            >
              {priority === 'top' && (
                <Crown size={11} color={priorityColor} style={{ marginRight: 3 }} />
              )}
              <Text
                className="font-sans-medium capitalize"
                style={{ color: priorityColor, fontSize: 11 }}
              >
                {priority} priority
              </Text>
            </View>

            {/* Category */}
            <View style={styles.categoryInline}>
              {getCategoryIcon({
                category: category
                  ? { name: categoryName, icon: category.icon || undefined }
                  : null,
                color: isUserCategory ? theme.colors.brand.light : iconColor,
                size: 13,
              })}
              <Text className="font-sans text-xs text-content-secondary ml-1" numberOfLines={1}>
                {categoryName}
              </Text>
            </View>
          </View>

          {/* Title — larger */}
          <Text
            className={`font-sans-semibold text-base mt-2 ${
              isCompleted ? 'text-content-muted line-through' : 'text-content-primary'
            }`}
            numberOfLines={3}
          >
            {task.title}
          </Text>

          {/* Notes preview — always visible (2 lines, truncated) */}
          {hasNotes && (
            <TouchableOpacity onPress={handleToggleNotes} activeOpacity={0.7}>
              <View style={[styles.notesPreview, { backgroundColor: buttonBg }]}>
                <FileText size={12} color={iconColor} style={{ marginTop: 2 }} />
                <Text
                  className="font-sans text-xs text-content-secondary ml-1.5 flex-1"
                  numberOfLines={isNotesExpanded ? undefined : 2}
                >
                  {task.notes}
                </Text>
                {isNotesExpanded ? (
                  <ChevronUp size={12} color={iconColor} />
                ) : (
                  <ChevronDown size={12} color={iconColor} />
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Bottom row: Reminder + Actions */}
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <View style={styles.bottomRow}>
            <View style={styles.metaLeft}>
              {reminderInfo && (
                <View style={styles.reminderContainer}>
                  <Bell
                    size={12}
                    color={
                      reminderInfo.isPast
                        ? theme.colors.text.tertiary
                        : theme.colors.brand.primary
                    }
                  />
                  <Text
                    className="font-sans text-xs ml-1"
                    style={{
                      color: reminderInfo.isPast
                        ? theme.colors.text.tertiary
                        : theme.colors.brand.primary,
                      textDecorationLine: reminderInfo.isPast ? 'line-through' : 'none',
                    }}
                  >
                    {reminderInfo.time}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => onEdit?.(task.id)}
                style={[styles.actionButton, { backgroundColor: buttonBg }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Pencil size={16} color={theme.colors.brand.light} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDelete?.(task.id)}
                style={[styles.actionButton, { backgroundColor: buttonBg }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={16} color={theme.colors.accent.brick} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 4,
  },
  contentBlock: {
    flex: 1,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    marginTop: 12,
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
