import React, { useMemo, useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { X } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import {
  useSubscription,
  isLocked as computeIsLocked,
  needsToStartTrial,
} from '~/hooks/useSubscription'
import { LockedScreen } from '~/components/LockedScreen'
import { PreTrialScreen } from '~/components/PreTrialScreen'
import {
  TodayHeader,
  ProgressCard,
  FocusCard,
  CardCarousel,
  TaskList,
  CompletedSection,
  AddTaskButton,
  ProgressPlaceholderCard,
  EmptyState,
} from '~/components/today'
import { inferDayTypeWithTranslations } from '~/utils/dayTypeInference'
import { useTasks, useToggleTask, useDeleteTask } from '~/hooks/useTasks'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import { useCurrentDate } from '~/hooks/useCurrentDate'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { useTutorialTarget } from '~/components/tutorial'
import { useTranslation } from '~/hooks/useTranslation'
import type { TaskWithCategory } from '~/types'

const NAME_PROMPT_DISMISSED_KEY = 'domani_name_prompt_dismissed'

export default function TodayScreen() {
  useScreenTracking('today')
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { status: subscriptionStatus, isLoading: subscriptionLoading } = useSubscription()
  const brandColor = theme.colors.brand.primary
  const { today: todayDate } = useCurrentDate()
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks(todayDate)
  const { profile, isLoading: profileLoading } = useProfile()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()
  const updateProfile = useUpdateProfile()

  // Tutorial target for the card carousel (Focus Card + Progress Card)
  const { targetRef: carouselRef, measureTarget: measureCarousel } =
    useTutorialTarget('today_screen')

  // Name prompt modal state
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')

  // Check if we should show name prompt
  useEffect(() => {
    const checkNamePrompt = async () => {
      if (profileLoading || !profile) return

      // If user already has a name, don't show
      if (profile.full_name) return

      // Check if user has dismissed the prompt before
      const dismissed = await AsyncStorage.getItem(NAME_PROMPT_DISMISSED_KEY)
      if (dismissed === 'true') return

      // Show the prompt
      setShowNameModal(true)
    }

    checkNamePrompt()
  }, [profile, profileLoading])

  const [refreshing, setRefreshing] = React.useState(false)

  // Calculate progress
  const completedCount = useMemo(() => {
    return tasks.filter((task: TaskWithCategory) => task.completed_at).length
  }, [tasks])

  // Extract MIT task (top priority, not completed)
  const mitTask = useMemo(() => {
    return tasks.find((task) => task.priority === 'top' && !task.completed_at) ?? null
  }, [tasks])

  // Calculate day theme from tasks excluding MIT
  const dayTheme = useMemo(() => {
    const nonMitTasks = tasks.filter((task) => task.priority !== 'top')
    return inferDayTypeWithTranslations(nonMitTasks, {
      work: {
        title: t('today.dayThemes.work.title'),
        subtitle: t('today.dayThemes.work.subtitle'),
      },
      wellness: {
        title: t('today.dayThemes.wellness.title'),
        subtitle: t('today.dayThemes.wellness.subtitle'),
      },
      personal: {
        title: t('today.dayThemes.personal.title'),
        subtitle: t('today.dayThemes.personal.subtitle'),
      },
      learning: {
        title: t('today.dayThemes.learning.title'),
        subtitle: t('today.dayThemes.learning.subtitle'),
      },
      balanced: {
        title: t('today.dayThemes.balanced.title'),
        subtitle: t('today.dayThemes.balanced.subtitle'),
      },
    })
  }, [tasks, t])

  // Gate the Today screen for users who haven't started a trial or whose
  // trial has expired. Placed AFTER all hook declarations to satisfy the
  // Rules of Hooks — hook count must be stable across renders.
  if (!subscriptionLoading) {
    if (computeIsLocked(subscriptionStatus)) {
      return <LockedScreen />
    }
    if (needsToStartTrial(subscriptionStatus)) {
      return <PreTrialScreen />
    }
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) return

    try {
      await updateProfile.mutateAsync({ full_name: nameInput.trim() })
      setShowNameModal(false)
    } catch (error) {
      Alert.alert(t('today.namePrompt.saveFailedTitle'), t('today.namePrompt.saveFailedMessage'))
    }
  }

  const handleDismissNameModal = async () => {
    await AsyncStorage.setItem(NAME_PROMPT_DISMISSED_KEY, 'true')
    setShowNameModal(false)
  }

  const isLoading = tasksLoading || profileLoading
  const totalCount = tasks.length

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await toggleTask.mutateAsync({ taskId, completed })
    } catch (error) {
      Alert.alert(t('common.errors.title'), t('common.errors.tryAgain'))
    }
  }

  const handleTaskPress = (task: TaskWithCategory) => {
    // Navigate to planning page with task to edit
    router.push(`/planning?defaultPlanningFor=today&editTaskId=${task.id}`)
  }

  const handleDeleteTask = async (task: TaskWithCategory) => {
    try {
      await deleteTask.mutateAsync(task.id)
    } catch (error) {
      Alert.alert(t('common.errors.title'), t('common.errors.tryAgain'))
    }
  }

  const handleAddTask = () => {
    router.push('/planning?defaultPlanningFor=today&openForm=true')
  }

  const handleNotificationPress = () => {
    // TODO: Open notifications
    console.log('Notifications pressed')
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetchTasks()
    setRefreshing(false)
  }

  if (isLoading && !refreshing) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ paddingTop: insets.top, backgroundColor: theme.colors.background }}
      >
        <ActivityIndicator size="large" color={brandColor} />
      </View>
    )
  }

  return (
    <View
      className="flex-1"
      style={{ paddingTop: insets.top, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={brandColor}
            colors={[brandColor]}
          />
        }
      >
        <TodayHeader onNotificationPress={handleNotificationPress} />

        {/* Progress Section - Show placeholder when no tasks, carousel when tasks exist */}
        <View ref={carouselRef} onLayout={measureCarousel} className="mt-4">
          {tasks.length === 0 ? (
            <ProgressPlaceholderCard />
          ) : (
            <CardCarousel>
              <ProgressCard completed={completedCount} total={totalCount} />
              <FocusCard
                mitTask={mitTask}
                dayTheme={dayTheme}
                totalTasks={totalCount}
                completedTasks={completedCount}
              />
            </CardCarousel>
          )}
        </View>

        {/* Task List or Empty State */}
        <View className="mt-6">
          {tasks.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <TaskList
                tasks={tasks}
                onToggle={handleToggleTask}
                onTaskPress={handleTaskPress}
                onDeleteTask={handleDeleteTask}
              />
              <CompletedSection
                tasks={tasks}
                onToggle={handleToggleTask}
                onTaskPress={handleTaskPress}
                onDeleteTask={handleDeleteTask}
              />
            </>
          )}
        </View>

        {/* Bottom spacing for Add Task button (only when tasks exist) */}
        {tasks.length > 0 && <View className="h-20" />}
      </ScrollView>

      {/* Fixed Add Task Button - only show when user has tasks */}
      {tasks.length > 0 && (
        <View
          className="absolute bottom-0 left-0 right-0"
          style={{
            paddingBottom: insets.bottom > 0 ? 0 : 16,
            backgroundColor: theme.colors.background,
          }}
        >
          <AddTaskButton onPress={handleAddTask} label={t('common.actions.addMoreTasks')} />
        </View>
      )}

      {/* Name Prompt Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={handleDismissNameModal}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View
            className="rounded-2xl p-5 max-h-[75%]"
            style={{ backgroundColor: theme.colors.card }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold text-content-primary">
                {t('today.namePrompt.title')}
              </Text>
              <TouchableOpacity onPress={handleDismissNameModal} hitSlop={8}>
                <X size={24} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-content-secondary mb-4">
              {t('today.namePrompt.description')}
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={t('settings.nameModal.placeholder')}
              placeholderTextColor={theme.colors.text.tertiary}
              autoFocus
              className="rounded-xl px-4 text-base mb-4"
              style={{
                paddingTop: 14,
                paddingBottom: 14,
                lineHeight: undefined,
                backgroundColor: theme.colors.background,
                color: theme.colors.text.primary,
              }}
            />
            <TouchableOpacity
              onPress={handleSaveName}
              disabled={updateProfile.isPending || !nameInput.trim()}
              activeOpacity={0.8}
              className="py-3 rounded-xl items-center"
              style={{
                backgroundColor: nameInput.trim() ? brandColor : `${brandColor}80`,
              }}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">{t('common.actions.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
