// Ensure React 19 act environment is recognized in JSDOM
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useLearningStore, resetGoogleAuthTimerForTest } from '../../src/features/learning/useLearningStore';
import { ApiClient } from '../../src/features/learning/apiClient';

// Mock Viewport3D to avoid WebGL context creation in JSDOM
vi.mock('../../src/features/viewport/Viewport3D', () => ({
  Viewport3D: () => <div data-testid="mock-viewport-3d" />,
}));

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
      resend: vi.fn(async () => ({ data: {}, error: null })),
      signInWithOAuth: vi.fn(async () => ({
        data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2' },
        error: null,
      })),
    },
  },
}));

import { AuthModal } from '../../src/features/learning/AuthModal';
import { supabase } from '../../src/lib/supabase';

describe('Google Sign-In Timeout, Popup Tracking, Cancellation & Auto-Reset Suite', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let mockPopup: { closed: boolean; close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    ApiClient.setToken(null);
    sessionStorage.clear();
    resetGoogleAuthTimerForTest();

    mockPopup = {
      closed: false,
      close: vi.fn(() => {
        mockPopup.closed = true;
      }),
    };
    vi.spyOn(window, 'open').mockImplementation(() => mockPopup as any);

    useLearningStore.setState({
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
      authModalOpen: false,
      pendingAuthRedirect: null,
    });
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    resetGoogleAuthTimerForTest();
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  it('sets googleAuthLoading, authLoading, and googleCountdown when loginWithGoogle is initiated', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2' },
      error: null,
    } as any);

    const store = useLearningStore.getState();
    const promise = store.loginWithGoogle({ timeoutSeconds: 15 });

    const stateDuring = useLearningStore.getState();
    expect(stateDuring.googleAuthLoading).toBe(true);
    expect(stateDuring.authLoading).toBe(true);
    expect(stateDuring.googleCountdown).toBe(15);

    await promise;

    const stateAfter = useLearningStore.getState();
    expect(stateAfter.googleAuthLoading).toBe(true);
    expect(stateAfter.authLoading).toBe(true);
    expect(window.open).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2',
      'kyntrix_google_oauth',
      expect.stringContaining('width=500')
    );
  });

  it('automatically ticks down googleCountdown and times out after safety timeout expires', async () => {
    vi.useFakeTimers();

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2' },
      error: null,
    } as any);

    const store = useLearningStore.getState();
    await store.loginWithGoogle({ timeoutSeconds: 5 });

    expect(useLearningStore.getState().googleAuthLoading).toBe(true);
    expect(useLearningStore.getState().googleCountdown).toBe(5);

    // Advance 2 seconds -> countdown should decrement
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(useLearningStore.getState().googleCountdown).toBe(3);

    // Advance past remaining 3 seconds -> should timeout and cancel
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    const updated = useLearningStore.getState();
    expect(updated.googleAuthLoading).toBe(false);
    expect(updated.authLoading).toBe(false);
    expect(updated.googleCountdown).toBe(30);
    expect(updated.authError).toContain('Google sign-in timed out');
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it('detects when the Google OAuth popup window is closed by the user and immediately cancels loading', async () => {
    vi.useFakeTimers();

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2' },
      error: null,
    } as any);

    const store = useLearningStore.getState();
    await store.loginWithGoogle({ timeoutSeconds: 30 });

    expect(useLearningStore.getState().googleAuthLoading).toBe(true);

    // User closes the Google popup window
    mockPopup.closed = true;

    // Advance timer by popup poll interval (400ms)
    await act(async () => {
      vi.advanceTimersByTime(450);
      await Promise.resolve();
    });

    const updated = useLearningStore.getState();
    expect(updated.googleAuthLoading).toBe(false);
    expect(updated.authLoading).toBe(false);
    expect(updated.authError).toContain('Google sign-in window was closed');
  });

  it('immediately cancels googleAuthLoading and closes popup when cancelGoogleAuth is invoked', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2' },
      error: null,
    } as any);

    const store = useLearningStore.getState();
    await store.loginWithGoogle({ timeoutSeconds: 30 });

    expect(useLearningStore.getState().googleAuthLoading).toBe(true);

    store.cancelGoogleAuth('User opted to use email instead.');

    const updated = useLearningStore.getState();
    expect(updated.googleAuthLoading).toBe(false);
    expect(updated.authLoading).toBe(false);
    expect(updated.authError).toBe('User opted to use email instead.');
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it('resets loading immediately if signInWithOAuth returns an error', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: null,
      error: { message: 'OAuth network failure', status: 500 },
    } as any);

    const store = useLearningStore.getState();
    await store.loginWithGoogle();

    const updated = useLearningStore.getState();
    expect(updated.googleAuthLoading).toBe(false);
    expect(updated.authLoading).toBe(false);
    expect(updated.authError).toBeTruthy();
  });

  it('renders Google in-progress banner and cancel button when googleAuthLoading is active in AuthModal', async () => {
    root = createRoot(container);
    await act(async () => {
      useLearningStore.setState({
        authModalOpen: true,
        authMode: 'signin',
        googleAuthLoading: true,
        googleCountdown: 24,
        authLoading: true,
      });
      root.render(<AuthModal />);
    });

    const banner = container.querySelector('[data-testid="google-auth-in-progress"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Signing in with Google (24s)...');

    const cancelBtn = container.querySelector('[data-testid="cancel-google-btn"]') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();

    // Main submit button should remain "Sign In" and not show "Processing..."
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.textContent).toContain('Sign In');
    expect(submitBtn.textContent).not.toContain('Processing...');

    // Clicking cancel button should reset googleAuthLoading
    await act(async () => {
      cancelBtn.click();
    });

    const updated = useLearningStore.getState();
    expect(updated.googleAuthLoading).toBe(false);
    expect(updated.authLoading).toBe(false);
    expect(updated.authError).toContain('cancelled');
  });

  it('cancels Google auth when user types into any registration field (name, username, institution, confirmPassword)', async () => {
    root = createRoot(container);
    await act(async () => {
      useLearningStore.setState({
        authModalOpen: true,
        authMode: 'register',
        googleAuthLoading: true,
        authLoading: true,
      });
      root.render(<AuthModal />);
    });

    const nameInput = container.querySelector('input[placeholder="e.g. Dr. Alex Vance"]') as HTMLInputElement;
    expect(nameInput).not.toBeNull();

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(nameInput, 'Dr. Gordon');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(useLearningStore.getState().googleAuthLoading).toBe(false);
    expect(useLearningStore.getState().authLoading).toBe(false);
  });

  it('cancels Google auth and allows user to type into email or password fields without being blocked', async () => {
    root = createRoot(container);
    await act(async () => {
      useLearningStore.setState({
        authModalOpen: true,
        authMode: 'signin',
        googleAuthLoading: true,
        authLoading: true,
      });
      root.render(<AuthModal />);
    });

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    expect(emailInput).not.toBeNull();
    expect(emailInput.disabled).toBe(false);

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(emailInput, 'user@robotics.edu');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(useLearningStore.getState().googleAuthLoading).toBe(false);
    expect(useLearningStore.getState().authLoading).toBe(false);
  });

  it('cancels Google auth when user switches to Create Account tab or closes the modal', async () => {
    root = createRoot(container);
    await act(async () => {
      useLearningStore.setState({
        authModalOpen: true,
        authMode: 'signin',
        googleAuthLoading: true,
        authLoading: true,
      });
      root.render(<AuthModal />);
    });

    // Tab buttons
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
    const registerTab = tabs[1] as HTMLButtonElement;

    await act(async () => {
      registerTab.click();
    });

    expect(useLearningStore.getState().googleAuthLoading).toBe(false);
    expect(useLearningStore.getState().authMode).toBe('register');

    // Set googleAuthLoading again
    await act(async () => {
      useLearningStore.setState({ googleAuthLoading: true, authLoading: true });
    });
    expect(useLearningStore.getState().googleAuthLoading).toBe(true);

    // Press Escape to close modal
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(useLearningStore.getState().googleAuthLoading).toBe(false);
    expect(useLearningStore.getState().authModalOpen).toBe(false);
  });

  it('cancels Google auth and closes popup when setAuthModalOpen(false) is called programmatically', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2' },
      error: null,
    } as any);

    const store = useLearningStore.getState();
    await store.loginWithGoogle();

    expect(useLearningStore.getState().googleAuthLoading).toBe(true);

    store.setAuthModalOpen(false);

    expect(useLearningStore.getState().googleAuthLoading).toBe(false);
    expect(useLearningStore.getState().authLoading).toBe(false);
    expect(useLearningStore.getState().authModalOpen).toBe(false);
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it('resets Google auth when page is restored from bfcache (pageshow event)', async () => {
    root = createRoot(container);
    await act(async () => {
      useLearningStore.setState({
        authModalOpen: true,
        authMode: 'signin',
        googleAuthLoading: true,
        authLoading: true,
      });
      root.render(<AuthModal />);
    });

    const pageShowEvent = new Event('pageshow') as PageTransitionEvent;
    Object.defineProperty(pageShowEvent, 'persisted', { value: true });

    await act(async () => {
      window.dispatchEvent(pageShowEvent);
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
    });

    expect(useLearningStore.getState().googleAuthLoading).toBe(false);
    expect(useLearningStore.getState().authLoading).toBe(false);
    expect(useLearningStore.getState().authError).toContain('Google sign-in was not completed');
  });

  it('resets Google auth after user blurs and returns to window without completing auth', async () => {
    vi.useFakeTimers();

    root = createRoot(container);
    await act(async () => {
      useLearningStore.setState({
        authModalOpen: true,
        authMode: 'signin',
        googleAuthLoading: true,
        authLoading: true,
      });
      root.render(<AuthModal />);
    });

    // User blurs (switches to Google tab/window)
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    // User returns (window focus)
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    // Wait for grace period (2500ms)
    await act(async () => {
      vi.advanceTimersByTime(2600);
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
    });

    expect(useLearningStore.getState().googleAuthLoading).toBe(false);
    expect(useLearningStore.getState().authLoading).toBe(false);
    expect(useLearningStore.getState().authError).toContain('Google sign-in was not completed');
  });
});
