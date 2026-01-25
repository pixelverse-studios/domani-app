import React, { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Tabs, Redirect } from 'expo-router'
import { CheckCircle, Calendar, MessageCircle, BarChart3, Settings } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '~/hooks/useTheme'
import { useAuth } from '~/hooks/useAuth'
import { WelcomeOverlay, TutorialSpotlight } from '~/components/tutorial'
import { useTutorialStore } from '~/stores/tutorialStore'

const TAB_BAR_CONTENT_HEIGHT = 56

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { user, loading } = useAuth()
  const initializeTutorialState = useTutorialStore((state) => state.initializeTutorialState)

  // Initialize tutorial state when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      initializeTutorialState(user.id)
    }
  }, [user, loading, initializeTutorialState])

  // Show loading while checking auth
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    )
  }

  // Redirect to welcome if not authenticated
  if (!user) {
    return <Redirect href="/welcome" />
  }

  const activeColor = '#a855f7' // purple-500
  const inactiveColor = isDark ? '#6b7280' : '#9ca3af' // gray-500/400
  const backgroundColor = isDark ? '#0a0a0f' : '#ffffff'
  const borderColor = isDark ? '#1f2937' : '#e5e7eb'

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          tabBarStyle: {
            backgroundColor,
            borderTopColor: borderColor,
            borderTopWidth: 1,
            height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginBottom: 2,
          },
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
