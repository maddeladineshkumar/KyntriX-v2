import { create } from 'zustand';
import { ApiClient } from './apiClient';
import { supabase } from '../../lib/supabase';
import { AuthService } from '../../lib/authService';
import type {
  User,
  UserRole,
  UserProfile,
  Problem,
  ProblemAttempt,
  SimulationChallenge,
  Classroom,
} from '../../server/db/types';

let authListenerSubscribed = false;
let authInitializing = false;
let googleAuthTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
let googleAuthCountdownInterval: ReturnType<typeof setInterval> | null = null;
let googleAuthPopup: Window | null = null;
let googleAuthPopupPollTimer: ReturnType<typeof setInterval> | null = null;

export function closeGoogleAuthPopup(): void {
  if (googleAuthPopup) {
    try {
      if (!googleAuthPopup.closed && typeof googleAuthPopup.close === 'function') {
        googleAuthPopup.close();
      }
    } catch {
      // Ignore cross-origin errors
    }
    googleAuthPopup = null;
  }
}

export function clearGoogleAuthTimers(): void {
  if (googleAuthTimeoutTimer) {
    clearTimeout(googleAuthTimeoutTimer);
    googleAuthTimeoutTimer = null;
  }
  if (googleAuthCountdownInterval) {
    clearInterval(googleAuthCountdownInterval);
    googleAuthCountdownInterval = null;
  }
  if (googleAuthPopupPollTimer) {
    clearInterval(googleAuthPopupPollTimer);
    googleAuthPopupPollTimer = null;
  }
}

export function resetAuthInitializingForTest(): void {
  authListenerSubscribed = false;
  authInitializing = false;
  clearGoogleAuthTimers();
  closeGoogleAuthPopup();
}

export function resetGoogleAuthTimerForTest(): void {
  clearGoogleAuthTimers();
  closeGoogleAuthPopup();
}

export function getGoogleAuthPopupForTest(): Window | null {
  return googleAuthPopup;
}

function buildUserFromSupabase(supabaseUser: any, profile: any): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'KyntriX Engineer',
    username: profile?.username || supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'engineer',
    role: ((profile?.role?.toLowerCase() as UserRole) || (supabaseUser.user_metadata?.role?.toLowerCase() as UserRole) || 'student'),
    institution: profile?.institution || supabaseUser.user_metadata?.institution || undefined,
    avatarUrl: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || undefined,
    passwordHash: '',
    salt: '',
    createdAt: profile?.created_at || supabaseUser.created_at || new Date().toISOString(),
    updatedAt: profile?.updated_at || new Date().toISOString(),
  };
}

export type LearningSubtab =
  | 'dashboard'
  | 'arena'
  | 'challenges'
  | 'analytics'
  | 'profile';

export interface LearningState {
  // Auth
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  googleAuthLoading: boolean;
  googleCountdown: number;
  authError: string | null;
  authSuccess: string | null;
  authMode: 'signin' | 'register' | 'forgot-password' | 'reset-password' | 'confirm-email';
  setAuthMode: (mode: 'signin' | 'register' | 'forgot-password' | 'reset-password' | 'confirm-email') => void;
  setAuthSuccess: (msg: string | null) => void;
  setAuthError: (msg: string | null) => void;
  pendingConfirmationEmail: string | null;
  setPendingConfirmationEmail: (email: string | null) => void;
  resendVerificationEmail: (email: string) => Promise<boolean>;
  loginWithGoogle: (options?: { timeoutSeconds?: number; preferPopup?: boolean; skipBrowserRedirectFallback?: boolean }) => Promise<void>;
  cancelGoogleAuth: (reason?: string) => void;
  resetAuthLoading: () => void;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (newPass: string) => Promise<boolean>;
  pendingAuthRedirect: 'learning' | null;
  setPendingAuthRedirect: (tab: 'learning' | null) => void;

  // Subtab
  activeSubtab: LearningSubtab;
  setActiveSubtab: (tab: LearningSubtab) => void;

  // Arena
  problems: Problem[];
  problemsLoading: boolean;
  activeProblem: Problem | null;
  activeProblemAttempts: ProblemAttempt[];
  categoryFilter: string;
  difficultyFilter: string;
  searchQuery: string;
  revealedHints: string[];
  hintLoading: boolean;
  submittingAttempt: boolean;
  attemptResult: any | null;

  // Challenges
  challenges: SimulationChallenge[];
  challengesLoading: boolean;
  activeChallenge: SimulationChallenge | null;
  submittingChallenge: boolean;
  challengeResult: any | null;

  // Leaderboard
  leaderboardScope: 'global' | 'institution' | 'weekly' | 'all_time';
  leaderboardMetric: 'xp' | 'rating' | 'problems_solved';
  leaderboardEntries: any[];
  leaderboardLoading: boolean;

  // Badges
  badges: any[];
  badgesLoading: boolean;

  // Analytics
  analyticsData: any | null;
  analyticsLoading: boolean;

  // Classroom
  classrooms: Classroom[];
  classroomsLoading: boolean;
  activeClassroom: any | null;
  activeAssignment: any | null;
  classroomAnalytics: any | null;

  // UI Modals
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;

  // Actions
  initializeAuth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (data: { name: string; username: string; email: string; password: string; role?: string; institution?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; institution?: string; avatarUrl?: string; role?: string }) => Promise<void>;

  setCategoryFilter: (cat: string) => void;
  setDifficultyFilter: (diff: string) => void;
  setSearchQuery: (query: string) => void;
  fetchProblems: () => Promise<void>;
  selectProblem: (id: string | null) => Promise<void>;
  requestNextHint: () => Promise<void>;
  submitProblemAttempt: (answer: any, solveTimeMs: number) => Promise<any>;

  fetchChallenges: () => Promise<void>;
  selectChallenge: (id: string | null) => void;
  submitSimulationChallenge: (finalJoints: number[], completionTimeSeconds?: number) => Promise<any>;
  setLeaderboardScope: (scope: 'global' | 'institution' | 'weekly' | 'all_time') => void;
  setLeaderboardMetric: (metric: 'xp' | 'rating' | 'problems_solved') => void;
  fetchLeaderboard: () => Promise<void>;

  fetchBadges: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;

  fetchClassrooms: () => Promise<void>;
  createClassroom: (name: string, description?: string, institution?: string) => Promise<boolean>;
  joinClassroom: (joinCode: string) => Promise<{ success: boolean; message?: string }>;
  selectClassroom: (id: string | null) => Promise<void>;
  createAssignment: (classroomId: string, data: any) => Promise<boolean>;
  selectAssignment: (id: string | null) => Promise<void>;
  submitAssignment: (assignmentId: string, attempts: any, timeSpentSeconds: number) => Promise<boolean>;
}

const PENDING_REDIRECT_KEY = 'kyntrix_pending_auth_redirect';

function getStoredPendingRedirect(): 'learning' | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = sessionStorage.getItem(PENDING_REDIRECT_KEY);
    return val === 'learning' ? 'learning' : null;
  } catch {
    return null;
  }
}

function setStoredPendingRedirect(tab: 'learning' | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (tab) {
      sessionStorage.setItem(PENDING_REDIRECT_KEY, tab);
    } else {
      sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    }
  } catch {}
}

export const useLearningStore = create<LearningState>((set, get) => ({
  user: null,
  profile: null,
  token: ApiClient.getToken(),
  isAuthenticated: false,
  authLoading: true,
  googleAuthLoading: false,
  googleCountdown: 30,
  authError: null,
  authSuccess: null,
  authMode: 'signin',
  pendingConfirmationEmail: null,
  setAuthMode: (mode) => set({ authMode: mode, authError: null, authSuccess: null }),
  setAuthSuccess: (msg) => set({ authSuccess: msg }),
  setAuthError: (msg) => set({ authError: msg }),
  setPendingConfirmationEmail: (email) => set({ pendingConfirmationEmail: email }),
  pendingAuthRedirect: getStoredPendingRedirect(),
  setPendingAuthRedirect: (tab) => {
    setStoredPendingRedirect(tab);
    set({ pendingAuthRedirect: tab });
  },

  activeSubtab: 'dashboard',
  setActiveSubtab: (tab) => set({ activeSubtab: tab }),

  problems: [],
  problemsLoading: false,
  activeProblem: null,
  activeProblemAttempts: [],
  categoryFilter: '',
  difficultyFilter: '',
  searchQuery: '',
  revealedHints: [],
  hintLoading: false,
  submittingAttempt: false,
  attemptResult: null,

  challenges: [],
  challengesLoading: false,
  activeChallenge: null,
  submittingChallenge: false,
  challengeResult: null,
  leaderboardScope: 'global',
  leaderboardMetric: 'xp',
  leaderboardEntries: [],
  leaderboardLoading: false,

  badges: [],
  badgesLoading: false,

  analyticsData: null,
  analyticsLoading: false,

  classrooms: [],
  classroomsLoading: false,
  activeClassroom: null,
  activeAssignment: null,
  classroomAnalytics: null,

  authModalOpen: false,
  setAuthModalOpen: (open) =>
    set((state) => {
      const pending = open ? state.pendingAuthRedirect : null;
      if (!open) {
        setStoredPendingRedirect(null);
        if (state.googleAuthLoading) {
          clearGoogleAuthTimers();
          closeGoogleAuthPopup();
        }
      }
      return {
        authModalOpen: open,
        authError: null,
        authSuccess: null,
        pendingAuthRedirect: pending,
        ...(open ? {} : { googleAuthLoading: false, authLoading: false, googleCountdown: 30 }),
      };
    }),

  // --- Auth Actions ---
  initializeAuth: async () => {
    // Only subscribe to auth state changes once across store lifecycles
    if (!authListenerSubscribed) {
      authListenerSubscribed = true;
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          clearGoogleAuthTimers();
          closeGoogleAuthPopup();
          ApiClient.setToken(null);
          setStoredPendingRedirect(null);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            authLoading: false,
            googleAuthLoading: false,
            googleCountdown: 30,
            pendingAuthRedirect: null,
            badges: [],
            analyticsData: null,
          });
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          clearGoogleAuthTimers();
          closeGoogleAuthPopup();
          if (session?.user) {
            const token = session.access_token;
            ApiClient.setToken(token);
            const prof = await AuthService.getProfile(session.user.id);
            const dbUser = buildUserFromSupabase(session.user, prof);
            set({
              user: dbUser,
              token,
              isAuthenticated: true,
              authLoading: false,
              googleAuthLoading: false,
              googleCountdown: 30,
              authModalOpen: false,
            });
            get().fetchBadges();
            get().fetchAnalytics();
          }
        } else if (event === 'PASSWORD_RECOVERY') {
          set({
            authModalOpen: true,
            authMode: 'reset-password',
            authError: null,
            authSuccess: null,
          });
        }
      });
    }

    if (authInitializing) return;
    authInitializing = true;
    if (!get().isAuthenticated || !get().user) {
      set({ authLoading: true });
    }
    try {
      const session = await AuthService.getSession();
      if (session?.user) {
        clearGoogleAuthTimers();
        closeGoogleAuthPopup();
        const token = session.access_token;
        ApiClient.setToken(token);
        const prof = await AuthService.getProfile(session.user.id);
        const dbUser = buildUserFromSupabase(session.user, prof);
        set({
          user: dbUser,
          token,
          isAuthenticated: true,
          authLoading: false,
          googleAuthLoading: false,
          googleCountdown: 30,
        });
        get().fetchBadges();
        get().fetchAnalytics();
      } else {
        const currentToken = ApiClient.getToken() || get().token;
        if (currentToken && get().user) {
          set({ authLoading: false, isAuthenticated: true });
        } else if (currentToken) {
          try {
            const meRes = await ApiClient.getMe();
            if (meRes.status === 200 && meRes.data?.user) {
              set({
                user: meRes.data.user,
                profile: meRes.data.profile || null,
                token: currentToken,
                isAuthenticated: true,
                authLoading: false,
                googleAuthLoading: false,
                googleCountdown: 30,
              });
              get().fetchBadges();
              get().fetchAnalytics();
              return;
            }
          } catch {
            // Expired or invalid token
          }
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            authLoading: false,
            googleAuthLoading: false,
            googleCountdown: 30,
          });
        } else {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            authLoading: false,
            googleAuthLoading: false,
            googleCountdown: 30,
          });
        }
      }
    } catch {
      clearGoogleAuthTimers();
      closeGoogleAuthPopup();
      set({ authLoading: false, googleAuthLoading: false, googleCountdown: 30 });
    } finally {
      authInitializing = false;
    }
  },

  login: async (email, password) => {
    set({ authLoading: true, authError: null, authSuccess: null });
    const res = await AuthService.signIn({ email, password });
    if (res.error) {
      // Fallback for offline or static hosting environments (e.g. GitHub Pages / tests)
      const clientRes = await ApiClient.login({ email, password });
      if (clientRes.data && clientRes.data.token) {
        ApiClient.setToken(clientRes.data.token);
        set({
          token: clientRes.data.token,
          user: clientRes.data.user,
          profile: clientRes.data.profile,
          isAuthenticated: true,
          authLoading: false,
          authModalOpen: false,
        });
        await Promise.all([
          get().fetchBadges(),
          get().fetchAnalytics(),
          get().fetchProblems(),
        ]);
        return true;
      }
      set({ authError: res.error, authLoading: false });
      return false;
    }
    if (res.session && res.user) {
      const token = res.session.access_token;
      ApiClient.setToken(token);
      const prof = await AuthService.getProfile(res.user.id);
      const dbUser = buildUserFromSupabase(res.user, prof);
      set({
        token,
        user: dbUser,
        isAuthenticated: true,
        authLoading: false,
        authModalOpen: false,
      });
      await Promise.all([
        get().fetchBadges(),
        get().fetchAnalytics(),
        get().fetchProblems(),
      ]);
      return true;
    }
    set({ authLoading: false });
    return false;
  },

  register: async (data) => {
    set({ authLoading: true, authError: null, authSuccess: null });
    const res = await AuthService.signUp({
      email: data.email,
      password: data.password,
      fullName: data.name,
      username: data.username,
      role: data.role,
      institution: data.institution,
    });
    if (res.error) {
      // Fallback for offline or static hosting environments (e.g. GitHub Pages / tests)
      const clientRes = await ApiClient.register(data);
      if (clientRes.data && clientRes.data.token) {
        ApiClient.setToken(clientRes.data.token);
        set({
          token: clientRes.data.token,
          user: clientRes.data.user,
          profile: clientRes.data.profile,
          isAuthenticated: true,
          authLoading: false,
          authModalOpen: false,
        });
        await Promise.all([
          get().fetchBadges(),
          get().fetchAnalytics(),
          get().fetchProblems(),
        ]);
        return true;
      }
      set({ authError: res.error, authLoading: false });
      return false;
    }
    if (res.needsEmailConfirmation) {
      set({
        authSuccess: 'Account created successfully. Please check your email to verify your KyntriX account.',
        authLoading: false,
        authMode: 'confirm-email',
        pendingConfirmationEmail: data.email,
      });
      return true;
    }
    if (res.session && res.user) {
      const token = res.session.access_token;
      ApiClient.setToken(token);
      const prof = await AuthService.getProfile(res.user.id);
      const dbUser = buildUserFromSupabase(res.user, prof);
      set({
        token,
        user: dbUser,
        isAuthenticated: true,
        authLoading: false,
        authModalOpen: false,
      });
      await Promise.all([
        get().fetchBadges(),
        get().fetchAnalytics(),
        get().fetchProblems(),
      ]);
      return true;
    }
    set({ authLoading: false });
    return true;
  },

  loginWithGoogle: async (options?: { timeoutSeconds?: number; preferPopup?: boolean; skipBrowserRedirectFallback?: boolean }) => {
    clearGoogleAuthTimers();
    closeGoogleAuthPopup();

    const timeoutSec = options?.timeoutSeconds ?? 30;

    set({
      authLoading: true,
      googleAuthLoading: true,
      googleCountdown: timeoutSec,
      authError: null,
      authSuccess: null,
    });

    // Authoritative 1s countdown timer in store
    googleAuthCountdownInterval = setInterval(() => {
      const current = get().googleCountdown;
      if (current <= 1) {
        get().cancelGoogleAuth(
          'Google sign-in timed out. Please try again or sign in with your email and password below.'
        );
      } else {
        set({ googleCountdown: current - 1 });
      }
    }, 1000);

    // Hard safety timeout
    googleAuthTimeoutTimer = setTimeout(() => {
      const state = get();
      if (state.googleAuthLoading && !state.isAuthenticated) {
        get().cancelGoogleAuth(
          'Google sign-in timed out. Please try again or sign in with your email and password below.'
        );
      }
    }, timeoutSec * 1000);

    const preferPopup = options?.preferPopup ?? (typeof window !== 'undefined' && typeof window.open === 'function');
    const res = await AuthService.signInWithGoogle({ skipBrowserRedirect: preferPopup });

    if (res.error) {
      clearGoogleAuthTimers();
      closeGoogleAuthPopup();
      set({
        authError: res.error,
        authLoading: false,
        googleAuthLoading: false,
        googleCountdown: 30,
      });
      return;
    }

    if (preferPopup && res.url && typeof window !== 'undefined' && typeof window.open === 'function') {
      const width = 500;
      const height = 620;
      const left = typeof window.screenX !== 'undefined'
        ? window.screenX + Math.max(0, (window.outerWidth || 1024) - width) / 2
        : 100;
      const top = typeof window.screenY !== 'undefined'
        ? window.screenY + Math.max(0, (window.outerHeight || 768) - height) / 2
        : 100;

      try {
        googleAuthPopup = window.open(
          res.url,
          'kyntrix_google_oauth',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );
      } catch {
        googleAuthPopup = null;
      }

      if (googleAuthPopup && typeof googleAuthPopup.closed !== 'undefined') {
        // Poll popup.closed every 400ms to immediately catch when user closes the window
        googleAuthPopupPollTimer = setInterval(async () => {
          if (googleAuthPopup && googleAuthPopup.closed) {
            if (googleAuthPopupPollTimer) {
              clearInterval(googleAuthPopupPollTimer);
              googleAuthPopupPollTimer = null;
            }
            googleAuthPopup = null;
            const session = await AuthService.getSession();
            if (!session?.user && get().googleAuthLoading) {
              get().cancelGoogleAuth(
                'Google sign-in window was closed. You can sign in with your email and password below.'
              );
            }
          }
        }, 400);
      } else if (!googleAuthPopup && typeof window !== 'undefined' && window.location?.assign && process.env.NODE_ENV !== 'test' && !options?.skipBrowserRedirectFallback) {
        window.location.assign(res.url);
      }
    }
  },

  cancelGoogleAuth: (reason?: string) => {
    clearGoogleAuthTimers();
    closeGoogleAuthPopup();
    set({
      authLoading: false,
      googleAuthLoading: false,
      googleCountdown: 30,
      ...(reason !== undefined ? { authError: reason } : {}),
    });
  },

  resetAuthLoading: () => {
    clearGoogleAuthTimers();
    closeGoogleAuthPopup();
    set({
      authLoading: false,
      googleAuthLoading: false,
      googleCountdown: 30,
    });
  },

  sendPasswordReset: async (email) => {
    set({ authLoading: true, authError: null, authSuccess: null });
    const res = await AuthService.sendPasswordResetEmail(email);
    if (res.error) {
      set({ authError: res.error, authLoading: false });
      return false;
    }
    set({
      authSuccess: 'Password reset link sent! Please check your email inbox.',
      authLoading: false,
    });
    return true;
  },

  resendVerificationEmail: async (email) => {
    set({ authLoading: true, authError: null, authSuccess: null });
    const res = await AuthService.resendVerificationEmail(email);
    if (res.error) {
      set({ authError: res.error, authLoading: false });
      return false;
    }
    set({
      authSuccess: 'A new verification link has been sent to your email inbox.',
      authLoading: false,
    });
    return true;
  },

  updatePassword: async (newPass) => {
    set({ authLoading: true, authError: null, authSuccess: null });
    const res = await AuthService.updatePassword(newPass);
    if (res.error) {
      set({ authError: res.error, authLoading: false });
      return false;
    }
    set({
      authSuccess: 'Password updated successfully!',
      authLoading: false,
      authModalOpen: false,
      authMode: 'signin',
    });
    return true;
  },

  logout: async () => {
    clearGoogleAuthTimers();
    closeGoogleAuthPopup();
    try {
      await AuthService.signOut();
    } catch {}
    ApiClient.setToken(null);
    setStoredPendingRedirect(null);
    set({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      authLoading: false,
      googleAuthLoading: false,
      googleCountdown: 30,
      authError: null,
      authSuccess: null,
      authMode: 'signin',
      pendingConfirmationEmail: null,
      badges: [],
      analyticsData: null,
      activeProblem: null,
      activeProblemAttempts: [],
      activeSubtab: 'profile',
      pendingAuthRedirect: null,
    });
  },

  updateProfile: async (data) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const res = await AuthService.updateProfile(currentUser.id, {
      full_name: data.name,
      institution: data.institution,
      avatar_url: data.avatarUrl,
      role: data.role,
    });
    if (res.data) {
      set({
        user: {
          ...currentUser,
          name: res.data.full_name || currentUser.name,
          institution: res.data.institution || currentUser.institution,
          avatarUrl: res.data.avatar_url || currentUser.avatarUrl,
          role: (res.data.role?.toLowerCase() as UserRole) || currentUser.role,
        },
      });
    }
  },

  // --- Arena Actions ---
  setCategoryFilter: (cat) => {
    set({ categoryFilter: cat });
    get().fetchProblems();
  },

  setDifficultyFilter: (diff) => {
    set({ difficultyFilter: diff });
    get().fetchProblems();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().fetchProblems();
  },

  fetchProblems: async () => {
    set({ problemsLoading: true });
    const res = await ApiClient.getProblems({
      category: get().categoryFilter || undefined,
      difficulty: get().difficultyFilter || undefined,
      search: get().searchQuery || undefined,
    });
    const raw = res.data;
    const problemList = Array.isArray(raw)
      ? raw
      : (raw && Array.isArray(raw.problems))
      ? raw.problems
      : [];
    set({ problems: problemList, problemsLoading: false });
  },

  selectProblem: async (id) => {
    if (!id) {
      set({ activeProblem: null, activeProblemAttempts: [], revealedHints: [], attemptResult: null });
      return;
    }
    const res = await ApiClient.getProblem(id);
    if (res.data && res.data.problem) {
      set({
        activeProblem: res.data.problem,
        activeProblemAttempts: res.data.attempts || [],
        revealedHints: [],
        attemptResult: null,
      });
    }
  },

  requestNextHint: async () => {
    const active = get().activeProblem;
    if (!active) return;
    const currentCount = get().revealedHints.length;
    if (currentCount >= active.hints.length) return;

    set({ hintLoading: true });
    const res = await ApiClient.getHint(active.id, currentCount);
    if (res.data && res.data.hint) {
      set((s) => ({
        revealedHints: [...s.revealedHints, res.data.hint],
        hintLoading: false,
      }));
    } else {
      set({ hintLoading: false });
    }
  },

  submitProblemAttempt: async (answer, solveTimeMs) => {
    const active = get().activeProblem;
    if (!active) return;

    set({ submittingAttempt: true });
    const res = await ApiClient.submitProblemAttempt(active.id, {
      answer,
      hintsUsed: get().revealedHints.length,
      solveTimeMs,
    });

    if (res.data) {
      set({
        attemptResult: res.data,
        submittingAttempt: false,
      });
      if (res.data.updatedProfile) {
        set({ profile: res.data.updatedProfile });
      }
      // Refresh problem attempts list
      get().selectProblem(active.id);
      // Immediately refresh badges, analytics, and problem catalogs so all stats, badges, and heatmap update in real time!
      get().fetchBadges();
      get().fetchAnalytics();
      get().fetchProblems();
      return res.data;
    } else {
      set({ submittingAttempt: false });
      return null;
    }
  },

  // --- Challenges Actions ---
  fetchChallenges: async () => {
    set({ challengesLoading: true });
    const res = await ApiClient.getChallenges();
    const raw = res.data;
    const challengeList = Array.isArray(raw)
      ? raw
      : (raw && Array.isArray(raw.challenges))
      ? raw.challenges
      : [];
    set({ challenges: challengeList, challengesLoading: false });
  },

  selectChallenge: (id) => {
    if (!id) {
      set({ activeChallenge: null, challengeResult: null });
      return;
    }
    const ch = get().challenges.find((c) => c.id === id) || null;
    set({ activeChallenge: ch, challengeResult: null });
  },

  submitSimulationChallenge: async (finalJoints, completionTimeSeconds = 15) => {
    const active = get().activeChallenge;
    if (!active) return;

    set({ submittingChallenge: true });
    const res = await ApiClient.submitChallenge(active.id, {
      finalJoints,
      completionTimeSeconds,
    });

    if (res.data) {
      set({
        challengeResult: res.data,
        submittingChallenge: false,
      });
      if (res.data.updatedProfile) {
        set({ profile: res.data.updatedProfile });
      }
      // Immediately refresh badges and analytics
      get().fetchBadges();
      get().fetchAnalytics();
      return res.data;
    } else {
      set({ submittingChallenge: false });
      return null;
    }
  },
  // --- Leaderboard & Badges ---
  setLeaderboardScope: (scope) => {
    set({ leaderboardScope: scope });
    get().fetchLeaderboard();
  },

  setLeaderboardMetric: (metric) => {
    set({ leaderboardMetric: metric });
    get().fetchLeaderboard();
  },

  fetchLeaderboard: async () => {
    set({ leaderboardLoading: true });
    const res = await ApiClient.getLeaderboard({
      scope: get().leaderboardScope,
      metric: get().leaderboardMetric,
      institution: get().leaderboardScope === 'institution' ? get().user?.institution : undefined,
    });
    const raw = res.data;
    const entries = Array.isArray(raw)
      ? raw
      : (raw && Array.isArray(raw.entries))
      ? raw.entries
      : (raw && Array.isArray(raw.leaderboard))
      ? raw.leaderboard
      : [];
    set({ leaderboardEntries: entries, leaderboardLoading: false });
  },

  fetchBadges: async () => {
    set({ badgesLoading: true });
    const res = await ApiClient.getBadges();
    const raw = res.data;
    const badgeList = Array.isArray(raw)
      ? raw
      : (raw && Array.isArray(raw.badges))
      ? raw.badges
      : [];
    set({ badges: badgeList, badgesLoading: false });
  },

  // --- Analytics ---
  fetchAnalytics: async () => {
    if (!ApiClient.getToken()) {
      set({ analyticsData: null, analyticsLoading: false });
      return;
    }
    set({ analyticsLoading: true });
    const res = await ApiClient.getAnalytics();
    if (res.data) {
      set({
        analyticsData: res.data,
        analyticsLoading: false,
        profile: res.data.profile || get().profile,
      });
    } else {
      set({ analyticsData: null, analyticsLoading: false });
    }
  },

  // --- Classroom Actions ---
  fetchClassrooms: async () => {
    set({ classroomsLoading: true });
    const res = await ApiClient.getClassrooms();
    const raw = res.data;
    const classList = Array.isArray(raw)
      ? raw
      : (raw && Array.isArray(raw.classrooms))
      ? raw.classrooms
      : [];
    set({ classrooms: classList, classroomsLoading: false });
  },

  createClassroom: async (name, description, institution) => {
    const res = await ApiClient.createClassroom({ name, description, institution });
    if (res.data && res.data.classroom) {
      get().fetchClassrooms();
      return true;
    }
    return false;
  },

  joinClassroom: async (joinCode) => {
    const res = await ApiClient.joinClassroom(joinCode);
    if (res.data && res.data.classroom) {
      get().fetchClassrooms();
      return { success: true };
    }
    return { success: false, message: res.error || 'Failed to join classroom.' };
  },

  selectClassroom: async (id) => {
    if (!id) {
      set({ activeClassroom: null, classroomAnalytics: null, activeAssignment: null });
      return;
    }
    const res = await ApiClient.getClassroom(id);
    if (res.data && res.data.classroom) {
      set({ activeClassroom: res.data, activeAssignment: null });
      // Fetch teacher analytics if teacher
      if (get().user?.role === 'teacher' || get().user?.role === 'admin') {
        const analyticsRes = await ApiClient.getClassroomAnalytics(id);
        if (analyticsRes.data) {
          set({ classroomAnalytics: analyticsRes.data });
        }
      }
    } else {
      set({ activeClassroom: null, classroomAnalytics: null, activeAssignment: null });
    }
  },

  createAssignment: async (classroomId, data) => {
    const res = await ApiClient.createAssignment(classroomId, data);
    if (res.data && res.data.assignment) {
      get().selectClassroom(classroomId);
      return true;
    }
    return false;
  },

  selectAssignment: async (id) => {
    if (!id) {
      set({ activeAssignment: null });
      return;
    }
    const res = await ApiClient.getAssignment(id);
    if (res.data && res.data.assignment) {
      set({ activeAssignment: res.data });
    } else {
      set({ activeAssignment: null });
    }
  },

  submitAssignment: async (assignmentId, attempts, timeSpentSeconds) => {
    const res = await ApiClient.submitAssignment(assignmentId, {
      problemAttempts: attempts,
      timeSpentSeconds,
    });
    if (res.data && res.data.submission) {
      get().selectAssignment(assignmentId);
      get().fetchBadges();
      get().fetchAnalytics();
      return true;
    }
    return false;
  },
}));
