import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native'

// =============================================================================
// DEBUG OVERLAY - On-screen debugging for production builds
// console.log doesn't work in iOS release builds, so we show events on screen
// =============================================================================
const DEBUG_CATEGORY_SELECTOR = true
const MAX_DEBUG_EVENTS = 15

interface DebugEvent {
  seq: number
  time: string
  event: string
  data?: string
}

let eventSequence = 0
let debugEventListeners: ((event: DebugEvent) => void)[] = []

const debugLog = (event: string, data?: Record<string, unknown>) => {
  if (!DEBUG_CATEGORY_SELECTOR) return
  const seq = ++eventSequence
  const now = new Date()
  const time = `${now.getMinutes()}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
  const debugEvent: DebugEvent = {
    seq,
    time,
    event,
    data: data ? JSON.stringify(data) : undefined,
  }
  // Still log to console (works in dev, stripped in prod)
  console.log(`[CAT-DEBUG #${seq}] ${time} | ${event}`, data ? JSON.stringify(data) : '')
  // Notify all listeners (for on-screen overlay)
  debugEventListeners.forEach((listener) => listener(debugEvent))
}

// Hook to subscribe to debug events
const useDebugEvents = () => {
  const [events, setEvents] = useState<DebugEvent[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const listener = (event: DebugEvent) => {
      setEvents((prev) => {
        const newEvents = [...prev, event]
        // Keep only last MAX_DEBUG_EVENTS
        return newEvents.slice(-MAX_DEBUG_EVENTS)
      })
    }
    debugEventListeners.push(listener)
    return () => {
      debugEventListeners = debugEventListeners.filter((l) => l !== listener)
    }
  }, [])

  const clearEvents = useCallback(() => setEvents([]), [])
  const toggleVisibility = useCallback(() => setIsVisible((v) => !v), [])

  return { events, isVisible, clearEvents, toggleVisibility }
}

// Text-based debug overlay for production visibility
function DebugOverlayWithText({
  events,
  isVisible,
  onClear,
  onToggle,
}: {
  events: DebugEvent[]
  isVisible: boolean
  onClear: () => void
  onToggle: () => void
}) {
  const scrollRef = useRef<ScrollView>(null)
  const { Text: RNText } = require('react-native')

  useEffect(() => {
    if (isVisible && scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true })
    }
  }, [events, isVisible])

  if (!DEBUG_CATEGORY_SELECTOR) return null

  const screenHeight = Dimensions.get('window').height

  return (
    <>
      {/* Toggle button - always visible */}
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.debugToggle,
          { backgroundColor: isVisible ? '#ef4444' : '#22c55e' },
        ]}
      >
        <RNText style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
          {isVisible ? 'X' : 'DBG'}
        </RNText>
      </TouchableOpacity>

      {/* Debug panel */}
      {isVisible && (
        <View style={[styles.debugPanel, { maxHeight: screenHeight * 0.35 }]}>
          <View style={styles.debugHeader}>
            <RNText style={{ color: '#22c55e', fontSize: 11, fontWeight: 'bold' }}>
              🔍 CAT-DEBUG ({events.length})
            </RNText>
            <TouchableOpacity onPress={onClear} style={styles.debugClearBtn}>
              <RNText style={{ color: '#fff', fontSize: 10 }}>CLEAR</RNText>
            </TouchableOpacity>
          </View>
          <ScrollView ref={scrollRef} style={styles.debugScroll}>
            {events.length === 0 ? (
              <RNText style={{ color: '#64748b', fontSize: 10, padding: 8 }}>
                Tap in the category search to start logging...
              </RNText>
            ) : (
              events.map((e) => (
                <View key={e.seq} style={styles.debugEvent}>
                  <RNText style={{ color: '#94a3b8', fontSize: 9 }}>
                    <RNText style={{ color: '#fbbf24' }}>#{e.seq}</RNText>
                    {' '}
                    <RNText style={{ color: '#64748b' }}>{e.time}</RNText>
                    {' '}
                    <RNText style={{ color: '#22d3ee', fontWeight: 'bold' }}>{e.event}</RNText>
                  </RNText>
                  {e.data && (
                    <RNText style={{ color: '#a78bfa', fontSize: 8, marginLeft: 8 }}>
                      {e.data}
                    </RNText>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </>
  )
}
// =============================================================================
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
  // Track pending selection to prevent blur race condition in production builds
  const pendingSelectionRef = useRef(false)

  // Delete confirmation state
  const [categoryToDelete, setCategoryToDelete] = React.useState<CategoryOption | null>(null)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)

  // Debug overlay state (for production debugging)
  const debugState = useDebugEvents()

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

  // All categories - favorites first (in user-set order), then remaining alphabetically
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

  // DEBUG: Log state changes
  useEffect(() => {
    debugLog('STATE_CHANGE', { isFocused, hasSearchText, showDropdown, showCategoryButtons })
  }, [isFocused, hasSearchText, showDropdown, showCategoryButtons])

  const handleSelectCategory = (category: CategoryOption) => {
    debugLog('HANDLE_SELECT_START', { categoryId: category.id, categoryLabel: category.label })
    // Mark selection as pending to prevent blur race condition
    pendingSelectionRef.current = true
    debugLog('PENDING_REF_SET', { value: true })
    onSelectCategory(category.id, category.label)
    debugLog('ON_SELECT_CALLBACK_DONE')
    setCategorySearch('')
    setIsFocused(false)
    debugLog('SET_IS_FOCUSED_CALLED', { value: false })
    categorySearchRef.current?.blur()
    debugLog('BLUR_CALLED')
  }

  const handleCreateCategory = async () => {
    const newCategoryName = categorySearch.trim()
    debugLog('HANDLE_CREATE_START', { newCategoryName })
    if (newCategoryName) {
      // Mark selection as pending to prevent blur race condition
      pendingSelectionRef.current = true
      debugLog('PENDING_REF_SET', { value: true })
      try {
        const newCategory = await createCategory.mutateAsync({ name: newCategoryName })
        debugLog('CREATE_MUTATION_SUCCESS', { newCategoryId: newCategory.id })
        onSelectCategory(newCategory.id, newCategory.name)
        setCategorySearch('')
        setIsFocused(false)
        categorySearchRef.current?.blur()
      } catch (error) {
        console.error('Failed to create category:', error)
        debugLog('CREATE_MUTATION_ERROR', { error: String(error) })
        // Reset pending flag on error so blur can work normally
        pendingSelectionRef.current = false
      }
    }
  }

  const handleDeletePress = (category: CategoryOption) => {
    debugLog('HANDLE_DELETE_START', { categoryId: category.id, categoryLabel: category.label })
    // Mark selection as pending to prevent blur race condition
    pendingSelectionRef.current = true
    debugLog('PENDING_REF_SET', { value: true })
    setCategoryToDelete(category)
    setShowDeleteModal(true)
    debugLog('DELETE_MODAL_SHOWN')
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
            onFocus={() => {
              debugLog('TEXT_INPUT_FOCUS')
              setIsFocused(true)
            }}
            onBlur={() => {
              debugLog('TEXT_INPUT_BLUR_START', { pendingRef: pendingSelectionRef.current })
              // Skip blur if a selection is pending (fixes blur/press race condition in production)
              if (pendingSelectionRef.current) {
                debugLog('BLUR_SKIPPED_DUE_TO_PENDING_REF')
                pendingSelectionRef.current = false
                return
              }
              // Fallback delay for other blur scenarios (e.g., tapping outside)
              debugLog('BLUR_STARTING_TIMEOUT', { delayMs: 150 })
              setTimeout(() => {
                debugLog('BLUR_TIMEOUT_FIRED')
                setIsFocused(false)
              }, 150)
            }}
            placeholder="Search All Categories"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            editable={!disabled}
            className="flex-1 font-sans px-3"
            style={{
              fontSize: 15,
              paddingVertical: 14,
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
                    {/* Wrapper View handles selection in onTouchStart - fires before blur */}
                    <View
                      onTouchStart={() => {
                        if (disabled) return
                        debugLog('DROPDOWN_ITEM_TOUCH_START', { categoryId: category.id, categoryLabel: category.label })
                        // Do selection IMMEDIATELY in onTouchStart - don't wait for onPressIn
                        handleSelectCategory(category)
                      }}
                    >
                      <TouchableOpacity
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
                    </View>
                    {/* Delete button for user categories */}
                    {!category.isSystem && (
                      <View
                        onTouchStart={() => {
                          if (disabled) return
                          debugLog('DELETE_BUTTON_TOUCH_START', { categoryId: category.id, categoryLabel: category.label })
                          handleDeletePress(category)
                        }}
                        className="absolute -top-1 -right-1"
                      >
                        <TouchableOpacity
                          disabled={disabled}
                          className="w-5 h-5 rounded-full items-center justify-center"
                          style={{ backgroundColor: isDark ? '#ef4444' : '#dc2626' }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )
              })}

              {/* Create New Category Option (if searching and no exact match) */}
              {hasSearchText && !exactMatchExists && (
                <View style={styles.categoryGridItem}>
                  <View
                    onTouchStart={() => {
                      if (disabled) return
                      debugLog('CREATE_BUTTON_TOUCH_START', { newCategoryName: categorySearch.trim() })
                      handleCreateCategory()
                    }}
                  >
                    <TouchableOpacity
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

      {/* Debug Overlay - Shows events on screen for production debugging */}
      {DEBUG_CATEGORY_SELECTOR && (
        <DebugOverlayWithText
          events={debugState.events}
          isVisible={debugState.isVisible}
          onClear={debugState.clearEvents}
          onToggle={debugState.toggleVisibility}
        />
      )}
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
  // Debug overlay styles
  debugToggle: {
    position: 'absolute',
    top: -40,
    right: 0,
    width: 36,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  debugToggleText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugPanel: {
    position: 'absolute',
    top: -200,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 12,
    padding: 8,
    zIndex: 999,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 6,
  },
  debugTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugClearBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  debugScroll: {
    maxHeight: 150,
  },
  debugEvent: {
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
  },
  debugEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugEventText: {
    fontSize: 9,
    color: '#94a3b8',
  },
  debugSeq: {
    fontSize: 9,
    color: '#fbbf24',
    marginRight: 4,
  },
  debugTime: {
    fontSize: 9,
    color: '#64748b',
    marginRight: 4,
  },
  debugEventName: {
    fontSize: 9,
    color: '#22d3ee',
    fontWeight: 'bold',
  },
  debugEventData: {
    fontSize: 8,
    color: '#a78bfa',
    marginLeft: 8,
  },
})
