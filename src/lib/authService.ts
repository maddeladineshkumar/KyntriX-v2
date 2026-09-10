import { supabase } from './supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { ProfileRow, ProfileUpdate } from '../types/database.types';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  username: string;
  role?: string;
  institution?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthErrorResponse {
  message: string;
  field?: 'email' | 'password' | 'username' | 'fullName' | 'institution';
}

/**
 * Format raw errors into polished, user-friendly KyntriX messages.
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = (typeof error === 'string' ? error : error.message || '').toLowerCase();
  const status = error.status;

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'Incorrect email or password.';
  }
  if (message.includes('email not confirmed') || message.includes('unverified')) {
    return 'Please verify your email before signing in.';
  }
  if (message.includes('already registered') || message.includes('user already exists')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (
    message.includes('profiles_username_key') ||
    message.includes('username is already taken') ||
    message.includes('unique constraint') && message.includes('username')
  ) {
    return 'That username is already taken. Please choose another.';
  }
  if (message.includes('valid email') || message.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('password') && (message.includes('short') || message.includes('characters') || message.includes('at least'))) {
    return 'Password must be at least 6 characters.';
  }
  if (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('405') ||
    message.includes('method not allowed') ||
    status === 0 ||
    status === 405
  ) {
    return 'Unable to connect right now. Please check your connection and try again.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a few moments and try again.';
  }

  return error.message || 'Authentication failed. Please try again.';
}

export class AuthService {
  /**
   * Get the current active session
   */
  public static async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[AuthService] Error fetching session:', error.message);
        return null;
      }
      return data.session;
    } catch (err) {
      console.warn('[AuthService] Unexpected error getting session:', err);
      return null;
    }
  }

  /**
   * Get the current authenticated user
   */
  public static async getUser(): Promise<SupabaseUser | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return null;
      return data.user;
    } catch {
      return null;
    }
  }

  /**
   * Fetch profile by user ID from public.profiles
   */
  public static async getProfile(userId: string): Promise<ProfileRow | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[AuthService] Error fetching profile:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[AuthService] Unexpected error fetching profile:', err);
      return null;
    }
  }

  /**
   * Update the user's profile
   */
  public static async updateProfile(
    userId: string,
    updates: ProfileUpdate
  ): Promise<{ data: ProfileRow | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error: formatAuthError(error) };
      }
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: formatAuthError(err) };
    }
  }

  /**
   * Sign up with email, password, and metadata
   */
  public static async signUp(
    params: SignUpParams
  ): Promise<{ user: SupabaseUser | null; session: Session | null; error: string | null; needsEmailConfirmation: boolean }> {
    // Client-side validations
    if (!params.fullName?.trim()) {
      return { user: null, session: null, error: 'Please enter your full name.', needsEmailConfirmation: false };
    }
    if (!params.username?.trim()) {
      return { user: null, session: null, error: 'Please choose a username.', needsEmailConfirmation: false };
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(params.username.trim())) {
      return {
        user: null,
        session: null,
        error: 'Username must be 3-30 characters and contain only letters, numbers, or underscores.',
        needsEmailConfirmation: false,
      };
    }
    if (!params.email?.trim() || !params.email.includes('@')) {
      return { user: null, session: null, error: 'Please enter a valid email address.', needsEmailConfirmation: false };
    }
    if (!params.password || params.password.length < 6) {
      return { user: null, session: null, error: 'Password must be at least 6 characters.', needsEmailConfirmation: false };
    }

    try {
      const cleanUsername = params.username.trim().toLowerCase();
      const role = params.role || 'Student';

      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            username: cleanUsername,
            role,
            institution: params.institution?.trim() || null,
          },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
      });

      if (error) {
        return { user: null, session: null, error: formatAuthError(error), needsEmailConfirmation: false };
      }

      const user = data.user;
      const session = data.session;
      const needsEmailConfirmation = !session && !!user;

      return {
        user,
        session,
        error: null,
        needsEmailConfirmation,
      };
    } catch (err: any) {
      return { user: null, session: null, error: formatAuthError(err), needsEmailConfirmation: false };
    }
  }

  /**
   * Sign in with email and password
   */
  public static async signIn(
    params: SignInParams
  ): Promise<{ user: SupabaseUser | null; session: Session | null; error: string | null }> {
    if (!params.email?.trim()) {
      return { user: null, session: null, error: 'Please enter your email address.' };
    }
    if (!params.password) {
      return { user: null, session: null, error: 'Please enter your password.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email.trim(),
        password: params.password,
      });

      if (error) {
        return { user: null, session: null, error: formatAuthError(error) };
      }

      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: formatAuthError(err) };
    }
  }

  /**
   * Sign in with Google OAuth
   */
  public static async signInWithGoogle(): Promise<{ error: string | null }> {
    try {
      const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectOrigin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { error: formatAuthError(error) };
      }
      return { error: null };
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  }

  /**
   * Send password reset email
   */
  public static async sendPasswordResetEmail(email: string): Promise<{ error: string | null }> {
    if (!email?.trim() || !email.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }

    try {
      const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${redirectOrigin}/reset-password`,
      });

      if (error) {
        return { error: formatAuthError(error) };
      }
      return { error: null };
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  }

  /**
   * Update password for user following password reset
   */
  public static async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    if (!newPassword || newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: formatAuthError(error) };
      }
      return { error: null };
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  }

  /**
   * Sign out
   */
  public static async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error: formatAuthError(error) };
      }
      return { error: null };
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  }
}
