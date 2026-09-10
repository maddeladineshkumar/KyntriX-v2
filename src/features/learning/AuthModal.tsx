import React, { useState } from 'react';
import { useLearningStore } from './useLearningStore';
import { X, LogIn, UserPlus, KeyRound, Lock, CheckCircle2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    authMode,
    setAuthMode,
    login,
    register,
    loginWithGoogle,
    sendPasswordReset,
    updatePassword,
    authLoading,
    authError,
    authSuccess,
  } = useLearningStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [institution, setInstitution] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const isRegister = authMode === 'register';
  const isForgotPassword = authMode === 'forgot-password';
  const isResetPassword = authMode === 'reset-password';
  const isSignIn = authMode === 'signin';

  const handleClose = () => {
    setAuthModalOpen(false);
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

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
      await register({ name, username, email, password, role, institution });
    } else {
      if (!email.trim() || !password) {
        setLocalError('Please fill in all required fields.');
        return;
      }
      await login(email, password);
    }
  };

  const handleGoogleClick = async () => {
    setLocalError(null);
    await loginWithGoogle();
  };

  const displayError = localError || authError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
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
          </div>
          <h2 id="auth-modal-title" className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {isRegister && 'Join KyntriX Robotics'}
            {isSignIn && 'Sign in to KyntriX'}
            {isForgotPassword && 'Reset Your Password'}
            {isResetPassword && 'Set New Password'}
          </h2>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            {isRegister && 'Access the Problem Arena, Simulation Challenges, Interactive Kinematics, and track your learning progress.'}
            {isSignIn && 'Sign in to continue your robotic simulations, kinematics progress, and streak.'}
            {isForgotPassword && 'Enter your email address and we will send you a secure link to reset your password.'}
            {isResetPassword && 'Enter your new password below to regain access to your KyntriX account.'}
          </p>
        </div>

        {/* Error Notification */}
        {displayError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold">
            {displayError}
          </div>
        )}

        {/* Success Notification */}
        {authSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{authSuccess}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Registration Extra Fields */}
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  disabled={authLoading}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Alex Vance"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  disabled={authLoading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex_v"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono disabled:opacity-60"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Role</label>
                  <select
                    value={role}
                    disabled={authLoading}
                    onChange={(e) => setRole(e.target.value as any)}
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
                    disabled={authLoading}
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
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
                disabled={authLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                    onClick={() => setAuthMode('forgot-password')}
                    className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                disabled={authLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                disabled={authLoading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-2.5 px-4 mt-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {authLoading ? (
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

        {/* Google OAuth (For SignIn and Register) */}
        {(isSignIn || isRegister) && (
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
              disabled={authLoading}
              className="w-full py-2.5 px-4 flex items-center justify-center gap-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition-all shadow-2xs active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}

        {/* Mode Switchers */}
        <div className="mt-4 text-center space-y-3">
          {isSignIn && (
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className="text-xs text-stone-600 hover:text-black font-bold underline cursor-pointer"
            >
              Don't have an account? Sign up
            </button>
          )}

          {isRegister && (
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              className="text-xs text-stone-600 hover:text-black font-bold underline cursor-pointer"
            >
              Already have an account? Sign in
            </button>
          )}

          {(isForgotPassword || isResetPassword) && (
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
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
