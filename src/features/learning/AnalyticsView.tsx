import React, { useEffect } from 'react';
import { useLearningStore } from './useLearningStore';
import {
  Activity,
  Target,
  AlertTriangle,
  ArrowRight,
  Layers,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { analyticsData, analyticsLoading, fetchAnalytics, selectProblem, setActiveSubtab } = useLearningStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 border-4 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const profile = analyticsData?.profile;
  const breakdown = analyticsData?.categoryBreakdown || {};
  const weaknesses = analyticsData?.detectedWeaknesses || [];
  const recommendations = analyticsData?.recommendations || [];
  const recentAttempts = analyticsData?.recentAttempts || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
          <Activity className="w-6 h-6 text-amber-600" />
          <span>Personal Kinematics Analytics</span>
        </h1>
        <p className="text-xs text-stone-600 mt-0.5">
          Authoritative performance metrics, deterministic weakness diagnostics, and skill progression analysis.
        </p>
      </div>

      {/* Top Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/90 backdrop-blur-xl border border-stone-200/90 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Overall Accuracy</div>
          <div className="text-2xl font-black text-stone-900 tabular-nums mt-1">
            {analyticsData?.overallAccuracy ?? 0}%
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">Across all attempts</div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-stone-200/90 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">First-Attempt Success</div>
          <div className="text-2xl font-black text-emerald-700 tabular-nums mt-1">
            {analyticsData?.firstAttemptAccuracy ?? 0}%
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">Zero prior attempts</div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-stone-200/90 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Problems Solved</div>
          <div className="text-2xl font-black text-stone-900 tabular-nums mt-1">
            {profile?.stats?.problemsSolved ?? 0}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">Verified solutions</div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-stone-200/90 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Challenges Passed</div>
          <div className="text-2xl font-black text-amber-600 tabular-nums mt-1">
            {profile?.stats?.challengesCompleted ?? 0}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">3D Simulator tasks</div>
        </div>
      </div>

      {/* Weakness Detection Diagnostic */}
      {weaknesses.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-amber-950 font-black text-sm uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Deterministic Weakness Detection</span>
          </div>

          <div className="space-y-2.5">
            {weaknesses.map((w: any) => (
              <div
                key={w.category}
                className="p-4 bg-white/90 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-stone-900 text-sm uppercase">{w.category}</span>
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      {w.accuracy}% Accuracy
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">{w.diagnosis}</p>
                  <p className="text-xs font-bold text-amber-900 mt-0.5">
                    Recommended Study: {w.recommendedTopic}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSubtab('arena')}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer"
                >
                  Solve Practice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Mastery Breakdown */}
      <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
          <Layers className="w-4 h-4 text-stone-700" />
          <span>Category Mastery Breakdown</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(breakdown).map(([cat, data]: [string, any]) => (
            <div key={cat} className="p-4 bg-stone-50 border border-stone-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-stone-900 text-sm uppercase">{cat}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  data.masteryLevel === 'Master'
                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                    : data.masteryLevel === 'Proficient'
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                    : 'bg-stone-200 text-stone-700'
                }`}>
                  {data.masteryLevel}
                </span>
              </div>

              <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, data.accuracy)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-stone-600 pt-1">
                <span>Accuracy: <strong className="font-mono text-stone-900">{data.accuracy}%</strong></span>
                <span>Solved: <strong className="font-mono text-stone-900">{data.solved}/{data.attempted}</strong></span>
                <span>Hints: <strong className="font-mono text-stone-900">{data.hintsUsed}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations Banner */}
      {recommendations.length > 0 && (
        <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-600" />
            <span>Targeted Problem Recommendations</span>
          </h2>

          <div className="space-y-3">
            {recommendations.map((rec: any) => (
              <div
                key={rec.id}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 text-xs sm:text-sm">{rec.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase">
                      {rec.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">{rec.reason}</p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await selectProblem(rec.id);
                    setActiveSubtab('arena');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Solve Problem</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Attempts Activity */}
      {recentAttempts.length > 0 && (
        <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-stone-700" />
            <span>Recent Problem Submissions</span>
          </h2>
          <div className="divide-y divide-stone-100">
            {recentAttempts.slice(0, 5).map((att: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${att.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="font-mono font-bold text-stone-800">{att.problemId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${att.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {att.isCorrect ? 'Solved' : 'Incorrect'}
                  </span>
                  <span className="text-stone-400 tabular-nums">
                    {new Date(att.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
