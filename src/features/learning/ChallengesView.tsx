import React, { useState, useEffect, useRef } from 'react';
import { useLearningStore } from './useLearningStore';
import { useRobotStore } from '../../state/robotStore';
import type { SimulationChallenge } from '../../server/db/types';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

interface ChallengesViewProps {
  onOpenSimulator?: (robotId?: string, pose?: any) => void;
}

interface ChallengeActiveViewProps {
  activeChallenge: SimulationChallenge;
  onBack: () => void;
  onOpenSimulator?: (robotId?: string, pose?: any) => void;
}

const ChallengeActiveView: React.FC<ChallengeActiveViewProps> = ({
  activeChallenge,
  onBack,
  onOpenSimulator,
}) => {
  const currentRobot = useRobotStore((s) => s.robot);
  const currentQ = useRobotStore((s) => s.q);
  const {
    submitSimulationChallenge,
    submittingChallenge,
    challengeResult,
  } = useLearningStore();

  const [jointInputs, setJointInputs] = useState<string[]>(() =>
    currentQ && currentQ.length > 0
      ? currentQ.map((v) => v.toFixed(4))
      : ['0', '0', '0', '0', '0', '0']
  );
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const handleSyncFromSimulator = () => {
    if (currentQ && currentQ.length > 0) {
      setJointInputs(currentQ.map((v) => v.toFixed(4)));
    }
  };

  const handleLaunchInSimulator = () => {
    if (!onOpenSimulator) return;
    onOpenSimulator(activeChallenge.robotId, activeChallenge.targetPose);
  };

  const handleSubmit = async () => {
    const q = jointInputs.map((v) => parseFloat(v) || 0);
    const timeSec = Math.max(1, Math.round((Date.now() - (startTimeRef.current ?? Date.now())) / 1000));
    await submitSimulationChallenge(q, timeSec);
  };

  return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-xs font-bold text-stone-800 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Simulation Challenges</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-stone-100 text-stone-800 border border-stone-300">
              {activeChallenge.robotId}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-orange-100 text-orange-950 border border-orange-300">
              +{activeChallenge.xpReward} XP
            </span>
          </div>
        </div>

        {/* Challenge details */}
        <div className="bg-white/95 backdrop-blur-xl border border-stone-300/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              {activeChallenge.title}
            </h1>
            <p className="text-sm text-stone-700 mt-2 leading-relaxed">
              {activeChallenge.description}
            </p>
          </div>

          {/* Target specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-stone-50 border border-stone-200 rounded-2xl">
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Target Cartesian Position [m]
              </div>
              <div className="font-mono text-sm font-bold text-stone-900">
                X: {activeChallenge.targetPose.position[0].toFixed(3)}, Y: {activeChallenge.targetPose.position[1].toFixed(3)}, Z: {activeChallenge.targetPose.position[2].toFixed(3)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Target Euler Orientation [rad]
              </div>
              <div className="font-mono text-sm font-bold text-stone-900">
                Rx: {activeChallenge.targetPose.orientationEuler[0].toFixed(3)}, Ry: {activeChallenge.targetPose.orientationEuler[1].toFixed(3)}, Rz: {activeChallenge.targetPose.orientationEuler[2].toFixed(3)}
              </div>
            </div>

            <div className="space-y-1 border-t border-stone-200 sm:border-t-0 pt-2 sm:pt-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Max Allowed Position Error
              </div>
              <div className="font-mono text-sm font-bold text-amber-700">
                {activeChallenge.constraints.maxPositionErrorMm} mm
              </div>
            </div>

            <div className="space-y-1 border-t border-stone-200 sm:border-t-0 pt-2 sm:pt-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Max Allowed Orientation Error
              </div>
              <div className="font-mono text-sm font-bold text-amber-700">
                {activeChallenge.constraints.maxOrientationErrorDeg}°
              </div>
            </div>
          </div>

          {/* 3D Simulator Bridge */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Integrated 3D Simulation Testing
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Load this challenge target directly into the 3D scene, jog joints or solve IK, then capture results.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenSimulator && (
                <button
                  type="button"
                  onClick={handleLaunchInSimulator}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  Launch in 3D Scene
                </button>
              )}
              <button
                type="button"
                onClick={handleSyncFromSimulator}
                className="px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-900 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                Sync Current Joints
              </button>
            </div>
          </div>

          {/* Joint Inputs */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-black uppercase tracking-wider text-stone-700">
              Final Evaluated Joint Values ({currentRobot.name})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {jointInputs.map((val, idx) => (
                <div key={idx} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="text-[10px] font-bold text-stone-500 mb-1">Joint {idx + 1}</div>
                  <input
                    type="number"
                    step="any"
                    value={val}
                    onChange={(e) => {
                      const copy = [...jointInputs];
                      copy[idx] = e.target.value;
                      setJointInputs(copy);
                    }}
                    className="w-full font-mono text-xs font-bold bg-white px-2 py-1 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submittingChallenge}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submittingChallenge ? 'Evaluating with Deterministic Engine...' : 'Submit Pose for Authoritative Scoring'}
          </button>

          {/* Challenge Result Evaluation */}
          {challengeResult && (
            <div
              className={`p-6 rounded-2xl border animate-in fade-in duration-200 space-y-4 ${
                challengeResult.attempt?.passed
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50/90 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {challengeResult.attempt?.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <span className="text-base font-black">
                    {challengeResult.attempt?.passed ? 'Challenge Passed!' : 'Tolerance Not Met'}
                  </span>
                </div>
                <div className="text-lg font-black tabular-nums">
                  Score: {challengeResult.attempt?.score} / 1000
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white/90 rounded-xl border border-stone-200">
                  <div className="text-stone-500 font-bold">Position Error</div>
                  <div className="font-mono text-sm font-bold text-stone-900 mt-0.5">
                    {challengeResult.attempt?.positionErrorMm} mm
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-stone-200">
                  <div className="text-stone-500 font-bold">Orientation Error</div>
                  <div className="font-mono text-sm font-bold text-stone-900 mt-0.5">
                    {challengeResult.attempt?.orientationErrorDeg}°
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-stone-200">
                  <div className="text-stone-500 font-bold">Joint Limits</div>
                  <div className="font-mono text-sm font-bold text-stone-900 mt-0.5">
                    {challengeResult.attempt?.jointLimitsPassed ? '✓ Compliant' : '✗ Violated'}
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-stone-200">
                  <div className="text-stone-500 font-bold">XP Awarded</div>
                  <div className="font-mono text-sm font-bold text-amber-600 mt-0.5">
                    +{challengeResult.xpAwarded} XP
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
};

export const ChallengesView: React.FC<ChallengesViewProps> = ({ onOpenSimulator }) => {
  const {
    challenges,
    challengesLoading,
    activeChallenge,
    fetchChallenges,
    selectChallenge,
  } = useLearningStore();

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  if (activeChallenge) {
    return (
      <ChallengeActiveView
        key={activeChallenge.id}
        activeChallenge={activeChallenge}
        onBack={() => selectChallenge(null)}
        onOpenSimulator={onOpenSimulator}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-amber-600" />
          <span>3D Simulation Challenges</span>
        </h1>
        <p className="text-xs text-stone-600 mt-0.5">
          Put theory into real robotic action: execute docking, pick-and-place, and singularity maneuvers verified by the deterministic engine.
        </p>
      </div>

      {challengesLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (challenges || []).length === 0 ? (
        <div className="bg-white/80 border border-stone-200 rounded-3xl p-12 text-center">
          <Sliders className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900">No simulation challenges found</h3>
          <p className="text-xs text-stone-600 mt-1">Check your connection or refresh to load verified challenges.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(challenges || []).map((ch) => (
            <div
              key={ch.id}
              className="bg-white/95 backdrop-blur-xl border border-stone-200/90 hover:border-amber-400/80 rounded-2xl p-5 sm:p-6 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-200">
                    {ch.robotId}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                      {ch.difficulty}
                    </span>
                    <span className="text-xs font-black text-amber-600">+{ch.xpReward} XP</span>
                  </div>
                </div>

                <h3 className="text-base font-black text-stone-900">{ch.title}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{ch.description}</p>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Target Pose:</span>
                    <span className="font-mono font-bold text-stone-900">
                      [{ch.targetPose.position.join(', ')}] m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Accuracy Tolerance:</span>
                    <span className="font-mono font-bold text-amber-700">
                      &lt; {ch.constraints.maxPositionErrorMm} mm, &lt; {ch.constraints.maxOrientationErrorDeg}°
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => selectChallenge(ch.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <span>Open Challenge</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
