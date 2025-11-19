import React from 'react';
import { ScrollView, View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';

import { Badge, Button, Card, Input, Text } from '~/components/ui';
import { useTheme } from '~/hooks/useTheme';
import { useAuth } from '~/hooks/useAuth';
import { FREE_TIER_LOGIC, PLANNING_PHILOSOPHY } from '~/utils/constants';

const modes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];

export default function HomeScreen() {
  const { mode, activeTheme, setMode } = useTheme();
  const { user, loading, signOut } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <ActivityIndicator size="large" color={activeTheme === 'dark' ? '#a855f7' : '#9333ea'} />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-slate-950 px-5 py-8" contentContainerStyle={{ gap: 16 }}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text variant="title" className="mb-1">
            Domani Design System
          </Text>
          <Text variant="caption">Reusable tokens, typography, and theming primitives.</Text>
        </View>
        <Badge>{activeTheme.toUpperCase()}</Badge>
      </View>

      <Card>
        <Text variant="subtitle" className="mb-3">
          Theme Modes
        </Text>
        <View className="flex-row gap-2">
          {modes.map((themeMode) => (
            <Button
              key={themeMode}
              size="sm"
              variant={themeMode === mode ? 'primary' : 'secondary'}
              onPress={() => setMode(themeMode)}
              className="flex-1"
            >
              {themeMode.toUpperCase()}
            </Button>
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="subtitle" className="mb-3">
          Account
        </Text>
        <Text variant="body" className="mb-3">
          {user.email}
        </Text>
        <Button variant="destructive" onPress={signOut}>
          Sign Out
        </Button>
      </Card>

      <Card>
        <Text variant="subtitle" className="mb-2">
          Planning Philosophy
        </Text>
        <Text className="mb-3 text-slate-700 dark:text-slate-300">{PLANNING_PHILOSOPHY.principle}</Text>
        <View className="gap-2">
          {PLANNING_PHILOSOPHY.eveningBenefits.map((item) => (
            <View key={item} className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-500" />
              <Text className="text-slate-700 dark:text-slate-300">{item}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="subtitle" className="mb-2">
          Free Tier Logic
        </Text>
        <Text className="mb-3 text-slate-700 dark:text-slate-300">{FREE_TIER_LOGIC.rationale}</Text>
        <View className="gap-2">
          {FREE_TIER_LOGIC.benefits.map((benefit) => (
            <Badge key={benefit} variant="outline">
              {benefit}
            </Badge>
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="subtitle" className="mb-3">
          Inputs & CTAs
        </Text>
        <Input placeholder="Add your Most Important Task" className="mb-3" />
        <View className="flex-row gap-2">
          <Button className="flex-1" onPress={() => {}}>
            Save Plan
          </Button>
          <Button className="flex-1" variant="secondary" onPress={() => {}}>
            Lock Plan
          </Button>
        </View>
      </Card>
    </ScrollView>
  );
}
