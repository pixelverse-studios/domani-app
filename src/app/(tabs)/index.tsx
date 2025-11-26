import React, { useMemo } from 'react'
import { View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '~/components/ui'
import {
  TodayHeader,
  FocusCard,
  ProgressCard,
  CardCarousel,
  TaskList,
  CompletedSection,
  AddTaskButton,
  NewUserProgressCard,
  NewUserEmptyState,
} from '~/components/today'
import { useTodayPlan } from '~/hooks/usePlans'
import { useTasks, useToggleTask } from '~/hooks/useTasks'
import { useProfile } from '~/hooks/useProfile'
import type { TaskWithCategory } from '~/types'

export default function TodayScreen() {
  const insets = useSafeAreaInsets()
  const { data: plan, isLoading: planLoading, refetch: refetchPlan } = useTodayPlan()
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks(plan?.id)
  const { isNewUser, isLoading: profileLoading } = useProfile()
  const toggleTask = useToggleTask()

  const isLoading = planLoading || tasksLoading || profileLoading
  const [refreshing, setRefreshing] = React.useState(false)

  // Derive MIT (Most Important Task)
  const mitTask = useMemo(() => {
    return tasks.find((task: TaskWithCategory) => task.is_mit && !task.completed_at) || null
  }, [tasks])

  // Calculate progress
  const completedCount = useMemo(() => {
    return tasks.filter((task: TaskWithCategory) => task.completed_at).length
  }, [tasks])

  const totalCount = tasks.length

  const handleToggleTask = (taskId: string, completed: boolean) => {
    toggleTask.mutate({ taskId, completed })
  }

  const handleTaskPress = (task: TaskWithCategory) => {
    // TODO: Open task detail/edit modal
    console.log('Task pressed:', task.id)
  }

  const handleAddTask = () => {
    // TODO: Open add task modal
    console.log('Add task pressed')
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
        className="flex-1 items-center justify-center bg-slate-950"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-slate-950" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#a855f7"
            colors={['#a855f7']}
          />
        }
      >
        <TodayHeader onNotificationPress={handleNotificationPress} />

        {/* Progress Card - Different for new users */}
        <View className="mt-4">
          {isNewUser && tasks.length === 0 ? (
            <NewUserProgressCard />
          ) : (
            <CardCarousel>
              <FocusCard task={mitTask} />
              <ProgressCard completed={completedCount} total={totalCount} />
            </CardCarousel>
          )}
        </View>

        {/* Task List */}
        <View className="mt-6">
          {tasks.length === 0 ? (
            isNewUser ? (
              <NewUserEmptyState />
            ) : (
              <View className="items-center justify-center py-12 mx-5">
                <Text className="text-slate-400 text-center text-base">
                  No tasks planned for today.
                </Text>
                <Text className="text-slate-500 text-center text-sm mt-2">
                  Add a task to get started!
                </Text>
              </View>
            )
          ) : (
            <>
              <TaskList tasks={tasks} onToggle={handleToggleTask} onTaskPress={handleTaskPress} />
              <CompletedSection
                tasks={tasks}
                onToggle={handleToggleTask}
                onTaskPress={handleTaskPress}
              />
            </>
          )}
        </View>

        {/* Bottom spacing for Add Task button */}
        <View className="h-20" />
      </ScrollView>

      {/* Fixed Add Task Button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-slate-950"
        style={{ paddingBottom: insets.bottom > 0 ? 0 : 16 }}
      >
        <AddTaskButton onPress={handleAddTask} />
      </View>
    </View>
  )
}
