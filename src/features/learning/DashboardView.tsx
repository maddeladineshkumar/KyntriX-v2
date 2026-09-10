import React, { useEffect } from 'react';
import { useLearningStore } from './useLearningStore';
import {
  Flame,
  Zap,
  Award,
  Target,
  ArrowRight,
  Sliders,
  Sparkles,
  BookOpen,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenSimulator?: (robotId?: string, pose?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenSimulator }) => {
  const {
    user,
    profile,
    setActiveSubtab,
    selectProblem,
    selectChallenge,
    analyticsData,
    fetchAnalytics,
    challenges,
    fetchChallenges,
    badges,
    fetchBadges,
  } = useLearningStore();

  useEffect(() => {
    fetchAnalytics();
    fetchChallenges();
    fetchBadges();
  }, [fetchAnalytics, fetchChallenges, fetchBadges]);

  const streak = profile?.streak?.currentStreak || 0;
  const xp = profile?.xp || 0;
  const rating = profile?.rating || 1200;
  const solved = profile?.stats?.problemsSolved || 0;
  const accuracy = analyticsData?.overallAccuracy ?? (profile?.stats?.totalAttempts ? Math.round((solved / profile.stats.totalAttempts) * 100) : 0);
  const nextBadge = badges.find((b) => !b.unlocked) || badges[0];

  const recommendations = analyticsData?.recommendations || [
    {
      id: 'prob_ik_01',
      title: 'Inverse Kinematics: 2R Planar Arm Target Reach',
      category: 'ik',
      difficulty: 'intermediate',
      xpReward: 50,
      reason: 'Targeted practice for multi-solution kinematic reachability',
    },
    {
      id: 'prob_dh_02',
      title: '3-DOF Spatial Anthropomorphic DH Parameters',
      category: 'dh',
      difficulty: 'intermediate',
      xpReward: 45,
      reason: 'Reinforce spatial frame twist angle conventions',
    },
  ];

  const featuredChallenge = challenges[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold mb-3 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Robotics Learning Environment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {user?.name || 'Engineer'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
              Solve verified kinematics problems, conquer 3D simulation challenges, and consult KyntriX AI with live simulator context.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubtab('arena')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-lg shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>Enter Problem Arena</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Streak */}
        <div className="bg-white/90 backdrop-blur-xl border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Learning Streak</div>
            <div className="text-xl sm:text-2xl font-black text-stone-900 tabular-nums">{streak} Days</div>
            <div className="text-[11px] text-stone-500">Longest: {profile?.streak?.longestStreak || 0} days</div>
          </div>
        </div>

        {/* XP */}
        <div className="bg-white/90 backdrop-blur-xl border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Total Experience</div>
            <div className="text-xl sm:text-2xl font-black text-stone-900 tabular-nums">{xp.toLocaleString()} XP</div>
            <div className="text-[11px] text-stone-500">Rank #{profile?.rank || 1} Global</div>
          </div>
        </div>

        {/* Rating */}
        <div className="bg-white/90 backdrop-blur-xl border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Kinematics Rating</div>
            <div className="text-xl sm:text-2xl font-black text-stone-900 tabular-nums">{rating} Elo</div>
            <div className="text-[11px] text-stone-500">Competitive Tier</div>
          </div>
        </div>

        {/* Solved */}
        <div className="bg-white/90 backdrop-blur-xl border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Problems Solved</div>
            <div className="text-xl sm:text-2xl font-black text-stone-900 tabular-nums">{solved} Solved</div>
            <div className="text-[11px] text-stone-500">{accuracy}% Overall Accuracy</div>
          </div>
        </div>
      </div>

      {/* Weakness Detection Banner if detected */}
      {analyticsData?.detectedWeaknesses && analyticsData.detectedWeaknesses.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-amber-950">
                  Targeted Learning Alert: {analyticsData.detectedWeaknesses[0].category.toUpperCase()} Needs Practice
                </h2>
                <p className="text-xs text-amber-900/80 mt-0.5">
                  {analyticsData.detectedWeaknesses[0].diagnosis} Recommended review:{' '}
                  <span className="font-bold text-amber-950">
                    {analyticsData.detectedWeaknesses[0].recommendedTopic}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSubtab('arena');
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shrink-0 transition-colors cursor-pointer"
            >
              Start Targeted Practice
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Personalized Recommendations + Featured Simulation Challenge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommendations Column (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>Recommended Practice Problems</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveSubtab('arena')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <span>View All Arena</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec: any) => (
              <div
                key={rec.id}
                className="bg-white/90 backdrop-blur-xl border border-stone-200/90 hover:border-amber-400/80 rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-200">
                      {rec.category.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      rec.difficulty === 'beginner'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : rec.difficulty === 'intermediate'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-purple-50 text-purple-800 border border-purple-200'
                    }`}>
                      {rec.difficulty}
                    </span>
                    <span className="text-[11px] font-bold text-amber-600">+{rec.xpReward} XP</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 leading-snug">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-stone-600">{rec.reason}</p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await selectProblem(rec.id);
                    setActiveSubtab('arena');
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-black transition-all active:scale-95 shrink-0 cursor-pointer"
                >
                  <span>Solve Problem</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Daily Goals & Milestone Progress (Deduplicated from Profile) */}
          <div className="bg-white/90 backdrop-blur-xl border border-stone-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600" />
                <span>Daily Practice Goals & Active Milestones</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveSubtab('profile')}
                className="text-xs font-bold text-stone-500 hover:text-amber-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View Full Skill Breakdown in Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Daily Streak Goal */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Daily Goal
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-stone-900 mt-1.5">
                      Maintain Daily Momentum
                    </h4>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      Solve 1 challenge today to keep your {streak}-day active streak alive.
                    </p>
                  </div>
                  <Flame className="w-5 h-5 text-amber-500 shrink-0" />
                </div>
                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-stone-500">
                    Status: <strong className="text-stone-800">{streak > 0 ? 'Active Today' : 'Pending'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSubtab('arena')}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                  >
                    Solve Arena ➔
                  </button>
                </div>
              </div>

              {/* Next Milestone Badge */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Next Milestone
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-stone-900 mt-1.5">
                      {nextBadge ? nextBadge.title : 'Robotics Specialist'}
                    </h4>
                    <p className="text-[11px] text-stone-600 mt-0.5 line-clamp-2">
                      {nextBadge ? nextBadge.criteriaDescription : 'Continue solving challenges to unlock new engineering honors.'}
                    </p>
                  </div>
                  <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-stone-500">
                    Reward: <strong className="text-amber-600">+{nextBadge?.xpReward || 50} XP</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSubtab('profile')}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                  >
                    Check Badges ➔
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Simulation Challenge Card & AI Tutor Spotlight */}
        <div className="space-y-4">
          {/* Featured Challenge */}
          {featuredChallenge && (
            <div className="bg-white/90 backdrop-blur-xl border border-stone-200/90 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-950 border border-orange-200">
                  Simulation Challenge
                </span>
                <span className="text-xs font-black text-amber-600">+{featuredChallenge.xpReward} XP</span>
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">{featuredChallenge.title}</h3>
                <p className="text-xs text-stone-600 mt-1">{featuredChallenge.description}</p>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-600 font-medium">Robot Architecture:</span>
                  <span className="font-bold text-stone-900">{featuredChallenge.robotId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 font-medium">Max Pos Error:</span>
                  <span className="font-mono font-bold text-stone-900">{featuredChallenge.constraints.maxPositionErrorMm} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 font-medium">Target Position:</span>
                  <span className="font-mono font-bold text-stone-900">
                    [{featuredChallenge.targetPose.position.join(', ')}] m
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onOpenSimulator) {
                    onOpenSimulator(featuredChallenge.robotId, featuredChallenge.targetPose);
                  } else {
                    selectChallenge(featuredChallenge.id);
                    setActiveSubtab('challenges');
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Launch in 3D Simulator</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
