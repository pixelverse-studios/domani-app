import React, { createContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

import { supabase } from '~/lib/supabase';

// Configure web browser for OAuth
WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Configure OAuth redirect for mobile app
  // Development: exp://127.0.0.1:8081/--/auth/callback
  // Production: domani://auth/callback
  const redirectTo = AuthSession.makeRedirectUri({
    scheme: 'domani',
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthProvider] Initial session:', session ? 'Found' : 'None');
      console.log('[AuthProvider] User:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthProvider] Auth state changed:', event);
      console.log('[AuthProvider] Session:', session ? 'Found' : 'None');
      console.log('[AuthProvider] User:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('[AuthProvider] Redirect URL:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;

      // Open OAuth URL in browser
      if (data?.url) {
        console.log('[AuthProvider] Opening browser for OAuth...');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        console.log('[AuthProvider] Browser result type:', result.type);

        if (result.type === 'success') {
          console.log('[AuthProvider] OAuth redirect URL:', result.url);

          // Extract the URL from the redirect
          const url = result.url;

          // Parse URL parameters from fragment (hash) or query string
          // OAuth tokens come in the fragment: exp://...#access_token=...&refresh_token=...
          let access_token: string | null = null;
          let refresh_token: string | null = null;

          // Try to parse from fragment first (most common for OAuth)
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const fragment = url.substring(hashIndex + 1);
            const fragmentParams = new URLSearchParams(fragment);
            access_token = fragmentParams.get('access_token');
            refresh_token = fragmentParams.get('refresh_token');
            console.log('[AuthProvider] Parsed tokens from fragment');
          }

          // Fallback to query params if not found in fragment
          if (!access_token || !refresh_token) {
            const params = new URL(url).searchParams;
            access_token = access_token || params.get('access_token');
            refresh_token = refresh_token || params.get('refresh_token');
            console.log('[AuthProvider] Parsed tokens from query params');
          }

          console.log('[AuthProvider] Tokens received:', {
            hasAccessToken: !!access_token,
            hasRefreshToken: !!refresh_token,
          });

          if (access_token && refresh_token) {
            // Set the session manually
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) {
              console.error('[AuthProvider] Session error:', sessionError);
              throw sessionError;
            }

            console.log('[AuthProvider] Session set successfully!', sessionData.user?.email);
          } else {
            console.error('[AuthProvider] No tokens in redirect URL');
          }
        } else {
          console.log('[AuthProvider] OAuth was cancelled or failed');
        }
      }
    } catch (error) {
      console.error('[AuthProvider] Google sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('[AuthProvider] Sign out error:', error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
