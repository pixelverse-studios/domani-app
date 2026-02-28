import React, { useEffect } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { Tabs, Redirect } from 'expo-router'
import { CheckCircle, Calendar, MessageCircle, BarChart3, Settings } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '~/hooks/useAppTheme'
import { useAuth } from '~/hooks/useAuth'
import { WelcomeOverlay, TutorialSpotlight, useTutorialLifecycle } from '~/components/tutorial'
import { useTutorialStore } from '~/stores/tutorialStore'

const TAB_BAR_CONTENT_HEIGHT = 56

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const { user, loading } = useAuth()
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
            height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
          tabBarLabel: ({ focused, children }) => (
            <Text
              style={{
                fontSize: 11,
                fontWeight: focused ? '600' : '400',
                color: focused ? theme.colors.brand.primary : theme.colors.text.muted,
                marginBottom: 2,
              }}
              allowFontScaling={false}
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
            title: 'Today',
            tabBarIcon: ({ color, size }) => <CheckCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="planning"
          options={{
            title: 'Planning',
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="feedback"
          options={{
            title: 'Feedback',
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Progress',
            tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
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
