import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
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
  Trash2,
  AlertTriangle,
  Info,
  HelpCircle,
  LogOut,
  ClipboardClock,
} from 'lucide-react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'

import { Text } from '~/components/ui'
import { AccountConfirmationOverlay } from '~/components/AccountConfirmationOverlay'
import { FavoriteCategoriesAccordion } from '~/components/settings'
import { useAuth } from '~/hooks/useAuth'
import { useTheme } from '~/hooks/useTheme'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import { useSubscription } from '~/hooks/useSubscription'
import { useNotifications } from '~/hooks/useNotifications'
import { useAccountDeletion } from '~/hooks/useAccountDeletion'
import { useAppConfig } from '~/stores/appConfigStore'
import type { ThemeMode } from '~/stores/themeStore'
import type { SubscriptionStatus } from '~/hooks/useSubscription'

// Get app version from app.json (Expo handles this)
import Constants from 'expo-constants'
const APP_VERSION = Constants.expoConfig?.version || '1.0.0'

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
// Note: 'premium' status is kept for backwards compatibility but lifetime model
// means all paid users are 'lifetime' status
const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bgColor: string }> =
  {
    free: { label: 'Free', color: '#94a3b8', bgColor: 'bg-slate-500/20' },
    trialing: { label: 'Trial', color: '#22c55e', bgColor: 'bg-green-500/20' },
    premium: { label: 'Lifetime', color: '#f59e0b', bgColor: 'bg-amber-500/20' },
    lifetime: { label: 'Lifetime', color: '#f59e0b', bgColor: 'bg-amber-500/20' },
  }

// Section Header component
function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
      {title}
    </Text>
  )
}

// Skeleton components for loading states
function SkeletonBox({ className }: { className?: string }) {
  return <View className={`bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${className}`} />
}

function ProfileSkeleton() {
  return (
    <View className="mb-6">
      <View className="py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-2">
        <View className="flex-row items-center">
          <SkeletonBox className="w-5 h-5 rounded mr-3" />
          <SkeletonBox className="w-24 h-4 rounded" />
          <View className="flex-1" />
          <SkeletonBox className="w-20 h-4 rounded" />
        </View>
      </View>
      <View className="py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        <View className="flex-row items-center">
          <SkeletonBox className="w-5 h-5 rounded mr-3" />
          <SkeletonBox className="w-20 h-4 rounded" />
          <View className="flex-1" />
          <SkeletonBox className="w-32 h-4 rounded" />
        </View>
      </View>
    </View>
  )
}

function SubscriptionSkeleton() {
  return (
    <View className="mb-6">
      <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <SkeletonBox className="w-5 h-5 rounded mr-2" />
            <SkeletonBox className="w-24 h-4 rounded" />
          </View>
          <SkeletonBox className="w-16 h-6 rounded-full" />
        </View>
        <SkeletonBox className="w-48 h-4 rounded mb-3" />
        <SkeletonBox className="w-full h-12 rounded-xl" />
      </View>
    </View>
  )
}

function PreferencesSkeleton() {
  return (
    <View className="mb-6">
      {[1, 2, 3].map((i) => (
        <View key={i} className="py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-2">
          <View className="flex-row items-center">
            <SkeletonBox className="w-5 h-5 rounded mr-3" />
            <SkeletonBox className="w-28 h-4 rounded" />
            <View className="flex-1" />
            <SkeletonBox className="w-24 h-4 rounded" />
          </View>
        </View>
      ))}
    </View>
  )
}

function PlanningSkeleton() {
  return (
    <View className="mb-6">
      <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <SkeletonBox className="w-5 h-5 rounded mr-3" />
          <SkeletonBox className="w-32 h-4 rounded" />
        </View>
        <SkeletonBox className="w-12 h-7 rounded-full" />
      </View>
      <SkeletonBox className="w-full h-14 rounded-xl" />
    </View>
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
        {value && <Text className="text-sm text-slate-600 dark:text-slate-400 mr-2">{value}</Text>}
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
  const { schedulePlanningReminder, permissionStatus, requestPermissions } = useNotifications()
  const accountDeletion = useAccountDeletion()
  const { phase } = useAppConfig()

  // Modal states
  const [showNameModal, setShowNameModal] = useState(false)
  const [showTimezoneModal, setShowTimezoneModal] = useState(false)
  const [showPlanningTimeModal, setShowPlanningTimeModal] = useState(false)
  const [showExecutionTimeModal, setShowExecutionTimeModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showFarewellOverlay, setShowFarewellOverlay] = useState(false)
  const [showSmartCategoriesModal, setShowSmartCategoriesModal] = useState(false)
  const [pendingSmartCategoriesValue, setPendingSmartCategoriesValue] = useState(false)

  // Form states
  const [editName, setEditName] = useState('')
  const [selectedTime, setSelectedTime] = useState(new Date())

  const handleSignOut = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut()
          router.replace('/welcome')
        },
      },
    ])
  }

  const handleDeleteAccount = async () => {
    try {
      await accountDeletion.scheduleDeletion.mutateAsync()
      setShowDeleteModal(false)
      setShowFarewellOverlay(true)
    } catch {
      Alert.alert('Error', 'Failed to schedule account deletion. Please try again.')
    }
  }

  const handleFarewellDismiss = () => {
    setShowFarewellOverlay(false)
    router.replace('/welcome')
  }

  const handleCancelDeletion = async () => {
    try {
      await accountDeletion.cancelDeletion.mutateAsync()
    } catch {
      Alert.alert('Error', 'Failed to cancel deletion. Please try again.')
    }
  }

  const handleSmartCategoriesToggle = (value: boolean) => {
    setPendingSmartCategoriesValue(value)
    setShowSmartCategoriesModal(true)
  }

  const confirmSmartCategoriesChange = async () => {
    await updateProfile.mutateAsync({ auto_sort_categories: pendingSmartCategoriesValue })
    setShowSmartCategoriesModal(false)
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
      await schedulePlanningReminder(time.getHours(), time.getMinutes())
    }

    setShowPlanningTimeModal(false)
  }

  const handleUpdateExecutionTime = async (time: Date) => {
    const timeString = format(time, 'HH:mm:ss')
    await updateProfile.mutateAsync({ execution_reminder_time: timeString })
    // Note: Execution reminder is handled server-side via Edge Function
    // No local notification scheduling needed
    setShowExecutionTimeModal(false)
  }

  const handleToggleExecutionReminder = async (enabled: boolean) => {
    if (enabled) {
      // Enable: Check if we have a push token, request permissions if not
      // Execution reminders are server-side push notifications, so we need a token
      if (!profile?.expo_push_token) {
        const granted = await requestPermissions()
        if (!granted) {
          Alert.alert(
            'Notifications Required',
            'Please enable notifications to receive execution reminders. You can enable them in your device settings.',
            [{ text: 'OK' }],
          )
          return
        }
        // Wait briefly for token registration to complete
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Set default time (8 AM)
      const defaultTime = new Date()
      defaultTime.setHours(8, 0, 0, 0)
      const timeString = format(defaultTime, 'HH:mm:ss')
      await updateProfile.mutateAsync({ execution_reminder_time: timeString })
    } else {
      // Disable: clear time
      await updateProfile.mutateAsync({ execution_reminder_time: null })
    }
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

  // Only need subscription data when not in beta
  const isBeta = phase === 'closed_beta' || phase === 'open_beta'
  const statusConfig = STATUS_CONFIG[subscription.status]

  // Determine loading states for individual sections
  const isProfileLoading = isLoading
  // Skip subscription loading in beta - we don't need RevenueCat data
  const isSubscriptionLoading = !isBeta && subscription.isLoading

  return (
    <View className="flex-1 bg-white dark:bg-slate-950" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-6">
          Settings
        </Text>

        {/* Profile Section */}
        <SectionHeader title="Profile" />
        {isProfileLoading ? (
          <ProfileSkeleton />
        ) : (
          <View className="mb-6">
            <SettingsRow
              label="Name"
              value={profile?.full_name || 'Not set'}
              onPress={openNameModal}
              icon={User}
            />
            <SettingsRow label="Email" value={profile?.email} icon={User} showChevron={false} />
          </View>
        )}

        {/* Subscription Section */}
        <SectionHeader title="Subscription" />
        {isSubscriptionLoading ? (
          <SubscriptionSkeleton />
        ) : (
          <View className="mb-6">
            {/* Beta Tester Card - shown during closed_beta or open_beta phases */}
            {isBeta ? (
              <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-2 border border-amber-200 dark:border-amber-700/50">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Sparkles size={20} color="#f59e0b" />
                    <Text className="text-base font-medium text-slate-900 dark:text-white ml-2">
                      Beta Tester
                    </Text>
                  </View>
                  <View className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                    <Text className="text-amber-700 dark:text-amber-300 text-sm font-semibold">
                      Beta
                    </Text>
                  </View>
                </View>

                <Text className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  You&apos;re part of our exclusive beta program with full Pro access while we build
                  Domani together.
                </Text>

                <View className="gap-2">
                  <View className="flex-row items-center">
                    <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2" />
                    <Text className="text-sm text-slate-700 dark:text-slate-300">
                      Unlimited tasks per day
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2" />
                    <Text className="text-sm text-slate-700 dark:text-slate-300">
                      Priority support
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2" />
                    <Text className="text-sm text-slate-700 dark:text-slate-300">
                      Early access to new features
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* Production Subscription UI */
              <>
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
                      <Text className="text-sm text-slate-600 dark:text-slate-400 mb-3">
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
                      <Text className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        Unlimited tasks • All features unlocked
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        className="bg-purple-500 py-3 rounded-xl items-center"
                      >
                        <Text className="text-white font-semibold">Get Lifetime Access</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Premium/Lifetime - no renewal, lifetime access */}
                  {subscription.status === 'premium' && (
                    <Text className="text-sm text-slate-600 dark:text-slate-400">
                      Unlimited tasks • All features unlocked forever
                    </Text>
                  )}

                  {/* Lifetime */}
                  {subscription.status === 'lifetime' && (
                    <Text className="text-sm text-slate-600 dark:text-slate-400">
                      Unlimited tasks • All features unlocked forever
                    </Text>
                  )}
                </View>

                {/* Restore purchases - only show for free/trial users in production */}
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
                        <Text className="text-sm text-slate-600 dark:text-slate-400 ml-1.5">
                          Restore Purchases
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* Planning Section */}
        <SectionHeader title="Planning" />
        {isProfileLoading ? (
          <PlanningSkeleton />
        ) : (
          <View className="mb-6">
            {/* Smart Categories Toggle */}
            <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Sparkles
                  size={18}
                  color={activeTheme === 'dark' ? '#a78bfa' : '#8b5cf6'}
                  fill={
                    profile?.auto_sort_categories
                      ? activeTheme === 'dark'
                        ? '#a78bfa'
                        : '#8b5cf6'
                      : 'transparent'
                  }
                />
                <Text className="text-base font-sans-medium text-slate-900 dark:text-white ml-3">
                  Smart Categories
                </Text>
                <TouchableOpacity
                  className="ml-2"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() =>
                    Alert.alert(
                      'Smart Categories',
                      'Favorite categories automatically adjust based on usage frequency. The app learns your habits and displays your most-used categories.',
                      [{ text: 'Got it' }],
                    )
                  }
                >
                  <Info size={16} color={activeTheme === 'dark' ? '#64748b' : '#94a3b8'} />
                </TouchableOpacity>
              </View>
              <Switch
                value={profile?.auto_sort_categories ?? false}
                onValueChange={handleSmartCategoriesToggle}
                trackColor={{
                  false: activeTheme === 'dark' ? '#334155' : '#e2e8f0',
                  true: activeTheme === 'dark' ? '#a78bfa' : '#8b5cf6',
                }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                ios_backgroundColor={activeTheme === 'dark' ? '#334155' : '#e2e8f0'}
              />
            </View>

            {/* Favorite Categories Accordion */}
            <FavoriteCategoriesAccordion />
          </View>
        )}

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        {isProfileLoading ? (
          <PreferencesSkeleton />
        ) : (
          <View className="mb-6">
            <SettingsRow
              label="Timezone"
              value={getTimezoneLabel(profile?.timezone || null)}
              onPress={() => setShowTimezoneModal(true)}
              icon={Globe}
            />
            <SettingsRow
              label="Planning Reminder"
              value={formatTimeDisplay(profile?.planning_reminder_time || null)}
              onPress={openPlanningTimeModal}
              icon={ClipboardClock}
            />
            {/* Execution Reminder Toggle */}
            <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 mb-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="mr-3">
                    <Clock size={20} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
                  </View>
                  <Text className="text-base text-slate-900 dark:text-slate-100">
                    Execution Reminder
                  </Text>
                </View>
                <Switch
                  value={!!profile?.execution_reminder_time}
                  onValueChange={handleToggleExecutionReminder}
                  trackColor={{
                    false: activeTheme === 'dark' ? '#334155' : '#e2e8f0',
                    true: activeTheme === 'dark' ? '#a78bfa' : '#8b5cf6',
                  }}
                  thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                  ios_backgroundColor={activeTheme === 'dark' ? '#334155' : '#e2e8f0'}
                />
              </View>
              {/* Time selector - only shown when enabled */}
              {profile?.execution_reminder_time && (
                <TouchableOpacity
                  onPress={openExecutionTimeModal}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700"
                >
                  <Text className="text-sm text-slate-600 dark:text-slate-400">Reminder time</Text>
                  <View className="flex-row items-center">
                    <Text className="text-sm text-slate-600 dark:text-slate-400 mr-2">
                      {formatTimeDisplay(profile.execution_reminder_time)}
                    </Text>
                    <ChevronRight
                      size={16}
                      color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'}
                    />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Appearance Section */}
        <SectionHeader title="Appearance" />
        <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
          <Text className="text-sm text-slate-600 dark:text-slate-400 mb-3">Theme</Text>
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
                      : 'bg-transparent border-transparent'
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

        {/* Support Section */}
        <SectionHeader title="Support" />
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => router.push('/contact-support')}
            activeOpacity={0.7}
            className="flex-row items-center justify-center py-3.5 rounded-xl border border-purple-500 bg-purple-500/10"
          >
            <HelpCircle size={18} color="#a855f7" />
            <Text className="text-purple-500 font-semibold ml-2">Contact for Support</Text>
          </TouchableOpacity>
        </View>

        {/* Log Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          className="flex-row items-center justify-center py-3.5 rounded-xl border border-slate-600/50 bg-[#374151]/30 dark:bg-[#374151]/50 mb-6"
        >
          <LogOut size={18} color={activeTheme === 'dark' ? '#9ca3af' : '#475569'} />
          <Text className="text-slate-600 dark:text-slate-400 font-semibold ml-2">Log Out</Text>
        </TouchableOpacity>

        {/* Danger Zone Section */}
        <SectionHeader title="Danger Zone" />
        <View className="mb-8 border border-red-500/30 rounded-xl overflow-hidden">
          {accountDeletion.isPendingDeletion ? (
            // Pending deletion state
            <View className="bg-red-500/5 dark:bg-red-500/10 p-4">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center mr-3">
                  <AlertTriangle size={20} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-red-500">
                    Account Scheduled for Deletion
                  </Text>
                  <Text className="text-sm text-slate-600 dark:text-slate-400">
                    {accountDeletion.daysRemaining} days remaining
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Your account will be permanently deleted on{' '}
                <Text className="font-medium text-slate-700 dark:text-slate-300">
                  {accountDeletion.deletionDate}
                </Text>
                . Sign in anytime before then to reactivate.
              </Text>
              <TouchableOpacity
                onPress={handleCancelDeletion}
                disabled={accountDeletion.cancelDeletion.isPending}
                activeOpacity={0.8}
                className="bg-slate-200 dark:bg-slate-700 py-3 rounded-xl items-center"
              >
                {accountDeletion.cancelDeletion.isPending ? (
                  <ActivityIndicator color="#64748b" />
                ) : (
                  <Text className="text-slate-700 dark:text-slate-200 font-semibold">
                    Cancel Deletion
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // Normal state - show delete option
            <TouchableOpacity
              onPress={() => setShowDeleteModal(true)}
              activeOpacity={0.7}
              className="flex-row items-center justify-between py-3.5 px-4 bg-red-500/5 dark:bg-red-500/10"
            >
              <View className="flex-row items-center">
                <Trash2 size={20} color="#ef4444" />
                <Text className="text-base text-red-500 ml-3">Delete Account</Text>
              </View>
              <ChevronRight size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* App Version */}
        <Text className="text-center text-sm text-slate-500 dark:text-slate-500 mb-4">
          Domani v{APP_VERSION}
        </Text>

        {/* Bottom padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* Name Edit Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-h-[75%]">
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
              placeholderTextColor={activeTheme === 'dark' ? '#94a3b8' : '#64748b'}
              autoFocus
              className="bg-slate-100 dark:bg-slate-700 rounded-xl px-4 text-slate-900 dark:text-white text-base mb-4"
              style={{ paddingTop: 14, paddingBottom: 14, lineHeight: undefined }}
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
      <Modal
        visible={showTimezoneModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimezoneModal(false)}
      >
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
                      <Text className="text-sm text-slate-600 dark:text-slate-400">
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
      <Modal
        visible={showPlanningTimeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlanningTimeModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-h-[75%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                Planning Reminder
              </Text>
              <TouchableOpacity onPress={() => setShowPlanningTimeModal(false)}>
                <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-slate-600 dark:text-slate-400 mb-4">
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
      <Modal
        visible={showExecutionTimeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExecutionTimeModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-h-[75%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                Execution Reminder
              </Text>
              <TouchableOpacity onPress={() => setShowExecutionTimeModal(false)}>
                <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-slate-600 dark:text-slate-400 mb-4">
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

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-[320px] max-h-[75%] items-center">
            {/* Warning Icon */}
            <View className="w-14 h-14 rounded-full bg-red-500/15 items-center justify-center mb-4">
              <AlertTriangle size={28} color="#ef4444" />
            </View>

            {/* Title */}
            <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
              Delete Your Account?
            </Text>

            {/* Description */}
            <Text className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
              Your account and all data will be permanently deleted after 30 days. You can sign in
              anytime before then to reactivate your account.
            </Text>

            {/* What will be deleted */}
            <View className="w-full bg-red-500/10 rounded-xl p-3 mb-5">
              <Text className="text-xs font-medium text-red-500 mb-2">
                This will permanently delete:
              </Text>
              <Text className="text-xs text-slate-600 dark:text-slate-400">
                {'\u2022'} All your plans and tasks{'\n'}
                {'\u2022'} Custom categories{'\n'}
                {'\u2022'} Progress history{'\n'}
                {'\u2022'} Account settings
              </Text>
            </View>

            {/* Buttons */}
            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={accountDeletion.scheduleDeletion.isPending}
                activeOpacity={0.8}
                className="w-full bg-red-500 py-4 rounded-xl items-center"
              >
                {accountDeletion.scheduleDeletion.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">Delete Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                disabled={accountDeletion.scheduleDeletion.isPending}
                activeOpacity={0.8}
                className="w-full bg-slate-200 dark:bg-slate-700 py-4 rounded-xl items-center"
              >
                <Text className="text-slate-700 dark:text-slate-200 font-semibold text-base">
                  Keep Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Smart Categories Confirmation Modal */}
      <Modal
        visible={showSmartCategoriesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSmartCategoriesModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-[320px] max-h-[75%] items-center">
            {/* Icon */}
            <View className="w-14 h-14 rounded-full bg-purple-500/15 items-center justify-center mb-4">
              <Sparkles size={28} color="#8b5cf6" />
            </View>

            {/* Title */}
            <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
              {pendingSmartCategoriesValue
                ? 'Enable Smart Categories?'
                : 'Disable Smart Categories?'}
            </Text>

            {/* Description */}
            <Text className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
              {pendingSmartCategoriesValue
                ? 'Your quick access categories will automatically adapt based on your usage patterns. This will override your current favorite categories.'
                : 'Your categories will return to manual ordering. You can reorder them by going to Favorite Categories.'}
            </Text>

            {/* Buttons */}
            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={confirmSmartCategoriesChange}
                disabled={updateProfile.isPending}
                activeOpacity={0.8}
                className="w-full bg-purple-500 py-4 rounded-xl items-center"
              >
                {updateProfile.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    {pendingSmartCategoriesValue ? 'Enable' : 'Disable'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowSmartCategoriesModal(false)}
                disabled={updateProfile.isPending}
                activeOpacity={0.8}
                className="w-full bg-slate-200 dark:bg-slate-700 py-4 rounded-xl items-center"
              >
                <Text className="text-slate-700 dark:text-slate-200 font-semibold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Farewell overlay after scheduling deletion */}
      <AccountConfirmationOverlay
        visible={showFarewellOverlay}
        type="deleted"
        onDismiss={handleFarewellDismiss}
      />
    </View>
  )
}
