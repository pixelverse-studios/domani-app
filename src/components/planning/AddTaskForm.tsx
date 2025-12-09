import React, { useState, useMemo, useRef } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import {
  X,
  Tag,
  AlertTriangle,
  Briefcase,
  Heart,
  User,
  BookOpen,
  Search,
  Plus,
  ChevronUp,
  Star,
  Check,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { Text, ConfirmationModal } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useProfile } from '~/hooks/useProfile'
import {
  useCreateUserCategory,
  useDeleteUserCategory,
  useSortedCategories,
  useFavoriteCategories,
} from '~/hooks/useCategories'
import { colors } from '~/theme'

// Map system category names to form IDs and vice versa
const SYSTEM_NAME_TO_FORM_ID: Record<string, string> = {
  Work: 'work',
  Wellness: 'wellness',
  Personal: 'personal',
  Education: 'education',
}

const FORM_ID_TO_DISPLAY: Record<string, string> = {
  work: 'Work',
  wellness: 'Wellness',
  personal: 'Personal',
  education: 'Education',
}

// Get icon for category - moved outside component to avoid memoization issues
function getCategoryIcon(
  categoryId: string,
  isSelected: boolean,
  purpleColor: string,
  iconColor: string,
) {
  const color = isSelected ? purpleColor : iconColor
  const fill = isSelected ? purpleColor : 'none'

  switch (categoryId) {
    case 'work':
      return <Briefcase size={18} color={color} fill={fill} />
    case 'wellness':
      return <Heart size={18} color={color} fill={fill} />
    case 'personal':
      return <User size={18} color={color} fill={fill} />
    case 'education':
      return <BookOpen size={18} color={color} fill={fill} />
    default:
      return <Tag size={18} color={color} fill={fill} />
  }
}

type Category = 'work' | 'wellness' | 'personal' | 'education' | string
type Priority = 'high' | 'medium' | 'low'
type SubmitState = 'idle' | 'submitting' | 'success'

interface CategoryOption {
  id: Category
  label: string
  icon: React.ReactNode
  isSystem?: boolean
}

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
}

export function AddTaskForm({
  onClose,
  onSubmit,
  initialValues,
  isEditing = false,
}: AddTaskFormProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { profile } = useProfile()
  const sortedCategories = useSortedCategories(profile?.auto_sort_categories ?? false)
  const favoriteCategories = useFavoriteCategories(profile?.auto_sort_categories ?? false)
  const createCategory = useCreateUserCategory()
  const deleteCategory = useDeleteUserCategory()

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
  const [categorySearch, setCategorySearch] = useState('')
  const categorySearchRef = useRef<TextInput>(null)

  // Delete confirmation state
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryOption | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Submit state
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const isFormDisabled = submitState !== 'idle'

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const iconColor = isDark ? '#94a3b8' : '#64748b'

  // Get the user's favorite categories for quick-select buttons (max 4)
  const quickSelectCategories: CategoryOption[] = useMemo(() => {
    return favoriteCategories.slice(0, 4).map((cat) => {
      if (cat.isSystem) {
        // Convert database names to form IDs for backward compatibility
        const formId = SYSTEM_NAME_TO_FORM_ID[cat.name] || cat.name.toLowerCase()
        const displayLabel = FORM_ID_TO_DISPLAY[formId] || cat.name
        return {
          id: formId,
          label: displayLabel,
          icon: getCategoryIcon(formId, false, purpleColor, iconColor),
          isSystem: true,
        }
      } else {
        // Custom user category
        return {
          id: cat.id,
          label: cat.name,
          icon: <Tag size={18} color={iconColor} />,
          isSystem: false,
        }
      }
    })
  }, [favoriteCategories, iconColor, purpleColor])

  // All categories (system + custom user categories) - respects sort order
  const allCategories: CategoryOption[] = useMemo(() => {
    const systemOptions: CategoryOption[] = sortedCategories
      .filter((cat) => cat.isSystem)
      .map((cat) => {
        const formId = SYSTEM_NAME_TO_FORM_ID[cat.name] || cat.name.toLowerCase()
        const displayLabel = FORM_ID_TO_DISPLAY[formId] || cat.name
        return {
          id: formId,
          label: displayLabel,
          icon: getCategoryIcon(formId, false, purpleColor, iconColor),
          isSystem: true,
        }
      })

    const customOptions: CategoryOption[] = sortedCategories
      .filter((cat) => !cat.isSystem)
      .map((cat) => ({
        id: cat.id,
        label: cat.name,
        icon: <Tag size={18} color={iconColor} />,
        isSystem: false,
      }))

    return [...systemOptions, ...customOptions]
  }, [sortedCategories, iconColor, purpleColor])

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return []
    const search = categorySearch.toLowerCase()
    return allCategories.filter((cat) => cat.label.toLowerCase().includes(search))
  }, [categorySearch, allCategories])

  // Check if exact match exists
  const exactMatchExists = useMemo(() => {
    if (!categorySearch.trim()) return false
    const search = categorySearch.toLowerCase().trim()
    return allCategories.some((cat) => cat.label.toLowerCase() === search)
  }, [categorySearch, allCategories])

  const hasSearchText = categorySearch.trim().length > 0
  // Show dropdown whenever there's search text (not dependent on focus)
  const showDropdown = hasSearchText
  // Show category buttons when not actively searching
  const showCategoryButtons = !hasSearchText

  const handleSelectCategory = (category: CategoryOption) => {
    setSelectedCategory(category.id)
    setSelectedCategoryLabel(category.label)
    setCategorySearch('')
    categorySearchRef.current?.blur()
  }

  const handleCreateCategory = async () => {
    const newCategoryName = categorySearch.trim()
    if (newCategoryName) {
      try {
        const newCategory = await createCategory.mutateAsync({ name: newCategoryName })
        setSelectedCategory(newCategory.id)
        setSelectedCategoryLabel(newCategory.name)
        setCategorySearch('')
        categorySearchRef.current?.blur()
      } catch (error) {
        console.error('Failed to create category:', error)
      }
    }
  }

  const handleClearCategory = () => {
    setSelectedCategory(null)
    setSelectedCategoryLabel(null)
  }

  const handleDeletePress = (category: CategoryOption) => {
    setCategoryToDelete(category)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      await deleteCategory.mutateAsync(categoryToDelete.id)
      // Clear selection if the deleted category was selected
      if (selectedCategory === categoryToDelete.id) {
        setSelectedCategory(null)
        setSelectedCategoryLabel(null)
      }
      setShowDeleteModal(false)
      setCategoryToDelete(null)
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setCategoryToDelete(null)
  }

  const priorities: Priority[] = ['high', 'medium', 'low']

  const isValid = title.trim().length > 0 && selectedCategory !== null && selectedPriority !== null

  const resetForm = () => {
    setTitle('')
    setSelectedCategory(null)
    setSelectedCategoryLabel(null)
    setSelectedPriority(null)
    setCategorySearch('')
    setSubmitState('idle')
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
        className="font-sans"
        style={[
          styles.input,
          {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderColor: purpleColor,
            color: isDark ? '#f8fafc' : '#0f172a',
          },
        ]}
      />

      {/* Category Section */}
      <View className="mt-5">
        {/* Category Header with Selected Badge */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Tag size={16} color={iconColor} />
            <Text className="font-sans-medium text-slate-900 dark:text-white ml-2">Category</Text>
          </View>

          {/* Selected Category Badge */}
          {selectedCategoryLabel && (
            <TouchableOpacity
              onPress={handleClearCategory}
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{ backgroundColor: isDark ? '#7c3aed' : '#8b5cf6' }}
            >
              <Star size={12} color="#ffffff" fill="#ffffff" />
              <Text className="font-sans-medium text-white text-xs ml-1.5">
                {selectedCategoryLabel}
              </Text>
              <Check size={12} color="#ffffff" className="ml-1" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Search Input */}
        <View className="relative">
          <View
            className="flex-row items-center rounded-xl"
            style={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderWidth: hasSearchText ? 2 : 1,
              borderColor: hasSearchText ? purpleColor : isDark ? '#334155' : '#e2e8f0',
            }}
          >
            <View className="pl-4">
              <Search size={18} color={iconColor} />
            </View>
            <TextInput
              ref={categorySearchRef}
              value={categorySearch}
              onChangeText={setCategorySearch}
              placeholder="Search All Categories"
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              className="flex-1 font-sans py-3 px-3"
              style={{
                fontSize: 15,
                color: isDark ? '#f8fafc' : '#0f172a',
              }}
            />
          </View>

          {/* Search Results Grid */}
          {showDropdown && (
            <View className="mt-3">
              {/* Category Grid - 2 columns */}
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                {/* Matching Categories */}
                {filteredCategories.map((category) => {
                  const isSelected = selectedCategory === category.id
                  return (
                    <View key={category.id} style={styles.categoryGridItem}>
                      <TouchableOpacity
                        onPress={() => handleSelectCategory(category)}
                        className="flex-row items-center py-3 px-4 rounded-xl"
                        style={{
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? purpleColor : isDark ? '#334155' : '#e2e8f0',
                        }}
                      >
                        {getCategoryIcon(category.id, isSelected, purpleColor, iconColor)}
                        <Text
                          className="font-sans-medium ml-2"
                          style={{
                            color: isSelected ? purpleColor : isDark ? '#e2e8f0' : '#334155',
                          }}
                          numberOfLines={1}
                        >
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                      {/* Delete button for user categories */}
                      {!category.isSystem && (
                        <TouchableOpacity
                          onPress={() => handleDeletePress(category)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center"
                          style={{ backgroundColor: isDark ? '#ef4444' : '#dc2626' }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                })}

                {/* Create New Category Option (if no exact match) */}
                {!exactMatchExists && (
                  <View style={styles.categoryGridItem}>
                    <TouchableOpacity
                      onPress={handleCreateCategory}
                      className="flex-row items-center py-3 px-4 rounded-xl"
                      style={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderWidth: 1,
                        borderColor: purpleColor,
                        borderStyle: 'dashed',
                      }}
                    >
                      <Plus size={18} color={purpleColor} />
                      <Text
                        className="font-sans-medium ml-2"
                        style={{ color: purpleColor }}
                        numberOfLines={1}
                      >
                        Create &quot;{categorySearch.trim()}&quot;
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Show Less Button */}
              <TouchableOpacity
                onPress={() => setCategorySearch('')}
                className="flex-row items-center justify-center py-3 mt-2"
              >
                <ChevronUp size={16} color={iconColor} />
                <Text className="font-sans-medium text-slate-500 dark:text-slate-400 ml-1">
                  Show Less
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Category Grid - 2x2 (shown when not actively searching) */}
        {showCategoryButtons && (
          <View className="flex-row flex-wrap mt-3" style={{ gap: 10 }}>
            {quickSelectCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => handleSelectCategory(category)}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor:
                      selectedCategory === category.id
                        ? purpleColor
                        : isDark
                          ? '#334155'
                          : '#e2e8f0',
                    borderWidth: selectedCategory === category.id ? 2 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCategory === category.id }}
              >
                {getCategoryIcon(
                  category.id,
                  selectedCategory === category.id,
                  purpleColor,
                  iconColor,
                )}
                <Text
                  className={`font-sans-medium ml-2 ${
                    selectedCategory === category.id
                      ? 'text-purple-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Priority Section */}
      <View className="mt-5">
        <View className="flex-row items-center mb-3">
          <AlertTriangle size={16} color={iconColor} />
          <Text className="font-sans-medium text-slate-900 dark:text-white ml-2">Priority</Text>
        </View>

        {/* Priority Segmented Control */}
        <View
          className="flex-row rounded-xl overflow-hidden"
          style={{
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#e2e8f0',
          }}
        >
          {priorities.map((priority, index) => {
            const isSelected = selectedPriority === priority
            const priorityColors = {
              high: {
                bg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                text: '#ef4444',
              },
              medium: {
                bg: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',
                text: '#f97316',
              },
              low: {
                bg: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
                text: '#22c55e',
              },
            }
            return (
              <TouchableOpacity
                key={priority}
                onPress={() => setSelectedPriority(priority)}
                className="flex-1 py-3 items-center justify-center"
                style={[
                  isSelected && {
                    backgroundColor: priorityColors[priority].bg,
                  },
                  index < priorities.length - 1 && {
                    borderRightWidth: 1,
                    borderRightColor: isDark ? '#334155' : '#e2e8f0',
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  className="font-sans-medium"
                  style={{
                    color: isSelected
                      ? priorityColors[priority].text
                      : isDark
                        ? '#94a3b8'
                        : '#64748b',
                  }}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
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

      {/* Delete Category Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Category?"
        itemName={categoryToDelete?.label ?? ''}
        description="Are you sure you want to delete:"
        confirmLabel="Delete Category"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={deleteCategory.isPending}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '48%',
  },
  categoryGridItem: {
    width: '48%',
    position: 'relative',
  },
  addButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
