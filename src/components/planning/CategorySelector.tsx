import React, { useMemo, useRef } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import {
  Tag,
  Briefcase,
  Heart,
  User,
  BookOpen,
  Search,
  Plus,
  ChevronUp,
  Star,
  Check,
  X,
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

export function CategorySelector({
  selectedCategory,
  selectedCategoryLabel,
  onSelectCategory,
  onClearCategory,
  disabled = false,
}: CategorySelectorProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { profile } = useProfile()
  const sortedCategories = useSortedCategories(profile?.auto_sort_categories ?? false)
  const favoriteCategories = useFavoriteCategories(profile?.auto_sort_categories ?? false)
  const createCategory = useCreateUserCategory()
  const deleteCategory = useDeleteUserCategory()

  const [categorySearch, setCategorySearch] = React.useState('')
  const [isFocused, setIsFocused] = React.useState(false)
  const categorySearchRef = useRef<TextInput>(null)

  // Delete confirmation state
  const [categoryToDelete, setCategoryToDelete] = React.useState<CategoryOption | null>(null)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const iconColor = isDark ? '#94a3b8' : '#64748b'

  // Get the user's favorite categories for quick-select buttons (max 4)
  const quickSelectCategories: CategoryOption[] = useMemo(() => {
    return favoriteCategories.slice(0, 4).map((cat) => {
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

  // Filter categories based on search (show all when focused but empty)
  const filteredCategories = useMemo(() => {
    // When focused but no search text, show all categories
    if (isFocused && !categorySearch.trim()) return allCategories
    // When not focused and no search text, return empty (show quick select instead)
    if (!categorySearch.trim()) return []
    // Filter based on search text
    const search = categorySearch.toLowerCase()
    return allCategories.filter((cat) => cat.label.toLowerCase().includes(search))
  }, [categorySearch, allCategories, isFocused])

  // Check if exact match exists
  const exactMatchExists = useMemo(() => {
    if (!categorySearch.trim()) return false
    const search = categorySearch.toLowerCase().trim()
    return allCategories.some((cat) => cat.label.toLowerCase() === search)
  }, [categorySearch, allCategories])

  const hasSearchText = categorySearch.trim().length > 0
  // Show dropdown when focused (all categories) or when searching
  const showDropdown = isFocused || hasSearchText
  const showCategoryButtons = !isFocused && !hasSearchText

  const handleSelectCategory = (category: CategoryOption) => {
    onSelectCategory(category.id, category.label)
    setCategorySearch('')
    setIsFocused(false)
    categorySearchRef.current?.blur()
  }

  const handleCreateCategory = async () => {
    const newCategoryName = categorySearch.trim()
    if (newCategoryName) {
      try {
        const newCategory = await createCategory.mutateAsync({ name: newCategoryName })
        onSelectCategory(newCategory.id, newCategory.name)
        setCategorySearch('')
        setIsFocused(false)
        categorySearchRef.current?.blur()
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

  return (
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
            onPress={onClearCategory}
            disabled={disabled}
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
            borderWidth: isFocused || hasSearchText ? 2 : 1,
            borderColor: isFocused || hasSearchText ? purpleColor : isDark ? '#334155' : '#e2e8f0',
          }}
        >
          <View className="pl-4">
            <Search size={18} color={iconColor} />
          </View>
          <TextInput
            ref={categorySearchRef}
            value={categorySearch}
            onChangeText={setCategorySearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search All Categories"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            editable={!disabled}
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
                      disabled={disabled}
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
                        disabled={disabled}
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

              {/* Create New Category Option (if searching and no exact match) */}
              {hasSearchText && !exactMatchExists && (
                <View style={styles.categoryGridItem}>
                  <TouchableOpacity
                    onPress={handleCreateCategory}
                    disabled={disabled}
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
              onPress={() => {
                setCategorySearch('')
                setIsFocused(false)
                categorySearchRef.current?.blur()
              }}
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
              disabled={disabled}
              style={[
                styles.categoryButton,
                {
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor:
                    selectedCategory === category.id ? purpleColor : isDark ? '#334155' : '#e2e8f0',
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
})
