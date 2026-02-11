import React, { useState, useCallback, useEffect } from 'react'
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { LogOut } from 'lucide-react-native'
import { format } from 'date-fns'

import { Text } from '~/components/ui'
import { AccountConfirmationOverlay } from '~/components/AccountConfirmationOverlay'
import {
  ProfileSection,
  SubscriptionSection,
  CategoriesSection,
  NotificationsSection,
  PreferencesSection,
  SupportSection,
  DangerZoneSection,
  NameModal,
  TimezoneModal,
  PlanningTimeModal,
  DeleteAccountModal,
  SmartCategoriesModal,
} from '~/components/settings'
import { TutorialScrollProvider, useTutorialScroll } from '~/components/tutorial'
import { useAuth } from '~/hooks/useAuth'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import { useSubscription } from '~/hooks/useSubscription'
import { useNotifications } from '~/hooks/useNotifications'
import { useAccountDeletion } from '~/hooks/useAccountDeletion'
import { useAppConfig } from '~/stores/appConfigStore'
import { useTutorialStore } from '~/stores/tutorialStore'
import { useTutorialAnalytics } from '~/hooks/useTutorialAnalytics'
import { useScreenTracking } from '~/hooks/useScreenTracking'

// Get app version from app.json (Expo handles this)
import Constants from 'expo-constants'
const APP_VERSION = Constants.expoConfig?.version || '1.0.0'

/**
 * Settings screen wrapped with TutorialScrollProvider to enable
 * auto-scrolling to tutorial targets.
 */
export default function SettingsScreen() {
  return (
    <TutorialScrollProvider>
      <SettingsContent />
    </TutorialScrollProvider>
  )
}

function SettingsContent() {
  useScreenTracking('settings')
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut } = useAuth()
  const theme = useAppTheme()
  const { profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const subscription = useSubscription()
  const { schedulePlanningReminder, permissionStatus, getPermissionStatus, openSettings } =
    useNotifications()
  const accountDeletion = useAccountDeletion()
  const { phase } = useAppConfig()
  const { resetTutorial, isActive: isTutorialActive, currentStep } = useTutorialStore()
  const { trackTutorialStarted, resetTracking } = useTutorialAnalytics()
  const tutorialScroll = useTutorialScroll()

  // Scroll to appropriate position for Settings tutorial steps
  useEffect(() => {
    if (isTutorialActive && tutorialScroll) {
      if (currentStep === 'settings_categories') {
        // Scroll to top - Categories section is near the top
        const timer = setTimeout(() => {
          tutorialScroll.scrollToY(0, false) // Instant scroll to top
        }, 200)
        return () => clearTimeout(timer)
      } else if (currentStep === 'settings_reminders') {
        // Scroll down so Reminders section is visible with room for tooltip above
        // Using a smaller value to keep the full section in view
        const timer = setTimeout(() => {
          tutorialScroll.scrollToY(180, true) // Animated scroll
        }, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [isTutorialActive, currentStep, tutorialScroll])

  // Refresh permission status when screen comes into focus
  // Note: Skip on simulator as Notifications.getPermissionsAsync() can block the event loop
  useFocusEffect(
    useCallback(() => {
      if (Constants.isDevice) {
        getPermissionStatus()
      }
    }, [getPermissionStatus]),
  )

  // Modal states
  const [showNameModal, setShowNameModal] = useState(false)
  const [showTimezoneModal, setShowTimezoneModal] = useState(false)
  const [showPlanningTimeModal, setShowPlanningTimeModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showFarewellOverlay, setShowFarewellOverlay] = useState(false)
  const [showSmartCategoriesModal, setShowSmartCategoriesModal] = useState(false)
  const [pendingSmartCategoriesValue, setPendingSmartCategoriesValue] = useState(false)

  // Form states
  const [editName, setEditName] = useState('')
  const [selectedTime, setSelectedTime] = useState(new Date())

  // Beta check
  const isBeta = phase === 'closed_beta' || phase === 'open_beta'

  // ===========================================================================
  // Handlers
  // ===========================================================================

  const handleReplayTutorial = () => {
    // Reset tracking state and track new tutorial start from settings
    resetTracking()
    trackTutorialStarted('settings')
    resetTutorial()
    router.push('/(tabs)/')
  }

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

  const handleUpdatePlanningTime = async () => {
    const timeString = format(selectedTime, 'HH:mm:ss')
    await updateProfile.mutateAsync({ planning_reminder_time: timeString })

    // Reschedule notification if permissions are granted
    if (permissionStatus === 'granted') {
      await schedulePlanningReminder(selectedTime.getHours(), selectedTime.getMinutes())
    }

    setShowPlanningTimeModal(false)
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

  return (
    <View
      className="flex-1"
      style={{ paddingTop: insets.top, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        ref={tutorialScroll?.scrollViewRef}
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text className="text-2xl font-bold text-content-primary mt-4 mb-6">Settings</Text>

        {/* 1. Profile Section */}
        <ProfileSection
          isLoading={isLoading}
          fullName={profile?.full_name}
          email={profile?.email}
          isBeta={isBeta}
          onEditName={openNameModal}
        />

        {/* 2. Subscription Section - only shown when NOT in beta */}
        {!isBeta && (
          <SubscriptionSection
            isLoading={subscription.isLoading}
            status={subscription.status}
            canStartTrial={subscription.canStartTrial}
            isStartingTrial={subscription.isStartingTrial}
            isRestoring={subscription.isRestoring}
            trialDaysRemaining={subscription.trialDaysRemaining}
            onStartTrial={() => subscription.startTrial()}
            onRestore={() => subscription.restore()}
          />
        )}

        {/* 3. Categories Section */}
        <CategoriesSection
          isLoading={isLoading}
          autoSortCategories={profile?.auto_sort_categories ?? false}
          onToggleSmartCategories={handleSmartCategoriesToggle}
        />

        {/* 4. Notifications & Reminders Section */}
        <NotificationsSection
          isLoading={isLoading}
          planningReminderTime={profile?.planning_reminder_time || null}
          permissionStatus={permissionStatus}
          onEditPlanningTime={openPlanningTimeModal}
          onOpenSettings={openSettings}
        />

        {/* 5. Preferences Section */}
        <PreferencesSection
          isLoading={isLoading}
          timezone={profile?.timezone || null}
          onEditTimezone={() => setShowTimezoneModal(true)}
        />

        {/* 6. Support Section */}
        <SupportSection onReplayTutorial={handleReplayTutorial} />

        {/* Log Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          className="flex-row items-center justify-center py-3.5 rounded-xl mb-6"
          style={{
            backgroundColor: theme.colors.interactive.hover,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}
        >
          <LogOut size={18} color={theme.colors.text.secondary} />
          <Text className="font-semibold ml-2" style={{ color: theme.colors.text.secondary }}>
            Log Out
          </Text>
        </TouchableOpacity>

        {/* 7. Danger Zone Section */}
        <DangerZoneSection
          isPendingDeletion={accountDeletion.isPendingDeletion}
          daysRemaining={accountDeletion.daysRemaining}
          deletionDate={accountDeletion.deletionDate}
          isCancelling={accountDeletion.cancelDeletion.isPending}
          onOpenDeleteModal={() => setShowDeleteModal(true)}
          onCancelDeletion={handleCancelDeletion}
        />

        {/* App Version */}
        <Text className="text-center text-sm text-content-tertiary mb-4">
          Domani v{APP_VERSION}
        </Text>

        {/* Bottom padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* Modals */}
      <NameModal
        visible={showNameModal}
        name={editName}
        isPending={updateProfile.isPending}
        onNameChange={setEditName}
        onSave={handleUpdateName}
        onClose={() => setShowNameModal(false)}
      />

      <TimezoneModal
        visible={showTimezoneModal}
        currentTimezone={profile?.timezone || null}
        onSelect={handleUpdateTimezone}
        onClose={() => setShowTimezoneModal(false)}
      />

      <PlanningTimeModal
        visible={showPlanningTimeModal}
        selectedTime={selectedTime}
        isPending={updateProfile.isPending}
        onTimeChange={setSelectedTime}
        onSave={handleUpdatePlanningTime}
        onClose={() => setShowPlanningTimeModal(false)}
      />

      <DeleteAccountModal
        visible={showDeleteModal}
        isPending={accountDeletion.scheduleDeletion.isPending}
        onConfirm={handleDeleteAccount}
        onClose={() => setShowDeleteModal(false)}
      />

      <SmartCategoriesModal
        visible={showSmartCategoriesModal}
        isEnabling={pendingSmartCategoriesValue}
        isPending={updateProfile.isPending}
        onConfirm={confirmSmartCategoriesChange}
        onClose={() => setShowSmartCategoriesModal(false)}
      />

      {/* Farewell overlay after scheduling deletion */}
      <AccountConfirmationOverlay
        visible={showFarewellOverlay}
        type="deleted"
        onDismiss={handleFarewellDismiss}
      />
    </View>
  )
}
