import React, { useState, useEffect, useRef } from 'react';
import type { SMABFGSSolution } from '../../../robotics/ik/smaBfgs/types';
import { RAD_TO_DEG } from '../../../robotics/math/constants';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface TrajectoryPlaybackSectionProps {
  solution: SMABFGSSolution;
  onPreviewJoints: (joints: number[]) => void;
}

export const TrajectoryPlaybackSection: React.FC<TrajectoryPlaybackSectionProps> = ({
  solution,
  onPreviewJoints,
}) => {
  const { initialJoints, bestSMAJoints, finalJoints, smaResult, bfgsResult, robot } = solution;

  // Compile timeline of milestones and recorded iterations
  // 1. Initial configuration
  // 2. Best SMA iteration samples
  // 3. BFGS iteration samples
  // 4. Final configuration
  const timeline = React.useMemo(() => {
    const steps: { name: string; phase: 'Initial' | 'SMA' | 'BFGS' | 'Final'; q: number[]; iter: number }[] = [];

    steps.push({ name: 'Initial Configuration (q_0)', phase: 'Initial', q: [...initialJoints], iter: 0 });

    // Sample SMA history
    smaResult.history.forEach((h) => {
      steps.push({
        name: `SMA Iteration ${h.iteration}`,
        phase: 'SMA',
        q: [...h.bestPosition],
        iter: h.iteration,
      });
    });

    // Sample BFGS history
    bfgsResult.history.forEach((h) => {
      steps.push({
        name: `BFGS Iteration ${h.iteration}`,
        phase: 'BFGS',
        q: [...h.q],
        iter: h.iteration,
      });
    });

    steps.push({ name: 'Final Refined Solution (q*)', phase: 'Final', q: [...finalJoints], iter: steps.length });

    return steps;
  }, [initialJoints, bestSMAJoints, finalJoints, smaResult, bfgsResult]);

  const [currentStepIdx, setCurrentStepIdx] = useState<number>(timeline.length - 1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const activeStep = timeline[currentStepIdx] || timeline[timeline.length - 1];

  // Send preview joints whenever current step changes
  useEffect(() => {
    if (activeStep) {
      onPreviewJoints(activeStep.q);
    }
  }, [currentStepIdx, activeStep, onPreviewJoints]);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, timeline.length]);

  const handleTogglePlay = () => {
    if (currentStepIdx >= timeline.length - 1) {
      setCurrentStepIdx(0);
    }
    setIsPlaying((p) => !p);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(0);
  };

  const handleJumpToFinal = () => {
    setIsPlaying(false);
    setCurrentStepIdx(timeline.length - 1);
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              Recorded Optimization Trajectory & 3D Step-Through
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Inspect physical arm poses across initial seed, SMA food foraging, and BFGS gradient steps
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            title="Reset to Initial Pose"
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentStepIdx((i) => Math.max(0, i - 1))}
            title="Previous Step"
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleTogglePlay}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentStepIdx((i) => Math.min(timeline.length - 1, i + 1))}
            title="Next Step"
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-stone-200">
            <button
              type="button"
              onClick={handleReset}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                currentStepIdx === 0
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              Initial (q₀)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIdx(Math.min(timeline.length - 1, Math.max(0, smaResult.history.length)));
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeStep.phase === 'SMA' && currentStepIdx === smaResult.history.length
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              Best SMA (q_SMA)
            </button>
            <button
              type="button"
              onClick={handleJumpToFinal}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                currentStepIdx === timeline.length - 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200'
              }`}
            >
              Final BFGS (q*)
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                activeStep.phase === 'Initial'
                  ? 'bg-stone-200 text-stone-700'
                  : activeStep.phase === 'SMA'
                  ? 'bg-amber-200 text-amber-900'
                  : activeStep.phase === 'BFGS'
                  ? 'bg-blue-200 text-blue-900'
                  : 'bg-emerald-200 text-emerald-900'
              }`}
            >
              {activeStep.phase}
            </span>
            <span className="font-bold text-stone-900">{activeStep.name}</span>
          </div>
          <span className="font-mono text-stone-500 font-bold">
            Step {currentStepIdx + 1} of {timeline.length}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={timeline.length - 1}
          value={currentStepIdx}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentStepIdx(parseInt(e.target.value, 10));
          }}
          className="w-full accent-indigo-600 cursor-pointer"
        />

        {/* Milestone Quick Jumps */}
        <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 pt-1">
          <button
            type="button"
            onClick={() => { setIsPlaying(false); setCurrentStepIdx(0); }}
            className="hover:text-stone-700 cursor-pointer"
          >
            ● Initial Configuration
          </button>
          <button
            type="button"
            onClick={() => { setIsPlaying(false); setCurrentStepIdx(smaResult.history.length); }}
            className="hover:text-amber-700 cursor-pointer"
          >
            ● Best SMA Candidate
          </button>
          <button
            type="button"
            onClick={() => { setIsPlaying(false); setCurrentStepIdx(timeline.length - 1); }}
            className="hover:text-emerald-700 cursor-pointer"
          >
            ● Final BFGS Solution
          </button>
        </div>
      </div>

      {/* Live Pose Inspector */}
      <div className="space-y-1.5">
        <span className="text-xs font-black text-stone-700 uppercase tracking-wider block">
          Current Timeline Frame Joint Values (q):
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
          {activeStep.q.map((val, idx) => {
            const isRev = robot.joints[idx]?.type === 'revolute';
            return (
              <div key={idx} className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-[10px] text-stone-400 block font-sans uppercase">
                  Joint {idx + 1}
                </span>
                <span className="font-bold text-stone-900 block">
                  {isRev ? `${(val * RAD_TO_DEG).toFixed(2)}°` : `${val.toFixed(3)} m`}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  {val.toFixed(4)} rad
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
