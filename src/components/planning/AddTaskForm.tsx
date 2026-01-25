import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { X, Check, ChevronRight, FileText } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { addDays, setHours, setMinutes } from 'date-fns'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

import { Text } from '~/components/ui'
import { useTutorialTarget, useTutorialAdvancement } from '~/components/tutorial'
import { CategorySelector } from './CategorySelector'
import { PrioritySelector, type Priority } from './PrioritySelector'
import { DayToggle, type PlanningTarget } from './DayToggle'
import { ReminderSection } from './ReminderSection'
import { useTheme } from '~/hooks/useTheme'
import { colors } from '~/theme'

type Category = 'work' | 'wellness' | 'personal' | 'education' | string
type SubmitState = 'idle' | 'submitting' | 'success'

interface InitialFormValues {
  title: string
  categoryId?: string
  categoryLabel?: string
  priority?: Priority | null
  notes?: string | null
  plannedFor?: PlanningTarget
  reminderAt?: string | null // ISO timestamp
}

interface AddTaskFormProps {
  onClose: () => void
  onSubmit: (task: {
    title: string
    category: Category
    priority: Priority
    notes?: string | null
    plannedFor?: PlanningTarget
    reminderAt?: string | null // ISO timestamp
  }) => Promise<void> | void
  initialValues?: InitialFormValues
  isEditing?: boolean
  /** Existing TOP priority task in this plan (for MIT warning) */
  existingTopPriorityTask?: { id: string; title: string } | null
  /** ID of the task being edited (to exclude self from TOP check) */
  editingTaskId?: string
  /** Currently selected planning target (today/tomorrow) */
  selectedTarget: PlanningTarget
  /** Callback when target day changes */
  onTargetChange: (target: PlanningTarget) => void
  /** Auto-focus the title input when form opens (e.g., when editing) */
  autoFocusTitle?: boolean
}

export function AddTaskForm({
  onClose,
  onSubmit,
  initialValues,
  isEditing = false,
  existingTopPriorityTask,
  editingTaskId,
  selectedTarget,
  onTargetChange,
  autoFocusTitle = false,
}: AddTaskFormProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const titleInputRef = useRef<TextInput>(null)
  const { targetRef: titleTargetRef, measureTarget: measureTitleTarget } =
    useTutorialTarget('title_input')
  const { advanceFromTitleInput, advanceFromCategorySelector, advanceFromPrioritySelector } =
    useTutorialAdvancement()

  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialValues?.categoryId ?? null,
  )
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState<string | null>(
    initialValues?.categoryLabel ?? null,
  )
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(
    initialValues?.priority ?? null,
  )
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [isNotesExpanded, setIsNotesExpanded] = useState(!!initialValues?.notes)

  // Reminder state
  const [isReminderEnabled, setIsReminderEnabled] = useState(!!initialValues?.reminderAt)
  const [reminderDate, setReminderDate] = useState<Date>(() => {
    if (initialValues?.reminderAt) {
      return new Date(initialValues.reminderAt)
    }
    // Default: 9 AM on the selected target day
    const baseDate = selectedTarget === 'tomorrow' ? addDays(new Date(), 1) : new Date()
    return setMinutes(setHours(baseDate, 9), 0)
  })

  // Animation for chevron rotation
  const notesChevronRotation = useSharedValue(initialValues?.notes ? 1 : 0)

  // Sync form state when initialValues changes (e.g., editing a different task)
  // This is critical because useState initializers only run once on mount
  useEffect(() => {
    if (initialValues) {
      setTitle(initialValues.title ?? '')
      setSelectedCategory(initialValues.categoryId ?? null)
      setSelectedCategoryLabel(initialValues.categoryLabel ?? null)
      setSelectedPriority(initialValues.priority ?? null)
      setNotes(initialValues.notes ?? '')
      setIsNotesExpanded(!!initialValues.notes)
      notesChevronRotation.value = initialValues.notes ? 1 : 0

      // Sync reminder state
      setIsReminderEnabled(!!initialValues.reminderAt)
      if (initialValues.reminderAt) {
        setReminderDate(new Date(initialValues.reminderAt))
      }
    }
  }, [initialValues, notesChevronRotation])

  // Auto-focus title input when requested (e.g., when editing a task)
  useEffect(() => {
    if (autoFocusTitle) {
      // Delay focus to allow scroll animation to complete
      const timer = setTimeout(() => {
        titleInputRef.current?.focus()
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [autoFocusTitle])

  const handleToggleNotes = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsNotesExpanded((prev) => !prev)
    notesChevronRotation.value = withTiming(isNotesExpanded ? 0 : 1, {
      duration: 200,
      easing: Easing.ease,
    })
  }, [isNotesExpanded, notesChevronRotation])

  const notesChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(notesChevronRotation.value, [0, 1], [0, 90])}deg` }],
  }))

  // Submit state
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const isFormDisabled = submitState !== 'idle'

  // Focus state for title input
  const [isTitleFocused, setIsTitleFocused] = useState(false)

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const iconColor = isDark ? '#94a3b8' : '#64748b'

  const isValid = title.trim().length > 0 && selectedCategory !== null && selectedPriority !== null

  const resetForm = () => {
    setTitle('')
    setSelectedCategory(null)
    setSelectedCategoryLabel(null)
    setSelectedPriority(null)
    setNotes('')
    setIsNotesExpanded(false)
    notesChevronRotation.value = 0
    // Reset reminder
    setIsReminderEnabled(false)
    const baseDate = selectedTarget === 'tomorrow' ? addDays(new Date(), 1) : new Date()
    setReminderDate(setMinutes(setHours(baseDate, 9), 0))
    setSubmitState('idle')
  }

  // Track if we've already advanced from title input to prevent multiple triggers
  const hasAdvancedFromTitle = useRef(false)

  const handleTitleChange = (text: string) => {
    setTitle(text)
    // Advance tutorial when user starts typing (only once)
    if (text.length > 0 && !hasAdvancedFromTitle.current) {
      hasAdvancedFromTitle.current = true
      advanceFromTitleInput()
    }
  }

  const handleSelectCategory = (categoryId: string, categoryLabel: string) => {
    setSelectedCategory(categoryId)
    setSelectedCategoryLabel(categoryLabel)
    // Advance tutorial when category is selected
    advanceFromCategorySelector()
  }

  const handleClearCategory = () => {
    setSelectedCategory(null)
    setSelectedCategoryLabel(null)
  }

  const handleSelectPriority = (priority: Priority) => {
    setSelectedPriority(priority)
    // Advance tutorial when priority is selected
    advanceFromPrioritySelector(priority)
  }

  const handleSubmit = async () => {
    if (!isValid || !selectedCategory || !selectedPriority || isFormDisabled) return

    setSubmitState('submitting')

    try {
      // Only include reminder if enabled and date is in the future
      const reminderAt =
        isReminderEnabled && reminderDate > new Date() ? reminderDate.toISOString() : null

      await onSubmit({
        title: title.trim(),
        category: selectedCategory,
        priority: selectedPriority,
        notes: notes.trim() || null,
        plannedFor: selectedTarget,
        reminderAt,
      })

      // Show success state
      setSubmitState('success')

      // Wait 1.25s then reset form (or close if editing)
      setTimeout(() => {
        if (isEditing) {
          onClose()
        } else {
          resetForm()
        }
      }, 1250)
    } catch (error) {
      console.error('Failed to submit task:', error)
      setSubmitState('idle')
    }
  }

  return (
    <View
      className="mx-5 mt-6 p-5 rounded-2xl"
      style={{
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        borderWidth: 1,
        borderColor: isDark ? '#7c3aed' : '#a78bfa',
      }}
    >
      {/* Dim overlay when submitting/success */}
      {isFormDisabled && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.5)',
              borderRadius: 16,
              zIndex: 1,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-sans-bold text-slate-900 dark:text-white">
          {isEditing ? 'Edit Task' : 'New Task'}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          disabled={isFormDisabled}
          className="w-8 h-8 items-center justify-center"
          accessibilityLabel="Close form"
        >
          <X size={24} color={iconColor} />
        </TouchableOpacity>
      </View>

      {/* Day Toggle - Minimal Variant */}
      <View className="items-center mb-5">
        <DayToggle
          selectedTarget={selectedTarget}
          onTargetChange={onTargetChange}
          disabled={isFormDisabled}
          variant="minimal"
        />
      </View>

      {/* Task Title Input */}
      <View ref={titleTargetRef} onLayout={measureTitleTarget}>
        <TextInput
          ref={titleInputRef}
          value={title}
          onChangeText={handleTitleChange}
          placeholder="What do you want to accomplish?"
          placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
          editable={!isFormDisabled}
          onFocus={() => setIsTitleFocused(true)}
          onBlur={() => setIsTitleFocused(false)}
          className="font-sans"
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isTitleFocused ? purpleColor : isDark ? '#334155' : '#e2e8f0',
              borderWidth: isTitleFocused ? 2 : 1,
              color: isDark ? '#f8fafc' : '#0f172a',
            },
          ]}
        />
      </View>

      {/* Category Section */}
      <CategorySelector
        selectedCategory={selectedCategory}
        selectedCategoryLabel={selectedCategoryLabel}
        onSelectCategory={handleSelectCategory}
        onClearCategory={handleClearCategory}
        disabled={isFormDisabled}
      />

      {/* Priority Section */}
      <PrioritySelector
        selectedPriority={selectedPriority}
        onSelectPriority={handleSelectPriority}
        existingTopPriorityTask={existingTopPriorityTask}
        editingTaskId={editingTaskId}
        disabled={isFormDisabled}
      />

      {/* Notes Section - Collapsible */}
      <View className="mt-4">
        <TouchableOpacity
          onPress={handleToggleNotes}
          disabled={isFormDisabled}
          activeOpacity={0.7}
          className="flex-row items-center justify-between py-2"
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <FileText size={18} color={iconColor} />
            <Text className="text-sm font-sans-medium text-slate-500 dark:text-slate-400">
              Add Notes (Optional)
            </Text>
          </View>
          <Animated.View style={notesChevronStyle}>
            <ChevronRight size={18} color={iconColor} />
          </Animated.View>
        </TouchableOpacity>

        {isNotesExpanded && (
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add shopping list, details, or any notes..."
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isFormDisabled}
            className="font-sans"
            style={[
              styles.notesInput,
              {
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                color: isDark ? '#f8fafc' : '#0f172a',
              },
            ]}
          />
        )}
      </View>

      {/* Reminder Section */}
      <ReminderSection
        reminderDate={reminderDate}
        onReminderDateChange={setReminderDate}
        isReminderEnabled={isReminderEnabled}
        onReminderEnabledChange={setIsReminderEnabled}
        disabled={isFormDisabled}
        selectedTarget={selectedTarget}
      />

      {/* Action Buttons - above overlay */}
      <View className="mt-6" style={{ zIndex: 2 }}>
        {submitState === 'idle' && (
          <View className="flex-row" style={{ gap: 12 }}>
            {/* Cancel Button */}
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-4 rounded-xl items-center justify-center"
              style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
              accessibilityRole="button"
            >
              <Text className="font-sans-semibold text-slate-900 dark:text-white">Cancel</Text>
            </TouchableOpacity>

            {/* Add/Update Task Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!isValid}
              activeOpacity={0.8}
              className="flex-1 rounded-xl overflow-hidden"
              style={{ opacity: isValid ? 1 : 0.5 }}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isValid }}
            >
              <LinearGradient
                colors={[colors.brand.pink, colors.brand.pink, colors.brand.purple] as const}
                locations={[0, 0.6, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                <Text className="font-sans-semibold text-white">
                  {isEditing ? 'Update Task' : 'Add Task'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {submitState === 'submitting' && (
          <View
            className="py-4 rounded-xl items-center justify-center"
            style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
          >
            <ActivityIndicator size="small" color={purpleColor} />
          </View>
        )}

        {submitState === 'success' && (
          <View
            className="py-4 rounded-xl items-center justify-center flex-row"
            style={{
              backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
              borderWidth: 1,
              borderColor: '#22c55e',
            }}
          >
            <Check size={20} color="#22c55e" />
            <Text className="font-sans-semibold ml-2" style={{ color: '#22c55e' }}>
              {isEditing ? 'Task updated!' : 'Task added!'}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  addButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
