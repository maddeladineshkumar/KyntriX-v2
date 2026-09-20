import React, { useState } from 'react';
import type { SMABFGSSolution } from '../../../robotics/ik/smaBfgs/types';
import { Activity, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ConvergencePlotSectionProps {
  solution: SMABFGSSolution;
}

export const ConvergencePlotSection: React.FC<ConvergencePlotSectionProps> = ({ solution }) => {
  const { validation, smaResult, bfgsResult, objectiveHistory, options } = solution;

  const [activePlot, setActivePlot] = useState<'all-objective' | 'errors' | 'grad-norm'>('all-objective');

  // SMA objective data
  const smaData = objectiveHistory.smaPhase;
  // BFGS objective data
  const bfgsData = objectiveHistory.bfgsPhase;
  // Error data
  const posErrData = objectiveHistory.positionErrorHistory;
  const oriErrData = objectiveHistory.orientationErrorHistory;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
      {/* Header & Metrics Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              Convergence & Real Optimization Telemetry
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Objective descent curves, position residuals, and gradient norm dynamics
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black shrink-0 ${
            validation.converged
              ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
              : validation.status === 'INFEASIBLE_OR_UNREACHABLE_TARGET'
              ? 'bg-rose-100 text-rose-950 border-rose-300'
              : 'bg-amber-100 text-amber-950 border-amber-300'
          }`}
        >
          {validation.converged ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          )}
          <span>{validation.status}</span>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Execution Time</span>
          <span className="text-sm font-black text-stone-900 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            {validation.executionTimeMs.toFixed(1)} ms
          </span>
        </div>
        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Iterations</span>
          <span className="text-sm font-black text-stone-900">
            {smaResult.iterationsCompleted + bfgsResult.iterationsCompleted} (SMA {smaResult.iterationsCompleted} + BFGS {bfgsResult.iterationsCompleted})
          </span>
        </div>
        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Function Evaluations</span>
          <span className="text-sm font-black text-stone-900">
            {smaResult.functionEvaluations + bfgsResult.functionEvaluations}
          </span>
        </div>
        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Gradient Evaluations</span>
          <span className="text-sm font-black text-stone-900">
            {bfgsResult.gradientEvaluations}
          </span>
        </div>
        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Final Position Error</span>
          <span className="text-sm font-black text-emerald-800 font-mono">
            {validation.positionErrorMm < 0.1
              ? `${(validation.positionErrorMm * 1000).toFixed(1)} µm`
              : `${validation.positionErrorMm.toFixed(3)} mm`}
          </span>
        </div>
        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Final Objective f(q)</span>
          <span className="text-sm font-black text-stone-900 font-mono">
            {bfgsResult.objective.toExponential(4)}
          </span>
        </div>
      </div>

      {/* Plot Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActivePlot('all-objective')}
          className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
            activePlot === 'all-objective'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          SMA & BFGS Objective Descent
        </button>
        <button
          type="button"
          onClick={() => setActivePlot('errors')}
          className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
            activePlot === 'errors'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Position & Orientation Residuals
        </button>
        <button
          type="button"
          onClick={() => setActivePlot('grad-norm')}
          className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
            activePlot === 'grad-norm'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          BFGS Gradient Norm ||g_k||
        </button>
      </div>

      {/* SVG Convergence Chart */}
      <div className="bg-[#1e1e24] p-4 rounded-xl text-white">
        {activePlot === 'all-objective' && (
          <ObjectiveDescentPlot smaData={smaData} bfgsData={bfgsData} />
        )}
        {activePlot === 'errors' && (
          <ResidualErrorsPlot posData={posErrData} oriData={oriErrData} isPosOnly={options.positionOnly} />
        )}
        {activePlot === 'grad-norm' && (
          <GradientNormPlot bfgsData={bfgsData} />
        )}
      </div>
    </div>
  );
};

// SVG Sub-chart 1: Combined Objective Plot
const ObjectiveDescentPlot: React.FC<{
  smaData: { iteration: number; bestObjective: number; avgObjective: number }[];
  bfgsData: { iteration: number; objective: number }[];
}> = ({ smaData, bfgsData }) => {
  const width = 800;
  const height = 240;
  const padL = 65;
  const padR = 25;
  const padT = 25;
  const padB = 40;

  // Combine data into two continuous phases
  const totalSma = smaData.length;
  const totalBfgs = bfgsData.length;
  const totalPts = totalSma + totalBfgs;

  if (totalPts === 0) return <div className="text-center py-12 text-stone-400">No telemetry recorded yet.</div>;

  // Find y-range (use log scale if ratio > 100)
  const allVals = [
    ...smaData.map((d) => d.bestObjective),
    ...bfgsData.map((d) => d.objective),
  ].filter((v) => Number.isFinite(v) && v > 0);

  const maxVal = Math.max(...allVals, 1e-6);
  const minVal = Math.max(1e-12, Math.min(...allVals, 1e-6));

  const logMax = Math.log10(maxVal);
  const logMin = Math.log10(minVal);
  const logRange = Math.max(1, logMax - logMin);

  const getX = (globalIdx: number) => {
    return padL + (globalIdx / Math.max(1, totalPts - 1)) * (width - padL - padR);
  };

  const getY = (val: number) => {
    const safeVal = Math.max(minVal, val);
    const logV = Math.log10(safeVal);
    const normalized = (logV - logMin) / logRange;
    return height - padB - normalized * (height - padT - padB);
  };

  // SMA path
  let smaPath = '';
  smaData.forEach((d, i) => {
    const x = getX(i);
    const y = getY(d.bestObjective);
    smaPath += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  });

  // BFGS path (starts from last SMA point)
  let bfgsPath = '';
  bfgsData.forEach((d, i) => {
    const x = getX(totalSma + i);
    const y = getY(d.objective);
    bfgsPath += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  });

  const dividerX = getX(totalSma);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
      {/* Background grid */}
      <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="#374151" strokeWidth="1" />
      <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="#374151" strokeWidth="1" />

      {/* Phase division line */}
      <line
        x1={dividerX}
        y1={padT}
        x2={dividerX}
        y2={height - padB}
        stroke="#6b7280"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />

      {/* Phase Labels */}
      <text x={padL + 15} y={padT + 12} fill="#f59e0b" fontSize="11" fontWeight="bold">
        Phase A: SMA Global Exploration ({totalSma} iters)
      </text>
      <text x={dividerX + 15} y={padT + 12} fill="#60a5fa" fontSize="11" fontWeight="bold">
        Phase B: BFGS Quasi-Newton Refinement ({totalBfgs} iters)
      </text>

      {/* Y Axis ticks (log10) */}
      {[logMax, (logMax + logMin) / 2, logMin].map((lVal, idx) => {
        const y = height - padB - ((lVal - logMin) / logRange) * (height - padT - padB);
        const realV = Math.pow(10, lVal);
        return (
          <g key={idx}>
            <line x1={padL - 4} y1={y} x2={padL} y2={y} stroke="#9ca3af" />
            <text x={padL - 8} y={y + 3} fill="#9ca3af" fontSize="9" textAnchor="end" fontFamily="monospace">
              {realV.toExponential(1)}
            </text>
          </g>
        );
      })}

      {/* Lines */}
      {smaPath && (
        <path d={smaPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {bfgsPath && (
        <path d={bfgsPath} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
      )}

      {/* Final Dot */}
      {bfgsData.length > 0 && (
        <circle
          cx={getX(totalPts - 1)}
          cy={getY(bfgsData[bfgsData.length - 1].objective)}
          r="4"
          fill="#10b981"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
      )}

      {/* X Axis label */}
      <text x={width / 2} y={height - 8} fill="#9ca3af" fontSize="10" textAnchor="middle">
        Iteration Progress (SMA Global Search → BFGS Local Descent)
      </text>
    </svg>
  );
};

// SVG Sub-chart 2: Residual Errors Plot
const ResidualErrorsPlot: React.FC<{
  posData: { iteration: number; error: number }[];
  oriData: { iteration: number; error: number }[];
  isPosOnly: boolean;
}> = ({ posData, oriData, isPosOnly }) => {
  const width = 800;
  const height = 240;
  const padL = 65;
  const padR = 65;
  const padT = 25;
  const padB = 40;

  const n = posData.length;
  if (n === 0) return <div className="text-center py-12 text-stone-400">No error history available.</div>;

  const posErrorsMm = posData.map((d) => d.error * 1000);
  const maxPosMm = Math.max(1e-3, ...posErrorsMm);
  const minPosMm = Math.max(1e-5, Math.min(...posErrorsMm));

  const hasOri = !isPosOnly && oriData.length === n;
  const oriErrorsDeg = hasOri ? oriData.map((d) => (d.error * 180) / Math.PI) : [];
  const maxOriDeg = hasOri ? Math.max(1e-3, ...oriErrorsDeg) : 1;
  const minOriDeg = hasOri ? Math.max(1e-5, Math.min(...oriErrorsDeg)) : 0;

  const getX = (idx: number) => padL + (idx / Math.max(1, n - 1)) * (width - padL - padR);
  const getYPos = (valMm: number) => {
    const ratio = Math.max(0, Math.min(1, (valMm - minPosMm) / Math.max(1e-6, maxPosMm - minPosMm)));
    return height - padB - ratio * (height - padT - padB);
  };
  const getYOri = (valDeg: number) => {
    const ratio = Math.max(0, Math.min(1, (valDeg - minOriDeg) / Math.max(1e-6, maxOriDeg - minOriDeg)));
    return height - padB - ratio * (height - padT - padB);
  };

  let pathMm = '';
  posErrorsMm.forEach((v, i) => {
    pathMm += `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYPos(v).toFixed(1)} `;
  });

  let pathOri = '';
  if (hasOri) {
    oriErrorsDeg.forEach((v, i) => {
      pathOri += `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYOri(v).toFixed(1)} `;
    });
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
      <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="#374151" strokeWidth="1" />
      <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="#374151" strokeWidth="1" />

      {/* Legend & Title */}
      <text x={padL + 15} y={padT + 12} fill="#34d399" fontSize="11" fontWeight="bold">
        ― Position Residual (mm)
      </text>
      {hasOri && (
        <text x={padL + 180} y={padT + 12} fill="#fbbf24" fontSize="11" fontWeight="bold">
          ― Orientation Residual (°)
        </text>
      )}

      {/* Y Axis labels (Position on Left) */}
      <text x={padL - 8} y={padT + 8} fill="#34d399" fontSize="9" textAnchor="end" fontFamily="monospace">
        {maxPosMm.toFixed(2)} mm
      </text>
      <text x={padL - 8} y={height - padB} fill="#34d399" fontSize="9" textAnchor="end" fontFamily="monospace">
        {minPosMm.toFixed(3)} mm
      </text>

      {/* Y Axis labels (Orientation on Right) */}
      {hasOri && (
        <>
          <line x1={width - padR} y1={padT} x2={width - padR} y2={height - padB} stroke="#374151" strokeWidth="1" />
          <text x={width - padR + 8} y={padT + 8} fill="#fbbf24" fontSize="9" textAnchor="start" fontFamily="monospace">
            {maxOriDeg.toFixed(2)}°
          </text>
          <text x={width - padR + 8} y={height - padB} fill="#fbbf24" fontSize="9" textAnchor="start" fontFamily="monospace">
            {minOriDeg.toFixed(3)}°
          </text>
        </>
      )}

      {/* Position residual path */}
      <path d={pathMm} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
      <circle
        cx={getX(n - 1)}
        cy={getYPos(posErrorsMm[n - 1])}
        r="4"
        fill="#10b981"
        stroke="#ffffff"
        strokeWidth="1.5"
      />

      {/* Orientation residual path */}
      {hasOri && (
        <>
          <path d={pathOri} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" strokeLinecap="round" />
          <circle
            cx={getX(n - 1)}
            cy={getYOri(oriErrorsDeg[n - 1])}
            r="3.5"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </>
      )}

      <text x={width / 2} y={height - 8} fill="#9ca3af" fontSize="10" textAnchor="middle">
        BFGS Refinement Iteration
      </text>
    </svg>
  );
};

// SVG Sub-chart 3: Gradient Norm Plot
const GradientNormPlot: React.FC<{
  bfgsData: { iteration: number; gradientNorm: number }[];
}> = ({ bfgsData }) => {
  const width = 800;
  const height = 240;
  const padL = 65;
  const padR = 25;
  const padT = 25;
  const padB = 40;

  const n = bfgsData.length;
  if (n === 0) return <div className="text-center py-12 text-stone-400">No gradient history available.</div>;

  const norms = bfgsData.map((d) => Math.max(1e-12, d.gradientNorm));
  const maxNorm = Math.max(...norms);
  const minNorm = Math.min(...norms);

  const logMax = Math.log10(maxNorm);
  const logMin = Math.log10(minNorm);
  const logRange = Math.max(1, logMax - logMin);

  const getX = (idx: number) => padL + (idx / Math.max(1, n - 1)) * (width - padL - padR);
  const getY = (val: number) => {
    const logV = Math.log10(val);
    const normalized = (logV - logMin) / logRange;
    return height - padB - normalized * (height - padT - padB);
  };

  let path = '';
  norms.forEach((v, i) => {
    path += `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)} `;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
      <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="#374151" strokeWidth="1" />
      <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="#374151" strokeWidth="1" />

      <text x={padL + 15} y={padT + 12} fill="#a78bfa" fontSize="11" fontWeight="bold">
        Euclidean Norm of Objective Gradient ||∇f(q_k)|| (Logarithmic Scale)
      </text>

      <text x={padL - 8} y={padT + 8} fill="#9ca3af" fontSize="9" textAnchor="end" fontFamily="monospace">
        {maxNorm.toExponential(1)}
      </text>
      <text x={padL - 8} y={height - padB} fill="#9ca3af" fontSize="9" textAnchor="end" fontFamily="monospace">
        {minNorm.toExponential(1)}
      </text>

      <path d={path} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />

      <text x={width / 2} y={height - 8} fill="#9ca3af" fontSize="10" textAnchor="middle">
        BFGS Iterations
      </text>
    </svg>
  );
};
