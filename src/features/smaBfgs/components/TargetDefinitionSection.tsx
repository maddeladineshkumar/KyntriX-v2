import React from 'react';
import { Matrix4 } from '../../../robotics/math/Matrix4';
import { Vector3 } from '../../../robotics/math/Vector3';
import { Euler } from '../../../robotics/math/Euler';
import { DEG_TO_RAD, RAD_TO_DEG } from '../../../robotics/math/constants';
import { Target, Rotate3d, Crosshair, Sparkles } from 'lucide-react';

interface TargetDefinitionSectionProps {
  targetPose: Matrix4;
  onChangeTarget: (newTarget: Matrix4) => void;
  onUseCurrentPose: () => void;
  onSampleReachable: () => void;
  positionOnly: boolean;
}

export const TargetDefinitionSection: React.FC<TargetDefinitionSectionProps> = ({
  targetPose,
  onChangeTarget,
  onUseCurrentPose,
  onSampleReachable,
  positionOnly,
}) => {
  const pos = targetPose.getPosition();
  const euler = targetPose.getEuler('XYZ');
  const rot = targetPose.getRotation();

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPos = new Vector3(
      axis === 'x' ? value : pos.x,
      axis === 'y' ? value : pos.y,
      axis === 'z' ? value : pos.z
    );
    const updated = Matrix4.fromRotationTranslation(rot, newPos);
    onChangeTarget(updated);
  };

  const handleEulerChange = (axis: 'roll' | 'pitch' | 'yaw', degrees: number) => {
    const rad = degrees * DEG_TO_RAD;
    const newEuler = new Euler(
      axis === 'roll' ? rad : euler.x,
      axis === 'pitch' ? rad : euler.y,
      axis === 'yaw' ? rad : euler.z,
      'XYZ'
    );
    const newRot = newEuler.toRotationMatrix();
    const updated = Matrix4.fromRotationTranslation(newRot, pos);
    onChangeTarget(updated);
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              2. Target Definition in Task Space
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Desired end-effector cartesian coordinates and SO(3) orientation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onUseCurrentPose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-stone-600" />
            <span>Use Current Pose</span>
          </button>
          <button
            type="button"
            onClick={onSampleReachable}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-700" />
            <span>Sample Reachable Pose</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Position Inputs */}
        <div className="space-y-3 p-3.5 rounded-xl bg-stone-50/80 border border-stone-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-800 uppercase tracking-wider">
              Position Coordinates (Meters)
            </span>
            <span className="text-[11px] font-mono text-stone-500 font-bold">
              Norm: {pos.norm().toFixed(3)} m
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map((axis) => {
              const val = pos[axis];
              const colorCls =
                axis === 'x'
                  ? 'border-red-300 focus-within:ring-red-400 text-red-700'
                  : axis === 'y'
                  ? 'border-emerald-300 focus-within:ring-emerald-400 text-emerald-700'
                  : 'border-blue-300 focus-within:ring-blue-400 text-blue-700';

              return (
                <div key={axis} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-stone-700">
                      {axis.toUpperCase()}
                    </label>
                    <span className="text-[10px] font-mono text-stone-400">
                      {(val * 1000).toFixed(0)} mm
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={Number(val.toFixed(4))}
                    onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value) || 0)}
                    className={`w-full text-xs font-mono font-bold px-2 py-1.5 rounded-lg border bg-white text-stone-900 focus:outline-none focus:ring-2 ${colorCls}`}
                  />
                  <div className="flex items-center gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handlePositionChange(axis, val - 0.05)}
                      className="flex-1 py-0.5 text-[10px] font-bold bg-white hover:bg-stone-200 rounded border border-stone-300 cursor-pointer"
                    >
                      -5cm
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePositionChange(axis, val + 0.05)}
                      className="flex-1 py-0.5 text-[10px] font-bold bg-white hover:bg-stone-200 rounded border border-stone-300 cursor-pointer"
                    >
                      +5cm
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Orientation Inputs */}
        <div
          className={`space-y-3 p-3.5 rounded-xl border transition-opacity ${
            positionOnly
              ? 'bg-stone-100/50 border-stone-200 opacity-60 pointer-events-none'
              : 'bg-stone-50/80 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Rotate3d className="w-3.5 h-3.5" />
              Orientation (Euler XYZ Degrees)
            </span>
            {positionOnly && (
              <span className="text-[10px] font-bold bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded">
                Position-Only Mode
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'roll' as const, label: 'Roll (X)', val: euler.x * RAD_TO_DEG },
              { id: 'pitch' as const, label: 'Pitch (Y)', val: euler.y * RAD_TO_DEG },
              { id: 'yaw' as const, label: 'Yaw (Z)', val: euler.z * RAD_TO_DEG },
            ].map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase text-stone-700">
                    {item.label}
                  </label>
                  <span className="text-[10px] font-mono text-stone-400">
                    {(((item.val % 360) + 360) % 360).toFixed(0)}°
                  </span>
                </div>
                <input
                  type="number"
                  step="5"
                  disabled={positionOnly}
                  value={Number(item.val.toFixed(1))}
                  onChange={(e) => handleEulerChange(item.id, parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold px-2 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <div className="flex items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    disabled={positionOnly}
                    onClick={() => handleEulerChange(item.id, item.val - 15)}
                    className="flex-1 py-0.5 text-[10px] font-bold bg-white hover:bg-stone-200 rounded border border-stone-300 cursor-pointer"
                  >
                    -15°
                  </button>
                  <button
                    type="button"
                    disabled={positionOnly}
                    onClick={() => handleEulerChange(item.id, item.val + 15)}
                    className="flex-1 py-0.5 text-[10px] font-bold bg-white hover:bg-stone-200 rounded border border-stone-300 cursor-pointer"
                  >
                    +15°
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
