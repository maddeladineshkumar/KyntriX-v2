import React, { useState } from 'react';
import type { SMABFGSSolution } from '../../../robotics/ik/smaBfgs/types';
import { RAD_TO_DEG } from '../../../robotics/math/constants';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  Send,
} from 'lucide-react';

interface ValidationSectionProps {
  solution: SMABFGSSolution;
  onApplyToRobot: (joints: number[]) => void;
}

export const ValidationSection: React.FC<ValidationSectionProps> = ({
  solution,
  onApplyToRobot,
}) => {
  const { validation, robot, finalJoints, options } = solution;
  const [copied, setCopied] = useState(false);

  const handleCopyJoints = () => {
    const text = finalJoints.map((q, i) => `J${i + 1}: ${q.toFixed(6)} rad (${(q * RAD_TO_DEG).toFixed(3)}°)`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(solution, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${robot.name}_SMA_BFGS_IK_solution.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              Independent Kinematic Solution Validation
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Rigorous post-optimization recomputation of forward kinematics, residuals, and constraints
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJoints}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-600" />}
            <span>{copied ? 'Copied!' : 'Copy Angles'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>JSON</span>
          </button>
          <button
            type="button"
            onClick={() => onApplyToRobot(finalJoints)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Apply Solution to 3D Viewport</span>
          </button>
        </div>
      </div>

      {/* Status Message Alert */}
      <div
        className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
          validation.converged
            ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
            : validation.status === 'INFEASIBLE_OR_UNREACHABLE_TARGET'
            ? 'bg-rose-50 text-rose-950 border-rose-200'
            : 'bg-amber-50 text-amber-950 border-amber-200'
        }`}
      >
        {validation.converged ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          <span className="font-black block uppercase tracking-wider text-[11px]">
            Kinematic Audit Verdict: {validation.status}
          </span>
          <p className="font-medium text-stone-700">{validation.statusMessage}</p>
        </div>
      </div>

      {/* Validation Checklist Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* 1. Position Residual */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-600 uppercase text-[10px]">Position Residual</span>
            {validation.positionErrorMeters <= options.positionTolerance ? (
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">PASS</span>
            ) : (
              <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">FAIL</span>
            )}
          </div>
          <div className="text-base font-black text-stone-900 font-mono">
            {validation.positionErrorMm.toFixed(4)} mm
          </div>
          <span className="text-[10px] text-stone-400 block">
            Requested tolerance: {(options.positionTolerance * 1000).toFixed(3)} mm
          </span>
        </div>

        {/* 2. Orientation Residual */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-600 uppercase text-[10px]">Orientation Residual</span>
            {options.positionOnly || validation.orientationErrorRadians <= options.orientationTolerance ? (
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                {options.positionOnly ? 'FREE' : 'PASS'}
              </span>
            ) : (
              <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">FAIL</span>
            )}
          </div>
          <div className="text-base font-black text-stone-900 font-mono">
            {options.positionOnly ? 'Ignored' : `${validation.orientationErrorDegrees.toFixed(3)}°`}
          </div>
          <span className="text-[10px] text-stone-400 block">
            {options.positionOnly ? 'Position-only mode' : `Log-map residual: ${validation.orientationErrorRadians.toFixed(4)} rad`}
          </span>
        </div>

        {/* 3. Joint Limits */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-600 uppercase text-[10px]">Joint Limits Bound</span>
            {validation.withinJointLimits ? (
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">VALID</span>
            ) : (
              <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">VIOLATION</span>
            )}
          </div>
          <div className="text-base font-black text-stone-900">
            {validation.withinJointLimits ? 'All within [min, max]' : `${validation.jointLimitViolations.length} Violations`}
          </div>
          <span className="text-[10px] text-stone-400 block">
            Sigmoid transformation / projection
          </span>
        </div>

        {/* 4. Manipulability & Singularity */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-600 uppercase text-[10px]">Yoshikawa Dexterity</span>
            {validation.isSingular ? (
              <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">SINGULAR</span>
            ) : (
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">DEXTEROUS</span>
            )}
          </div>
          <div className="text-base font-black text-stone-900 font-mono">
            w = {validation.manipulability.toFixed(4)}
          </div>
          <span className="text-[10px] text-stone-400 block">
            Condition number: {validation.conditionNumber.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Computed Joint Angles Card Grid */}
      <div className="space-y-2">
        <span className="text-xs font-black text-stone-700 uppercase tracking-wider block">
          Final Joint Angles (q*):
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {finalJoints.map((qVal, idx) => {
            const joint = robot.joints[idx];
            const isRev = joint?.type === 'revolute';
            const deg = qVal * RAD_TO_DEG;
            return (
              <div key={idx} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] font-bold text-stone-400 block uppercase">
                  Joint {idx + 1} ({joint?.name || `J${idx + 1}`})
                </span>
                <div className="text-sm font-black font-mono text-stone-900">
                  {isRev ? `${deg.toFixed(2)}°` : `${qVal.toFixed(3)} m`}
                </div>
                <span className="text-[10px] text-stone-500 font-mono">
                  {qVal.toFixed(5)} rad
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
