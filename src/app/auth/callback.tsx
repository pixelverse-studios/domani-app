import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Text } from '~/components/ui';
import { supabase } from '~/lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      console.log('[AuthCallback] Received params:', params);
      const { access_token, refresh_token } = params;

      console.log('[AuthCallback] Tokens:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
      });

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: access_token as string,
          refresh_token: refresh_token as string,
        });

        if (error) throw error;

        console.log('[AuthCallback] Session set successfully');
        // Navigate to home screen
        router.replace('/');
      } else {
        throw new Error('No tokens received from OAuth');
      }
    } catch (error) {
      console.error('[AuthCallback] Error:', error);
      router.replace('/login');
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
      <ActivityIndicator size="large" color="#a855f7" />
      <Text variant="body" className="mt-4">
        Completing sign in...
      </Text>
    </View>
  );
}
