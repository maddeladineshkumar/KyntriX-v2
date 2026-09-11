import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useLearningStore } from '../../src/features/learning/useLearningStore';
import { LearningWorkspace } from '../../src/features/learning/LearningWorkspace';
import { ApiClient } from '../../src/features/learning/apiClient';

// Mock Viewport3D to avoid WebGL context creation in JSDOM
vi.mock('../../src/features/viewport/Viewport3D', () => ({
  Viewport3D: () => <div data-testid="mock-viewport-3d" />,
}));

// Mock Supabase to isolate auth testing
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
    },
  },
}));

import App from '../../src/App';
import { AuthModal } from '../../src/features/learning/AuthModal';
import { supabase } from '../../src/lib/supabase';

describe('AI & Learning Authentication Protection Suite', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    ApiClient.setToken(null);
    sessionStorage.clear();

    // Reset learning store to initial unauthenticated state
    useLearningStore.setState({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      authLoading: false,
      authError: null,
      authSuccess: null,
      authMode: 'signin',
      authModalOpen: false,
      pendingAuthRedirect: null,
      activeSubtab: 'dashboard',
    });
  });

  afterEach(() => {
    ApiClient.setToken(null);
    sessionStorage.clear();
    useLearningStore.setState({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      authLoading: false,
      authModalOpen: false,
      pendingAuthRedirect: null,
    });

    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  describe('Store: pendingAuthRedirect and Modal Lifecycle', () => {
    it('sets and cleans up pendingAuthRedirect properly when modal closes', () => {
      const store = useLearningStore.getState();
      expect(store.pendingAuthRedirect).toBeNull();

      // User initiates redirect to learning
      store.setPendingAuthRedirect('learning');
      store.setAuthModalOpen(true);
      expect(useLearningStore.getState().pendingAuthRedirect).toBe('learning');
      expect(useLearningStore.getState().authModalOpen).toBe(true);

      // User closes modal without authenticating
      store.setAuthModalOpen(false);
      expect(useLearningStore.getState().pendingAuthRedirect).toBeNull();
      expect(useLearningStore.getState().authModalOpen).toBe(false);
    });

    it('clears pendingAuthRedirect upon logout', async () => {
      const store = useLearningStore.getState();
      useLearningStore.setState({
        isAuthenticated: true,
        user: { id: 'u1', name: 'Test User', email: 'test@example.com', username: 'test', role: 'student', passwordHash: '', salt: '', createdAt: '', updatedAt: '' },
        pendingAuthRedirect: 'learning',
      });

      await store.logout();
      expect(useLearningStore.getState().isAuthenticated).toBe(false);
      expect(useLearningStore.getState().user).toBeNull();
      expect(useLearningStore.getState().pendingAuthRedirect).toBeNull();
      expect(sessionStorage.getItem('kyntrix_pending_auth_redirect')).toBeNull();
    });

    it('persists pendingAuthRedirect in sessionStorage for third-party OAuth redirect recovery', () => {
      const store = useLearningStore.getState();
      store.setPendingAuthRedirect('learning');
      expect(sessionStorage.getItem('kyntrix_pending_auth_redirect')).toBe('learning');

      store.setPendingAuthRedirect(null);
      expect(sessionStorage.getItem('kyntrix_pending_auth_redirect')).toBeNull();
    });
  });

  describe('LearningWorkspace: Unauthenticated Lock Gate', () => {
    it('does NOT render Arena, Challenges, or Dashboard content when unauthenticated', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<LearningWorkspace />);
      });

      const text = container.textContent || '';
      // Verify lock gate is displayed
      expect(text).toContain('Sign In to Access AI & Learning');
      expect(text).toContain('Kinematics Benchmarks, and Learning Analytics require you to be signed in');

      // Verify the actual Problem Arena view and its interactive components are NOT rendered
      expect(text).not.toContain('KyntriX Problem Arena');
      expect(text).not.toContain('Solve Arena ➔');
      expect(text).not.toContain('Leaderboard');

      act(() => {
        root.unmount();
      });
    });

    it('triggers auth modal in signin mode when clicking Sign In on lock gate', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<LearningWorkspace />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const signInBtn = buttons.find((b) => b.textContent?.includes('Sign In'));
      expect(signInBtn).toBeDefined();

      await act(async () => {
        signInBtn?.click();
      });

      expect(useLearningStore.getState().authModalOpen).toBe(true);
      expect(useLearningStore.getState().authMode).toBe('signin');

      act(() => {
        root.unmount();
      });
    });

    it('triggers auth modal in register mode when clicking Create Free Account on lock gate', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<LearningWorkspace />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const registerBtn = buttons.find((b) => b.textContent?.includes('Create Free Account'));
      expect(registerBtn).toBeDefined();

      await act(async () => {
        registerBtn?.click();
      });

      expect(useLearningStore.getState().authModalOpen).toBe(true);
      expect(useLearningStore.getState().authMode).toBe('register');

      act(() => {
        root.unmount();
      });
    });

    it('calls onOpenSimulator when clicking Return to 3D Simulator', async () => {
      const openSimulatorSpy = vi.fn();
      const root = createRoot(container);
      await act(async () => {
        root.render(<LearningWorkspace onOpenSimulator={openSimulatorSpy} />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const returnBtn = buttons.find((b) => b.textContent?.includes('Return to 3D Simulator'));
      expect(returnBtn).toBeDefined();

      await act(async () => {
        returnBtn?.click();
      });

      expect(openSimulatorSpy).toHaveBeenCalledTimes(1);

      act(() => {
        root.unmount();
      });
    });

    it('renders full workspace when user is authenticated', async () => {
      ApiClient.setToken('mock-auth-token');
      useLearningStore.setState({
        isAuthenticated: true,
        token: 'mock-auth-token',
        user: {
          id: 'u-123',
          name: 'Elena Rostova',
          email: 'elena@mit.edu',
          username: 'elena_r',
          role: 'teacher',
          passwordHash: '',
          salt: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        profile: {
          userId: 'u-123',
          xp: 1500,
          rating: 1400,
          streak: { currentStreak: 5, longestStreak: 12, lastActiveDate: '' },
          stats: { problemsSolved: 10, totalAttempts: 12, categoryStats: {} as any },
          badges: [],
          updatedAt: '',
        },
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<LearningWorkspace />);
      });

      const text = container.textContent || '';
      expect(text).not.toContain('Sign In to Access AI & Learning');
      expect(text).toContain('Dashboard');
      expect(text).toContain('Arena');
      expect(text).toContain('Challenges');
      expect(text).toContain('Analytics');
      expect(text).toContain('Profile');

      act(() => {
        root.unmount();
      });
    });
  });

  describe('AuthModal: Segmented Switcher & Dismissal', () => {
    it('renders segmented switcher and allows toggling between Sign In and Sign Up directly', async () => {
      useLearningStore.setState({ authModalOpen: true, authMode: 'signin', pendingAuthRedirect: 'learning' });
      const root = createRoot(container);
      await act(async () => {
        root.render(<AuthModal />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const signUpTab = buttons.find((b) => b.textContent?.includes('Create Account') || b.textContent?.includes('Sign Up'));
      expect(signUpTab).toBeDefined();

      await act(async () => {
        signUpTab?.click();
      });

      expect(useLearningStore.getState().authMode).toBe('register');
      expect(container.textContent).toContain('Full Name');
      expect(container.textContent).toContain('Username');

      const signInTab = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Sign In'));
      await act(async () => {
        signInTab?.click();
      });

      expect(useLearningStore.getState().authMode).toBe('signin');
      expect(container.textContent).not.toContain('Full Name');

      act(() => {
        root.unmount();
      });
    });

    it('dismisses modal and clears pendingAuthRedirect when Escape key is pressed', async () => {
      useLearningStore.setState({ authModalOpen: true, authMode: 'signin', pendingAuthRedirect: 'learning' });
      const root = createRoot(container);
      await act(async () => {
        root.render(<AuthModal />);
      });

      expect(useLearningStore.getState().authModalOpen).toBe(true);

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(useLearningStore.getState().authModalOpen).toBe(false);
      expect(useLearningStore.getState().pendingAuthRedirect).toBeNull();

      act(() => {
        root.unmount();
      });
    });

    it('dismisses modal and clears pendingAuthRedirect when clicking outside dialog on backdrop', async () => {
      useLearningStore.setState({ authModalOpen: true, authMode: 'signin', pendingAuthRedirect: 'learning' });
      const root = createRoot(container);
      await act(async () => {
        root.render(<AuthModal />);
      });

      const backdrop = container.querySelector('[role="dialog"]');
      expect(backdrop).toBeDefined();

      await act(async () => {
        backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(useLearningStore.getState().authModalOpen).toBe(false);
      expect(useLearningStore.getState().pendingAuthRedirect).toBeNull();

      act(() => {
        root.unmount();
      });
    });
  });

  describe('App: Homepage Mode Selector & Auth Redirection', () => {
    it('redirects to login and does NOT show learning workspace when unauthenticated user clicks AI & Learning', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<App />);
      });

      // Find AI & Learning button in top navigation bar
      const buttons = Array.from(container.querySelectorAll('button'));
      const aiLearningBtn = buttons.find(
        (b) => b.getAttribute('aria-label') === 'AI & Learning Mode' || b.textContent?.includes('AI & Learning')
      );
      expect(aiLearningBtn).toBeDefined();

      // Click AI & Learning while unauthenticated
      await act(async () => {
        aiLearningBtn?.click();
      });

      // Verification 1: AuthModal opened in signin mode
      expect(useLearningStore.getState().authModalOpen).toBe(true);
      expect(useLearningStore.getState().authMode).toBe('signin');
      expect(useLearningStore.getState().pendingAuthRedirect).toBe('learning');

      // Verification 2: Top mode is NOT learning (user remains on homepage/simulate)
      expect(aiLearningBtn?.getAttribute('aria-pressed')).toBe('false');

      // Verification 3: Actual Learning Workspace content is NOT rendered
      expect(container.textContent).not.toContain('KyntriX Problem Arena');
      expect(container.textContent).not.toContain('Solve Arena ➔');

      act(() => {
        root.unmount();
      });
    });

    it('automatically transitions to AI & Learning and closes modal after successful authentication', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<App />);
      });

      // 1. Click AI & Learning while unauthenticated
      const buttons = Array.from(container.querySelectorAll('button'));
      const aiLearningBtn = buttons.find(
        (b) => b.getAttribute('aria-label') === 'AI & Learning Mode' || b.textContent?.includes('AI & Learning')
      );
      expect(aiLearningBtn).toBeDefined();

      await act(async () => {
        aiLearningBtn?.click();
      });

      expect(useLearningStore.getState().pendingAuthRedirect).toBe('learning');
      expect(useLearningStore.getState().authModalOpen).toBe(true);

      // 2. User successfully signs in (modal remains open before redirect takes effect)
      ApiClient.setToken('mock-login-token');
      await act(async () => {
        useLearningStore.setState({
          isAuthenticated: true,
          token: 'mock-login-token',
          user: {
            id: 'authed-1',
            name: 'Alex Vance',
            email: 'alex@stanford.edu',
            username: 'alex_v',
            role: 'student',
            passwordHash: '',
            salt: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      });

      // Wait for the scheduled timer in useEffect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Verification: User was automatically navigated to AI & Learning AND modal was closed
      expect(useLearningStore.getState().pendingAuthRedirect).toBeNull();
      expect(useLearningStore.getState().authModalOpen).toBe(false);
      const updatedButtons = Array.from(container.querySelectorAll('button'));
      const updatedAiBtn = updatedButtons.find(
        (b) => b.getAttribute('aria-label') === 'AI & Learning Mode' || b.textContent?.includes('AI & Learning')
      );
      expect(updatedAiBtn?.getAttribute('aria-pressed')).toBe('true');

      act(() => {
        root.unmount();
      });
    });

    it('goes directly into AI & Learning without prompt when user is ALREADY authenticated', async () => {
      // Pre-authenticate user
      ApiClient.setToken('mock-user-token');
      useLearningStore.setState({
        isAuthenticated: true,
        token: 'mock-user-token',
        user: {
          id: 'authed-2',
          name: 'Marcus Chen',
          email: 'marcus@berkeley.edu',
          username: 'marcus_c',
          role: 'student',
          passwordHash: '',
          salt: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<App />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const aiLearningBtn = buttons.find(
        (b) => b.getAttribute('aria-label') === 'AI & Learning Mode' || b.textContent?.includes('AI & Learning')
      );
      expect(aiLearningBtn).toBeDefined();

      // Click AI & Learning while authenticated
      await act(async () => {
        aiLearningBtn?.click();
      });

      // Verification: Auth modal is NOT opened, user transitions directly
      expect(useLearningStore.getState().authModalOpen).toBe(false);
      expect(aiLearningBtn?.getAttribute('aria-pressed')).toBe('true');

      act(() => {
        root.unmount();
      });
    });

    it('redirects back to homepage and prompts login if user logs out while on AI & Learning', async () => {
      // Start authenticated and navigate to AI & Learning
      ApiClient.setToken('mock-user-token');
      useLearningStore.setState({
        isAuthenticated: true,
        token: 'mock-user-token',
        user: {
          id: 'authed-3',
          name: 'Sarah Connor',
          email: 'sarah@mit.edu',
          username: 'sarah_c',
          role: 'student',
          passwordHash: '',
          salt: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<App />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const aiLearningBtn = buttons.find(
        (b) => b.getAttribute('aria-label') === 'AI & Learning Mode' || b.textContent?.includes('AI & Learning')
      );
      await act(async () => {
        aiLearningBtn?.click();
      });
      expect(aiLearningBtn?.getAttribute('aria-pressed')).toBe('true');

      // User logs out while on learning tab
      ApiClient.setToken(null);
      await act(async () => {
        useLearningStore.setState({
          isAuthenticated: false,
          user: null,
          token: null,
          authLoading: false,
        });
      });

      // Wait for the scheduled timer
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Verification: Bounced out of learning tab, signin modal opened
      const simulateBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Simulate Kinematics Mode'
      );
      expect(simulateBtn?.getAttribute('aria-pressed')).toBe('true');
      expect(useLearningStore.getState().authModalOpen).toBe(true);
      expect(useLearningStore.getState().authMode).toBe('signin');

      act(() => {
        root.unmount();
      });
    });

    it('does not flash login modal when user clicks AI & Learning while authLoading is true and session is valid', async () => {
      let resolveSession!: (val: any) => void;
      vi.mocked(supabase.auth.getSession).mockImplementationOnce(
        () => new Promise((resolve) => { resolveSession = resolve; })
      );

      useLearningStore.setState({
        isAuthenticated: false,
        user: null,
        token: null,
        authLoading: true,
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<App />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const aiLearningBtn = buttons.find(
        (b) => b.getAttribute('aria-label') === 'AI & Learning Mode' || b.textContent?.includes('AI & Learning')
      );
      expect(aiLearningBtn).toBeDefined();

      // Click while authLoading is true
      await act(async () => {
        aiLearningBtn?.click();
      });

      // Pending redirect is recorded, but authModal is NOT yet opened
      expect(useLearningStore.getState().pendingAuthRedirect).toBe('learning');
      expect(useLearningStore.getState().authModalOpen).toBe(false);

      // Session loads and authenticates successfully
      ApiClient.setToken('session-token');
      await act(async () => {
        resolveSession({
          data: {
            session: {
              access_token: 'session-token',
              user: {
                id: 'authed-4',
                email: 'bowman@discovery.org',
                user_metadata: { full_name: 'David Bowman', username: 'dbowman', role: 'teacher' },
              },
            },
          },
          error: null,
        });
      });

      // Wait for timer
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // User transitions straight to learning tab, modal was never opened
      expect(useLearningStore.getState().authModalOpen).toBe(false);
      expect(useLearningStore.getState().pendingAuthRedirect).toBeNull();
      const updatedButtons = Array.from(container.querySelectorAll('button'));
      const updatedAiBtn = updatedButtons.find(
        (b) => b.getAttribute('aria-label') === 'AI & Learning Mode' || b.textContent?.includes('AI & Learning')
      );
      expect(updatedAiBtn?.getAttribute('aria-pressed')).toBe('true');

      act(() => {
        root.unmount();
      });
    });

    it('prompts signin modal once authLoading completes if user clicked AI & Learning and was unauthenticated', async () => {
      let resolveSession!: (val: any) => void;
      vi.mocked(supabase.auth.getSession).mockImplementationOnce(
        () => new Promise((resolve) => { resolveSession = resolve; })
      );

      useLearningStore.setState({
        isAuthenticated: false,
        user: null,
        token: null,
        authLoading: true,
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<App />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const aiLearningBtn = buttons.find(
        (b) => b.getAttribute('aria-label') === 'AI & Learning Mode' || b.textContent?.includes('AI & Learning')
      );
      expect(aiLearningBtn).toBeDefined();

      // Click while authLoading is true
      await act(async () => {
        aiLearningBtn?.click();
      });

      expect(useLearningStore.getState().pendingAuthRedirect).toBe('learning');
      expect(useLearningStore.getState().authModalOpen).toBe(false);

      // Session finishes loading with no user
      await act(async () => {
        resolveSession({
          data: { session: null },
          error: null,
        });
      });

      // Verification: Now that authLoading finished with unauthenticated state, modal opens
      expect(useLearningStore.getState().authModalOpen).toBe(true);
      expect(useLearningStore.getState().authMode).toBe('signin');

      act(() => {
        root.unmount();
      });
    });
  });
});
