import React, { useState } from 'react';
import { useRobotStore } from '../../state/robotStore';
import { Matrix4 } from '../../robotics/math/Matrix4';
import { RAD_TO_DEG } from '../../robotics/math/constants';
import {
  Network,
  Compass,
  Layers,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

export const TransformationStudio: React.FC = () => {
  const {
    robot,
    fkResult,
    viewOptions,
    setStepMode,
    setStepFrameIndex,
  } = useRobotStore();

  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(robot.dof);
  const [showExplanation, setShowExplanation] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const eePose = fkResult.endEffectorPose;
  const eePos = fkResult.endEffectorTransform.getPosition();
  const eeQuat = eePose.quaternion;
  const eeEulerXYZ = eePose.euler;
  const eeEulerZYX = fkResult.endEffectorTransform.getEuler('ZYX');
  const eeEulerZYZ = fkResult.endEffectorTransform.getEuler('ZYZ');

  // Selected Transform Matrix (A_i or T_{0i})
  const selectedT =
    selectedFrameIndex === 0
      ? robot.baseTransform ?? Matrix4.identity()
      : fkResult.T[selectedFrameIndex - 1] ?? Matrix4.identity();

  const selectedA =
    selectedFrameIndex > 0 ? fkResult.A[selectedFrameIndex - 1] ?? Matrix4.identity() : null;

  const handleCopyMatrix = (matrix: Matrix4, key: string) => {
    const formatted = matrix
      .formatForDisplay(6)
      .map((row) => row.join('\t'))
      .join('\n');
    navigator.clipboard.writeText(formatted);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSelectFrame = (fIdx: number) => {
    setSelectedFrameIndex(fIdx);
    if (fIdx <= 1) {
      setShowExplanation(true);
    }
    if (viewOptions.stepMode) {
      setStepFrameIndex(fIdx);
    }
  };

  const handlePrevStep = () => {
    const nextIdx = Math.max(0, selectedFrameIndex - 1);
    handleSelectFrame(nextIdx);
  };

  const handleNextStep = () => {
    const nextIdx = Math.min(robot.dof, selectedFrameIndex + 1);
    handleSelectFrame(nextIdx);
  };

  const handleToggleStepMode = () => {
    const nextMode = !viewOptions.stepMode;
    setStepMode(nextMode);
    if (nextMode) {
      setStepFrameIndex(selectedFrameIndex);
    }
  };

  const dhParam =
    selectedFrameIndex > 0 && robot.joints[selectedFrameIndex - 1]
      ? robot.joints[selectedFrameIndex - 1]
      : null;

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] text-black p-5 overflow-y-auto select-none space-y-4">
      {/* Step Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-200">
        <span className="text-xs text-stone-600 font-medium">
          Relative (A_i) and cumulative (T_0i) 4x4 coordinate transforms with 3D step isolation
        </span>

        {/* Step Mode Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStepMode}
            className={`px-3.5 py-2 text-xs font-black rounded-xl border-2 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 ${
              viewOptions.stepMode
                ? 'bg-amber-400 text-black border-stone-900 shadow-sm'
                : 'bg-white text-black border-stone-300 hover:bg-stone-100'
            }`}
          >
            <Layers className="w-4 h-4 text-black" />
            <span>Step Mode: {viewOptions.stepMode ? 'ON' : 'OFF'}</span>
          </button>

          {viewOptions.stepMode && (
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border-2 border-stone-300">
              <button
                onClick={handlePrevStep}
                disabled={selectedFrameIndex <= 0}
                aria-label="Previous Step Frame"
                className="p-1.5 rounded-lg hover:bg-stone-100 text-black disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-black" />
              </button>
              <span className="px-2.5 text-xs font-mono text-black font-black">
                Frame {selectedFrameIndex} / {robot.dof}
              </span>
              <button
                onClick={handleNextStep}
                disabled={selectedFrameIndex >= robot.dof}
                aria-label="Next Step Frame"
                className="p-1.5 rounded-lg hover:bg-stone-100 text-black disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-black" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Frame Selector Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 rounded-2xl border-2 border-stone-200 shadow-sm">
        <button
          onClick={() => handleSelectFrame(0)}
          className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
            selectedFrameIndex === 0
              ? 'bg-amber-400 text-black border border-stone-900 shadow-xs'
              : 'text-black hover:bg-stone-100 border border-transparent'
          }`}
        >
          Base Frame (T_0)
        </button>
        {robot.joints.map((_, idx) => {
          const fIdx = idx + 1;
          const isEE = fIdx === robot.dof;
          return (
            <button
              key={fIdx}
              onClick={() => handleSelectFrame(fIdx)}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                selectedFrameIndex === fIdx
                  ? 'bg-amber-400 text-black border border-stone-900 shadow-xs'
                  : 'text-black hover:bg-stone-100 border border-transparent'
              }`}
            >
              {isEE ? `End-Effector (T_0${fIdx})` : `Frame ${fIdx}`}
            </button>
          );
        })}
      </div>

      {/* Educational Tooltip & Explanation System (PRD §86) */}
      <div className="bg-white rounded-2xl border-2 border-stone-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-3.5 bg-stone-50/80 border-b border-stone-200">
          <div className="flex items-center gap-2 text-xs font-black text-black">
            <Info className="w-4 h-4 text-amber-600" />
            <span>Mathematical Transformation Explanation — Frame {selectedFrameIndex}</span>
          </div>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            title="Toggle educational explanation panel"
            aria-label="Toggle explanation panel"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Info className="w-3.5 h-3.5 text-amber-700" />
            <span>{showExplanation ? 'Hide Explanation' : 'Explain Transform'}</span>
          </button>
        </div>

        {showExplanation && (
          <div className="p-4 space-y-3 text-xs leading-relaxed text-stone-800">
            {selectedFrameIndex === 0 ? (
              <div className="space-y-1.5">
                <div className="font-black text-black text-xs">
                  ℹ️ T₀ — Cumulative Transform (World → Frame 0 / Base)
                </div>
                <p className="text-stone-700 text-[11px] font-medium">
                  The base frame T₀ serves as the global Cartesian world coordinate system. All subsequent link transformations are referenced relative to this origin.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* A_i explanation */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                  <div className="font-black text-black text-xs">
                    ℹ️ A{selectedFrameIndex > 1 ? `_${selectedFrameIndex}` : '₁'} — Relative Transform (Frame {selectedFrameIndex - 1} → Frame {selectedFrameIndex})
                  </div>
                  <p className="text-stone-700 text-[11px] font-medium">
                    This 4×4 matrix describes how frame {selectedFrameIndex} is positioned and oriented relative to frame {selectedFrameIndex - 1}, computed from the {robot.dhConvention === 'modified' ? 'Modified (Craig)' : 'Standard'} DH formula:
                  </p>
                  <div className="font-mono font-bold text-[11px] bg-white p-2 rounded-lg border border-stone-300 text-black">
                    {robot.dhConvention === 'modified'
                      ? 'A_i = RotX(α_{i-1}) · TransX(a_{i-1}) · RotZ(θ_i) · TransZ(d_i)'
                      : 'A_i = RotZ(θ_i) · TransZ(d_i) · TransX(a_i) · RotX(α_i)'}
                  </div>
                  <p className="text-stone-600 text-[11px] font-medium">
                    The rotation submatrix (top-left 3×3) encodes orientation. The last column [px, py, pz] encodes position.
                  </p>
                </div>

                {/* T_0i explanation */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                  <div className="font-black text-black text-xs">
                    ℹ️ T₀{selectedFrameIndex} — Cumulative Transform (World → Frame {selectedFrameIndex})
                  </div>
                  <p className="text-stone-700 text-[11px] font-medium">
                    This matrix is the product {selectedFrameIndex === 1 ? 'A₁' : Array.from({ length: selectedFrameIndex }, (_, k) => `A${k + 1}`).join(' · ')}. It describes where frame {selectedFrameIndex} sits in the world (base) coordinate system. The end-effector pose is T₀{robot.dof}.
                  </p>
                </div>
              </div>
            )}

            {dhParam && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono font-black">
                <span className="bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-300 text-black">
                  θ: <span className="text-black font-black">{(dhParam.theta * RAD_TO_DEG).toFixed(1)}°</span>
                </span>
                <span className="bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-300 text-black">
                  d: <span className="text-black font-black">{(dhParam.d * 1000).toFixed(1)} mm</span>
                </span>
                <span className="bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-300 text-black">
                  a: <span className="text-black font-black">{(dhParam.a * 1000).toFixed(1)} mm</span>
                </span>
                <span className="bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-300 text-black">
                  α: <span className="text-black font-black">{(dhParam.alpha * RAD_TO_DEG).toFixed(1)}°</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid Layout: Selected Frame Matrices & End-Effector Decomposition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Homogeneous Transformation Matrices */}
        <div className="space-y-4">
          {/* Cumulative Transform T_{0i} */}
          <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-black" />
                <h3 className="text-xs font-black text-black uppercase tracking-wide">
                  Cumulative Transform T_0{selectedFrameIndex}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyMatrix(selectedT, `T_0${selectedFrameIndex}`)}
                  title="Copy Matrix to Clipboard"
                  className="flex items-center gap-1.5 text-xs font-black bg-stone-100 hover:bg-stone-200 text-black px-2.5 py-1 rounded-lg border border-stone-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  {copiedKey === `T_0${selectedFrameIndex}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-black" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] font-mono font-black bg-amber-100 text-black px-2 py-0.5 rounded-md border border-amber-300">
                  SE(3)
                </span>
              </div>
            </div>

            {/* 4x4 Matrix Table */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-300 font-mono text-xs">
              <div className="grid grid-cols-4 gap-2 text-right">
                {selectedT.formatForDisplay(4).flatMap((row, rIdx) =>
                  row.map((val, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`p-1.5 rounded ${
                        cIdx === 3 && rIdx < 3
                          ? 'bg-amber-200 text-black font-black border border-amber-400'
                          : rIdx === 3
                          ? 'text-stone-400 font-semibold'
                          : 'text-black font-bold'
                      }`}
                    >
                      {val}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Relative Transform A_i (if not Base) */}
          {selectedA && (
            <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-black" />
                  <h3 className="text-xs font-black text-black uppercase tracking-wide">
                    Relative Transform A_{selectedFrameIndex}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyMatrix(selectedA, `A_${selectedFrameIndex}`)}
                    title="Copy Matrix to Clipboard"
                    className="flex items-center gap-1.5 text-xs font-black bg-stone-100 hover:bg-stone-200 text-black px-2.5 py-1 rounded-lg border border-stone-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    {copiedKey === `A_${selectedFrameIndex}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-black" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] font-mono font-black bg-emerald-100 text-black px-2 py-0.5 rounded-md border border-emerald-300">
                    A_i
                  </span>
                </div>
              </div>

              {/* 4x4 Matrix Table */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-300 font-mono text-xs">
                <div className="grid grid-cols-4 gap-2 text-right">
                  {selectedA.formatForDisplay(4).flatMap((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className={`p-1.5 rounded ${
                          cIdx === 3 && rIdx < 3
                            ? 'bg-amber-200 text-black font-black border border-amber-400'
                            : rIdx === 3
                            ? 'text-stone-400 font-semibold'
                            : 'text-black font-bold'
                        }`}
                      >
                        {val}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Authoritative End-Effector Decomposition */}
        <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-black" />
              <h3 className="text-xs font-black text-black uppercase tracking-wide">End-Effector Pose Decomposition</h3>
            </div>
            <button
              onClick={() => handleCopyMatrix(fkResult.endEffectorTransform, 'T_EE')}
              title="Copy EE Matrix"
              className="flex items-center gap-1.5 text-xs font-black bg-stone-100 hover:bg-stone-200 text-black px-2.5 py-1 rounded-lg border border-stone-300 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              {copiedKey === 'T_EE' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-black" />
                  <span>Copy T_EE</span>
                </>
              )}
            </button>
          </div>

          {/* Cartesian Position (meters & mm) */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-300">
            <div className="text-xs font-black text-black uppercase tracking-wider mb-2">Position Vector P_EE</div>
            <div className="grid grid-cols-3 gap-2.5 font-mono text-xs text-center">
              <div className="p-2.5 rounded-xl bg-white border-2 border-stone-200 shadow-2xs">
                <div className="text-[10px] text-black font-black uppercase mb-0.5">X Axis</div>
                <div className="text-black font-black text-sm">{eePos.x.toFixed(4)} m</div>
                <div className="text-[11px] text-black font-bold">{(eePos.x * 1000).toFixed(1)} mm</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border-2 border-stone-200 shadow-2xs">
                <div className="text-[10px] text-black font-black uppercase mb-0.5">Y Axis</div>
                <div className="text-black font-black text-sm">{eePos.y.toFixed(4)} m</div>
                <div className="text-[11px] text-black font-bold">{(eePos.y * 1000).toFixed(1)} mm</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border-2 border-stone-200 shadow-2xs">
                <div className="text-[10px] text-black font-black uppercase mb-0.5">Z Axis</div>
                <div className="text-black font-black text-sm">{eePos.z.toFixed(4)} m</div>
                <div className="text-[11px] text-black font-bold">{(eePos.z * 1000).toFixed(1)} mm</div>
              </div>
            </div>
          </div>

          {/* Unit Quaternion */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-300">
            <div className="text-xs font-black text-black uppercase tracking-wider mb-2">Unit Quaternion (w, x, y, z)</div>
            <div className="grid grid-cols-4 gap-2 font-mono text-xs text-center">
              <div className="p-2 rounded-xl bg-white border border-stone-300 shadow-2xs">
                <span className="text-black font-black">w: </span>
                <span className="text-black font-bold">{eeQuat.w.toFixed(4)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-stone-300 shadow-2xs">
                <span className="text-black font-black">x: </span>
                <span className="text-black font-bold">{eeQuat.x.toFixed(4)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-stone-300 shadow-2xs">
                <span className="text-black font-black">y: </span>
                <span className="text-black font-bold">{eeQuat.y.toFixed(4)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-stone-300 shadow-2xs">
                <span className="text-black font-black">z: </span>
                <span className="text-black font-bold">{eeQuat.z.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Euler Representations */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-300 space-y-2.5">
            <div className="text-xs font-black text-black uppercase tracking-wider">Euler Angles (Conventions)</div>

            {/* XYZ (Roll, Pitch, Yaw) */}
            <div className="flex items-center justify-between text-xs font-mono bg-white px-3 py-2 rounded-xl border border-stone-300 shadow-2xs">
              <span className="text-black font-black uppercase whitespace-nowrap mr-2">Euler XYZ:</span>
              <span className="text-black font-black whitespace-nowrap tabular-nums text-[11px]">
                ψ={(eeEulerXYZ.x * RAD_TO_DEG).toFixed(2)}°, θ={(eeEulerXYZ.y * RAD_TO_DEG).toFixed(2)}°, φ={(eeEulerXYZ.z * RAD_TO_DEG).toFixed(2)}°
              </span>
            </div>

            {/* ZYX */}
            <div className="flex items-center justify-between text-xs font-mono bg-white px-3 py-2 rounded-xl border border-stone-300 shadow-2xs">
              <span className="text-black font-black uppercase whitespace-nowrap mr-2">Euler ZYX:</span>
              <span className="text-black font-black whitespace-nowrap tabular-nums text-[11px]">
                z={(eeEulerZYX.x * RAD_TO_DEG).toFixed(2)}°, y={(eeEulerZYX.y * RAD_TO_DEG).toFixed(2)}°, x={(eeEulerZYX.z * RAD_TO_DEG).toFixed(2)}°
              </span>
            </div>

            {/* ZYZ (Spherical Wrist) */}
            <div className="flex items-center justify-between text-xs font-mono bg-white px-3 py-2 rounded-xl border border-stone-300 shadow-2xs">
              <span className="text-black font-black uppercase whitespace-nowrap mr-2">Euler ZYZ:</span>
              <span className="text-black font-black whitespace-nowrap tabular-nums text-[11px]">
                z1={(eeEulerZYZ.x * RAD_TO_DEG).toFixed(2)}°, y={(eeEulerZYZ.y * RAD_TO_DEG).toFixed(2)}°, z2={(eeEulerZYZ.z * RAD_TO_DEG).toFixed(2)}°
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
