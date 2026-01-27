import React, { useMemo, useRef, useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native'
import {
  Tag,
  Briefcase,
  Heart,
  User,
  BookOpen,
  Search,
  Plus,
  Star,
  Check,
  X,
} from 'lucide-react-native'

import { Text, ConfirmationModal } from '~/components/ui'
import { useTutorialTarget, useTutorialAdvancement } from '~/components/tutorial'
import { useTutorialStore } from '~/stores/tutorialStore'
import { useTheme } from '~/hooks/useTheme'
import { useProfile } from '~/hooks/useProfile'
import {
  useCreateUserCategory,
  useDeleteUserCategory,
  useSortedCategories,
  useFavoriteCategories,
} from '~/hooks/useCategories'

// Check if error is a duplicate name constraint violation (Postgres error code 23505)
function isDuplicateNameError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code === '23505'
  }
  return false
}

// Map system category names (from database) to form IDs
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

// Get icon for category
function getCategoryIcon(
  categoryId: string,
  isSelected: boolean,
  purpleColor: string,
  iconColor: string,
  size: number = 16,
) {
  const color = isSelected ? purpleColor : iconColor
  const fill = isSelected ? purpleColor : 'none'

  switch (categoryId) {
    case 'work':
      return <Briefcase size={size} color={color} fill={fill} />
    case 'wellness':
      return <Heart size={size} color={color} fill={fill} />
    case 'personal':
      return <User size={size} color={color} fill={fill} />
    case 'education':
      return <BookOpen size={size} color={color} fill={fill} />
    default:
      return <Tag size={size} color={color} fill={fill} />
  }
}

export interface CategoryOption {
  id: string
  label: string
  icon: React.ReactNode
  isSystem?: boolean
}

interface CategorySelectorProps {
  selectedCategory: string | null
  selectedCategoryLabel: string | null
  onSelectCategory: (categoryId: string, categoryLabel: string) => void
  onClearCategory: () => void
  disabled?: boolean
}

// Number of categories to show in collapsed state
const COLLAPSED_COUNT = 4

export function CategorySelector({
  selectedCategory,
  selectedCategoryLabel,
  onSelectCategory,
  onClearCategory,
  disabled = false,
}: CategorySelectorProps) {
  const { targetRef: categorySelectorRef, measureTarget: measureCategorySelector } =
    useTutorialTarget('category_selector')
  const { targetRef: moreCategoriesRef, measureTarget: measureMoreCategories } =
    useTutorialTarget('more_categories_button')
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { profile } = useProfile()
  const sortedCategories = useSortedCategories(profile?.auto_sort_categories ?? false)
  const favoriteCategories = useFavoriteCategories(profile?.auto_sort_categories ?? false)
  const createCategory = useCreateUserCategory()
  const deleteCategory = useDeleteUserCategory()
  const { advanceFromCategorySelector, advanceFromCreateCategory, advanceFromMoreCategoriesButton } =
    useTutorialAdvancement()
  const hideOverlay = useTutorialStore((state) => state.hideOverlay)

  // Bottom sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const searchInputRef = useRef<TextInput>(null)

  // Create category modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const createInputRef = useRef<TextInput>(null)

  // Delete confirmation state
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryOption | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const iconColor = isDark ? '#94a3b8' : '#64748b'

  // All categories - favorites first (in user-set order), then remaining alphabetically
  const allCategories: CategoryOption[] = useMemo(() => {
    const favoriteIds = new Set(favoriteCategories.map((c) => c.id))

    const toCategoryOption = (cat: (typeof sortedCategories)[0]): CategoryOption => {
      if (cat.isSystem) {
        const formId = SYSTEM_NAME_TO_FORM_ID[cat.name] || cat.name.toLowerCase()
        const displayLabel = FORM_ID_TO_DISPLAY[formId] || cat.name
        return {
          id: formId,
          label: displayLabel,
          icon: getCategoryIcon(formId, false, purpleColor, iconColor),
          isSystem: true,
        }
      } else {
        return {
          id: cat.id,
          label: cat.name,
          icon: <Tag size={16} color={iconColor} />,
          isSystem: false,
        }
      }
    }

    // Favorites first (already in correct order from useFavoriteCategories)
    const favoriteOptions = favoriteCategories.map(toCategoryOption)

    // Remaining categories (non-favorites), sorted alphabetically
    const remainingOptions = sortedCategories
      .filter((cat) => !favoriteIds.has(cat.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toCategoryOption)

    return [...favoriteOptions, ...remainingOptions]
  }, [sortedCategories, favoriteCategories, iconColor, purpleColor])

  // Categories to display in collapsed state (first 4)
  const collapsedCategories = useMemo(() => {
    return allCategories.slice(0, COLLAPSED_COUNT)
  }, [allCategories])

  // Count of additional categories
  const additionalCount = Math.max(0, allCategories.length - COLLAPSED_COUNT)

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return allCategories
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

  const openSheet = () => {
    if (disabled) return
    // Hide spotlight while sheet is open
    hideOverlay()
    setIsSheetOpen(true)
  }

  const closeSheet = () => {
    Keyboard.dismiss()
    setCategorySearch('')
    setIsSheetOpen(false)
    // Advance tutorial when sheet closes (so priority tooltip shows after sheet is gone)
    advanceFromMoreCategoriesButton()
  }

  const openCreateModal = () => {
    if (disabled) return
    // Hide spotlight when modal opens so it doesn't show behind the modal
    hideOverlay()
    setIsCreateModalOpen(true)
    setTimeout(() => {
      createInputRef.current?.focus()
    }, 300)
  }

  const closeCreateModal = () => {
    Keyboard.dismiss()
    setNewCategoryName('')
    setIsCreateModalOpen(false)
  }

  const handleCreateFromModal = async () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) return

    try {
      const newCategory = await createCategory.mutateAsync({ name: trimmedName })
      onSelectCategory(newCategory.id, newCategory.name)
      closeCreateModal()
      // Delay tutorial advancement until after modal closes and React Query updates
      // This ensures the "+N more" button is visible before we try to highlight it
      setTimeout(() => {
        advanceFromCreateCategory()
      }, 400)
    } catch (error) {
      console.error('Failed to create category:', error)
      if (isDuplicateNameError(error)) {
        Alert.alert('Category already exists', 'A category with this name already exists.')
      } else {
        Alert.alert('Failed to create category', 'Please try again.')
      }
    }
  }

  const handleSelectCategory = (category: CategoryOption) => {
    onSelectCategory(category.id, category.label)
    // Only advance tutorial if user has more than 4 categories (they've created custom ones)
    // If they only have defaults, they must create a category first
    if (allCategories.length > 4) {
      advanceFromCategorySelector()
    }
  }

  const handleSelectCategoryAndClose = (category: CategoryOption) => {
    onSelectCategory(category.id, category.label)
    // Only advance tutorial if user has more than 4 categories (they've created custom ones)
    // If they only have defaults, they must create a category first
    if (allCategories.length > 4) {
      advanceFromCategorySelector()
    }
    closeSheet()
  }

  const handleCreateCategory = async () => {
    const newCategoryName = categorySearch.trim()
    if (newCategoryName) {
      try {
        const newCategory = await createCategory.mutateAsync({ name: newCategoryName })
        advanceFromCreateCategory()
        onSelectCategory(newCategory.id, newCategory.name)
        closeSheet()
      } catch (error) {
        console.error('Failed to create category:', error)
        if (isDuplicateNameError(error)) {
          Alert.alert('Category already exists', 'A category with this name already exists.')
        } else {
          Alert.alert('Failed to create category', 'Please try again.')
        }
      }
    } else {
      // Empty search - focus input so user knows to type a name
      searchInputRef.current?.focus()
    }
  }

  const handleDeletePress = (category: CategoryOption) => {
    setCategoryToDelete(category)
    setShowDeleteModal(true)
  }

  // For deleting from within the sheet - close sheet first to avoid Modal stacking issues
  const handleDeletePressFromSheet = (category: CategoryOption) => {
    // Close the sheet first
    Keyboard.dismiss()
    setCategorySearch('')
    setIsSheetOpen(false)
    // Then show delete modal after sheet closes
    setTimeout(() => {
      setCategoryToDelete(category)
      setShowDeleteModal(true)
    }, 300)
  }

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      await deleteCategory.mutateAsync(categoryToDelete.id)
      if (selectedCategory === categoryToDelete.id) {
        onClearCategory()
      }
      setShowDeleteModal(false)
      setCategoryToDelete(null)
    } catch (error) {
      console.error('Failed to delete category:', error)
      setShowDeleteModal(false)
      setCategoryToDelete(null)
      Alert.alert('Failed to delete category', 'Please try again.')
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setCategoryToDelete(null)
  }

  // Render a chip in collapsed state (with delete button for custom)
  const renderCollapsedChip = (category: CategoryOption) => {
    const isSelected = selectedCategory === category.id
    return (
      <View key={category.id} style={styles.chipWrapper}>
        <TouchableOpacity
          onPress={() => handleSelectCategory(category)}
          disabled={disabled}
          style={[
            styles.chip,
            {
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isSelected ? purpleColor : isDark ? '#334155' : '#e2e8f0',
              borderWidth: isSelected ? 2 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          {getCategoryIcon(category.id, isSelected, purpleColor, iconColor)}
          <Text
            className="font-sans-medium ml-1.5"
            style={{
              color: isSelected ? purpleColor : isDark ? '#e2e8f0' : '#334155',
              fontSize: 14,
            }}
            numberOfLines={1}
          >
            {category.label}
          </Text>
        </TouchableOpacity>
        {/* Delete button for user-created categories */}
        {!category.isSystem && (
          <TouchableOpacity
            onPress={() => handleDeletePress(category)}
            disabled={disabled}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full items-center justify-center"
            style={{ backgroundColor: isDark ? '#ef4444' : '#dc2626', zIndex: 10 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={11} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    )
  }

  // Render a chip in the sheet (with delete button for custom categories)
  const renderSheetChip = (category: CategoryOption) => {
    const isSelected = selectedCategory === category.id
    return (
      <View key={category.id} style={styles.chipWrapper}>
        {/* Chip */}
        <TouchableOpacity
          onPress={() => handleSelectCategoryAndClose(category)}
          disabled={disabled}
          className="flex-row items-center py-2.5 px-3 rounded-xl"
          style={{
            backgroundColor: isSelected
              ? isDark
                ? 'rgba(139, 92, 246, 0.2)'
                : 'rgba(139, 92, 246, 0.1)'
              : isDark
                ? '#1e293b'
                : '#f8fafc',
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected ? purpleColor : isDark ? '#334155' : '#e2e8f0',
          }}
          activeOpacity={0.7}
        >
          {getCategoryIcon(category.id, isSelected, purpleColor, iconColor, 16)}
          <Text
            className="font-sans-medium ml-2 text-sm"
            style={{ color: isSelected ? purpleColor : isDark ? '#e2e8f0' : '#334155' }}
            numberOfLines={1}
          >
            {category.label}
          </Text>
          {isSelected && <Check size={14} color={purpleColor} style={{ marginLeft: 4 }} />}
        </TouchableOpacity>
        {/* Delete button for user-created categories - same approach as collapsed view */}
        {!category.isSystem && (
          <Pressable
            onPress={() => handleDeletePressFromSheet(category)}
            disabled={disabled}
            onStartShouldSetResponder={() => true}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full items-center justify-center"
            style={{ backgroundColor: isDark ? '#ef4444' : '#dc2626', zIndex: 10 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={11} color="#ffffff" />
          </Pressable>
        )}
      </View>
    )
  }

  // Render the inline "+ New" pill in the bottom sheet
  const renderNewPill = () => {
    const showCreateLabel = hasSearchText && !exactMatchExists
    const pillLabel = showCreateLabel ? `Create "${categorySearch.trim()}"` : 'New'

    return (
      <TouchableOpacity
        onPress={handleCreateCategory}
        disabled={disabled || createCategory.isPending || (hasSearchText && exactMatchExists)}
        style={[
          styles.newPill,
          {
            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
            borderColor: purpleColor,
            opacity: hasSearchText && exactMatchExists ? 0.5 : 1,
          },
        ]}
        activeOpacity={0.7}
      >
        <Plus size={14} color={purpleColor} />
        <Text
          className="font-sans-medium ml-1"
          style={{ color: purpleColor, fontSize: 14 }}
          numberOfLines={1}
        >
          {pillLabel}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View className="mt-5" ref={categorySelectorRef} onLayout={measureCategorySelector}>
      {/* Category Header with Selected Badge */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Tag size={16} color={iconColor} />
          <Text className="font-sans-medium text-slate-900 dark:text-white ml-2">Category</Text>
        </View>

        {/* Selected Category Badge */}
        {selectedCategoryLabel && (
          <View className="flex-row items-center">
            <View
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{ backgroundColor: isDark ? '#7c3aed' : '#8b5cf6' }}
            >
              <Star size={12} color="#ffffff" fill="#ffffff" />
              <Text className="font-sans-medium text-white text-xs ml-1.5">
                {selectedCategoryLabel}
              </Text>
              <Check size={12} color="#ffffff" style={{ marginLeft: 4 }} />
            </View>
            {/* X button to clear selection */}
            <TouchableOpacity
              onPress={onClearCategory}
              disabled={disabled}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginLeft: 8 }}
            >
              <X size={18} color={iconColor} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Collapsed View: Horizontal chips with "+N more" and "+ New" */}
      <View style={styles.collapsedContainer}>
        {/* Category chips */}
        {collapsedCategories.map((category) => renderCollapsedChip(category))}

        {/* "+N more" button - opens bottom sheet */}
        {additionalCount > 0 && (
          <View ref={moreCategoriesRef} onLayout={measureMoreCategories}>
            <TouchableOpacity
              onPress={openSheet}
              disabled={disabled}
              style={[
                styles.moreButton,
                {
                  backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                  borderColor: isDark ? '#475569' : '#cbd5e1',
                },
              ]}
            >
              <Text
                className="font-sans-medium"
                style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 }}
              >
                +{additionalCount} more
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* "+ New" button */}
        <TouchableOpacity
          onPress={openCreateModal}
          disabled={disabled}
          style={[
            styles.newButton,
            {
              backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
              borderColor: purpleColor,
            },
          ]}
        >
          <Plus size={14} color={purpleColor} />
          <Text className="font-sans-medium ml-1" style={{ color: purpleColor, fontSize: 13 }}>
            New
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={isSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          {/* Backdrop with semi-transparent background for touch handling */}
          <Pressable style={styles.backdrop} onPress={closeSheet} />

          {/* Sheet Content - Single ScrollView for proper keyboard tap handling */}
          <View
            style={[
              styles.sheetContent,
              {
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              },
            ]}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Handle Bar */}
              <View className="items-center pt-3 pb-2">
                <View
                  className="w-10 h-1 rounded-full"
                  style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1' }}
                />
              </View>

              {/* Header */}
              <View className="flex-row items-center justify-between px-5 py-3">
                <Text
                  className="font-sans-semibold text-lg"
                  style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                >
                  Select Category
                </Text>
                <TouchableOpacity
                  onPress={closeSheet}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color={iconColor} />
                </TouchableOpacity>
              </View>

              {/* Search Input */}
              <View className="px-5 pb-4">
                <View
                  className="flex-row items-center rounded-xl"
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    borderWidth: 1,
                    borderColor: hasSearchText ? purpleColor : 'transparent',
                  }}
                >
                  <View className="pl-4">
                    <Search size={18} color={iconColor} />
                  </View>
                  <TextInput
                    ref={searchInputRef}
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                    placeholder="Search or create..."
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    className="flex-1 font-sans px-3"
                    style={{
                      fontSize: 15,
                      paddingVertical: 14,
                      color: isDark ? '#f8fafc' : '#0f172a',
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType={hasSearchText && !exactMatchExists ? 'done' : 'search'}
                    enablesReturnKeyAutomatically={true}
                    blurOnSubmit={false}
                    onSubmitEditing={() => {
                      if (hasSearchText && !exactMatchExists) {
                        handleCreateCategory()
                      }
                    }}
                  />
                  {hasSearchText && (
                    <TouchableOpacity
                      onPress={() => setCategorySearch('')}
                      className="pr-4"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <X size={18} color={iconColor} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Category Grid */}
              <View className="flex-row flex-wrap px-5 pt-2" style={{ gap: 10 }}>
                {filteredCategories.map((category) => renderSheetChip(category))}
                {/* Inline "+ New" pill */}
                {renderNewPill()}
              </View>

              {/* Empty state when no matches */}
              {filteredCategories.length === 0 && hasSearchText && (
                <View className="items-center py-6 px-5">
                  <Text
                    className="font-sans text-center"
                    style={{ color: isDark ? '#64748b' : '#94a3b8' }}
                  >
                    No categories match &quot;{categorySearch.trim()}&quot;
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Bottom extension to seamlessly connect with keyboard */}
            <View
              style={{
                height: 400,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                marginBottom: -400,
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

      {/* Create Category Modal */}
      <Modal
        visible={isCreateModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={closeCreateModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.createModalContainer}
        >
          {/* Backdrop */}
          <Pressable style={styles.createModalBackdrop} onPress={closeCreateModal} />

          {/* Modal Content */}
          <View
            style={[
              styles.createModalContent,
              { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <Text
                className="font-sans-semibold text-lg mb-4"
                style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
              >
                New Category
              </Text>
              <TextInput
                ref={createInputRef}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Category name"
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                className="font-sans"
                style={[
                  styles.createModalInput,
                  {
                    backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    borderColor: newCategoryName.trim() ? purpleColor : 'transparent',
                  },
                ]}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleCreateFromModal}
              />
              <View style={styles.createModalButtonRow}>
                <TouchableOpacity
                  onPress={closeCreateModal}
                  style={[
                    styles.createModalButton,
                    { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
                  ]}
                >
                  <Text
                    className="font-sans-medium"
                    style={{ color: isDark ? '#e2e8f0' : '#475569' }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateFromModal}
                  disabled={!newCategoryName.trim() || createCategory.isPending}
                  style={[
                    styles.createModalButton,
                    {
                      backgroundColor: purpleColor,
                      opacity: !newCategoryName.trim() || createCategory.isPending ? 0.5 : 1,
                      flex: 1,
                    },
                  ]}
                >
                  <Text className="font-sans-medium text-white">
                    {createCategory.isPending ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  // Collapsed view styles
  collapsedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  // Bottom sheet styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheetContent: {
    maxHeight: '80%',
    minHeight: '50%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sheetScrollContent: {
    paddingBottom: 32,
  },
  chipWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  // Sheet chip wrapper - needs padding to contain delete button within touch bounds
  sheetChipWrapper: {
    position: 'relative',
  },
  sheetChipWrapperWithDelete: {
    paddingTop: 6,
    paddingRight: 6,
    marginTop: -2,
    marginRight: -2,
  },
  sheetDeleteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Inline new pill in sheet
  newPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 4,
  },
  // Create category modal styles
  createModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  createModalContent: {
    width: 320,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  createModalInput: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  createModalButtonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  createModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
