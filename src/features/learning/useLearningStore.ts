import { create } from 'zustand';
import { ApiClient } from './apiClient';
import type {
  User,
  UserProfile,
  Problem,
  ProblemAttempt,
  SimulationChallenge,
  Classroom,
} from '../../server/db/types';

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
  authError: string | null;

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
  updateProfile: (data: { name?: string; institution?: string; avatarUrl?: string }) => Promise<void>;

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

export const useLearningStore = create<LearningState>((set, get) => ({
  user: null,
  profile: null,
  token: ApiClient.getToken(),
  isAuthenticated: false,
  authLoading: true,
  authError: null,

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
  setAuthModalOpen: (open) => set({ authModalOpen: open }),

  // --- Auth Actions ---
  initializeAuth: async () => {
    const token = ApiClient.getToken();
    if (!token) {
      // Auto-login default demo student Dinesh Kumar so the app is instantly usable
      const loginRes = await ApiClient.login({
        email: 'student@kyntrix.edu',
        password: 'KyntriX2025!',
      });
      if (loginRes.data && loginRes.data.token) {
        ApiClient.setToken(loginRes.data.token);
        set({
          token: loginRes.data.token,
          user: loginRes.data.user,
          profile: loginRes.data.profile,
          isAuthenticated: true,
          authLoading: false,
        });
        get().fetchBadges();
        get().fetchAnalytics();
        return;
      }
      set({ authLoading: false });
      return;
    }

    set({ authLoading: true });
    const res = await ApiClient.getMe();
    if (res.data && res.data.user) {
      set({
        user: res.data.user,
        profile: res.data.profile,
        isAuthenticated: true,
        authLoading: false,
      });
      get().fetchBadges();
      get().fetchAnalytics();
    } else if (res.status === 401 || res.status === 403) {
      // Token expired, fallback to student demo
      const loginRes = await ApiClient.login({
        email: 'student@kyntrix.edu',
        password: 'KyntriX2025!',
      });
      if (loginRes.data && loginRes.data.token) {
        ApiClient.setToken(loginRes.data.token);
        set({
          token: loginRes.data.token,
          user: loginRes.data.user,
          profile: loginRes.data.profile,
          isAuthenticated: true,
          authLoading: false,
        });
        get().fetchBadges();
        get().fetchAnalytics();
      } else {
        ApiClient.setToken(null);
        set({ user: null, profile: null, isAuthenticated: false, authLoading: false });
      }
    } else {
      // Offline mode / temporary network failure (status 0): preserve existing session state
      set({ authLoading: false });
    }
  },

  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    const res = await ApiClient.login({ email, password });
    if (res.data && res.data.token) {
      ApiClient.setToken(res.data.token);
      set({
        token: res.data.token,
        user: res.data.user,
        profile: res.data.profile,
        isAuthenticated: true,
        authLoading: false,
        authModalOpen: false,
      });
      get().fetchBadges();
      get().fetchAnalytics();
      return true;
    } else {
      set({ authError: res.error || 'Login failed', authLoading: false });
      return false;
    }
  },

  register: async (data) => {
    set({ authLoading: true, authError: null });
    const res = await ApiClient.register(data);
    if (res.data && res.data.token) {
      ApiClient.setToken(res.data.token);
      set({
        token: res.data.token,
        user: res.data.user,
        profile: res.data.profile,
        isAuthenticated: true,
        authLoading: false,
        authModalOpen: false,
      });
      get().fetchBadges();
      get().fetchAnalytics();
      return true;
    } else {
      set({ authError: res.error || 'Registration failed', authLoading: false });
      return false;
    }
  },

  logout: async () => {
    await ApiClient.logout();
    set({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      activeSubtab: 'dashboard',
    });
  },

  updateProfile: async (data) => {
    const res = await ApiClient.updateProfile(data);
    if (res.data) {
      set({
        user: res.data.user,
        profile: res.data.profile,
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
    set({ analyticsLoading: true });
    const res = await ApiClient.getAnalytics();
    if (res.data) {
      set({
        analyticsData: res.data,
        analyticsLoading: false,
        profile: res.data.profile || get().profile,
      });
    } else {
      set({ analyticsLoading: false });
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
