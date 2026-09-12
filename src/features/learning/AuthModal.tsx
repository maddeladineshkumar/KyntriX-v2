import React, { useState, useEffect, useCallback } from 'react';
import { useLearningStore } from './useLearningStore';
import { AuthService } from '../../lib/authService';
import {
  X,
  LogIn,
  UserPlus,
  KeyRound,
  Lock,
  CheckCircle2,
  Mail,
  MailCheck,
  Clock,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    authMode,
    setAuthMode,
    setPendingAuthRedirect,
    login,
    register,
    loginWithGoogle,
    cancelGoogleAuth,
    sendPasswordReset,
    updatePassword,
    authLoading,
    googleAuthLoading,
    googleCountdown,
    authError,
    authSuccess,
    setAuthSuccess,
    pendingConfirmationEmail,
    setPendingConfirmationEmail,
    resendVerificationEmail,
  } = useLearningStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [institution, setInstitution] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Email confirmation countdown & resend cooldown state
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [autoRedirectEnabled, setAutoRedirectEnabled] = useState(true);
  const isSubmittingRef = React.useRef(false);

  const isFormSubmitting = authLoading && !googleAuthLoading;

  const isRegister = authMode === 'register';
  const isForgotPassword = authMode === 'forgot-password';
  const isResetPassword = authMode === 'reset-password';
  const isSignIn = authMode === 'signin';
  const isConfirmEmail = authMode === 'confirm-email';

  const targetConfirmationEmail = pendingConfirmationEmail || email;

  const handleClose = useCallback(() => {
    if (useLearningStore.getState().googleAuthLoading) {
      useLearningStore.getState().cancelGoogleAuth();
    }
    setPendingAuthRedirect(null);
    setAuthModalOpen(false);
    setLocalError(null);
    setRedirectCountdown(5);
    setAutoRedirectEnabled(true);
    isSubmittingRef.current = false;
    if (authMode === 'confirm-email') {
      setAuthMode('signin');
    }
  }, [setPendingAuthRedirect, setAuthModalOpen, authMode, setAuthMode]);

  const handleGoToLogin = useCallback(() => {
    const userEmail = targetConfirmationEmail;
    if (userEmail) {
      setEmail(userEmail);
    }
    setPassword('');
    setConfirmPassword('');
    setRedirectCountdown(5);
    setAutoRedirectEnabled(true);
    setAuthMode('signin');
    setLocalError(null);
    setAuthSuccess(
      userEmail
        ? `Verification link sent to ${userEmail}. Please verify your email before signing in.`
        : 'Please verify your email before signing in.'
    );
  }, [targetConfirmationEmail, setAuthMode, setAuthSuccess]);

  const handleReturnToSignUp = useCallback(() => {
    setAuthMode('register');
    setPendingConfirmationEmail(null);
    setLocalError(null);
    setAuthSuccess(null);
    setRedirectCountdown(5);
    setAutoRedirectEnabled(true);
    setPassword('');
    setConfirmPassword('');
  }, [setAuthMode, setPendingConfirmationEmail, setAuthSuccess]);

  const handleResendEmail = async () => {
    if (!targetConfirmationEmail || resendCooldown > 0 || authLoading) return;
    setAutoRedirectEnabled(false);
    setLocalError(null);
    const ok = await resendVerificationEmail(targetConfirmationEmail);
    if (ok) {
      setResendCooldown(60);
    }
  };

  useEffect(() => {
    if (!authModalOpen || authMode !== 'confirm-email' || !autoRedirectEnabled) return;

    let remaining = 5;
    const timer = setInterval(() => {
      remaining -= 1;
      setRedirectCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        handleGoToLogin();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [authModalOpen, authMode, autoRedirectEnabled, handleGoToLogin]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!authModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalOpen, handleClose]);

  // Window focus, visibility, and bfcache restoration detection for Google sign-in
  useEffect(() => {
    if (!authModalOpen || !googleAuthLoading) return;

    let returnGraceTimer: ReturnType<typeof setTimeout> | null = null;
    let hasBlurred = false;

    const handleBlur = () => {
      hasBlurred = true;
    };

    const handleReturn = () => {
      // If user had blurred (switched to Google window/tab) and now returns:
      if (!hasBlurred) return;

      // Wait a grace period (2.5s) to allow any redirect or OAuth callback to settle
      if (returnGraceTimer) clearTimeout(returnGraceTimer);
      returnGraceTimer = setTimeout(async () => {
        const checkSession = await AuthService.getSession();
        if (!checkSession?.user && useLearningStore.getState().googleAuthLoading) {
          cancelGoogleAuth(
            'Google sign-in was not completed. You can sign in with your email and password below.'
          );
        }
      }, 2500);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReturn();
      } else {
        hasBlurred = true;
      }
    };

    const handlePageShow = () => {
      // Restored from bfcache (browser Back button from Google) or navigation
      AuthService.getSession().then((session) => {
        if (!session?.user && useLearningStore.getState().googleAuthLoading) {
          cancelGoogleAuth(
            'Google sign-in was not completed. You can sign in with your email and password below.'
          );
        }
      });
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      if (returnGraceTimer) clearTimeout(returnGraceTimer);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [authModalOpen, googleAuthLoading, cancelGoogleAuth]);

  if (!authModalOpen) return null;

  const handleEmailChange = (val: string) => {
    if (googleAuthLoading) {
      cancelGoogleAuth();
    }
    setEmail(val);
  };

  const handlePasswordChange = (val: string) => {
    if (googleAuthLoading) {
      cancelGoogleAuth();
    }
    setPassword(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (googleAuthLoading) {
      cancelGoogleAuth();
    }
    if (isFormSubmitting || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLocalError(null);

    try {

    if (isForgotPassword) {
      if (!email.trim()) {
        setLocalError('Please enter your email address.');
        return;
      }
      await sendPasswordReset(email.trim());
      return;
    }

    if (isResetPassword) {
      if (!password || password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      await updatePassword(password);
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (!username.trim()) {
        setLocalError('Please choose a username.');
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
        setLocalError('Username must be 3-30 characters (letters, numbers, underscores).');
        return;
      }
      if (!email.trim()) {
        setLocalError('Please enter your email address.');
        return;
      }
      if (!password || password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      const success = await register({ name, username, email, password, role, institution });
      if (success) {
        setPassword('');
        setConfirmPassword('');
      }
      return;
    } else {
      if (!email.trim() || !password) {
        setLocalError('Please fill in all required fields.');
        return;
      }
      await login(email, password);
    }
  } finally {
    isSubmittingRef.current = false;
  }
};

  const handleGoogleClick = async () => {
    setLocalError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      cancelGoogleAuth(err?.message || 'Failed to start Google sign-in. Please try again.');
    }
  };

  const displayError = localError || authError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-[#fcfaf7] border border-stone-300 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 text-stone-500 hover:text-black rounded-full hover:bg-stone-200/60 transition-colors cursor-pointer"
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Heading */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 mb-3">
            {isRegister && <UserPlus className="w-6 h-6" />}
            {isSignIn && <LogIn className="w-6 h-6" />}
            {isForgotPassword && <KeyRound className="w-6 h-6" />}
            {isResetPassword && <Lock className="w-6 h-6" />}
            {isConfirmEmail && <MailCheck className="w-6 h-6" />}
          </div>
          <h2 id="auth-modal-title" className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {isRegister && 'Join KyntriX Robotics'}
            {isSignIn && 'Sign in to KyntriX'}
            {isForgotPassword && 'Reset Your Password'}
            {isResetPassword && 'Set New Password'}
            {isConfirmEmail && 'Confirm Your Email'}
          </h2>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            {isRegister && 'Access the Problem Arena, Simulation Challenges, Interactive Kinematics, and track your learning progress.'}
            {isSignIn && 'Sign in to access AI & Learning, Problem Arena, Simulation Challenges, and track your learning progress.'}
            {isForgotPassword && 'Enter your email address and we will send you a secure link to reset your password.'}
            {isResetPassword && 'Enter your new password below to regain access to your KyntriX account.'}
            {isConfirmEmail && 'Please check your email and click the confirmation link to activate your account.'}
          </p>
        </div>

        {/* Segmented Auth Mode Switcher (Sign In vs Sign Up) */}
        {(isSignIn || isRegister) && (
          <div className="flex p-1 bg-stone-200/80 rounded-2xl mb-5" role="tablist" aria-label="Authentication Options">
            <button
              type="button"
              role="tab"
              aria-selected={isSignIn}
              onClick={() => {
                if (googleAuthLoading) cancelGoogleAuth();
                setAuthMode('signin');
                setLocalError(null);
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isSignIn
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              onClick={() => {
                if (googleAuthLoading) cancelGoogleAuth();
                setAuthMode('register');
                setLocalError(null);
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isRegister
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {displayError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold">
            {displayError}
          </div>
        )}

        {/* Success Notification */}
        {authSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{authSuccess}</span>
          </div>
        )}

        {/* Email Confirmation Screen */}
        {isConfirmEmail && (
          <div className="space-y-4 py-2" data-testid="email-confirmation-view">
            {/* Recipient Details & Message */}
            <div className="bg-amber-500/10 border border-amber-300/70 rounded-2xl p-4 sm:p-5 text-center space-y-2.5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-600">Verification email sent to</p>
                <div
                  data-testid="confirmed-email-display"
                  className="mt-1 px-3 py-1.5 bg-white border border-amber-300/80 rounded-xl font-mono text-sm font-bold text-stone-900 break-all inline-block max-w-full shadow-2xs"
                >
                  {targetConfirmationEmail}
                </div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed max-w-xs mx-auto">
                Click the confirmation link in your email to activate your account. Once verified, you can sign in with your password.
              </p>
            </div>

            {/* Hint / Troubleshooting */}
            <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-600 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Can't find the email? Please check your <strong>spam/junk</strong> folder, or wait a few moments.
              </span>
            </div>

            {/* Countdown / Status banner */}
            <div className="flex items-center justify-center gap-1.5 py-1 text-stone-500 text-xs font-medium text-center">
              {autoRedirectEnabled ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                  <span>
                    Redirecting to login in <strong className="text-stone-900 font-bold">{redirectCountdown}s</strong>...
                  </span>
                  <button
                    type="button"
                    onClick={() => setAutoRedirectEnabled(false)}
                    className="ml-1 text-[11px] text-amber-700 hover:text-amber-900 underline cursor-pointer"
                  >
                    (pause)
                  </button>
                </>
              ) : (
                <span>Ready to sign in? Click below to go to the login screen.</span>
              )}
            </div>

            {/* Go to Login Button */}
            <button
              type="button"
              onClick={handleGoToLogin}
              data-testid="go-to-login-btn"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Go to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Actions: Resend & Change Email */}
            <div className="pt-2 flex flex-col items-center gap-2 text-center">
              {resendCooldown > 0 ? (
                <span className="text-[11px] text-stone-400 font-medium">
                  Resend available in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleResendEmail}
                  className="text-xs text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend verification email</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReturnToSignUp}
                className="text-xs text-stone-500 hover:text-stone-800 font-medium underline cursor-pointer"
              >
                Wrong email address? Register again
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {!isConfirmEmail && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Registration Extra Fields */}
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  disabled={isFormSubmitting}
                  value={name}
                  onChange={(e) => {
                    if (googleAuthLoading) cancelGoogleAuth();
                    setName(e.target.value);
                  }}
                  placeholder="e.g. Dr. Alex Vance"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  disabled={isFormSubmitting}
                  value={username}
                  onChange={(e) => {
                    if (googleAuthLoading) cancelGoogleAuth();
                    setUsername(e.target.value);
                  }}
                  placeholder="e.g. alex_v"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono disabled:opacity-60"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Role</label>
                  <select
                    value={role}
                    disabled={isFormSubmitting}
                    onChange={(e) => {
                      if (googleAuthLoading) cancelGoogleAuth();
                      setRole(e.target.value as any);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Institution</label>
                  <input
                    type="text"
                    disabled={isFormSubmitting}
                    value={institution}
                    onChange={(e) => {
                      if (googleAuthLoading) cancelGoogleAuth();
                      setInstitution(e.target.value);
                    }}
                    placeholder="e.g. MIT / IIT"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Address (for SignIn, Register, and ForgotPassword) */}
          {!isResetPassword && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                disabled={isFormSubmitting}
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="you@institution.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60"
              />
            </div>
          )}

          {/* Password (for SignIn, Register, and ResetPassword) */}
          {!isForgotPassword && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-700">
                  {isResetPassword ? 'New Password' : 'Password'}
                </label>
                {isSignIn && (
                  <button
                    type="button"
                    onClick={() => {
                      if (googleAuthLoading) cancelGoogleAuth();
                      setAuthMode('forgot-password');
                    }}
                    className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                disabled={isFormSubmitting}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60"
              />
            </div>
          )}

          {/* Confirm Password (for ResetPassword mode) */}
          {isResetPassword && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                disabled={isFormSubmitting}
                value={confirmPassword}
                onChange={(e) => {
                  if (googleAuthLoading) cancelGoogleAuth();
                  setConfirmPassword(e.target.value);
                }}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isFormSubmitting}
            className="w-full py-2.5 px-4 mt-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {isFormSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </span>
            ) : isRegister ? (
              'Create Account'
            ) : isForgotPassword ? (
              'Send Reset Link'
            ) : isResetPassword ? (
              'Update Password'
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        )}

        {/* Google OAuth (For SignIn and Register) */}
        {!isConfirmEmail && (isSignIn || isRegister) && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#fcfaf7] px-2 text-stone-500 font-bold text-[10px] tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={googleAuthLoading || isFormSubmitting}
              className="w-full py-2.5 px-4 flex items-center justify-center gap-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition-all shadow-2xs active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {googleAuthLoading ? (
                <span className="flex items-center justify-center gap-2 text-stone-700">
                  <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  <span>Signing in with Google ({googleCountdown}s)...</span>
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Google OAuth In-Progress & Cancellation Banner */}
            {googleAuthLoading && (
              <div
                data-testid="google-auth-in-progress"
                className="mt-2.5 p-3 bg-amber-500/10 border border-amber-300/80 rounded-xl text-xs text-stone-700 flex flex-col gap-2 animate-in fade-in"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-semibold text-[11px] text-amber-950">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                    <span>Signing in with Google ({googleCountdown}s)...</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      cancelGoogleAuth(
                        'Google sign-in was cancelled. You can sign in with your email and password below.'
                      )
                    }
                    data-testid="cancel-google-btn"
                    className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-stone-800 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Google window opened. If you don't want to sign in with Google or came back, click{' '}
                  <button
                    type="button"
                    onClick={() =>
                      cancelGoogleAuth(
                        'Google sign-in was cancelled. You can sign in with your email and password below.'
                      )
                    }
                    className="font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                  >
                    Cancel
                  </button>{' '}
                  to use your email and password instead.
                </p>
              </div>
            )}
          </>
        )}

        {/* Mode Switchers */}
        <div className="mt-4 text-center space-y-3">
          {/* Unconfirmed email recovery for Sign In mode */}
          {isSignIn && (pendingConfirmationEmail || displayError?.toLowerCase().includes('verify')) && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-300/70 rounded-xl text-center text-xs text-stone-700 space-y-1">
              <p className="font-semibold text-stone-800">
                Didn't receive or need a new confirmation email?
              </p>
              {resendCooldown > 0 ? (
                <span className="text-[11px] text-stone-500 font-bold block">
                  Resend available in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={async () => {
                    const resendTarget = pendingConfirmationEmail || email.trim();
                    if (!resendTarget) {
                      setLocalError('Please enter your email address to resend confirmation.');
                      return;
                    }
                    setLocalError(null);
                    const ok = await resendVerificationEmail(resendTarget);
                    if (ok) {
                      setResendCooldown(60);
                    }
                  }}
                  className="font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend verification link</span>
                </button>
              )}
            </div>
          )}

          {isSignIn && (
            <button
              type="button"
              onClick={() => {
                if (googleAuthLoading) cancelGoogleAuth();
                setAuthMode('register');
              }}
              className="text-xs text-stone-600 hover:text-black font-bold underline cursor-pointer"
            >
              Don't have an account? Sign up
            </button>
          )}

          {isRegister && (
            <button
              type="button"
              onClick={() => {
                if (googleAuthLoading) cancelGoogleAuth();
                setAuthMode('signin');
              }}
              className="text-xs text-stone-600 hover:text-black font-bold underline cursor-pointer"
            >
              Already have an account? Sign in
            </button>
          )}

          {(isForgotPassword || isResetPassword) && (
            <button
              type="button"
              onClick={() => {
                if (googleAuthLoading) cancelGoogleAuth();
                setAuthMode('signin');
              }}
              className="text-xs text-stone-600 hover:text-black font-bold underline cursor-pointer"
            >
              Back to Sign In
            </button>
          )}

          {/* Legal notice */}
          <div className="pt-3 border-t border-stone-200/80">
            <p className="text-[11px] text-stone-500 leading-relaxed">
              By continuing, you agree to KyntriX's{' '}
              <a
                href="/terms"
                onClick={(e) => {
                  e.preventDefault();
                  handleClose();
                  window.history.pushState({}, '', '/terms');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-amber-700 hover:text-amber-900 font-bold underline"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="/privacypolicy"
                onClick={(e) => {
                  e.preventDefault();
                  handleClose();
                  window.history.pushState({}, '', '/privacypolicy');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-amber-700 hover:text-amber-900 font-bold underline"
              >
                Privacy Policy
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
