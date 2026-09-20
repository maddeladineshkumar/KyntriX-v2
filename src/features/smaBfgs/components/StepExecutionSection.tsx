import React, { useState } from 'react';
import type { SMABFGSSolution } from '../../../robotics/ik/smaBfgs/types';
import { RAD_TO_DEG } from '../../../robotics/math/constants';
import { MathView } from './MathView';
import {
  ListOrdered,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';

interface StepExecutionSectionProps {
  solution: SMABFGSSolution;
}

export const StepExecutionSection: React.FC<StepExecutionSectionProps> = ({ solution }) => {
  const { stepTraces } = solution;

  const [expandedStep, setExpandedStep] = useState<number | null>(6); // Default expanded to SMA/BFGS iterations

  const toggleStep = (stepIndex: number) => {
    setExpandedStep(expandedStep === stepIndex ? null : stepIndex);
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
            <ListOrdered className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              Step-by-Step Mathematical Execution Trace
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Real computational pipeline across all 9 optimization and verification stages
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
          9 Verification Checkpoints
        </span>
      </div>

      {/* Accordion Steps List */}
      <div className="space-y-2.5">
        {stepTraces.map((trace) => {
          const isExpanded = expandedStep === trace.stepIndex;

          return (
            <div
              key={trace.stepIndex}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? 'border-amber-400 bg-amber-50/20 shadow-xs'
                  : 'border-stone-200 bg-stone-50/60 hover:bg-stone-50'
              }`}
            >
              {/* Step Header */}
              <button
                type="button"
                onClick={() => toggleStep(trace.stepIndex)}
                className="w-full flex items-center justify-between p-3.5 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                      isExpanded
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {trace.stepIndex}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-stone-900 uppercase tracking-wider block truncate">
                      STEP {trace.stepIndex}: {trace.stepName}
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium truncate block">
                      {trace.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    VERIFIED
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-stone-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-500" />
                  )}
                </div>
              </button>

              {/* Step Content Body */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-stone-200/60 text-xs text-stone-800 space-y-3">
                  <StepDataRenderer
                    stepIndex={trace.stepIndex}
                    data={trace.data}
                    solution={solution}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Sub-component to render custom layouts per step
const StepDataRenderer: React.FC<{
  stepIndex: number;
  data: Record<string, unknown>;
  solution: SMABFGSSolution;
}> = ({ stepIndex, data, solution }) => {
  const { robot } = solution;

  switch (stepIndex) {
    case 1: // Input Validation
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="p-2 bg-white rounded-lg border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 block uppercase">Status</span>
              <span className="font-bold text-emerald-700">{String(data.status)}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 block uppercase">Target (m)</span>
              <span>{(data.targetPosition as number[]).map((v) => v.toFixed(3)).join(', ')}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 block uppercase">PRNG Seed</span>
              <span>{String(data.randomSeed)} (Deterministic)</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 block uppercase">Bound Strategy</span>
              <span>{String(data.boundStrategy)}</span>
            </div>
          </div>
        </div>
      );

    case 2: // Robot Model
      return (
        <div className="space-y-2">
          <div className="text-xs text-stone-600 font-medium">
            Manipulator serial chain loaded with {robot.dof} active joints under {robot.dhConvention} DH convention.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            {robot.joints.map((j, idx) => (
              <div key={idx} className="p-2 bg-white rounded-lg border border-stone-200">
                <span className="text-[10px] font-bold text-stone-400 block uppercase">
                  Joint {idx + 1}: {j.name} ({j.type})
                </span>
                <div>Limits: [{(j.min * RAD_TO_DEG).toFixed(1)}°, {(j.max * RAD_TO_DEG).toFixed(1)}°]</div>
                <div>DH: d={j.d.toFixed(2)}, a={j.a.toFixed(2)}, α={(j.alpha * RAD_TO_DEG).toFixed(0)}°</div>
              </div>
            ))}
          </div>
        </div>
      );

    case 3: // Initial FK
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="p-2.5 bg-white rounded-lg border border-stone-200 space-y-1">
            <div className="text-stone-500 font-bold">Initial End-Effector Position p(q_0):</div>
            <div className="font-bold text-stone-900">
              [{(data.initialPosition as number[]).map((v) => v.toFixed(4)).join(', ')}] meters
            </div>
            <div className="text-stone-500 font-bold pt-1">Initial Position Error ||p(q_0) - p_target||:</div>
            <div className="font-bold text-amber-700">
              {((data.initialPositionErrorMeters as number) * 1000).toFixed(2)} mm ({(data.initialPositionErrorMeters as number).toFixed(4)} m)
            </div>
          </div>
        </div>
      );

    case 4: // Objective Formulation
      return (
        <div className="space-y-2">
          <div className="p-3 bg-white rounded-lg border border-stone-200">
            <MathView
              block
              math={`f(q) = w_p \\cdot \\frac{1}{2} \\|p(q) - p_{\\text{target}}\\|^2 + w_o \\cdot \\frac{1}{2} \\|\\log(R_{\\text{target}} R(q)^T)\\|^2`}
            />
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-2 border-t border-stone-100">
              <div>w_p: {String(data.positionWeight)}</div>
              <div>w_o: {String(data.orientationWeight)}</div>
              <div>f_p(q_0): {(data.initialPositionObjective as number).toFixed(5)}</div>
              <div>f_total(q_0): {(data.initialTotalObjective as number).toFixed(5)}</div>
            </div>
          </div>
        </div>
      );

    case 5: // SMA Initialization
      return (
        <div className="space-y-2">
          <div className="text-xs text-stone-600">
            Initial population seeded with Mulberry32 deterministic generator (Seed={String(data.randomSeed)}).
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2.5 bg-white rounded-lg border border-stone-200">
              <span className="font-bold text-stone-500 block">Initial Best Fitness:</span>
              <span className="text-sm font-black text-amber-700">
                {(data.initialBestFitness as number).toFixed(6)}
              </span>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-stone-200">
              <span className="font-bold text-stone-500 block">Population Size:</span>
              <span className="text-sm font-black text-stone-800">
                {String(data.populationSize)} agents in ℝ^{robot.dof}
              </span>
            </div>
          </div>
        </div>
      );

    case 6: // SMA Iterations
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-700">SMA Iteration History Log (Sampled):</span>
            <span className="text-stone-500 font-mono text-[11px]">
              Final Best Fitness: {(data.finalBestObjective as number).toExponential(4)}
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-left font-mono text-[10px]">
              <thead className="bg-stone-100 text-stone-700 uppercase">
                <tr>
                  <th className="p-2">Iter</th>
                  <th className="p-2">Best Cost</th>
                  <th className="p-2">Avg Cost</th>
                  <th className="p-2">Param a</th>
                  <th className="p-2">Param b</th>
                  <th className="p-2">Dominant Update Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {solution.smaResult.history.slice(0, 8).map((h) => (
                  <tr key={h.iteration}>
                    <td className="p-2 font-bold">{h.iteration}</td>
                    <td className="p-2 text-amber-700 font-bold">{h.bestFitness.toFixed(6)}</td>
                    <td className="p-2 text-stone-600">{h.averageFitness.toFixed(6)}</td>
                    <td className="p-2">{h.parameterA.toFixed(3)}</td>
                    <td className="p-2">{h.parameterB.toFixed(3)}</td>
                    <td className="p-2 text-stone-600 truncate max-w-[200px]">{h.updateRuleTriggered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 7: // BFGS Initialization
      return (
        <div className="space-y-2">
          <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2">
            <MathView
              block
              math={`p_0 = - H_0 \\nabla f(q_{\\text{SMA}}), \\quad H_0 = I_{${robot.dof}}`}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
              <div>Initial BFGS Cost: {(data.startingObjective as number).toFixed(6)}</div>
              <div>Gradient Norm ||g_0||: {(data.gradientNorm as number).toFixed(5)}</div>
              <div>Inverse Hessian Trace: {String(data.initialHessianTrace)}</div>
            </div>
          </div>
        </div>
      );

    case 8: // BFGS Iterations
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-700">Quasi-Newton BFGS Descent Log (Sampled):</span>
            <span className="text-stone-500 font-mono text-[11px]">
              Termination: {String(data.terminationReason)}
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-left font-mono text-[10px]">
              <thead className="bg-stone-100 text-stone-700 uppercase">
                <tr>
                  <th className="p-2">k</th>
                  <th className="p-2">f(q_k)</th>
                  <th className="p-2">||g_k||</th>
                  <th className="p-2">Step α</th>
                  <th className="p-2">s^T y (Curvature)</th>
                  <th className="p-2">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {solution.bfgsResult.history.slice(0, 10).map((h) => (
                  <tr key={h.iteration}>
                    <td className="p-2 font-bold">{h.iteration}</td>
                    <td className="p-2 text-blue-700 font-bold">{h.objective.toExponential(4)}</td>
                    <td className="p-2 text-stone-700">{h.gradientNorm.toExponential(3)}</td>
                    <td className="p-2">{h.stepSize.toFixed(4)}</td>
                    <td className="p-2 text-stone-600">{h.curvature.toExponential(3)}</td>
                    <td className="p-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          h.updateStatus === 'Updated'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {h.updateStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 9: // Final Validation
      return (
        <div className="space-y-2">
          <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Authoritative Kinematic Audit Finished in {(data.executionTimeMs as number).toFixed(1)} ms</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
              <div>Position Residual: {(data.positionErrorMm as number).toFixed(4)} mm</div>
              <div>Orientation Residual: {(data.orientationErrorDegrees as number).toFixed(3)}°</div>
              <div>Manipulability w: {(data.manipulability as number).toFixed(4)}</div>
              <div>Condition Number: {(data.conditionNumber as number).toFixed(1)}</div>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
