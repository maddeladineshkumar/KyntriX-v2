// Ensure React 19 act environment is recognized in JSDOM
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useLearningStore } from '../../src/features/learning/useLearningStore';
import { ApiClient } from '../../src/features/learning/apiClient';
import { AuthService } from '../../src/lib/authService';

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
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
      resend: vi.fn(async () => ({ data: {}, error: null })),
    },
  },
}));

import { AuthModal } from '../../src/features/learning/AuthModal';
import { supabase } from '../../src/lib/supabase';

describe('Auth Email Confirmation & Transition Flow', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    ApiClient.setToken(null);
    sessionStorage.clear();

    useLearningStore.setState({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      authLoading: false,
      authError: null,
      authSuccess: null,
      authMode: 'signin',
      pendingConfirmationEmail: null,
      authModalOpen: false,
      pendingAuthRedirect: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  it('transitions store to confirm-email mode when signup requires email confirmation', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: {
        user: {
          id: 'unconfirmed-user-id',
          email: 'robotics_student@stanford.edu',
          app_metadata: {},
          user_metadata: { full_name: 'Robot Student', username: 'robostudent' },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as any,
        session: null,
      },
      error: null,
    });

    const store = useLearningStore.getState();
    const success = await store.register({
      name: 'Robot Student',
      username: 'robostudent',
      email: 'robotics_student@stanford.edu',
      password: 'SecurePassword123!',
      role: 'student',
      institution: 'Stanford',
    });

    expect(success).toBe(true);
    const updated = useLearningStore.getState();
    expect(updated.authMode).toBe('confirm-email');
    expect(updated.pendingConfirmationEmail).toBe('robotics_student@stanford.edu');
    expect(updated.authSuccess).toContain('Account created successfully');
    expect(updated.authLoading).toBe(false);
    expect(updated.isAuthenticated).toBe(false);
  });

  it('hides the signup form and displays email confirmation card in confirm-email mode', async () => {
    useLearningStore.setState({
      authModalOpen: true,
      authMode: 'confirm-email',
      pendingConfirmationEmail: 'robotics_student@stanford.edu',
      authSuccess: 'Account created successfully. Please check your email to verify your KyntriX account.',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<AuthModal />);
    });

    // 1. The sign up form inputs should NOT appear in DOM
    expect(container.querySelector('form')).toBeNull();
    expect(container.textContent).not.toContain('Full Name');
    expect(container.textContent).not.toContain('Choose a username');
    expect(container.textContent).not.toContain('Create Account');

    // 2. Segmented switcher tab bar should NOT appear
    expect(container.querySelector('[role="tablist"]')).toBeNull();

    // 3. Confirmation card must be present with email displayed
    const confirmView = container.querySelector('[data-testid="email-confirmation-view"]');
    expect(confirmView).not.toBeNull();
    expect(container.textContent).toContain('Confirm Your Email');
    expect(container.textContent).toContain('robotics_student@stanford.edu');

    // 4. "Go to Login" button must be present
    const goToLoginBtn = container.querySelector('[data-testid="go-to-login-btn"]');
    expect(goToLoginBtn).not.toBeNull();
    expect(goToLoginBtn?.textContent).toContain('Go to Login');

    act(() => {
      root.unmount();
    });
  });

  it('navigates immediately to login mode and pre-populates email when clicking Go to Login', async () => {
    useLearningStore.setState({
      authModalOpen: true,
      authMode: 'confirm-email',
      pendingConfirmationEmail: 'robotics_student@stanford.edu',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<AuthModal />);
    });

    const goToLoginBtn = container.querySelector('[data-testid="go-to-login-btn"]') as HTMLButtonElement;
    expect(goToLoginBtn).not.toBeNull();

    await act(async () => {
      goToLoginBtn.click();
    });

    // Verification 1: authMode switched to signin
    expect(useLearningStore.getState().authMode).toBe('signin');

    // Verification 2: Sign in form is now displayed
    expect(container.querySelector('form')).not.toBeNull();
    expect(container.textContent).toContain('Sign in to KyntriX');

    // Verification 3: Email field is pre-filled with the confirmation email
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    expect(emailInput).not.toBeNull();
    expect(emailInput.value).toBe('robotics_student@stanford.edu');

    // Verification 4: Informational notice is displayed
    expect(container.textContent).toContain('Verification link sent to robotics_student@stanford.edu');

    act(() => {
      root.unmount();
    });
  });

  it('automatically transitions to login mode after countdown expires', async () => {
    vi.useFakeTimers();

    useLearningStore.setState({
      authModalOpen: true,
      authMode: 'confirm-email',
      pendingConfirmationEmail: 'timer_test@berkeley.edu',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<AuthModal />);
    });

    expect(useLearningStore.getState().authMode).toBe('confirm-email');

    // Advance 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Verification: Automatically transitioned to signin mode
    expect(useLearningStore.getState().authMode).toBe('signin');

    act(() => {
      root.unmount();
    });
  });

  it('cancels auto-redirect countdown when user requests email resend', async () => {
    vi.useFakeTimers();
    vi.spyOn(AuthService, 'resendVerificationEmail').mockResolvedValueOnce({ error: null });

    useLearningStore.setState({
      authModalOpen: true,
      authMode: 'confirm-email',
      pendingConfirmationEmail: 'pause_test@berkeley.edu',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<AuthModal />);
    });

    expect(useLearningStore.getState().authMode).toBe('confirm-email');

    const buttons = Array.from(container.querySelectorAll('button'));
    const resendBtn = buttons.find((b) => b.textContent?.includes('Resend verification email'));
    expect(resendBtn).toBeDefined();

    await act(async () => {
      resendBtn?.click();
    });

    // Advance 10 seconds past initial countdown
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    // Verification: Should NOT have transitioned to signin; stays on confirm-email
    expect(useLearningStore.getState().authMode).toBe('confirm-email');

    act(() => {
      root.unmount();
    });
  });

  it('allows manually pausing the auto-redirect countdown', async () => {
    vi.useFakeTimers();

    useLearningStore.setState({
      authModalOpen: true,
      authMode: 'confirm-email',
      pendingConfirmationEmail: 'manual_pause@mit.edu',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<AuthModal />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const pauseBtn = buttons.find((b) => b.textContent?.includes('(pause)'));
    expect(pauseBtn).toBeDefined();

    await act(async () => {
      pauseBtn?.click();
    });

    // Advance 10 seconds
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(useLearningStore.getState().authMode).toBe('confirm-email');

    act(() => {
      root.unmount();
    });
  });

  it('allows returning to signup form if user clicked wrong email link', async () => {
    useLearningStore.setState({
      authModalOpen: true,
      authMode: 'confirm-email',
      pendingConfirmationEmail: 'typo_email@berkeley.edu',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<AuthModal />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const returnBtn = buttons.find((b) => b.textContent?.includes('Register again') || b.textContent?.includes('Wrong email'));
    expect(returnBtn).toBeDefined();

    await act(async () => {
      returnBtn?.click();
    });

    // Verification: Switched back to register mode
    expect(useLearningStore.getState().authMode).toBe('register');
    expect(container.querySelector('form')).not.toBeNull();
    expect(container.textContent).toContain('Full Name');

    act(() => {
      root.unmount();
    });
  });

  it('resets to signin mode and cleans up on modal close', async () => {
    useLearningStore.setState({
      authModalOpen: true,
      authMode: 'confirm-email',
      pendingConfirmationEmail: 'close_test@mit.edu',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<AuthModal />);
    });

    // Close button
    const closeBtn = container.querySelector('button[aria-label="Close authentication modal"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    await act(async () => {
      closeBtn.click();
    });

    expect(useLearningStore.getState().authModalOpen).toBe(false);
    expect(useLearningStore.getState().authMode).toBe('signin');

    act(() => {
      root.unmount();
    });
  });

  it('supports resending verification email with cooldown and visible success feedback', async () => {
    const resendSpy = vi.spyOn(AuthService, 'resendVerificationEmail').mockResolvedValueOnce({ error: null });

    useLearningStore.setState({
      authModalOpen: true,
      authMode: 'confirm-email',
      pendingConfirmationEmail: 'resend_student@stanford.edu',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<AuthModal />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const resendBtn = buttons.find((b) => b.textContent?.includes('Resend verification email'));
    expect(resendBtn).toBeDefined();

    await act(async () => {
      resendBtn?.click();
    });

    expect(resendSpy).toHaveBeenCalledWith('resend_student@stanford.edu');
    expect(container.textContent).toContain('Resend available in');
    // Verification: Visible feedback is rendered to the user
    expect(container.textContent).toContain('A new verification link has been sent to your email inbox.');

    act(() => {
      root.unmount();
    });
  });

  it('provides resend verification action on sign in form when pending confirmation email exists', async () => {
    const resendSpy = vi.spyOn(AuthService, 'resendVerificationEmail').mockResolvedValueOnce({ error: null });

    useLearningStore.setState({
      authModalOpen: true,
      authMode: 'signin',
      pendingConfirmationEmail: 'signin_resend@mit.edu',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<AuthModal />);
    });

    expect(container.textContent).toContain("Didn't receive or need a new confirmation email?");

    const buttons = Array.from(container.querySelectorAll('button'));
    const resendLink = buttons.find((b) => b.textContent?.includes('Resend verification link'));
    expect(resendLink).toBeDefined();

    await act(async () => {
      resendLink?.click();
    });

    expect(resendSpy).toHaveBeenCalledWith('signin_resend@mit.edu');

    act(() => {
      root.unmount();
    });
  });

  it('prevents double submission on rapid form submissions', async () => {
    let resolveSignUp: (val: any) => void;
    const signUpPromise = new Promise((resolve) => {
      resolveSignUp = resolve;
    });
    const signUpSpy = vi.spyOn(AuthService, 'signUp').mockImplementation(() => signUpPromise as any);

    useLearningStore.setState({
      authModalOpen: true,
      authMode: 'register',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<AuthModal />);
    });

    // Populate registration form inputs
    const inputs = Array.from(container.querySelectorAll('input'));
    const nameInput = inputs.find((i) => i.placeholder?.includes('Dr. Alex Vance'))!;
    const usernameInput = inputs.find((i) => i.placeholder?.includes('alex_v'))!;
    const emailInput = inputs.find((i) => i.type === 'email')!;
    const passwordInput = inputs.find((i) => i.type === 'password')!;

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      nativeSetter?.call(nameInput, 'Marie Curie');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeSetter?.call(usernameInput, 'marie_curie');
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeSetter?.call(emailInput, 'marie@sorbonne.edu');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeSetter?.call(passwordInput, 'Radium1898!');
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = container.querySelector('form')!;

    // Rapid double submission
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Only one call dispatched to AuthService.signUp
    expect(signUpSpy).toHaveBeenCalledTimes(1);

    // Resolve in-flight request
    await act(async () => {
      resolveSignUp!({
        user: { id: 'marie-id', email: 'marie@sorbonne.edu' } as any,
        session: null,
        error: null,
        needsEmailConfirmation: true,
      });
    });

    act(() => {
      root.unmount();
    });
  });
});

