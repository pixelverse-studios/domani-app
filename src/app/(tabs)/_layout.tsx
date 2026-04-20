import React, { useEffect } from 'react'
import { View, Text, ActivityIndicator, Platform } from 'react-native'
import { Tabs, Redirect } from 'expo-router'
import { CheckCircle, Calendar, MessageCircle, BarChart3, Settings } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '~/hooks/useAppTheme'
import { useAuth } from '~/hooks/useAuth'
import { useSubscription, hasFullAccess } from '~/hooks/useSubscription'
import { useTranslation } from '~/hooks/useTranslation'
import { WelcomeOverlay, TutorialSpotlight, useTutorialLifecycle } from '~/components/tutorial'
import { useTutorialStore } from '~/stores/tutorialStore'

const TAB_BAR_CONTENT_HEIGHT = 56
const ANDROID_MIN_BOTTOM_PADDING = 16

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const bottomPadding =
    Platform.OS === 'android' ? Math.max(insets.bottom, ANDROID_MIN_BOTTOM_PADDING) : insets.bottom
  const theme = useAppTheme()
  const { user, loading } = useAuth()
  const { t } = useTranslation()
  const { status: subscriptionStatus, isLoading: subscriptionLoading } = useSubscription()
  // Hide non-essential tabs for any state that doesn't grant full access
  // (i.e. pre_trial or expired), so the user only sees Today + Settings
  // until they start a trial or upgrade. Also hide while loading to avoid
  // a flash of fully-enabled tabs before the state machine resolves.
  const hideLockedTabs = subscriptionLoading || !hasFullAccess(subscriptionStatus)
  const initializeTutorialState = useTutorialStore((state) => state.initializeTutorialState)

  // Initialize tutorial state when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      initializeTutorialState(user.id)
    }
  }, [user, loading, initializeTutorialState])

  // Handle tutorial pause/resume on app lifecycle and navigation changes
  useTutorialLifecycle()

  // Show loading while checking auth
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-bg">
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      </View>
    )
  }

  // Redirect to welcome if not authenticated
  if (!user) {
    return <Redirect href="/welcome" />
  }

  return (
    <>
      <Tabs
        safeAreaInsets={{ bottom: 0 }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.brand.primary,
          tabBarInactiveTintColor: theme.colors.text.muted,
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border.primary,
            borderTopWidth: 1,
            height: TAB_BAR_CONTENT_HEIGHT + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 8,
          },
          tabBarLabel: ({ focused, children }) => (
            <Text
              style={{
                fontSize: 11,
                fontWeight: focused ? '600' : '400',
                color: focused ? theme.colors.brand.primary : theme.colors.text.muted,
                marginBottom: 2,
                textAlign: 'center',
              }}
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {children}
            </Text>
          ),
          tabBarIconStyle: {
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('common.tabs.today'),
            tabBarIcon: ({ color, size }) => <CheckCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="planning"
          options={{
            title: t('common.tabs.planning'),
            href: hideLockedTabs ? null : undefined,
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="feedback"
          options={{
            title: t('common.tabs.feedback'),
            href: hideLockedTabs ? null : undefined,
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: t('common.tabs.progress'),
            href: hideLockedTabs ? null : undefined,
            tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('common.tabs.settings'),
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />
      </Tabs>

      {/* Tutorial Overlays */}
      <WelcomeOverlay />
      <TutorialSpotlight />
    </>
  )
}
