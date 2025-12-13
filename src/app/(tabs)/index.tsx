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
import { useTheme } from '~/hooks/useTheme'
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
import type { TaskWithCategory } from '~/types'

const NAME_PROMPT_DISMISSED_KEY = 'domani_name_prompt_dismissed'

export default function TodayScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { activeTheme } = useTheme()
  const { data: plan, isLoading: planLoading, refetch: refetchPlan } = useTodayPlan()
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks(plan?.id)
  const { profile, isLoading: profileLoading } = useProfile()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()
  const updateProfile = useUpdateProfile()

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

  // Theme-aware colors for native components
  const accentColor = '#a855f7' // purple-500 - consistent across themes

  const isLoading = planLoading || tasksLoading || profileLoading
  const [refreshing, setRefreshing] = React.useState(false)

  // Calculate progress
  const completedCount = useMemo(() => {
    return tasks.filter((task: TaskWithCategory) => task.completed_at).length
  }, [tasks])

  const totalCount = tasks.length

  // Extract MIT task (high priority, not completed)
  const mitTask = useMemo(() => {
    return tasks.find((task) => task.priority === 'high' && !task.completed_at) ?? null
  }, [tasks])

  // Calculate day theme from tasks excluding MIT
  const dayTheme = useMemo(() => {
    const nonMitTasks = tasks.filter((task) => task.priority !== 'high')
    return inferDayType(nonMitTasks)
  }, [tasks])

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await toggleTask.mutateAsync({ taskId, completed })
    } catch (error) {
      Alert.alert('Failed to update task', 'Please try again.')
    }
  }

  const handleTaskPress = (task: TaskWithCategory) => {
    // TODO: Open task detail/edit modal
    console.log('Task pressed:', task.id)
  }

  const handleDeleteTask = async (task: TaskWithCategory) => {
    try {
      await deleteTask.mutateAsync(task.id)
    } catch (error) {
      Alert.alert('Failed to delete task', 'Please try again.')
    }
  }

  const handleAddTask = () => {
    router.push('/planning?defaultPlanningFor=today')
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
        className="flex-1 items-center justify-center bg-white dark:bg-slate-950"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-950" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
      >
        <TodayHeader onNotificationPress={handleNotificationPress} />

        {/* Progress Section - Show placeholder when no tasks, carousel when tasks exist */}
        <View className="mt-4">
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
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-950"
          style={{ paddingBottom: insets.bottom > 0 ? 0 : 16 }}
        >
          <AddTaskButton onPress={handleAddTask} label="Add More Tasks" />
        </View>
      )}

      {/* Name Prompt Modal */}
      <Modal visible={showNameModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                What should we call you?
              </Text>
              <TouchableOpacity onPress={handleDismissNameModal} hitSlop={8}>
                <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Add your name to personalize your experience
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your name"
              placeholderTextColor="#94a3b8"
              autoFocus
              className="bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-base mb-4"
            />
            <TouchableOpacity
              onPress={handleSaveName}
              disabled={updateProfile.isPending || !nameInput.trim()}
              activeOpacity={0.8}
              className={`py-3 rounded-xl items-center ${
                nameInput.trim() ? 'bg-purple-500' : 'bg-purple-500/50'
              }`}
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
