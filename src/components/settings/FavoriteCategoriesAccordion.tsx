import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated'
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import { Heart, ChevronDown, Briefcase, User, BookOpen, Star, Tag, GripVertical } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useProfile } from '~/hooks/useProfile'
import {
  useSortedCategories,
  useUpdateFavoriteCategories,
  useUpdateCategoryPositions,
  type UnifiedCategory,
} from '~/hooks/useCategories'
import { colors } from '~/theme'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const MAX_FAVORITES = 4

function getCategoryIcon(category: UnifiedCategory, color: string, size: number = 18) {
  const iconName = category.icon?.toLowerCase() || category.name.toLowerCase()

  switch (iconName) {
    case 'briefcase':
    case 'work':
      return <Briefcase size={size} color={color} />
    case 'heart':
    case 'health':
    case 'wellness':
      return <Heart size={size} color={color} />
    case 'user':
    case 'personal':
      return <User size={size} color={color} />
    case 'book-open':
    case 'education':
      return <BookOpen size={size} color={color} />
    case 'tag':
      return <Tag size={size} color={color} />
    default:
      return <Star size={size} color={color} />
  }
}

export function FavoriteCategoriesAccordion() {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { profile } = useProfile()
  const autoSort = profile?.auto_sort_categories ?? false
  const allCategories = useSortedCategories(false) // Always get manual sort for selection UI
  const updateFavorites = useUpdateFavoriteCategories()
  const updatePositions = useUpdateCategoryPositions()

  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Track the ordered list of favorite categories (for drag-to-reorder)
  const [orderedFavorites, setOrderedFavorites] = useState<UnifiedCategory[]>([])

  // Animation values
  const rotation = useSharedValue(0)

  // Create a stable key for favorite IDs to prevent infinite loops
  const favoriteIdsKey = allCategories
    .filter((cat) => cat.isFavorite)
    .map((cat) => cat.id)
    .sort()
    .join(',')

  // Initialize selected IDs and ordered favorites from categories
  useEffect(() => {
    const favorites = allCategories.filter((cat) => cat.isFavorite)
    const favoriteIds = new Set(favorites.map((cat) => cat.id))
    setSelectedIds(favoriteIds)
    // Sort by position for initial order
    setOrderedFavorites([...favorites].sort((a, b) => a.position - b.position))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteIdsKey])

  // Separate favorites from non-favorites based on current selection
  // Use orderedFavorites for favorites (maintains drag order)
  const favoriteCategories = useMemo(() => {
    // Filter orderedFavorites to only include currently selected items
    const ordered = orderedFavorites.filter((cat) => selectedIds.has(cat.id))
    // Add any newly selected categories that aren't in orderedFavorites yet (at the end)
    const newlySelected = allCategories.filter(
      (cat) => selectedIds.has(cat.id) && !orderedFavorites.some((f) => f.id === cat.id)
    )
    return [...ordered, ...newlySelected]
  }, [orderedFavorites, selectedIds, allCategories])

  // Sort other categories alphabetically by name
  const otherCategories = useMemo(() => {
    return allCategories
      .filter((cat) => !selectedIds.has(cat.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allCategories, selectedIds])

  const selectedCount = selectedIds.size
  const canSelectMore = selectedCount < MAX_FAVORITES

  const handleToggleExpand = useCallback(() => {
    if (autoSort) return // Don't expand if managed by smart

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded((prev) => !prev)
    rotation.value = withTiming(isExpanded ? 0 : 1, {
      duration: 200,
      easing: Easing.ease,
    })
  }, [autoSort, isExpanded, rotation])

  const handleToggleCategory = useCallback((categoryId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
        // Also remove from orderedFavorites
        setOrderedFavorites((prevOrder) => prevOrder.filter((cat) => cat.id !== categoryId))
      } else if (newSet.size < MAX_FAVORITES) {
        newSet.add(categoryId)
        // Add to orderedFavorites at the end
        const category = allCategories.find((cat) => cat.id === categoryId)
        if (category) {
          setOrderedFavorites((prevOrder) => [...prevOrder, category])
        }
      }
      return newSet
    })
  }, [allCategories])

  const handleSave = useCallback(async () => {
    // Save favorite selections
    await updateFavorites.mutateAsync(Array.from(selectedIds))

    // Save new positions for favorites based on their order
    if (favoriteCategories.length > 0) {
      const positionUpdates = favoriteCategories.map((cat, index) => ({
        id: cat.id,
        position: index, // Position 0, 1, 2, 3 for favorites
        isSystem: cat.isSystem,
      }))
      await updatePositions.mutateAsync(positionUpdates)
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded(false)
    rotation.value = withTiming(0, { duration: 200, easing: Easing.ease })
  }, [selectedIds, favoriteCategories, updateFavorites, updatePositions, rotation])

  // Handle drag end - update local order
  const handleDragEnd = useCallback(({ data }: { data: UnifiedCategory[] }) => {
    setOrderedFavorites(data)
  }, [])

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` }],
  }))

  // Colors
  const iconColor = isDark ? '#64748b' : '#94a3b8'
  const selectedHeartColor = isDark ? '#a78bfa' : '#8b5cf6'
  const textMuted = isDark ? '#64748b' : '#94a3b8'
  const dividerColor = isDark ? '#334155' : '#e2e8f0'

  // Render a non-draggable category row (for "other" categories)
  const renderCategoryRow = (category: UnifiedCategory, isLast: boolean = false) => {
    const isSelected = selectedIds.has(category.id)
    const canSelect = isSelected || canSelectMore

    return (
      <TouchableOpacity
        key={category.id}
        onPress={() => canSelect && handleToggleCategory(category.id)}
        disabled={!canSelect && !isSelected}
        activeOpacity={0.7}
        style={[
          styles.categoryRow,
          !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
          !canSelect && !isSelected && { opacity: 0.4 },
        ]}
      >
        {/* Category Icon & Name */}
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryIconBg, { backgroundColor: `${category.color}15` }]}>
            {getCategoryIcon(category, category.color, 16)}
          </View>
          <Text
            className={`text-base ${isDark ? 'text-white' : 'text-slate-900'}`}
            style={{ marginLeft: 12 }}
          >
            {category.name}
          </Text>
          {!category.isSystem && (
            <View
              style={[styles.customBadge, { backgroundColor: isDark ? '#7c3aed20' : '#8b5cf620' }]}
            >
              <Text style={{ color: selectedHeartColor, fontSize: 10, fontWeight: '500' }}>
                Custom
              </Text>
            </View>
          )}
        </View>

        {/* Heart Selection Icon */}
        <Heart
          size={20}
          color={isSelected ? selectedHeartColor : iconColor}
          fill={isSelected ? selectedHeartColor : 'transparent'}
        />
      </TouchableOpacity>
    )
  }

  // Render a draggable favorite category row
  const renderDraggableFavorite = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<UnifiedCategory>) => {
      const index = getIndex()
      const isLast = index === favoriteCategories.length - 1

      return (
        <ScaleDecorator activeScale={1.02}>
          <TouchableOpacity
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
                // Haptics not available (e.g., in Expo Go)
              })
              drag()
            }}
            onPress={() => handleToggleCategory(item.id)}
            delayLongPress={150}
            activeOpacity={0.7}
            style={[
              styles.categoryRow,
              !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
              isActive && {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
              },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle}>
              <GripVertical size={18} color={iconColor} />
            </View>

            {/* Category Icon & Name */}
            <View style={styles.categoryInfo}>
              <View style={[styles.categoryIconBg, { backgroundColor: `${item.color}15` }]}>
                {getCategoryIcon(item, item.color, 16)}
              </View>
              <Text
                className={`text-base ${isDark ? 'text-white' : 'text-slate-900'}`}
                style={{ marginLeft: 12 }}
              >
                {item.name}
              </Text>
              {!item.isSystem && (
                <View
                  style={[styles.customBadge, { backgroundColor: isDark ? '#7c3aed20' : '#8b5cf620' }]}
                >
                  <Text style={{ color: selectedHeartColor, fontSize: 10, fontWeight: '500' }}>
                    Custom
                  </Text>
                </View>
              )}
            </View>

            {/* Heart Selection Icon */}
            <Heart
              size={20}
              color={selectedHeartColor}
              fill={selectedHeartColor}
            />
          </TouchableOpacity>
        </ScaleDecorator>
      )
    },
    [favoriteCategories.length, handleToggleCategory, dividerColor, isDark, iconColor, selectedHeartColor]
  )

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc' }]}
    >
      {/* Header Row - Always Visible */}
      <TouchableOpacity
        onPress={handleToggleExpand}
        disabled={autoSort}
        activeOpacity={autoSort ? 1 : 0.7}
        style={styles.headerRow}
      >
        <View style={styles.headerLeft}>
          <Heart
            size={18}
            color={selectedHeartColor}
            fill={autoSort || selectedCount > 0 ? selectedHeartColor : 'transparent'}
          />
          <Text
            className={`text-base font-sans-medium ${isDark ? 'text-white' : 'text-slate-900'}`}
            style={{ marginLeft: 12 }}
          >
            Favorite Categories
          </Text>
        </View>

        <View style={styles.headerRight}>
          {autoSort ? (
            <Text style={{ color: textMuted, fontSize: 14 }}>Managed by Smart</Text>
          ) : (
            <>
              <Text style={{ color: textMuted, fontSize: 14, marginRight: 4 }}>
                {selectedCount} selected
              </Text>
              <Animated.View style={chevronStyle}>
                <ChevronDown size={18} color={iconColor} />
              </Animated.View>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && !autoSort && (
        <View style={styles.expandedContent}>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text
              className={`text-sm font-sans-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              Quick Access Categories
            </Text>
            <Text style={{ color: textMuted, fontSize: 13, marginTop: 4 }}>
              Select up to {MAX_FAVORITES} categories to display by default when adding tasks
            </Text>
          </View>

          {/* Favorite Categories (above the line) - Draggable */}
          {favoriteCategories.length > 0 && (
            <View style={styles.categoryList}>
              <DraggableFlatList
                data={favoriteCategories}
                keyExtractor={(item) => item.id}
                renderItem={renderDraggableFavorite}
                onDragEnd={handleDragEnd}
                scrollEnabled={false}
              />
              <Text style={{ color: textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                Hold and drag to reorder
              </Text>
            </View>
          )}

          {/* Divider between favorites and others */}
          {otherCategories.length > 0 && favoriteCategories.length > 0 && (
            <View style={[styles.sectionDivider, { backgroundColor: dividerColor }]} />
          )}

          {/* Other Categories (below the line) */}
          {otherCategories.length > 0 && (
            <View style={styles.categoryList}>
              {otherCategories.map((cat, index) =>
                renderCategoryRow(cat, index === otherCategories.length - 1),
              )}
            </View>
          )}

          {/* Done Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={updateFavorites.isPending || updatePositions.isPending}
              activeOpacity={0.8}
              style={styles.doneButtonWrapper}
            >
              <LinearGradient
                colors={[colors.brand.pink, colors.brand.pink, colors.brand.purple] as const}
                locations={[0, 0.6, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneButton}
              >
                <Text className="text-white font-sans-semibold text-base">
                  {updateFavorites.isPending || updatePositions.isPending ? 'Saving...' : 'Done'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  categoryList: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  dragHandle: {
    paddingRight: 8,
    paddingLeft: 4,
    paddingVertical: 4,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionDivider: {
    height: 1,
    marginVertical: 12,
  },
  buttonContainer: {
    marginTop: 20,
  },
  doneButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  doneButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
