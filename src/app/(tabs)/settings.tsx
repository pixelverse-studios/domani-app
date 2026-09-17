import React, { useState, useCallback, useEffect } from 'react'
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'
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
import { PaywallModal } from '~/components/PaywallModal'
import { LayoutPickerModal } from '~/components/settings/LayoutPickerModal'
import { TutorialScrollProvider, useTutorialScroll } from '~/components/tutorial'
import { useAuth } from '~/hooks/useAuth'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import { useSubscription, hasFullAccess } from '~/hooks/useSubscription'
import { useNotifications } from '~/hooks/useNotifications'
import { useAccountDeletion } from '~/hooks/useAccountDeletion'
import { useAppConfig } from '~/stores/appConfigStore'
import { isBetaPhase } from '~/types/appConfig'
import { useTutorialStore } from '~/stores/tutorialStore'
import { useTutorialAnalytics } from '~/hooks/useTutorialAnalytics'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'

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
  const { openPaywall } = useLocalSearchParams<{ openPaywall?: string }>()
  const { signOut } = useAuth()
  const theme = useAppTheme()
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)
  const { profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const subscription = useSubscription()
  const {
    schedulePlanningReminder,
    cancelPlanningReminder,
    requestPermissions,
    permissionStatus,
    getPermissionStatus,
    openSettings,
  } = useNotifications()
  const accountDeletion = useAccountDeletion()
  const { phase } = useAppConfig()
  const { resetTutorial } = useTutorialStore()
  const { trackTutorialStarted, resetTracking } = useTutorialAnalytics()
  const tutorialScroll = useTutorialScroll()

  useEffect(() => {
    if (openPaywall === '1') {
      setShowPaywallModal(true)
      router.replace('/(tabs)/settings')
    }
  }, [openPaywall, router])

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
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [pendingSmartCategoriesValue, setPendingSmartCategoriesValue] = useState(false)
  const [showPaywallModal, setShowPaywallModal] = useState(false)

  // Form states
  const [editName, setEditName] = useState('')
  const [selectedTime, setSelectedTime] = useState(new Date())

  // Beta check (kept as a local convenience; the subscription state machine
  // already collapses beta into status='beta'). Used by ProfileSection for the
  // "Beta Tester" badge styling.
  const isBeta = isBetaPhase(phase)

  // Gate the "normal" settings sections when the user needs to act on their
  // subscription state (expired → purchase required, pre_trial → trial required).
  // Derived from the state-machine helper so adding a new non-access status
  // in the future automatically includes it here without an extra edit.
  // During loading, nothing is gated to avoid a flash of limited content.
  const isGated = !subscription.isLoading && !hasFullAccess(subscription.status)

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

  const openRedeemCode = () => {
    router.push('/redeem-code?source=settings')
  }

  const handleSignOut = async () => {
    Alert.alert(copy.settings.logOutTitle, copy.settings.logOutBody, [
      { text: copy.common.cancel, style: 'cancel' },
      {
        text: copy.settings.logOut,
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut()
            router.replace('/welcome')
          } catch (error) {
            Alert.alert(
              copy.settings.logOutTitle,
              error instanceof Error
                ? error.message
                : 'Unable to securely sign out. Please try again.',
            )
          }
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
      Alert.alert(copy.settings.deleteErrorTitle, copy.settings.deleteErrorBody)
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
      Alert.alert(copy.settings.deleteErrorTitle, copy.settings.cancelDeletionErrorBody)
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

  const handleUpdatePlanningTime = async (overrideDate?: Date) => {
    try {
      const timeString = format(overrideDate ?? selectedTime, 'HH:mm:ss')
      await updateProfile.mutateAsync({ planning_reminder_time: timeString })

      // Only reschedule notification if user has opted in and permissions are granted
      if (profile?.planning_reminder_enabled && permissionStatus === 'granted') {
        await schedulePlanningReminder(selectedTime.getHours(), selectedTime.getMinutes())
      }

      setShowPlanningTimeModal(false)
    } catch {
      Alert.alert(copy.settings.deleteErrorTitle, copy.settings.savePlanningTimeErrorBody)
    }
  }

  const handleTogglePlanningReminder = async (enabled: boolean) => {
    try {
      const updated = await updateProfile.mutateAsync({ planning_reminder_enabled: enabled })

      if (enabled) {
        // Use a local variable — the store's permissionStatus may not update until next render
        let resolvedPermission = permissionStatus
        if (resolvedPermission === 'undetermined') {
          const granted = await requestPermissions()
          resolvedPermission = granted ? 'granted' : 'denied'
        }

        // If denied, open OS settings so the user can grant permission.
        // planning_reminder_enabled=true intentionally persists in the DB here —
        // the warning banner in NotificationsSection guides recovery once permission is granted.
        if (resolvedPermission === 'denied') {
          await openSettings()
          return
        }

        // Re-enable: reschedule using the saved planning time (denied path already returned above)
        if (updated.planning_reminder_time) {
          const [hours, minutes] = updated.planning_reminder_time.split(':').map(Number)
          await schedulePlanningReminder(hours, minutes)
        }
      } else {
        // Disable: cancel the scheduled notification
        await cancelPlanningReminder()
      }
    } catch {
      Alert.alert(copy.settings.deleteErrorTitle, copy.settings.updateNotificationErrorBody)
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
        <Text className="text-2xl font-bold text-content-primary mt-4 mb-6">
          {copy.settings.title}
        </Text>

        {/* 1. Profile Section — always visible so signed-in users can see which account they're on */}
        <ProfileSection
          isLoading={isLoading}
          fullName={profile?.full_name}
          email={profile?.email}
          isBeta={isBeta}
          onEditName={openNameModal}
        />

        {/* 2. Subscription Section - always shown; SubscriptionSection renders
            an appropriate variant per status (including a "Full Access" row
            for beta testers). */}
        <SubscriptionSection
          isLoading={subscription.isLoading}
          status={subscription.status}
          isStartingTrial={subscription.isStartingTrial}
          isRestoring={subscription.isRestoring}
          isSyncingAccess={subscription.isSyncingAccess}
          isRedeemingPromoCode={subscription.isRedeemingPromoCode}
          accessSyncPhase={subscription.accessSyncPhase}
          accessSyncAttempt={subscription.accessSyncAttempt}
          trialDaysRemaining={subscription.trialDaysRemaining}
          trialExpirationDate={subscription.trialExpirationDate}
          graceDaysRemaining={subscription.graceDaysRemaining}
          graceExpirationDate={subscription.graceExpirationDate}
          onStartTrial={() => subscription.startTrial()}
          onRestore={async () => {
            try {
              await subscription.restore()
            } catch {
              Alert.alert(copy.settings.restoreFailedTitle, copy.settings.restoreFailedBody)
            }
          }}
          onSyncAccess={async () => {
            await subscription.syncAccess({ source: 'manual', forceStoreSync: true })
          }}
          onRedeemPromoCode={openRedeemCode}
          onOpenRedeemCode={openRedeemCode}
          onUpgrade={() => setShowPaywallModal(true)}
          onOpenPurchaseHelp={() => router.push('/purchase-help?source=settings')}
        />

        {/* 3–6. Categories, Notifications, Preferences, Support stay visible.
            App-specific controls are disabled for gated states while account,
            subscription, and support access remains available. */}
        <CategoriesSection
          isLoading={isLoading}
          autoSortCategories={profile?.auto_sort_categories ?? false}
          onToggleSmartCategories={handleSmartCategoriesToggle}
          disabled={isGated}
        />

        <NotificationsSection
          isLoading={isLoading}
          planningReminderTime={profile?.planning_reminder_time || null}
          planningReminderEnabled={profile?.planning_reminder_enabled ?? false}
          permissionStatus={permissionStatus}
          isUpdating={updateProfile.isPending}
          onEditPlanningTime={openPlanningTimeModal}
          onTogglePlanningReminder={handleTogglePlanningReminder}
          onOpenSettings={openSettings}
          disabled={isGated}
        />

        <PreferencesSection
          isLoading={isLoading}
          timezone={profile?.timezone || null}
          onEditTimezone={() => setShowTimezoneModal(true)}
          onEditLayout={() => setShowLayoutModal(true)}
          disabled={isGated}
        />

        <SupportSection onReplayTutorial={handleReplayTutorial} disableTutorialReplay={isGated} />

        {__DEV__ && !isGated && (
          <TouchableOpacity
            onPress={() => router.push('/notification-setup')}
            activeOpacity={0.7}
            className="py-3.5 px-4 rounded-xl mb-4"
            style={{
              backgroundColor: theme.colors.interactive.hover,
              borderWidth: 1,
              borderColor: theme.colors.border.primary,
            }}
          >
            <Text className="font-semibold text-content-primary">
              Reopen Notification Onboarding
            </Text>
            <Text className="text-sm text-content-secondary mt-1">
              Dev-only shortcut to revisit the trial-start reminder screen.
            </Text>
          </TouchableOpacity>
        )}

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
            {copy.settings.logOut}
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

      <PaywallModal
        visible={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        offerings={subscription.offerings ?? null}
        offeringIdentifier={subscription.offeringIdentifier}
        isPurchasing={subscription.isPurchasing}
        isRestoring={subscription.isRestoring}
        isSyncingAccess={subscription.isSyncingAccess}
        isRedeemingPromoCode={subscription.isRedeemingPromoCode}
        onPurchase={async (pkg) => {
          return await subscription.purchase(pkg)
        }}
        onRestore={async () => {
          return await subscription.restore()
        }}
        onSyncAccess={async () => {
          const result = await subscription.syncAccess({ source: 'manual', forceStoreSync: true })
          return result.status === 'confirmed' ? result.customerInfo : null
        }}
        onOpenRedeemCode={openRedeemCode}
      />

      <LayoutPickerModal visible={showLayoutModal} onClose={() => setShowLayoutModal(false)} />

      {/* Farewell overlay after scheduling deletion */}
      <AccountConfirmationOverlay
        visible={showFarewellOverlay}
        type="deleted"
        onDismiss={handleFarewellDismiss}
      />
    </View>
  )
}
