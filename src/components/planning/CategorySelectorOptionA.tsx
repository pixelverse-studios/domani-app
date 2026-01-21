import React, { useState, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  Modal,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import {
  Tag,
  Briefcase,
  Heart,
  User,
  BookOpen,
  Plus,
  Star,
  Check,
  X,
  ChevronDown,
  ChevronUp,
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
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

interface CategorySelectorOptionAProps {
  selectedCategory: string | null
  selectedCategoryLabel: string | null
  onSelectCategory: (categoryId: string, categoryLabel: string) => void
  onClearCategory: () => void
  disabled?: boolean
}

// Number of categories to show in collapsed state
const COLLAPSED_COUNT = 4

export function CategorySelectorOptionA({
  selectedCategory,
  selectedCategoryLabel,
  onSelectCategory,
  onClearCategory,
  disabled = false,
}: CategorySelectorOptionAProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { profile } = useProfile()
  const sortedCategories = useSortedCategories(profile?.auto_sort_categories ?? false)
  const favoriteCategories = useFavoriteCategories(profile?.auto_sort_categories ?? false)
  const createCategory = useCreateUserCategory()
  const deleteCategory = useDeleteUserCategory()

  // Expansion state
  const [isExpanded, setIsExpanded] = useState(false)

  // Delete confirmation state
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryOption | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Create category modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const iconColor = isDark ? '#94a3b8' : '#64748b'

  // Get ALL categories in user's preferred order (favorites first, then rest alphabetically)
  const allCategories: CategoryOption[] = useMemo(() => {
    // Get favorite IDs for filtering
    const favoriteIds = new Set(favoriteCategories.map((c) => c.id))

    // Helper to convert a category to CategoryOption
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

  const handleSelectCategory = (category: CategoryOption) => {
    onSelectCategory(category.id, category.label)
  }

  const handleCreateCategory = async (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    try {
      const newCategory = await createCategory.mutateAsync({ name: trimmedName })
      onSelectCategory(newCategory.id, newCategory.name)
    } catch (_error) {
      // Silently fail - user can retry
    }
  }

  const handleNewPress = () => {
    if (Platform.OS === 'ios') {
      // Use Alert.prompt on iOS
      Alert.prompt(
        'New Category',
        'Enter a name for your category',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create',
            onPress: (value: string | undefined) => {
              if (value) {
                handleCreateCategory(value)
              }
            },
          },
        ],
        'plain-text',
        '',
        'default',
      )
    } else {
      // Show modal on Android
      setNewCategoryName('')
      setShowCreateModal(true)
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
    } catch (_error) {
      // Silently fail - user can retry
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setCategoryToDelete(null)
  }

  const handleCreateModalSubmit = () => {
    if (newCategoryName.trim()) {
      handleCreateCategory(newCategoryName)
    }
    setShowCreateModal(false)
    setNewCategoryName('')
  }

  const handleCreateModalCancel = () => {
    setShowCreateModal(false)
    setNewCategoryName('')
  }

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded(!isExpanded)
  }

  // Render a single category chip
  const renderChip = (category: CategoryOption, showDeleteButton: boolean = false) => {
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
        {/* Delete button for user categories (only in expanded view) */}
        {showDeleteButton && !category.isSystem && (
          <TouchableOpacity
            onPress={() => handleDeletePress(category)}
            disabled={disabled}
            style={[
              styles.deleteButton,
              { backgroundColor: isDark ? '#ef4444' : '#dc2626' },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={10} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    )
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

      {/* Collapsed View: Horizontal chips with "+N more" and "+ New" */}
      {!isExpanded && (
        <View style={styles.collapsedContainer}>
          {/* Category chips */}
          {collapsedCategories.map((category) => renderChip(category, false))}

          {/* "+N more" button */}
          {additionalCount > 0 && (
            <TouchableOpacity
              onPress={toggleExpanded}
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
              <ChevronDown size={14} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          )}

          {/* "+ New" button */}
          <TouchableOpacity
            onPress={handleNewPress}
            disabled={disabled || createCategory.isPending}
            style={[
              styles.newButton,
              {
                backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
                borderColor: purpleColor,
              },
            ]}
          >
            <Plus size={14} color={purpleColor} />
            <Text
              className="font-sans-medium ml-1"
              style={{ color: purpleColor, fontSize: 13 }}
            >
              New
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expanded View: Full grid of all categories */}
      {isExpanded && (
        <View>
          {/* All categories in a wrapping grid */}
          <View style={styles.expandedGrid}>
            {allCategories.map((category) => renderChip(category, true))}
          </View>

          {/* Create New Category Button (full width) */}
          <TouchableOpacity
            onPress={handleNewPress}
            disabled={disabled || createCategory.isPending}
            style={[
              styles.createFullButton,
              {
                backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',
                borderColor: purpleColor,
              },
            ]}
          >
            <Plus size={16} color={purpleColor} />
            <Text
              className="font-sans-medium ml-2"
              style={{ color: purpleColor, fontSize: 14 }}
            >
              Create New Category
            </Text>
          </TouchableOpacity>

          {/* Show Less Button */}
          <TouchableOpacity
            onPress={toggleExpanded}
            style={styles.showLessButton}
          >
            <ChevronUp size={16} color={iconColor} />
            <Text
              className="font-sans-medium ml-1"
              style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 14 }}
            >
              Show Less
            </Text>
          </TouchableOpacity>
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

      {/* Create Category Modal (Android only) */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={handleCreateModalCancel}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
            ]}
          >
            <Text
              className="text-lg font-sans-semibold text-slate-900 dark:text-white mb-4"
              style={{ textAlign: 'center' }}
            >
              New Category
            </Text>

            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Enter category name"
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              autoFocus
              className="font-sans"
              style={[
                styles.modalInput,
                {
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? '#f8fafc' : '#0f172a',
                },
              ]}
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                onPress={handleCreateModalSubmit}
                disabled={!newCategoryName.trim() || createCategory.isPending}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: purpleColor,
                    opacity: !newCategoryName.trim() || createCategory.isPending ? 0.6 : 1,
                  },
                ]}
              >
                <Text className="font-sans-semibold text-white" style={{ fontSize: 16 }}>
                  {createCategory.isPending ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateModalCancel}
                disabled={createCategory.isPending}
                style={[
                  styles.modalButton,
                  { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
                ]}
              >
                <Text
                  className="font-sans-semibold text-slate-900 dark:text-white"
                  style={{ fontSize: 16 }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  chipWrapper: {
    position: 'relative',
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
    gap: 4,
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
  // Expanded view styles
  expandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  deleteButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  showLessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
  },
  modalInput: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalButtonContainer: {
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
