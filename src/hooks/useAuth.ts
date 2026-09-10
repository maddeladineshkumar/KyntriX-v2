import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthService, formatAuthError } from '../lib/authService';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { ProfileRow, ProfileUpdate } from '../types/database.types';

export interface CurrentUser {
  id: string;
  email: string;
}

export interface CurrentProfile {
  full_name: string | null;
  username: string | null;
  role: string | null;
  institution: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AuthContextValue {
  user: CurrentUser | null;
  profile: CurrentProfile | null;
  rawUser: SupabaseUser | null;
  rawProfile: ProfileRow | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: ProfileUpdate) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthContextValue {
  const [session, setSession] = useState<Session | null>(null);
  const [rawUser, setRawUser] = useState<SupabaseUser | null>(null);
  const [rawProfile, setRawProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const profileCache = useRef<Record<string, ProfileRow>>({});

  const loadProfile = useCallback(async (userId: string): Promise<ProfileRow | null> => {
    if (profileCache.current[userId]) {
      return profileCache.current[userId];
    }
    const profile = await AuthService.getProfile(userId);
    if (profile) {
      profileCache.current[userId] = profile;
    }
    return profile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!rawUser) return;
    delete profileCache.current[rawUser.id];
    const updated = await AuthService.getProfile(rawUser.id);
    if (updated) {
      profileCache.current[rawUser.id] = updated;
      setRawProfile(updated);
    }
  }, [rawUser]);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial session load
    AuthService.getSession().then(async (initialSession) => {
      if (!isMounted) return;
      setSession(initialSession);
      const user = initialSession?.user ?? null;
      setRawUser(user);

      if (user) {
        const prof = await loadProfile(user.id);
        if (isMounted) setRawProfile(prof);
      }
      if (isMounted) setIsLoading(false);
    });

    // 2. Auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setRawUser(currentUser);

      if (event === 'SIGNED_OUT') {
        profileCache.current = {};
        setRawProfile(null);
        setIsLoading(false);
      } else if (currentUser) {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          const prof = await loadProfile(currentUser.id);
          if (isMounted) setRawProfile(prof);
        }
        setIsLoading(false);
      } else {
        setRawProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<{ success: boolean; error?: string }> => {
      if (!rawUser) return { success: false, error: 'User is not logged in.' };
      setError(null);
      const res = await AuthService.updateProfile(rawUser.id, updates);
      if (res.error) {
        setError(res.error);
        return { success: false, error: res.error };
      }
      if (res.data) {
        profileCache.current[rawUser.id] = res.data;
        setRawProfile(res.data);
      }
      return { success: true };
    },
    [rawUser]
  );

  const signOut = useCallback(async () => {
    setError(null);
    const res = await AuthService.signOut();
    if (res.error) {
      setError(formatAuthError(res.error));
    }
  }, []);

  const user: CurrentUser | null = rawUser
    ? {
        id: rawUser.id,
        email: rawUser.email || '',
      }
    : null;

  const profile: CurrentProfile | null = rawProfile
    ? {
        full_name: rawProfile.full_name,
        username: rawProfile.username,
        role: rawProfile.role,
        institution: rawProfile.institution,
        avatar_url: rawProfile.avatar_url,
        created_at: rawProfile.created_at,
        updated_at: rawProfile.updated_at,
      }
    : rawUser
    ? {
        // Fallback to auth metadata if profile is loading or just created
        full_name: (rawUser.user_metadata?.full_name as string) || (rawUser.user_metadata?.name as string) || null,
        username: (rawUser.user_metadata?.username as string) || null,
        role: (rawUser.user_metadata?.role as string) || 'Student',
        institution: (rawUser.user_metadata?.institution as string) || null,
        avatar_url: (rawUser.user_metadata?.avatar_url as string) || (rawUser.user_metadata?.picture as string) || null,
        created_at: rawUser.created_at || null,
        updated_at: null,
      }
    : null;

  return {
    user,
    profile,
    rawUser,
    rawProfile,
    session,
    isAuthenticated: !!session && !!rawUser,
    isLoading,
    error,
    updateProfile,
    refreshProfile,
    signOut,
  };
}
