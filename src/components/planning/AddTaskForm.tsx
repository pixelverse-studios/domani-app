import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { X, Check } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

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
}

interface AddTaskFormProps {
  onClose: () => void
  onSubmit: (task: {
    title: string
    category: Category
    priority: Priority
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
  addButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
