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
import { inferDayType } from '~/utils/dayTypeInference'
import { useTodayPlan } from '~/hooks/usePlans'
import { useTasks, useToggleTask, useDeleteTask } from '~/hooks/useTasks'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { useTutorialTarget } from '~/components/tutorial'
import type { TaskWithCategory } from '~/types'

const NAME_PROMPT_DISMISSED_KEY = 'domani_name_prompt_dismissed'

export default function TodayScreen() {
  useScreenTracking('today')
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const { data: plan, isLoading: planLoading, refetch: refetchPlan } = useTodayPlan()
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks(plan?.id)
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

  const handleSaveName = async () => {
    if (!nameInput.trim()) return

    try {
      await updateProfile.mutateAsync({ full_name: nameInput.trim() })
      setShowNameModal(false)
    } catch (error) {
      Alert.alert('Failed to save name', 'Please try again.')
    }
  }

  const handleDismissNameModal = async () => {
    await AsyncStorage.setItem(NAME_PROMPT_DISMISSED_KEY, 'true')
    setShowNameModal(false)
  }

  const isLoading = planLoading || tasksLoading || profileLoading
  const [refreshing, setRefreshing] = React.useState(false)

  // Calculate progress
  const completedCount = useMemo(() => {
    return tasks.filter((task: TaskWithCategory) => task.completed_at).length
  }, [tasks])

  const totalCount = tasks.length

  // Extract MIT task (top priority, not completed)
  const mitTask = useMemo(() => {
    return tasks.find((task) => task.priority === 'top' && !task.completed_at) ?? null
  }, [tasks])

  // Calculate day theme from tasks excluding MIT
  const dayTheme = useMemo(() => {
    const nonMitTasks = tasks.filter((task) => task.priority !== 'top')
    return inferDayType(nonMitTasks)
  }, [tasks])

  // Memoize TextInput style for name prompt modal
  const textInputStyle = useMemo(() => ({
    paddingTop: 14,
    paddingBottom: 14,
    lineHeight: undefined,
    backgroundColor: theme.colors.background,
    color: theme.colors.text.primary,
  }), [theme])

  // Memoize submit button style for name prompt modal
  const submitButtonStyle = useMemo(() => ({
    backgroundColor: nameInput.trim() ? brandColor : `${brandColor}80`,
  }), [nameInput, brandColor])

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await toggleTask.mutateAsync({ taskId, completed })
    } catch (error) {
      Alert.alert('Failed to update task', 'Please try again.')
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
      Alert.alert('Failed to delete task', 'Please try again.')
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
    await Promise.all([refetchPlan(), refetchTasks()])
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
    <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: theme.colors.background }}>
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
          style={{ paddingBottom: insets.bottom > 0 ? 0 : 16, backgroundColor: theme.colors.background }}
        >
          <AddTaskButton onPress={handleAddTask} label="Add More Tasks" />
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
          <View className="rounded-2xl p-5 max-h-[75%]" style={{ backgroundColor: theme.colors.card }}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold text-content-primary">
                What should we call you?
              </Text>
              <TouchableOpacity onPress={handleDismissNameModal} hitSlop={8}>
                <X size={24} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-content-secondary mb-4">
              Add your name to personalize your experience
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.text.tertiary}
              autoFocus
              className="rounded-xl px-4 text-base mb-4"
              style={textInputStyle}
            />
            <TouchableOpacity
              onPress={handleSaveName}
              disabled={updateProfile.isPending || !nameInput.trim()}
              activeOpacity={0.8}
              className="py-3 rounded-xl items-center"
              style={submitButtonStyle}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
