import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Text } from '~/components/ui';
import { useAuth } from '~/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Sign In Error',
        error instanceof Error ? error.message : 'Failed to sign in with Google'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950 px-6">
      <View className="w-full max-w-sm items-center">
        {/* App Logo/Icon */}
        <View className="mb-8 h-24 w-24 items-center justify-center rounded-3xl bg-purple-100 dark:bg-purple-900/30">
          <Text className="text-5xl">📅</Text>
        </View>

        {/* Title */}
        <Text variant="title" className="mb-2 text-center">
          Welcome to Domani
        </Text>

        <Text variant="body" className="mb-12 text-center text-slate-600 dark:text-slate-400">
          Plan your tomorrow, tonight. Execute with focus.
        </Text>

        {/* Sign in buttons */}
        <View className="w-full gap-3">
          <Button
            variant="primary"
            size="lg"
            onPress={handleGoogleSignIn}
            loading={loading}
            className="w-full"
          >
            Continue with Google
          </Button>

          <Text variant="caption" className="mt-4 text-center text-slate-500 dark:text-slate-400">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </View>
  );
}
