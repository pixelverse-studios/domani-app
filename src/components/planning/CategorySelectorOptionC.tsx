import React, { useMemo, useRef, useState } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
  TextInput,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
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
  ChevronLeft,
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
  size: number = 20,
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

interface CategorySelectorOptionCProps {
  selectedCategory: string | null
  selectedCategoryLabel: string | null
  onSelectCategory: (categoryId: string, categoryLabel: string) => void
  onClearCategory: () => void
  disabled?: boolean
}

const SCREEN_WIDTH = Dimensions.get('window').width
const HORIZONTAL_PADDING = 20 // mx-5 = 20px each side
const AVAILABLE_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2
const CARD_GAP = 10
const VISIBLE_CARDS = 3
const CARD_WIDTH = (AVAILABLE_WIDTH - CARD_GAP * (VISIBLE_CARDS - 1)) / VISIBLE_CARDS

export function CategorySelectorOptionC({
  selectedCategory,
  selectedCategoryLabel,
  onSelectCategory,
  onClearCategory,
  disabled = false,
}: CategorySelectorOptionCProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { profile } = useProfile()
  const sortedCategories = useSortedCategories(profile?.auto_sort_categories ?? false)
  const favoriteCategories = useFavoriteCategories(profile?.auto_sort_categories ?? false)
  const createCategory = useCreateUserCategory()
  const deleteCategory = useDeleteUserCategory()

  const scrollViewRef = useRef<ScrollView>(null)
  const [scrollPosition, setScrollPosition] = useState(0)

  // Delete confirmation state
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryOption | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Create category modal state (Android)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const iconColor = isDark ? '#94a3b8' : '#64748b'

  // Get ALL categories in user's preferred order (favorites first, then rest alphabetically)
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
          icon: <Tag size={20} color={iconColor} />,
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

  // Calculate scroll metrics
  const totalWidth = allCategories.length * (CARD_WIDTH + CARD_GAP) + (CARD_WIDTH + CARD_GAP) // +1 for add button
  const maxScroll = Math.max(0, totalWidth - AVAILABLE_WIDTH)
  const canScrollLeft = scrollPosition > 10
  const canScrollRight = scrollPosition < maxScroll - 10

  const handleSelectCategory = (category: CategoryOption) => {
    onSelectCategory(category.id, category.label)
  }

  const handleCreateCategory = async (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    try {
      const newCategory = await createCategory.mutateAsync({ name: trimmedName })
      onSelectCategory(newCategory.id, newCategory.name)
      // Scroll to end to show new category
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (_error) {
      // Silently fail
    }
  }

  const handleNewPress = () => {
    if (Platform.OS === 'ios') {
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
      // Silently fail
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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollPosition(event.nativeEvent.contentOffset.x)
  }

  const scrollBy = (direction: 'left' | 'right') => {
    const scrollAmount = CARD_WIDTH + CARD_GAP
    const newPosition =
      direction === 'left'
        ? Math.max(0, scrollPosition - scrollAmount * 2)
        : Math.min(maxScroll, scrollPosition + scrollAmount * 2)

    scrollViewRef.current?.scrollTo({ x: newPosition, animated: true })
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

      {/* Carousel Container */}
      <View style={styles.carouselContainer}>
        {/* Left Arrow Indicator */}
        {canScrollLeft && (
          <TouchableOpacity
            onPress={() => scrollBy('left')}
            style={[
              styles.arrowButton,
              styles.arrowLeft,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              },
            ]}
          >
            <ChevronLeft size={20} color={purpleColor} />
          </TouchableOpacity>
        )}

        {/* Horizontal ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + CARD_GAP}
          snapToAlignment="start"
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {allCategories.map((category) => {
            const isSelected = selectedCategory === category.id
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => handleSelectCategory(category)}
                onLongPress={() => {
                  if (!category.isSystem) {
                    handleDeletePress(category)
                  }
                }}
                disabled={disabled}
                style={[
                  styles.card,
                  {
                    width: CARD_WIDTH,
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(139, 92, 246, 0.2)'
                        : 'rgba(139, 92, 246, 0.1)'
                      : isDark
                        ? '#0f172a'
                        : '#ffffff',
                    borderColor: isSelected ? purpleColor : isDark ? '#334155' : '#e2e8f0',
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                {getCategoryIcon(category.id, isSelected, purpleColor, iconColor)}
                <Text
                  className="font-sans-medium mt-2 text-center"
                  style={{
                    color: isSelected ? purpleColor : isDark ? '#e2e8f0' : '#334155',
                    fontSize: 12,
                  }}
                  numberOfLines={1}
                >
                  {category.label}
                </Text>
                {isSelected && (
                  <View
                    style={[styles.checkBadge, { backgroundColor: purpleColor }]}
                  >
                    <Check size={10} color="#ffffff" />
                  </View>
                )}
                {/* Delete indicator for custom categories (shown subtly) */}
                {!category.isSystem && (
                  <View style={styles.customIndicator}>
                    <View
                      style={[
                        styles.customDot,
                        { backgroundColor: isDark ? '#475569' : '#cbd5e1' },
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            )
          })}

          {/* Add New Category Card */}
          <TouchableOpacity
            onPress={handleNewPress}
            disabled={disabled || createCategory.isPending}
            style={[
              styles.card,
              styles.addCard,
              {
                width: CARD_WIDTH,
                backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',
                borderColor: purpleColor,
              },
            ]}
            activeOpacity={0.7}
          >
            <View
              style={[styles.addIconCircle, { backgroundColor: purpleColor }]}
            >
              <Plus size={18} color="#ffffff" />
            </View>
            <Text
              className="font-sans-medium mt-2 text-center"
              style={{ color: purpleColor, fontSize: 12 }}
            >
              Add New
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Right Arrow Indicator */}
        {canScrollRight && (
          <TouchableOpacity
            onPress={() => scrollBy('right')}
            style={[
              styles.arrowButton,
              styles.arrowRight,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              },
            ]}
          >
            <ChevronRight size={20} color={purpleColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Scroll Progress Indicator */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' },
          ]}
        >
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: purpleColor,
                width: `${Math.min(100, ((scrollPosition + AVAILABLE_WIDTH) / totalWidth) * 100)}%`,
              },
            ]}
          />
        </View>
        <Text
          className="font-sans text-xs ml-2"
          style={{ color: isDark ? '#64748b' : '#94a3b8' }}
        >
          {allCategories.length + 1} items
        </Text>
      </View>

      {/* Long-press hint */}
      <Text
        className="font-sans text-xs text-center mt-2"
        style={{ color: isDark ? '#475569' : '#cbd5e1' }}
      >
        Long-press custom categories to delete
      </Text>

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
  carouselContainer: {
    position: 'relative',
  },
  scrollContent: {
    paddingRight: 4,
    gap: CARD_GAP,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    minHeight: 80,
    position: 'relative',
  },
  addCard: {
    borderStyle: 'dashed',
  },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  customDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  arrowLeft: {
    left: -8,
  },
  arrowRight: {
    right: -8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
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
