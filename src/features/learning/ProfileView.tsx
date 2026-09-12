import React, { useState, useEffect } from 'react';
import { useLearningStore } from './useLearningStore';
import { LeetCodeStatsCard } from './LeetCodeStatsCard';
import {
  Award,
  Zap,
  Flame,
  TrendingUp,
  Target,
  School,
  User as UserIcon,
  Edit3,
  LogOut,
  LogIn,
  Lock,
  Layers,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const {
    user,
    profile,
    badges,
    fetchBadges,
    updateProfile,
    logout,
    setAuthModalOpen,
    analyticsData,
    fetchAnalytics,
    problems,
    fetchProblems,
  } = useLearningStore();

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  useEffect(() => {
    fetchBadges();
    fetchAnalytics();
    fetchProblems();
  }, [fetchBadges, fetchAnalytics, fetchProblems]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ name, institution, avatarUrl });
    setEditOpen(false);
  };

  const streak = profile?.streak?.currentStreak || 0;
  const xp = profile?.xp || 0;
  const rating = profile?.rating || 1200;
  const solved = profile?.stats?.problemsSolved || 0;
  const accuracy = analyticsData?.overallAccuracy ?? (profile?.stats?.totalAttempts ? Math.round((solved / profile.stats.totalAttempts) * 100) : 0);

  const breakdown = analyticsData?.categoryBreakdown || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Profile Header Card */}
      <div className="bg-white/95 backdrop-blur-xl border border-stone-300/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-stone-200 border-2 border-stone-300 overflow-hidden shrink-0 flex items-center justify-center text-stone-600 font-black text-2xl shadow-xs">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  {user?.name || 'Guest Engineer'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  user?.role === 'teacher'
                    ? 'bg-teal-100 text-teal-950 border border-teal-300'
                    : user?.role === 'admin'
                    ? 'bg-purple-100 text-purple-950 border border-purple-300'
                    : 'bg-amber-100 text-amber-950 border border-amber-300'
                }`}>
                  {user?.role || 'Guest'}
                </span>
              </div>
              <div className="text-xs text-stone-500 font-mono">@{user?.username || 'guest'}</div>
              {user?.institution && (
                <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium pt-0.5">
                  <School className="w-3.5 h-3.5 text-stone-400" />
                  <span>{user.institution}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setName(user.name);
                    setInstitution(user.institution || '');
                    setAvatarUrl(user.avatarUrl || '');
                    setEditOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 text-stone-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-200">
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold uppercase">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>Streak</span>
            </div>
            <div className="text-xl font-black text-stone-900 mt-1 tabular-nums">{streak} Days</div>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold uppercase">
              <Zap className="w-3.5 h-3.5 text-orange-600" />
              <span>Total XP</span>
            </div>
            <div className="text-xl font-black text-stone-900 mt-1 tabular-nums">{xp.toLocaleString()}</div>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold uppercase">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              <span>Rating</span>
            </div>
            <div className="text-xl font-black text-stone-900 mt-1 tabular-nums">{rating} Elo</div>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold uppercase">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>Accuracy</span>
            </div>
            <div className="text-xl font-black text-stone-900 mt-1 tabular-nums">{accuracy}%</div>
          </div>
        </div>
      </div>

      {/* Guest Mode Notice */}
      {!user && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <Flame className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are currently viewing as Guest. Sign in or register to maintain your individual problem-solving streak, unlock badges, and sync your personalized activity!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* LeetCode Style Problem Solving & Activity Heatmap */}
      <LeetCodeStatsCard
        profile={profile}
        analyticsData={analyticsData}
        badges={badges}
        allProblems={problems}
      />

      {/* Badges & Achievements Section */}
      <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <span>Badges & Achievements</span>
          </h2>
          <span className="text-xs font-bold text-stone-500">
            {badges.filter((b) => b.unlocked).length} / {badges.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                badge.unlocked
                  ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                  : 'bg-stone-50 border-stone-200 opacity-60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  badge.unlocked
                    ? 'bg-gradient-to-tr from-amber-400 to-amber-500 text-white'
                    : 'bg-stone-200 text-stone-400'
                }`}
              >
                {badge.unlocked ? <Award className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-stone-900">{badge.name}</h3>
                  <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                    {badge.rarity}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">{badge.description}</p>
                <div className="text-[10px] text-stone-500 pt-1">
                  {badge.unlocked ? (
                    <span className="text-emerald-700 font-bold">
                      ✓ Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span>Criteria: {badge.criteriaDescription}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skill Breakdown */}
      <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-stone-700" />
          <span>Kinematic Skill Breakdown</span>
        </h2>

        <div className="space-y-3">
          {[
            { label: 'DH Parameters', cat: 'dh' },
            { label: 'Transformation Matrices', cat: 'transforms' },
            { label: 'Forward Kinematics', cat: 'fk' },
            { label: 'Inverse Kinematics', cat: 'ik' },
            { label: 'Jacobians & Singularities', cat: 'jacobians' },
            { label: 'Trajectory Planning', cat: 'trajectory' },
          ].map((item) => {
            const data = breakdown[item.cat] || { accuracy: 0, solved: 0 };
            return (
              <div key={item.cat} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-stone-800">{item.label}</span>
                  <span className="font-mono text-stone-600">{data.accuracy}%</span>
                </div>
                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, data.accuracy)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#fcfaf7] border border-stone-300 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-stone-900">Edit Profile</h3>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Account Role</label>
                <div className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-100 text-stone-700 font-bold capitalize flex items-center justify-between">
                  <span>{user?.role || 'student'}</span>
                  <span className="text-[10px] text-stone-500 font-normal uppercase tracking-wider">Locked</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Institution / University</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Legal & Compliance Notice */}
      <div className="pt-6 pb-2 text-center text-xs text-stone-500 border-t border-stone-200/80 space-y-1">
        <p className="font-semibold text-stone-600">
          KyntriX Robotics & AI Kinematics Laboratory
        </p>
        <div className="flex items-center justify-center gap-4 text-[11px] pt-1 font-bold">
          <a
            href="/privacypolicy"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/privacypolicy');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-stone-500 hover:text-amber-800 underline transition-colors"
          >
            Privacy Policy
          </a>
          <span className="text-stone-300">•</span>
          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/terms');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-stone-500 hover:text-amber-800 underline transition-colors"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
};
