import { Sliders, Dna, Shuffle } from 'lucide-react';
import type { SMABFGSSolverOptions } from '../../../robotics/ik/smaBfgs/types';

interface SolverConfigSectionProps {
  options: SMABFGSSolverOptions;
  onChangeOptions: (updated: Partial<SMABFGSSolverOptions>) => void;
  onSolve: () => void;
  isSolving: boolean;
}

export const SolverConfigSection: React.FC<SolverConfigSectionProps> = ({
  options,
  onChangeOptions,
  onSolve,
  isSolving,
}) => {
  const popSize = options.populationSize ?? 30;
  const smaIter = options.smaIterations ?? 40;
  const bfgsIter = options.bfgsIterations ?? 50;
  const wP = options.positionWeight ?? 1.0;
  const wO = options.orientationWeight ?? 0.2;
  const posTol = options.positionTolerance ?? 1e-4;
  const seed = options.randomSeed ?? 42;
  const posOnly = options.positionOnly ?? false;
  const boundStrategy = options.boundStrategy ?? 'sigmoid-transform';
  const gradMethod = options.gradientMethod ?? 'analytical';

  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 100000);
    onChangeOptions({ randomSeed: newSeed });
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              3. Hybrid Hyperparameters & Mathematical Configuration
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Stochastic population budget, Quasi-Newton step constraints, and objective weights
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isSolving}
          onClick={onSolve}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer ${
            isSolving
              ? 'bg-amber-400 text-white cursor-not-allowed animate-pulse'
              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
          }`}
        >
          {isSolving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Optimizing Real Kinematics...</span>
            </>
          ) : (
            <>
              <Dna className="w-4 h-4" />
              <span>Execute SMA-BFGS Hybrid Solver</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
        {/* Population Size */}
        <div className="p-3 bg-stone-50/90 rounded-xl border border-stone-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-stone-700">SMA Population (N)</label>
            <span className="font-mono font-black text-amber-700">{popSize}</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={popSize}
            onChange={(e) => onChangeOptions({ populationSize: parseInt(e.target.value, 10) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className="text-[10px] text-stone-400 block">
            Canonical Slime Mould search agents
          </span>
        </div>

        {/* SMA Iterations */}
        <div className="p-3 bg-stone-50/90 rounded-xl border border-stone-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-stone-700">SMA Iterations (T_max)</label>
            <span className="font-mono font-black text-amber-700">{smaIter}</span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            step="5"
            value={smaIter}
            onChange={(e) => onChangeOptions({ smaIterations: parseInt(e.target.value, 10) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className="text-[10px] text-stone-400 block">
            Phase A global exploration budget
          </span>
        </div>

        {/* BFGS Iterations */}
        <div className="p-3 bg-stone-50/90 rounded-xl border border-stone-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-stone-700">BFGS Iterations (K_max)</label>
            <span className="font-mono font-black text-blue-700">{bfgsIter}</span>
          </div>
          <input
            type="range"
            min="10"
            max="200"
            step="5"
            value={bfgsIter}
            onChange={(e) => onChangeOptions({ bfgsIterations: parseInt(e.target.value, 10) })}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <span className="text-[10px] text-stone-400 block">
            Phase B Quasi-Newton local refinement
          </span>
        </div>

        {/* Deterministic Seed */}
        <div className="p-3 bg-stone-50/90 rounded-xl border border-stone-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-stone-700">Random Seed</label>
            <button
              type="button"
              onClick={handleRandomizeSeed}
              className="flex items-center gap-1 text-[10px] text-purple-700 hover:text-purple-900 font-bold cursor-pointer"
            >
              <Shuffle className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>
          <input
            type="number"
            value={seed}
            onChange={(e) => onChangeOptions({ randomSeed: parseInt(e.target.value, 10) || 0 })}
            className="w-full text-xs font-mono font-bold px-2 py-1 rounded-lg border border-stone-300 bg-white"
          />
          <span className="text-[10px] text-stone-400 block">
            Ensures 100% reproducible execution
          </span>
        </div>

        {/* Objective Weights */}
        <div className="p-3 bg-stone-50/90 rounded-xl border border-stone-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-stone-700">Position Weight (w_p)</label>
            <span className="font-mono font-black text-stone-900">{wP.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={wP}
            onChange={(e) => onChangeOptions({ positionWeight: parseFloat(e.target.value) })}
            className="w-full accent-stone-700 cursor-pointer"
          />
          <span className="text-[10px] text-stone-400 block">1/2 * w_p * ||e_p||^2</span>
        </div>

        <div className="p-3 bg-stone-50/90 rounded-xl border border-stone-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-stone-700">Orientation Weight (w_o)</label>
            <span className="font-mono font-black text-stone-900">{wO.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="2.0"
            step="0.05"
            disabled={posOnly}
            value={wO}
            onChange={(e) => onChangeOptions({ orientationWeight: parseFloat(e.target.value) })}
            className="w-full accent-stone-700 cursor-pointer disabled:opacity-40"
          />
          <span className="text-[10px] text-stone-400 block">1/2 * w_o * ||e_o||^2</span>
        </div>

        {/* Bound Handling Strategy */}
        <div className="p-3 bg-stone-50/90 rounded-xl border border-stone-200 space-y-1.5">
          <label className="font-bold text-stone-700 block">Bound Handling Strategy</label>
          <select
            value={boundStrategy}
            onChange={(e) => onChangeOptions({ boundStrategy: e.target.value as any })}
            className="w-full text-xs font-bold bg-white border border-stone-300 rounded-lg px-2 py-1 text-stone-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="sigmoid-transform">Sigmoid Transformation (Smooth C∞)</option>
            <option value="projected-armijo">Projected Active-Set Armijo</option>
            <option value="unconstrained">Unconstrained (Strict Post-Check)</option>
          </select>
          <span className="text-[10px] text-stone-400 block">
            Guarantees joint limits compliance
          </span>
        </div>

        {/* Gradient Method */}
        <div className="p-3 bg-stone-50/90 rounded-xl border border-stone-200 space-y-1.5">
          <label className="font-bold text-stone-700 block">Gradient Computation</label>
          <select
            value={gradMethod}
            onChange={(e) => onChangeOptions({ gradientMethod: e.target.value as any })}
            className="w-full text-xs font-bold bg-white border border-stone-300 rounded-lg px-2 py-1 text-stone-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="analytical">Analytical (J^T * e)</option>
            <option value="finite-differences">Central Finite Differences</option>
          </select>
          <span className="text-[10px] text-stone-400 block">
            Verified exact to machine precision
          </span>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700 select-none">
          <input
            type="checkbox"
            checked={posOnly}
            onChange={(e) => onChangeOptions({ positionOnly: e.target.checked })}
            className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
          />
          <span>Position-Only Mode (Ignores End-Effector SO(3) Orientation)</span>
        </label>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-stone-600">Position Tolerance:</span>
          <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-800 font-bold">
            {(posTol * 1000).toFixed(2)} mm
          </span>
        </div>
      </div>
    </div>
  );
};
