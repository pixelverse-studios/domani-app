import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  Sun,
  Moon,
  Smartphone,
  ChevronRight,
  User,
  Clock,
  Globe,
  Crown,
  X,
  Check,
  Sparkles,
  RotateCcw,
} from 'lucide-react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'

import { Text } from '~/components/ui'
import { useAuth } from '~/hooks/useAuth'
import { useTheme } from '~/hooks/useTheme'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import { useSubscription } from '~/hooks/useSubscription'
import { useNotifications } from '~/hooks/useNotifications'
import type { ThemeMode } from '~/stores/themeStore'
import type { SubscriptionStatus } from '~/hooks/useSubscription'

// Theme options
const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'auto', label: 'System', icon: Smartphone },
]

// Common timezones grouped by region
const TIMEZONES = [
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles', offset: 'GMT-8' },
  { label: 'Mountain Time (MT)', value: 'America/Denver', offset: 'GMT-7' },
  { label: 'Central Time (CT)', value: 'America/Chicago', offset: 'GMT-6' },
  { label: 'Eastern Time (ET)', value: 'America/New_York', offset: 'GMT-5' },
  { label: 'Atlantic Time (AT)', value: 'America/Halifax', offset: 'GMT-4' },
  { label: 'London (GMT)', value: 'Europe/London', offset: 'GMT+0' },
  { label: 'Paris (CET)', value: 'Europe/Paris', offset: 'GMT+1' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai', offset: 'GMT+4' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata', offset: 'GMT+5:30' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore', offset: 'GMT+8' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo', offset: 'GMT+9' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney', offset: 'GMT+10' },
]

// Subscription status display config
const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bgColor: string }> =
  {
    free: { label: 'Free', color: '#94a3b8', bgColor: 'bg-slate-500/20' },
    trialing: { label: 'Trial', color: '#22c55e', bgColor: 'bg-green-500/20' },
    premium: { label: 'Pro', color: '#a855f7', bgColor: 'bg-purple-500/20' },
    lifetime: { label: 'Lifetime', color: '#f59e0b', bgColor: 'bg-amber-500/20' },
  }

// Section Header component
function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
      {title}
    </Text>
  )
}

// Settings Row component
function SettingsRow({
  label,
  value,
  onPress,
  icon: Icon,
  showChevron = true,
}: {
  label: string
  value?: string
  onPress?: () => void
  icon?: typeof User
  showChevron?: boolean
}) {
  const { activeTheme } = useTheme()
  const iconColor = activeTheme === 'dark' ? '#94a3b8' : '#64748b'

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-2"
    >
      <View className="flex-row items-center flex-1">
        {Icon && (
          <View className="mr-3">
            <Icon size={20} color={iconColor} />
          </View>
        )}
        <Text className="text-base text-slate-900 dark:text-slate-100">{label}</Text>
      </View>
      <View className="flex-row items-center">
        {value && <Text className="text-sm text-slate-500 dark:text-slate-400 mr-2">{value}</Text>}
        {showChevron && onPress && <ChevronRight size={18} color={iconColor} />}
      </View>
    </TouchableOpacity>
  )
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut } = useAuth()
  const { mode, setMode, activeTheme } = useTheme()
  const { profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const subscription = useSubscription()
  const { scheduleEveningReminder, permissionStatus } = useNotifications()

  // Modal states
  const [showNameModal, setShowNameModal] = useState(false)
  const [showTimezoneModal, setShowTimezoneModal] = useState(false)
  const [showPlanningTimeModal, setShowPlanningTimeModal] = useState(false)
  const [showExecutionTimeModal, setShowExecutionTimeModal] = useState(false)

  // Form states
  const [editName, setEditName] = useState('')
  const [selectedTime, setSelectedTime] = useState(new Date())

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut()
          router.replace('/welcome')
        },
      },
    ])
  }

  const handleUpdateName = async () => {
    if (!editName.trim()) return
    await updateProfile.mutateAsync({ full_name: editName.trim() })
    setShowNameModal(false)
  }

  const handleUpdateTimezone = async (timezone: string) => {
    await updateProfile.mutateAsync({ timezone })
    setShowTimezoneModal(false)
  }

  const handleUpdatePlanningTime = async (time: Date) => {
    const timeString = format(time, 'HH:mm:ss')
    await updateProfile.mutateAsync({ planning_reminder_time: timeString })

    // Reschedule notification if permissions are granted
    if (permissionStatus === 'granted') {
      await scheduleEveningReminder(time.getHours(), time.getMinutes())
    }

    setShowPlanningTimeModal(false)
  }

  const handleUpdateExecutionTime = async (time: Date) => {
    const timeString = format(time, 'HH:mm:ss')
    await updateProfile.mutateAsync({ execution_reminder_time: timeString })
    setShowExecutionTimeModal(false)
  }

  const openNameModal = () => {
    setEditName(profile?.full_name || '')
    setShowNameModal(true)
  }

  const openPlanningTimeModal = () => {
    if (profile?.planning_reminder_time) {
      const [hours, minutes] = profile.planning_reminder_time.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), parseInt(minutes), 0)
      setSelectedTime(date)
    } else {
      const date = new Date()
      date.setHours(21, 0, 0) // Default 9 PM
      setSelectedTime(date)
    }
    setShowPlanningTimeModal(true)
  }

  const openExecutionTimeModal = () => {
    if (profile?.execution_reminder_time) {
      const [hours, minutes] = profile.execution_reminder_time.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), parseInt(minutes), 0)
      setSelectedTime(date)
    } else {
      const date = new Date()
      date.setHours(8, 0, 0) // Default 8 AM
      setSelectedTime(date)
    }
    setShowExecutionTimeModal(true)
  }

  // Format time for display
  const formatTimeDisplay = (timeString: string | null) => {
    if (!timeString) return 'Not set'
    const [hours, minutes] = timeString.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return format(date, 'h:mm a')
  }

  // Get timezone display label
  const getTimezoneLabel = (value: string | null) => {
    if (!value) return 'Not set'
    const tz = TIMEZONES.find((t) => t.value === value)
    return tz ? tz.label : value
  }

  const statusConfig = STATUS_CONFIG[subscription.status]

  if (isLoading || subscription.isLoading) {
    return (
      <View
        className="flex-1 bg-white dark:bg-slate-950 items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-950" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-6">
          Settings
        </Text>

        {/* Profile Section */}
        <SectionHeader title="Profile" />
        <View className="mb-6">
          <SettingsRow
            label="Name"
            value={profile?.full_name || 'Not set'}
            onPress={openNameModal}
            icon={User}
          />
          <SettingsRow label="Email" value={profile?.email} icon={User} showChevron={false} />
        </View>

        {/* Subscription Section */}
        <SectionHeader title="Subscription" />
        <View className="mb-6">
          <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-2">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Crown size={20} color={statusConfig.color} />
                <Text className="text-base font-medium text-slate-900 dark:text-white ml-2">
                  Current Plan
                </Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${statusConfig.bgColor}`}>
                <Text style={{ color: statusConfig.color }} className="text-sm font-semibold">
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            {/* Free tier - show trial option */}
            {subscription.status === 'free' && (
              <>
                <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  3 tasks per day • Basic features
                </Text>
                {subscription.canStartTrial ? (
                  <TouchableOpacity
                    onPress={() => subscription.startTrial()}
                    disabled={subscription.isStartingTrial}
                    activeOpacity={0.8}
                    className="bg-green-500 py-3 rounded-xl items-center flex-row justify-center mb-2"
                  >
                    {subscription.isStartingTrial ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Sparkles size={18} color="#fff" />
                        <Text className="text-white font-semibold ml-2">
                          Start 14-Day Free Trial
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    className="bg-purple-500 py-3 rounded-xl items-center"
                  >
                    <Text className="text-white font-semibold">Upgrade to Pro</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Trialing - show days remaining */}
            {subscription.status === 'trialing' && (
              <>
                <View className="flex-row items-center mb-3">
                  <Sparkles size={16} color="#22c55e" />
                  <Text className="text-sm text-green-500 font-medium ml-2">
                    {subscription.trialDaysRemaining} days remaining in trial
                  </Text>
                </View>
                <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  Unlimited tasks • All features unlocked
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="bg-purple-500 py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-semibold">Subscribe Now</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Premium - show renewal date */}
            {subscription.status === 'premium' && (
              <>
                <Text className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Unlimited tasks • All features unlocked
                </Text>
                {subscription.expirationDate && (
                  <Text className="text-sm text-slate-500 dark:text-slate-400">
                    {subscription.willRenew ? 'Renews' : 'Expires'}{' '}
                    {format(subscription.expirationDate, 'MMM d, yyyy')}
                  </Text>
                )}
              </>
            )}

            {/* Lifetime */}
            {subscription.status === 'lifetime' && (
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                Unlimited tasks • All features unlocked forever
              </Text>
            )}
          </View>

          {/* Restore purchases - only show for free/trial users */}
          {(subscription.status === 'free' || subscription.status === 'trialing') && (
            <TouchableOpacity
              onPress={() => subscription.restore()}
              disabled={subscription.isRestoring}
              activeOpacity={0.7}
              className="flex-row items-center justify-center py-2"
            >
              {subscription.isRestoring ? (
                <ActivityIndicator size="small" color="#94a3b8" />
              ) : (
                <>
                  <RotateCcw size={14} color="#94a3b8" />
                  <Text className="text-sm text-slate-500 dark:text-slate-400 ml-1.5">
                    Restore Purchases
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        <View className="mb-6">
          <SettingsRow
            label="Timezone"
            value={getTimezoneLabel(profile?.timezone || null)}
            onPress={() => setShowTimezoneModal(true)}
            icon={Globe}
          />
          <SettingsRow
            label="Evening Reminder"
            value={formatTimeDisplay(profile?.planning_reminder_time || null)}
            onPress={openPlanningTimeModal}
            icon={Clock}
          />
          <SettingsRow
            label="Morning Reminder"
            value={formatTimeDisplay(profile?.execution_reminder_time || null)}
            onPress={openExecutionTimeModal}
            icon={Clock}
          />
        </View>

        {/* Appearance Section */}
        <SectionHeader title="Appearance" />
        <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">Theme</Text>
          <View className="flex-row gap-2">
            {THEME_OPTIONS.map(({ mode: optionMode, label, icon: Icon }) => {
              const isSelected = mode === optionMode
              const iconColor = isSelected
                ? '#a855f7'
                : activeTheme === 'dark'
                  ? '#94a3b8'
                  : '#64748b'

              return (
                <TouchableOpacity
                  key={optionMode}
                  onPress={() => setMode(optionMode)}
                  activeOpacity={0.7}
                  className={`flex-1 items-center py-3 rounded-lg border ${
                    isSelected
                      ? 'bg-purple-500/10 border-purple-500'
                      : 'bg-slate-100 dark:bg-slate-700 border-transparent'
                  }`}
                >
                  <Icon size={20} color={iconColor} />
                  <Text
                    className={`text-sm mt-1 ${
                      isSelected
                        ? 'text-purple-500 font-medium'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          className="bg-red-500/10 py-3.5 rounded-xl items-center mb-8"
        >
          <Text className="text-red-500 font-semibold">Sign Out</Text>
        </TouchableOpacity>

        {/* Bottom padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* Name Edit Modal */}
      <Modal visible={showNameModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                Edit Name
              </Text>
              <TouchableOpacity onPress={() => setShowNameModal(false)}>
                <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor="#94a3b8"
              autoFocus
              className="bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-base mb-4"
            />
            <TouchableOpacity
              onPress={handleUpdateName}
              disabled={updateProfile.isPending}
              activeOpacity={0.8}
              className="bg-purple-500 py-3 rounded-xl items-center"
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

      {/* Timezone Modal */}
      <Modal visible={showTimezoneModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-slate-800 rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                Select Timezone
              </Text>
              <TouchableOpacity onPress={() => setShowTimezoneModal(false)}>
                <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <ScrollView className="px-5 py-3">
              {TIMEZONES.map((tz) => {
                const isSelected = profile?.timezone === tz.value
                return (
                  <TouchableOpacity
                    key={tz.value}
                    onPress={() => handleUpdateTimezone(tz.value)}
                    activeOpacity={0.7}
                    className={`flex-row items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700/50`}
                  >
                    <View>
                      <Text className="text-base text-slate-900 dark:text-white">{tz.label}</Text>
                      <Text className="text-sm text-slate-500 dark:text-slate-400">
                        {tz.offset}
                      </Text>
                    </View>
                    {isSelected && <Check size={20} color="#a855f7" />}
                  </TouchableOpacity>
                )
              })}
              <View style={{ height: insets.bottom + 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Planning Time Picker Modal */}
      <Modal visible={showPlanningTimeModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                Evening Reminder
              </Text>
              <TouchableOpacity onPress={() => setShowPlanningTimeModal(false)}>
                <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Get reminded to plan tomorrow&apos;s tasks
            </Text>
            <View className="items-center mb-4">
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={(_event: unknown, date?: Date) => date && setSelectedTime(date)}
                textColor={activeTheme === 'dark' ? '#fff' : '#000'}
              />
            </View>
            <TouchableOpacity
              onPress={() => handleUpdatePlanningTime(selectedTime)}
              disabled={updateProfile.isPending}
              activeOpacity={0.8}
              className="bg-purple-500 py-3 rounded-xl items-center"
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

      {/* Execution Time Picker Modal */}
      <Modal visible={showExecutionTimeModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                Morning Reminder
              </Text>
              <TouchableOpacity onPress={() => setShowExecutionTimeModal(false)}>
                <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Get reminded to start your planned tasks
            </Text>
            <View className="items-center mb-4">
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={(_event: unknown, date?: Date) => date && setSelectedTime(date)}
                textColor={activeTheme === 'dark' ? '#fff' : '#000'}
              />
            </View>
            <TouchableOpacity
              onPress={() => handleUpdateExecutionTime(selectedTime)}
              disabled={updateProfile.isPending}
              activeOpacity={0.8}
              className="bg-purple-500 py-3 rounded-xl items-center"
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
