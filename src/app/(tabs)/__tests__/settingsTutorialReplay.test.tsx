import React from 'react'

import { fireEvent, renderWithProviders, screen } from '~/test/test-utils'
import SettingsScreen from '../settings'
import { useTutorialStore } from '~/stores/tutorialStore'

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockResetTracking = jest.fn()
const mockTrackTutorialStarted = jest.fn()

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn((callback) => callback()),
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
  })),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}))

jest.mock('~/components/AccountConfirmationOverlay', () => ({
  AccountConfirmationOverlay: () => null,
}))

jest.mock('~/components/PaywallModal', () => ({
  PaywallModal: () => null,
}))

jest.mock('~/components/settings/LayoutPickerModal', () => ({
  LayoutPickerModal: () => null,
}))

jest.mock('~/components/tutorial', () => {
  const React = require('react')

  return {
    TutorialScrollProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useTutorialScroll: jest.fn(() => ({
      scrollViewRef: { current: null },
      scrollToY: jest.fn(),
    })),
  }
})

jest.mock('~/components/settings', () => {
  const React = require('react')
  const { Text, TouchableOpacity } = require('react-native')

  return {
    ProfileSection: () => null,
    SubscriptionSection: () => null,
    CategoriesSection: () => null,
    NotificationsSection: () => null,
    PreferencesSection: () => null,
    SupportSection: ({ onReplayTutorial }: { onReplayTutorial: () => void }) => (
      <TouchableOpacity onPress={onReplayTutorial}>
        <Text>Replay Tutorial</Text>
      </TouchableOpacity>
    ),
    DangerZoneSection: () => null,
    NameModal: () => null,
    TimezoneModal: () => null,
    PlanningTimeModal: () => null,
    DeleteAccountModal: () => null,
    SmartCategoriesModal: () => null,
  }
})

jest.mock('~/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    signOut: jest.fn(),
  })),
}))

jest.mock('~/hooks/useProfile', () => ({
  useProfile: jest.fn(() => ({
    isLoading: false,
    profile: {
      auto_sort_categories: false,
      email: 'test@example.com',
      full_name: 'Test User',
      planning_reminder_enabled: false,
      planning_reminder_time: null,
      timezone: 'America/New_York',
    },
  })),
  useUpdateProfile: jest.fn(() => ({
    isPending: false,
    mutateAsync: jest.fn(),
  })),
}))

jest.mock('~/hooks/useSubscription', () => ({
  hasFullAccess: jest.fn(() => true),
  useSubscription: jest.fn(() => ({
    status: 'trialing',
    isLoading: false,
    isStartingTrial: false,
    isRestoring: false,
    trialDaysRemaining: null,
    trialExpirationDate: null,
    graceDaysRemaining: null,
    graceExpirationDate: null,
    offerings: null,
    offeringIdentifier: null,
    isPurchasing: false,
    startTrial: jest.fn(),
    restore: jest.fn(),
    purchase: jest.fn(),
  })),
}))

jest.mock('~/hooks/useNotifications', () => ({
  useNotifications: jest.fn(() => ({
    schedulePlanningReminder: jest.fn(),
    cancelPlanningReminder: jest.fn(),
    requestPermissions: jest.fn(),
    permissionStatus: 'granted',
    getPermissionStatus: jest.fn(),
    openSettings: jest.fn(),
  })),
}))

jest.mock('~/hooks/useAccountDeletion', () => ({
  useAccountDeletion: jest.fn(() => ({
    isPendingDeletion: false,
    daysRemaining: null,
    deletionDate: null,
    scheduleDeletion: {
      isPending: false,
      mutateAsync: jest.fn(),
    },
    cancelDeletion: {
      isPending: false,
      mutateAsync: jest.fn(),
    },
  })),
}))

jest.mock('~/hooks/useTutorialAnalytics', () => ({
  useTutorialAnalytics: jest.fn(() => ({
    resetTracking: mockResetTracking,
    trackTutorialStarted: mockTrackTutorialStarted,
  })),
}))

jest.mock('~/hooks/useScreenTracking', () => ({
  useScreenTracking: jest.fn(),
}))

jest.mock('~/stores/appConfigStore', () => ({
  useAppConfig: jest.fn(() => ({
    phase: 'beta',
  })),
}))

describe('SettingsScreen tutorial replay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useTutorialStore.setState({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: true,
      isOverlayHidden: true,
    })
  })

  it('resets tutorial state, analytics, and navigation from the real Settings handler', () => {
    renderWithProviders(<SettingsScreen />)

    fireEvent.press(screen.getByText('Replay Tutorial'))

    expect(mockResetTracking).toHaveBeenCalledTimes(1)
    expect(mockTrackTutorialStarted).toHaveBeenCalledWith('settings')
    expect(useTutorialStore.getState()).toMatchObject({
      isActive: true,
      currentStep: 'welcome',
      hasCompletedTutorial: false,
      isOverlayHidden: false,
    })
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/')
  })
})
