import React, { useEffect } from 'react'
import { View, ActivityIndicator, Platform, Text } from 'react-native'
import { Tabs, Redirect, usePathname } from 'expo-router'
import { CheckCircle, Calendar, MessageCircle, BarChart3, Settings } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '~/hooks/useAppTheme'
import { useAuth } from '~/hooks/useAuth'
import { useSubscription, hasFullAccess } from '~/hooks/useSubscription'
import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'
import { WelcomeOverlay, TutorialSpotlight, useTutorialLifecycle } from '~/components/tutorial'
import { useTutorialStore } from '~/stores/tutorialStore'

const TAB_BAR_CONTENT_HEIGHT = 54
const ANDROID_MIN_BOTTOM_PADDING = 16
const RESTRICTED_TAB_PATHS = [
  '/planning',
  '/(tabs)/planning',
  '/feedback',
  '/(tabs)/feedback',
  '/analytics',
  '/(tabs)/analytics',
]

function isRestrictedTabPath(pathname: string) {
  return RESTRICTED_TAB_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export default function TabLayout() {
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, ANDROID_MIN_BOTTOM_PADDING)
      : Math.max(insets.bottom - 12, 8)
  const theme = useAppTheme()
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)
  const { user, loading } = useAuth()
  const { status: subscriptionStatus, isLoading: subscriptionLoading } = useSubscription()
  // Hide non-essential tabs for any state that doesn't grant full access
  // (i.e. pre_trial or expired), so the user only sees Today + Settings
  // until they start a trial or upgrade. Also hide while loading to avoid
  // a flash of fully-enabled tabs before the state machine resolves.
  const userHasFullAccess = hasFullAccess(subscriptionStatus)
  const hideLockedTabs = subscriptionLoading || !userHasFullAccess
  const isRestrictedPath = isRestrictedTabPath(pathname)
  const initializeTutorialState = useTutorialStore((state) => state.initializeTutorialState)

  // Initialize tutorial state when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      initializeTutorialState(user.id)
    }
  }, [user, loading, initializeTutorialState])

  // Handle tutorial pause/resume on app lifecycle and navigation changes
  useTutorialLifecycle()

  // Do not mount user or paid screens until both identity and access are resolved.
  if (loading || subscriptionLoading) {
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

  if (isRestrictedPath && !userHasFullAccess) {
    return <Redirect href="/(tabs)" />
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
            paddingTop: 3,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            lineHeight: 12,
            marginTop: 0,
            paddingBottom: 0,
            textAlign: 'center',
          },
          tabBarItemStyle: {
            minWidth: 0,
            paddingTop: 0,
            paddingBottom: 0,
          },
          tabBarLabel: ({ focused, children }) => (
            <Text
              style={{
                fontSize: 10,
                lineHeight: 12,
                fontWeight: focused ? '600' : '400',
                color: focused ? theme.colors.brand.primary : theme.colors.text.muted,
                textAlign: 'center',
                paddingHorizontal: 2,
                includeFontPadding: false,
                flexShrink: 1,
              }}
              allowFontScaling={false}
            >
              {children}
            </Text>
          ),
          tabBarIconStyle: {
            marginTop: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: copy.tabs.today,
            tabBarIcon: ({ color, size }) => <CheckCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="planning"
          options={{
            title: copy.tabs.planning,
            href: hideLockedTabs ? null : undefined,
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: copy.tabs.progress,
            href: hideLockedTabs ? null : undefined,
            tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="feedback"
          options={{
            title: copy.tabs.feedback,
            href: hideLockedTabs ? null : undefined,
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: copy.tabs.settings,
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
