import React, { useEffect, useMemo } from 'react';
import { useLearningStore } from './useLearningStore';
import {
  Activity,
  Target,
  AlertTriangle,
  ArrowRight,
  Layers,
} from 'lucide-react';

interface CategoryMasteryItem {
  name: string;
  shortCode: string;
  description: string;
  attempted: number;
  solved: number;
  accuracy: number;
  hintsUsed: number;
  masteryLevel: string;
}

const CANONICAL_CATEGORIES: Record<string, { name: string; description: string }> = {
  transforms: {
    name: 'Transformations & Coordinate Frames',
    description: 'Rotation matrices, homogeneous transforms, Euler angles & quaternions',
  },
  dh: {
    name: 'Denavit-Hartenberg (DH) Parameters',
    description: 'Standard & Craig DH parameter tables, frame alignment & twists',
  },
  fk: {
    name: 'Forward Kinematics (FK)',
    description: 'End-effector pose calculation from joint space configurations',
  },
  ik: {
    name: 'Inverse Kinematics (IK)',
    description: 'Analytical closed-form, spherical wrist & numerical IK solvers',
  },
  jacobians: {
    name: 'Differential Kinematics & Jacobians',
    description: 'Geometric Jacobians, velocity propagation & kinematic singularities',
  },
  dynamics: {
    name: 'Manipulator Dynamics & Inertia',
    description: 'Euler-Lagrange, Newton-Euler dynamics & joint torque evaluation',
  },
  control: {
    name: 'Robot Control & Motion Tracking',
    description: 'PID, feedforward, impedance control & operational space tracking',
  },
  mobile: {
    name: 'Mobile Robotics & Odometry',
    description: 'Differential drive, wheel odometry & kinematic vehicle models',
  },
  trajectory: {
    name: 'Trajectory Planning & Generation',
    description: 'Cubic & quintic polynomials, trapezoidal profiles & blend times',
  },
  workspace: {
    name: 'Workspace Reachability & Volume',
    description: 'Reachable & dextrous workspace envelopes and volume integration',
  },
};

export const AnalyticsView: React.FC = () => {
  const { analyticsData, analyticsLoading, fetchAnalytics, selectProblem, setActiveSubtab } = useLearningStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const profile = analyticsData?.profile;
  const weaknesses = analyticsData?.detectedWeaknesses || [];
  const recommendations = analyticsData?.recommendations || [];
  const recentAttempts = analyticsData?.recentAttempts || [];

  const breakdown = useMemo<Record<string, CategoryMasteryItem>>(() => {
    const raw = analyticsData?.categoryBreakdown || {};
    const result: Record<string, CategoryMasteryItem> = {};

    for (const [key, meta] of Object.entries(CANONICAL_CATEGORIES)) {
      const data = raw[key];
      const attempted = typeof data?.attempted === 'number' ? data.attempted : 0;
      const solved = typeof data?.solved === 'number' ? data.solved : 0;
      const accuracy = attempted > 0 ? Math.round((solved / attempted) * 100) : (data?.accuracy ?? 0);
      const hintsUsed = typeof data?.hintsUsed === 'number' ? data.hintsUsed : 0;
      let mastery = data?.masteryLevel || 'Novice';
      if (!data?.masteryLevel) {
        if (accuracy >= 85 && solved >= 5) mastery = 'Master';
        else if (accuracy >= 70 && solved >= 3) mastery = 'Proficient';
        else if (solved >= 1) mastery = 'Developing';
      }

      result[key] = {
        name: meta.name,
        shortCode: key,
        description: meta.description,
        attempted,
        solved,
        accuracy,
        hintsUsed,
        masteryLevel: mastery,
      };
    }

    // Include any custom or extra categories
    for (const [key, data] of Object.entries(raw)) {
      if (!result[key] && data && typeof data === 'object') {
        const d = data as any;
        result[key] = {
          name: key.toUpperCase(),
          shortCode: key,
          description: 'Kinematics category',
          attempted: d.attempted ?? 0,
          solved: d.solved ?? 0,
          accuracy: d.accuracy ?? 0,
          hintsUsed: d.hintsUsed ?? 0,
          masteryLevel: d.masteryLevel ?? 'Novice',
        };
      }
    }

    return result;
  }, [analyticsData?.categoryBreakdown]);

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 border-4 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

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
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-stone-700" />
            <span>Category Mastery Breakdown</span>
          </h2>
          <span className="text-xs font-bold text-stone-500">
            {Object.values(breakdown).filter((b) => b.solved > 0).length} of {Object.keys(breakdown).length} Categories Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(breakdown).map(([cat, data]) => (
            <div key={cat} className="p-4 bg-stone-50 border border-stone-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-stone-900 text-sm">{data.name}</span>
                    <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-200/70 px-1.5 py-0.5 rounded">
                      {data.shortCode.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">{data.description}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                  data.masteryLevel === 'Master'
                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                    : data.masteryLevel === 'Proficient'
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                    : data.masteryLevel === 'Developing'
                    ? 'bg-blue-100 text-blue-950 border border-blue-300'
                    : 'bg-stone-200 text-stone-700'
                }`}>
                  {data.masteryLevel}
                </span>
              </div>

              <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(data.accuracy > 0 ? 4 : 0, Math.min(100, data.accuracy))}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-stone-600 pt-0.5">
                <span>Accuracy: <strong className="font-mono text-stone-900">{data.accuracy}%</strong></span>
                <span>Solved: <strong className="font-mono text-stone-900">{data.solved}/{data.attempted}</strong></span>
                <span>Hints Used: <strong className="font-mono text-stone-900">{data.hintsUsed}</strong></span>
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
