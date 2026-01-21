import React, { useMemo, useRef, useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native'
import {
  Tag,
  Briefcase,
  Heart,
  User,
  BookOpen,
  Search,
  Plus,
  Check,
  X,
  ChevronRight,
} from 'lucide-react-native'

import { Text, ConfirmationModal } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useProfile } from '~/hooks/useProfile'
import {
  useCreateUserCategory,
  useDeleteUserCategory,
  useSortedCategories,
  useFavoriteCategories,
} from '~/hooks/useCategories'

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
  size: number = 18,
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

interface CategorySelectorOptionBProps {
  selectedCategory: string | null
  selectedCategoryLabel: string | null
  onSelectCategory: (categoryId: string, categoryLabel: string) => void
  onClearCategory: () => void
  disabled?: boolean
}

export function CategorySelectorOptionB({
  selectedCategory,
  selectedCategoryLabel,
  onSelectCategory,
  onClearCategory,
  disabled = false,
}: CategorySelectorOptionBProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { profile } = useProfile()
  const sortedCategories = useSortedCategories(profile?.auto_sort_categories ?? false)
  const favoriteCategories = useFavoriteCategories(profile?.auto_sort_categories ?? false)
  const createCategory = useCreateUserCategory()
  const deleteCategory = useDeleteUserCategory()

  // Bottom sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const searchInputRef = useRef<TextInput>(null)

  // Delete confirmation state
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryOption | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const iconColor = isDark ? '#94a3b8' : '#64748b'

  // All categories - favorites first (in user-set order), then remaining alphabetically
  // Unified list - no separation between system and custom
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
          icon: <Tag size={18} color={iconColor} />,
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
    setIsSheetOpen(true)
    // Focus search input after sheet opens
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)
  }

  const closeSheet = () => {
    Keyboard.dismiss()
    setCategorySearch('')
    setIsSheetOpen(false)
  }

  const handleSelectCategory = (category: CategoryOption) => {
    onSelectCategory(category.id, category.label)
    closeSheet()
  }

  const handleCreateCategory = async () => {
    const newCategoryName = categorySearch.trim()
    if (newCategoryName) {
      try {
        const newCategory = await createCategory.mutateAsync({ name: newCategoryName })
        onSelectCategory(newCategory.id, newCategory.name)
        closeSheet()
      } catch (error) {
        console.error('Failed to create category:', error)
      }
    }
  }

  const handleDeletePress = (category: CategoryOption) => {
    setCategoryToDelete(category)
    setShowDeleteModal(true)
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
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setCategoryToDelete(null)
  }

  const handleClearSelection = () => {
    onClearCategory()
  }

  // Render a category chip in the bottom sheet
  const renderCategoryChip = (category: CategoryOption) => {
    const isSelected = selectedCategory === category.id
    return (
      <View key={category.id} style={styles.chipWrapper}>
        <TouchableOpacity
          onPress={() => handleSelectCategory(category)}
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
            style={{
              color: isSelected ? purpleColor : isDark ? '#e2e8f0' : '#334155',
            }}
            numberOfLines={1}
          >
            {category.label}
          </Text>
          {isSelected && <Check size={14} color={purpleColor} style={{ marginLeft: 4 }} />}
        </TouchableOpacity>
        {/* Delete button for user-created categories */}
        {!category.isSystem && (
          <TouchableOpacity
            onPress={() => handleDeletePress(category)}
            disabled={disabled}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full items-center justify-center"
            style={{ backgroundColor: isDark ? '#ef4444' : '#dc2626' }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={11} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View className="mt-5">
      {/* Collapsed Row - Main UI */}
      <TouchableOpacity
        onPress={openSheet}
        disabled={disabled}
        className="flex-row items-center justify-between py-3 px-4 rounded-xl"
        style={{
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: selectedCategory ? 2 : 1,
          borderColor: selectedCategory ? purpleColor : isDark ? '#334155' : '#e2e8f0',
        }}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <Tag size={18} color={iconColor} />
          <Text
            className="font-sans-medium ml-2"
            style={{ color: isDark ? '#e2e8f0' : '#334155' }}
          >
            Category
          </Text>
        </View>

        {selectedCategoryLabel ? (
          <View className="flex-row items-center">
            <View
              className="flex-row items-center px-3 py-1.5 rounded-full mr-2"
              style={{ backgroundColor: purpleColor }}
            >
              {getCategoryIcon(selectedCategory ?? '', true, '#ffffff', '#ffffff', 14)}
              <Text className="font-sans-medium text-white text-xs ml-1.5">
                {selectedCategoryLabel}
              </Text>
              <Check size={12} color="#ffffff" style={{ marginLeft: 4 }} />
            </View>
            <TouchableOpacity
              onPress={handleClearSelection}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={iconColor} />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row items-center">
            <Text
              className="font-sans text-sm mr-1"
              style={{ color: isDark ? '#64748b' : '#94a3b8' }}
            >
              Tap to select
            </Text>
            <ChevronRight size={16} color={isDark ? '#64748b' : '#94a3b8'} />
          </View>
        )}
      </TouchableOpacity>

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
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closeSheet}
          />

          {/* Sheet Content */}
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
              <TouchableOpacity onPress={closeSheet} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View className="flex-row flex-wrap px-5" style={{ gap: 10 }}>
                {filteredCategories.map((category) => renderCategoryChip(category))}
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

            {/* Create Button - Fixed at Bottom */}
            <View
              className="px-5 pt-4 pb-8"
              style={{
                borderTopWidth: 1,
                borderTopColor: isDark ? '#1e293b' : '#f1f5f9',
              }}
            >
              <TouchableOpacity
                onPress={handleCreateCategory}
                disabled={disabled || createCategory.isPending || (hasSearchText && exactMatchExists) || !hasSearchText}
                className="flex-row items-center justify-center py-4 rounded-xl"
                style={{
                  backgroundColor:
                    hasSearchText && !exactMatchExists
                      ? purpleColor
                      : isDark
                        ? '#1e293b'
                        : '#f1f5f9',
                  opacity: hasSearchText && !exactMatchExists ? 1 : 0.6,
                }}
                activeOpacity={0.8}
              >
                <Plus
                  size={20}
                  color={hasSearchText && !exactMatchExists ? '#ffffff' : iconColor}
                />
                <Text
                  className="font-sans-semibold ml-2"
                  style={{
                    color: hasSearchText && !exactMatchExists ? '#ffffff' : iconColor,
                  }}
                >
                  {hasSearchText && !exactMatchExists
                    ? `Create "${categorySearch.trim()}"`
                    : 'Create New Category'}
                </Text>
              </TouchableOpacity>
            </View>
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
    </View>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContent: {
    maxHeight: '80%',
    minHeight: '50%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  chipWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
})
