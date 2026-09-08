import React from 'react';
import { useRobotStore } from '../../state/robotStore';
import {
  RotateCcw,
  Sliders,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { DEG_TO_RAD, RAD_TO_DEG } from '../../robotics/math/constants';

export const JointControlPanel: React.FC = () => {
  const { robot, q, setJointValue, resetToHome, setJoints } = useRobotStore();

  const handleZeroAll = () => {
    setJoints(new Array(robot.dof).fill(0));
  };

  const handleRandomPose = () => {
    const randomQ = robot.joints.map((joint) => {
      const min = joint.min;
      const max = joint.max;
      // Keep within 80% of limits to avoid harsh singularity
      const span = max - min;
      return min + span * 0.1 + Math.random() * span * 0.8;
    });
    setJoints(randomQ);
  };

  const handleInvertAll = () => {
    const inverted = q.map((val, idx) => {
      const j = robot.joints[idx];
      const neg = -val;
      return Math.max(j.min, Math.min(j.max, neg));
    });
    setJoints(inverted);
  };

  const handleNudgeAll = (deltaDeg: number) => {
    const deltaRad = deltaDeg * DEG_TO_RAD;
    const nudged = q.map((val, idx) => {
      const j = robot.joints[idx];
      const next = j.type === 'revolute' ? val + deltaRad : val + deltaDeg / 1000;
      return Math.max(j.min, Math.min(j.max, next));
    });
    setJoints(nudged);
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] p-4 select-none overflow-y-auto space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-stone-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-black border border-amber-300 shadow-xs">
              <Sliders className="w-4 h-4 text-black" />
            </div>
            <div>
              <h2 className="text-sm font-black text-black">Joint Controllers</h2>
              <p className="text-[11px] text-stone-600 font-bold">
                {robot.dof} Generalized Coordinates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={resetToHome}
              title="Reset all joints to calibrated Home Pose"
              aria-label="Reset to Home Pose"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-black bg-white hover:bg-stone-100 rounded-xl border border-stone-300 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-black" />
              Home
            </button>
            <button
              onClick={handleZeroAll}
              title="Set all joint variables to 0"
              aria-label="Set all joint variables to zero"
              className="px-3 py-1.5 text-xs font-black text-black bg-stone-100 hover:bg-stone-200 rounded-xl border border-stone-300 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Zero All
            </button>
          </div>
        </div>

        {/* Global Quick Action Pose Buttons */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <button
            onClick={handleRandomPose}
            title="Generate random valid configuration"
            aria-label="Random Pose"
            className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 border border-orange-300 rounded-xl text-[11px] font-black text-black shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-orange-700" />
            Random
          </button>
          <button
            onClick={handleInvertAll}
            title="Invert sign of all joint values"
            aria-label="Invert Pose"
            className="flex items-center justify-center gap-1 px-2 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-[11px] font-black text-black shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-black" />
            Invert
          </button>
          <button
            onClick={() => handleNudgeAll(5)}
            title="Nudge all joints +5 degrees"
            aria-label="Nudge All +5 deg"
            className="flex items-center justify-center gap-1 px-2 py-2 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl text-[11px] font-black text-black shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <ArrowUp className="w-3 h-3 text-emerald-800" />
            +5° All
          </button>
          <button
            onClick={() => handleNudgeAll(-5)}
            title="Nudge all joints -5 degrees"
            aria-label="Nudge All -5 deg"
            className="flex items-center justify-center gap-1 px-2 py-2 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-xl text-[11px] font-black text-black shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <ArrowDown className="w-3 h-3 text-rose-800" />
            -5° All
          </button>
        </div>
      </div>

      {/* Joint Cards List with Direct Stepper Buttons */}
      <div className="flex-1 space-y-3.5">
        {robot.joints.map((joint, idx) => {
          const isRevolute = joint.type === 'revolute';
          const val = q[idx] ?? 0;

          // Unit display: degrees for revolute, mm for prismatic
          const displayVal = isRevolute ? val * RAD_TO_DEG : val * 1000;
          const minDisplay = isRevolute ? joint.min * RAD_TO_DEG : joint.min * 1000;
          const maxDisplay = isRevolute ? joint.max * RAD_TO_DEG : joint.max * 1000;
          const unit = isRevolute ? '°' : ' mm';

          // Limit proximity margin (within 5 deg or 10 mm)
          const margin = isRevolute ? 5 : 10;
          const nearMin = displayVal - minDisplay < margin;
          const nearMax = maxDisplay - displayVal < margin;
          const isNearLimit = nearMin || nearMax;

          // Jog step handler
          const handleStep = (delta: number) => {
            const nextDisplay = displayVal + delta;
            const clamped = Math.max(minDisplay, Math.min(maxDisplay, nextDisplay));
            const radVal = isRevolute ? clamped * DEG_TO_RAD : clamped / 1000;
            setJointValue(idx, radVal);
          };

          const handleSetExact = (targetDegOrMm: number) => {
            const clamped = Math.max(minDisplay, Math.min(maxDisplay, targetDegOrMm));
            const radVal = isRevolute ? clamped * DEG_TO_RAD : clamped / 1000;
            setJointValue(idx, radVal);
          };

          const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const num = parseFloat(e.target.value);
            const radVal = isRevolute ? num * DEG_TO_RAD : num / 1000;
            setJointValue(idx, radVal);
          };

          const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) {
              const clamped = Math.max(minDisplay, Math.min(maxDisplay, num));
              const radVal = isRevolute ? clamped * DEG_TO_RAD : clamped / 1000;
              setJointValue(idx, radVal);
            }
          };

          return (
            <div
              key={joint.id}
              className={`p-3.5 rounded-2xl border-2 transition-all overflow-hidden ${
                isNearLimit
                  ? 'bg-amber-50/90 border-amber-400 shadow-md shadow-amber-500/10'
                  : 'bg-white border-stone-200/90 shadow-sm hover:border-stone-400 hover:shadow-md'
              }`}
            >
              {/* Joint Title & Badges */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-black">{joint.name}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${
                      isRevolute
                        ? 'bg-stone-100 text-black border-stone-300'
                        : 'bg-emerald-100 text-black border-emerald-300'
                    }`}
                  >
                    {isRevolute ? 'REVOLUTE' : 'PRISMATIC'}
                  </span>
                  {isNearLimit && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-950 font-black bg-amber-200 px-1.5 py-0.5 rounded-md">
                      <AlertTriangle className="w-3 h-3 text-amber-800" />
                      Limit
                    </span>
                  )}
                </div>

                {/* Direct Numeric Input Box */}
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    aria-label={`Joint ${idx + 1} value`}
                    step={isRevolute ? '0.5' : '1'}
                    value={displayVal.toFixed(1)}
                    onChange={handleNumberChange}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        handleStep(isRevolute ? 1 : 10);
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        handleStep(isRevolute ? -1 : -10);
                      }
                    }}
                    className="w-16 px-1.5 py-0.5 text-right font-mono text-xs font-black text-black bg-stone-50 border-2 border-stone-300 rounded-md focus:border-black focus:bg-white focus:outline-none shrink-0"
                  />
                  <span className="text-xs text-black font-mono font-bold w-4 shrink-0">{unit}</span>
                </div>
              </div>

              {/* Tactile Button Jogger Bar */}
              <div className="grid grid-cols-5 gap-1 mb-2.5">
                <button
                  onClick={() => handleStep(isRevolute ? -10 : -50)}
                  title={isRevolute ? 'Jog -10°' : 'Jog -50 mm'}
                  aria-label={isRevolute ? `Joint ${idx + 1} -10 degrees` : `Joint ${idx + 1} -50 mm`}
                  className="py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-black text-[11px] font-black transition-all active:scale-95 cursor-pointer"
                >
                  {isRevolute ? '-10°' : '-50'}
                </button>
                <button
                  onClick={() => handleStep(isRevolute ? -1 : -5)}
                  title={isRevolute ? 'Jog -1°' : 'Jog -5 mm'}
                  aria-label={isRevolute ? `Joint ${idx + 1} -1 degree` : `Joint ${idx + 1} -5 mm`}
                  className="py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-black text-[11px] font-black transition-all active:scale-95 cursor-pointer"
                >
                  {isRevolute ? '-1°' : '-5'}
                </button>
                <button
                  onClick={() => handleSetExact(0)}
                  title="Zero this joint"
                  aria-label={`Zero Joint ${idx + 1}`}
                  className="py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-black font-black text-[11px] transition-all active:scale-95 border-2 border-amber-400 cursor-pointer shadow-xs"
                >
                  0
                </button>
                <button
                  onClick={() => handleStep(isRevolute ? 1 : 5)}
                  title={isRevolute ? 'Jog +1°' : 'Jog +5 mm'}
                  aria-label={isRevolute ? `Joint ${idx + 1} +1 degree` : `Joint ${idx + 1} +5 mm`}
                  className="py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-black text-[11px] font-black transition-all active:scale-95 cursor-pointer"
                >
                  {isRevolute ? '+1°' : '+5'}
                </button>
                <button
                  onClick={() => handleStep(isRevolute ? 10 : 50)}
                  title={isRevolute ? 'Jog +10°' : 'Jog +50 mm'}
                  aria-label={isRevolute ? `Joint ${idx + 1} +10 degrees` : `Joint ${idx + 1} +50 mm`}
                  className="py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-black text-[11px] font-black transition-all active:scale-95 cursor-pointer"
                >
                  {isRevolute ? '+10°' : '+50'}
                </button>
              </div>

              {/* Slider with Smooth Accent */}
              <div className="space-y-1">
                <input
                  type="range"
                  aria-label={isRevolute ? `Joint ${idx + 1} angle` : `Joint ${idx + 1} displacement`}
                  aria-valuemin={minDisplay}
                  aria-valuemax={maxDisplay}
                  aria-valuenow={displayVal}
                  aria-valuetext={`${displayVal.toFixed(1)} ${isRevolute ? 'degrees' : 'mm'}`}
                  min={minDisplay}
                  max={maxDisplay}
                  step={isRevolute ? 0.2 : 0.5}
                  value={displayVal}
                  onChange={handleSliderChange}
                  className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-black hover:accent-stone-800 transition-colors"
                />

                {/* Min / Max labels */}
                <div className="flex justify-between text-[10px] font-mono text-stone-700 font-bold">
                  <span>{minDisplay.toFixed(0)}{unit}</span>
                  <span className="text-black font-black">
                    {val.toFixed(3)} {isRevolute ? 'rad' : 'm'}
                  </span>
                  <span>{maxDisplay.toFixed(0)}{unit}</span>
                </div>
              </div>

              {/* Quick Preset Buttons (for revolute joints) */}
              {isRevolute && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100 mt-2">
                  <span className="text-[9px] font-black text-black uppercase tracking-tight mr-1">
                    Presets:
                  </span>
                  {[-90, -45, 0, 45, 90].map((presetAngle) => {
                    const isAvailable = presetAngle >= minDisplay && presetAngle <= maxDisplay;
                    if (!isAvailable) return null;
                    const isCurrent = Math.abs(displayVal - presetAngle) < 0.5;
                    return (
                      <button
                        key={presetAngle}
                        onClick={() => handleSetExact(presetAngle)}
                        className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-black text-white shadow-xs'
                            : 'bg-stone-100 hover:bg-stone-200 text-black border border-stone-300'
                        }`}
                      >
                        {presetAngle}°
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JointControlPanel;
