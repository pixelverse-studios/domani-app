import React, { useState, useEffect } from 'react'
import { Modal, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { Check, Star, X } from 'lucide-react-native'

import { Button } from '~/components/ui/Button'
import { Text } from '~/components/ui/Text'
import { useAppTheme } from '~/hooks/useAppTheme'
import type { RolloverTask } from '~/hooks/useRolloverTasks'
import { getCategoryIcon } from '~/utils/categoryIcons'

interface RolloverModalProps {
  visible: boolean
  mitTask: RolloverTask | null
  otherTasks: RolloverTask[]
  /** Modal title — defaults to "Yesterday's Unfinished Tasks" */
  title?: string
  /** Modal subtitle — defaults to "A fresh start - choose what matters today" */
  subtitle?: string
  onCarryForward: (params: {
    selectedTaskIds: string[]
    makeMitToday: boolean
    keepReminderTimes: boolean
  }) => void
  onStartFresh: () => void
}

export function RolloverModal({
  visible,
  mitTask,
  otherTasks,
  title = "Yesterday's Unfinished Tasks",
  subtitle = 'A fresh start - choose what matters today',
  onCarryForward,
  onStartFresh,
}: RolloverModalProps) {
  const theme = useAppTheme()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [makeMitToday, setMakeMitToday] = useState(false)
  const [keepReminderTimes, setKeepReminderTimes] = useState(true)

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedIds(new Set())
      setMakeMitToday(false)
      setKeepReminderTimes(true)
    }
  }, [visible])

  // Selection handlers
  const toggleTask = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
      if (mitTask && id === mitTask.id) {
        setMakeMitToday(false) // Reset MIT toggle if unchecking MIT
      }
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleCarryForward = () => {
    onCarryForward({
      selectedTaskIds: Array.from(selectedIds),
      makeMitToday,
      keepReminderTimes,
    })
  }

  const selectedCount = selectedIds.size
  const isMitSelected = mitTask ? selectedIds.has(mitTask.id) : false

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStartFresh}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity
            onPress={onStartFresh}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close"
          >
            <X size={24} color={theme.colors.text.tertiary} />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text
                className="text-2xl font-sans-bold text-content-primary"
                style={{ textAlign: 'center' }}
              >
                {title}
              </Text>
              <Text
                className="font-sans text-content-secondary mt-2"
                style={{ textAlign: 'center', fontSize: 15 }}
              >
                {subtitle}
              </Text>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border.divider }]} />

            {/* MIT Section */}
            {mitTask && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Star size={16} color={theme.colors.brand.primary} />
                  <Text
                    className="font-sans-bold text-xs text-content-tertiary ml-2"
                    style={{ letterSpacing: 0.5 }}
                  >
                    YOUR MOST IMPORTANT TASK
                  </Text>
                </View>

                <TaskCard
                  task={mitTask}
                  isSelected={isMitSelected}
                  onToggle={toggleTask}
                  theme={theme}
                />

                {/* MIT Toggle - only shown when MIT is selected */}
                {isMitSelected && (
                  <TouchableOpacity
                    onPress={() => setMakeMitToday(!makeMitToday)}
                    style={styles.mitToggle}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: makeMitToday
                            ? theme.colors.brand.primary
                            : theme.colors.border.primary,
                          backgroundColor: makeMitToday
                            ? theme.colors.brand.primary
                            : 'transparent',
                        },
                      ]}
                    >
                      {makeMitToday && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </View>
                    <Text className="font-sans text-sm text-content-primary ml-3">
                      Make this today&apos;s MIT
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Other Tasks Section */}
            {otherTasks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    className="font-sans-bold text-xs text-content-tertiary"
                    style={{ letterSpacing: 0.5 }}
                  >
                    OTHER TASKS
                  </Text>
                </View>

                {otherTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedIds.has(task.id)}
                    onToggle={toggleTask}
                    theme={theme}
                  />
                ))}
              </View>
            )}

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border.divider }]} />

            {/* Reminder Times Option */}
            <View style={styles.section}>
              <Text className="font-sans-medium text-sm text-content-primary mb-3">
                Reminder Times
              </Text>

              <TouchableOpacity
                onPress={() => setKeepReminderTimes(true)}
                style={styles.radioOption}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radioButton,
                    {
                      borderColor: keepReminderTimes
                        ? theme.colors.brand.primary
                        : theme.colors.border.primary,
                    },
                  ]}
                >
                  {keepReminderTimes && (
                    <View
                      style={[
                        styles.radioButtonInner,
                        { backgroundColor: theme.colors.brand.primary },
                      ]}
                    />
                  )}
                </View>
                <Text className="font-sans text-sm text-content-primary ml-3">
                  Keep original times
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setKeepReminderTimes(false)}
                style={styles.radioOption}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radioButton,
                    {
                      borderColor: !keepReminderTimes
                        ? theme.colors.brand.primary
                        : theme.colors.border.primary,
                    },
                  ]}
                >
                  {!keepReminderTimes && (
                    <View
                      style={[
                        styles.radioButtonInner,
                        { backgroundColor: theme.colors.brand.primary },
                      ]}
                    />
                  )}
                </View>
                <Text className="font-sans text-sm text-content-primary ml-3">
                  Set new reminder times
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              onPress={handleCarryForward}
              disabled={selectedCount === 0}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Carry Forward ({selectedCount})
            </Button>

            <TouchableOpacity
              onPress={onStartFresh}
              style={styles.textButton}
              activeOpacity={0.7}
            >
              <Text
                className="font-sans-medium text-base"
                style={{ color: theme.colors.text.secondary }}
              >
                Start Fresh Instead
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// Task Card Component
interface TaskCardProps {
  task: RolloverTask
  isSelected: boolean
  onToggle: (id: string) => void
  theme: ReturnType<typeof useAppTheme>
}

function TaskCard({ task, isSelected, onToggle, theme }: TaskCardProps) {
  const priority = task.priority || 'medium'
  const priorityColor = theme.priority[priority]?.color ?? theme.priority.medium.color
  const priorityBadgeBg = `${priorityColor}26` // 15% opacity

  return (
    <TouchableOpacity
      onPress={() => onToggle(task.id)}
      style={[
        styles.taskCard,
        {
          backgroundColor: isSelected ? theme.colors.interactive.hover : theme.colors.background,
          borderColor: isSelected ? theme.colors.brand.primary : theme.colors.border.primary,
          borderLeftColor: priorityColor,
        },
      ]}
      activeOpacity={0.7}
    >
      {/* Checkbox */}
      <View
        style={[
          styles.checkbox,
          {
            borderColor: isSelected ? theme.colors.brand.primary : theme.colors.border.primary,
            backgroundColor: isSelected ? theme.colors.brand.primary : 'transparent',
          },
        ]}
      >
        {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
      </View>

      {/* Content */}
      <View style={styles.taskContent}>
        <Text className="font-sans-semibold text-base text-content-primary mb-2" numberOfLines={2}>
          {task.title}
        </Text>

        <View style={styles.taskMeta}>
          {/* Priority Badge */}
          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor: priorityBadgeBg,
              },
            ]}
          >
            <Text
              className="font-sans-medium text-xs capitalize"
              style={{ color: priorityColor }}
            >
              {priority}
            </Text>
          </View>

          {/* Category */}
          {(task.system_category_id || task.user_category_id) && (
            <View style={styles.categoryBadge}>
              {getCategoryIcon({
                categoryId: task.system_category_id || undefined,
                color: theme.colors.text.tertiary,
                size: 12,
              })}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48, // Extra padding for close button
  },
  header: {
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actions: {
    padding: 24,
    paddingTop: 16,
    gap: 12,
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
})
