import React, { useState, useCallback } from 'react'
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
import { CategorySelector } from './CategorySelector'
import { PrioritySelector, type Priority } from './PrioritySelector'
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
}

interface AddTaskFormProps {
  onClose: () => void
  onSubmit: (task: {
    title: string
    category: Category
    priority: Priority
    notes?: string | null
  }) => Promise<void> | void
  initialValues?: InitialFormValues
  isEditing?: boolean
  /** Existing HIGH priority task in this plan (for MIT warning) */
  existingHighPriorityTask?: { id: string; title: string } | null
  /** ID of the task being edited (to exclude self from HIGH check) */
  editingTaskId?: string
}

export function AddTaskForm({
  onClose,
  onSubmit,
  initialValues,
  isEditing = false,
  existingHighPriorityTask,
  editingTaskId,
}: AddTaskFormProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

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

  // Animation for chevron rotation
  const notesChevronRotation = useSharedValue(initialValues?.notes ? 1 : 0)

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
    setSubmitState('idle')
  }

  const handleSelectCategory = (categoryId: string, categoryLabel: string) => {
    setSelectedCategory(categoryId)
    setSelectedCategoryLabel(categoryLabel)
  }

  const handleClearCategory = () => {
    setSelectedCategory(null)
    setSelectedCategoryLabel(null)
  }

  const handleSubmit = async () => {
    if (!isValid || !selectedCategory || !selectedPriority || isFormDisabled) return

    setSubmitState('submitting')

    try {
      await onSubmit({
        title: title.trim(),
        category: selectedCategory,
        priority: selectedPriority,
        notes: notes.trim() || null,
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
      <View className="flex-row items-center justify-between mb-5">
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

      {/* Task Title Input */}
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="What do you want to accomplish?"
        placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
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
        onSelectPriority={setSelectedPriority}
        existingHighPriorityTask={existingHighPriorityTask}
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
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
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
    paddingTop: 12,
    paddingBottom: 16,
    fontSize: 16,
    minHeight: 48,
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
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
