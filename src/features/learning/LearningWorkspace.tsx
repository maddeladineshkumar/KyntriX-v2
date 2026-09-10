import React, { useEffect } from 'react';
import { useLearningStore, type LearningSubtab } from './useLearningStore';
import { DashboardView } from './DashboardView';
import { ArenaView } from './ArenaView';
import { ChallengesView } from './ChallengesView';
import { AnalyticsView } from './AnalyticsView';
import { ProfileView } from './ProfileView';
import { ErrorBoundary } from './ErrorBoundary';
import {
  LayoutDashboard,
  Target,
  Sliders,
  Activity,
  User as UserIcon,
  Flame,
  Zap,
  TrendingUp,
  LogIn,
} from 'lucide-react';

interface LearningWorkspaceProps {
  onOpenSimulator?: (robotId?: string, targetPose?: any) => void;
}

export const LearningWorkspace: React.FC<LearningWorkspaceProps> = ({ onOpenSimulator }) => {
  const {
    activeSubtab,
    setActiveSubtab,
    user,
    profile,
    initializeAuth,
    setAuthModalOpen,
  } = useLearningStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const navItems: Array<{ id: LearningSubtab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'arena', label: 'Arena', icon: <Target className="w-4 h-4" /> },
    { id: 'challenges', label: 'Challenges', icon: <Sliders className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <Activity className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#f7f4ed] overflow-y-auto overscroll-none">
      {/* Top Sub-Navigation Bar */}
      <div className="sticky top-0 z-30 bg-[#f7f4ed]/95 backdrop-blur-2xl border-b border-stone-300/80 px-4 sm:px-6 py-2.5 shadow-2xs shrink-0 flex items-center justify-between gap-4">
        {/* Nav Pills */}
        <nav
          aria-label="Learning Subsections"
          className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSubtab(item.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeSubtab === item.id
                  ? 'bg-stone-900 text-white shadow-md scale-[1.02]'
                  : 'bg-white/80 hover:bg-white text-stone-700 hover:text-black border border-stone-200/80'
              }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Summary Pill on Right */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => setActiveSubtab('profile')}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-stone-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="tabular-nums">{profile?.streak?.currentStreak || 0}</span>
              </div>

              <div className="hidden md:flex items-center gap-1 text-xs font-bold text-orange-700 border-l border-stone-200 pl-2">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                <span className="tabular-nums">{(profile?.xp || 0).toLocaleString()} XP</span>
              </div>

              <div className="hidden lg:flex items-center gap-1 text-xs font-bold text-teal-800 border-l border-stone-200 pl-2">
                <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                <span className="tabular-nums">{profile?.rating || 1200} Elo</span>
              </div>

              <div className="w-6 h-6 rounded-full bg-stone-200 border border-stone-300 overflow-hidden flex items-center justify-center text-[10px] font-black text-stone-700 ml-1">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
        <ErrorBoundary fallbackTitle="Could not load learning section" onReset={() => setActiveSubtab('dashboard')}>
          {activeSubtab === 'dashboard' && <DashboardView onOpenSimulator={onOpenSimulator} />}
          {activeSubtab === 'arena' && <ArenaView onOpenSimulator={onOpenSimulator} />}
          {activeSubtab === 'challenges' && <ChallengesView onOpenSimulator={onOpenSimulator} />}
          {activeSubtab === 'analytics' && <AnalyticsView />}
          {activeSubtab === 'profile' && <ProfileView />}
        </ErrorBoundary>
      </main>
    </div>
  );
};
