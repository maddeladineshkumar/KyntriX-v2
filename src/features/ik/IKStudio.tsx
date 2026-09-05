import React, { useState, useEffect } from 'react';
import { useRobotStore } from '../../state/robotStore';
import { Matrix4 } from '../../robotics/math/Matrix4';
import { Vector3 } from '../../robotics/math/Vector3';
import { Euler } from '../../robotics/math/Euler';
import { DEG_TO_RAD, RAD_TO_DEG } from '../../robotics/math/constants';
import type { IKSingleSolution } from '../../robotics/ik/types';
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Loader2,
  Sliders,
  RotateCcw,
  Zap,
  Sparkles,
  Eye,
  Undo2,
  ArrowLeftRight,
} from 'lucide-react';

export const IKStudio: React.FC = () => {
  const {
    robot,
    q,
    fkResult,
    targetPose,
    ikResult,
    ikSolving,
    setJoints,
    setTargetPose,
    triggerSolveIK,
    applyIKSolution,
  } = useRobotStore();

  const currentPos = targetPose.getPosition();
  const currentEuler = targetPose.getEuler('XYZ');

  const [inputX, setInputX] = useState(currentPos.x.toFixed(3));
  const [inputY, setInputY] = useState(currentPos.y.toFixed(3));
  const [inputZ, setInputZ] = useState(currentPos.z.toFixed(3));
  const [inputRoll, setInputRoll] = useState((currentEuler.x * RAD_TO_DEG).toFixed(1));
  const [inputPitch, setInputPitch] = useState((currentEuler.y * RAD_TO_DEG).toFixed(1));
  const [inputYaw, setInputYaw] = useState((currentEuler.z * RAD_TO_DEG).toFixed(1));
  const [nudgeStepMm, setNudgeStepMm] = useState<number>(10);
  const [autoAnimate, setAutoAnimate] = useState<boolean>(true);
  const [activeSolIdx, setActiveSolIdx] = useState<number | null>(null);

  // PRD §26: 3D Preview, Restore, and Compare States
  const [prePreviewQ, setPrePreviewQ] = useState<number[] | null>(null);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareAIdx, setCompareAIdx] = useState<number>(0);
  const [compareBIdx, setCompareBIdx] = useState<number>(1);

  // Sync inputs with targetPose updates (e.g. when dragging 3D gizmo or switching robot)
  useEffect(() => {
    const pos = targetPose.getPosition();
    const euler = targetPose.getEuler('XYZ');
    const xStr = pos.x.toFixed(3);
    const yStr = pos.y.toFixed(3);
    const zStr = pos.z.toFixed(3);
    const rStr = (euler.x * RAD_TO_DEG).toFixed(1);
    const pStr = (euler.y * RAD_TO_DEG).toFixed(1);
    const yawStr = (euler.z * RAD_TO_DEG).toFixed(1);

    const timer = setTimeout(() => {
      setInputX(xStr);
      setInputY(yStr);
      setInputZ(zStr);
      setInputRoll(rStr);
      setInputPitch(pStr);
      setInputYaw(yawStr);
    }, 0);
    return () => clearTimeout(timer);
  }, [targetPose]);

  const [prevRobotId, setPrevRobotId] = useState(robot.id);
  if (prevRobotId !== robot.id) {
    setPrevRobotId(robot.id);
    setPrePreviewQ(null);
  }

  const applyPoseValues = (
    x: number,
    y: number,
    z: number,
    rDeg: number,
    pDeg: number,
    yDeg: number,
    shouldSolve: boolean = true
  ) => {
    setInputX(x.toFixed(3));
    setInputY(y.toFixed(3));
    setInputZ(z.toFixed(3));
    setInputRoll(rDeg.toFixed(1));
    setInputPitch(pDeg.toFixed(1));
    setInputYaw(yDeg.toFixed(1));

    const rot = new Euler(rDeg * DEG_TO_RAD, pDeg * DEG_TO_RAD, yDeg * DEG_TO_RAD, 'XYZ').toRotationMatrix();
    const pos = new Vector3(x, y, z);
    const newTarget = Matrix4.fromRotationTranslation(rot, pos);
    setTargetPose(newTarget);
    if (shouldSolve) {
      triggerSolveIK(autoAnimate);
    }
  };

  const handleUpdateTarget = () => {
    const x = parseFloat(inputX) || 0;
    const y = parseFloat(inputY) || 0;
    const z = parseFloat(inputZ) || 0;
    const r = parseFloat(inputRoll) || 0;
    const p = parseFloat(inputPitch) || 0;
    const yaw = parseFloat(inputYaw) || 0;
    applyPoseValues(x, y, z, r, p, yaw);
  };

  const handleNudgeCartesian = (axis: 'x' | 'y' | 'z', sign: 1 | -1) => {
    const deltaMeters = (sign * nudgeStepMm) / 1000;
    const curX = parseFloat(inputX) || currentPos.x;
    const curY = parseFloat(inputY) || currentPos.y;
    const curZ = parseFloat(inputZ) || currentPos.z;
    const curR = parseFloat(inputRoll) || currentEuler.x * RAD_TO_DEG;
    const curP = parseFloat(inputPitch) || currentEuler.y * RAD_TO_DEG;
    const curYaw = parseFloat(inputYaw) || currentEuler.z * RAD_TO_DEG;

    const nextX = axis === 'x' ? curX + deltaMeters : curX;
    const nextY = axis === 'y' ? curY + deltaMeters : curY;
    const nextZ = axis === 'z' ? curZ + deltaMeters : curZ;

    applyPoseValues(nextX, nextY, nextZ, curR, curP, curYaw);
  };

  const handleOrientationPreset = (preset: 'down' | 'forward' | 'up' | 'level') => {
    const curX = parseFloat(inputX) || currentPos.x;
    const curY = parseFloat(inputY) || currentPos.y;
    const curZ = parseFloat(inputZ) || currentPos.z;

    let r = 0;
    let p = 0;
    let yaw = 0;

    if (preset === 'down') {
      r = 0;
      p = 180;
      yaw = 0;
    } else if (preset === 'forward') {
      r = 0;
      p = 90;
      yaw = 0;
    } else if (preset === 'up') {
      r = 0;
      p = 0;
      yaw = 0;
    } else {
      r = 0;
      p = 0;
      yaw = 0;
    }

    applyPoseValues(curX, curY, curZ, r, p, yaw, true);
  };

  const handleSyncToCurrentEE = () => {
    const eePos = fkResult.endEffectorTransform.getPosition();
    const eeEuler = fkResult.endEffectorTransform.getEuler('XYZ');
    applyPoseValues(
      eePos.x,
      eePos.y,
      eePos.z,
      eeEuler.x * RAD_TO_DEG,
      eeEuler.y * RAD_TO_DEG,
      eeEuler.z * RAD_TO_DEG,
      true
    );
  };

  const handleSelectSolution = (sol: IKSingleSolution, idx: number, animate: boolean) => {
    setActiveSolIdx(idx);
    setPrePreviewQ(null);
    applyIKSolution(sol, animate);
  };

  const handlePreview3D = (sol: IKSingleSolution) => {
    if (prePreviewQ === null) {
      setPrePreviewQ([...q]);
    }
    setJoints(sol.q);
  };

  const handleRestorePose = () => {
    if (prePreviewQ !== null) {
      setJoints(prePreviewQ);
      setPrePreviewQ(null);
    }
  };

  const isCurrentPose = (sol: IKSingleSolution) => {
    for (let i = 0; i < robot.dof; i++) {
      if (Math.abs(sol.q[i] - (q[i] ?? 0)) > 0.02) return false;
    }
    return true;
  };

  return (
    <div className="flex flex-col h-full bg-[#fbf9f5] text-stone-900 p-4 space-y-4 select-none">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium truncate">
          <span className="truncate">Analytical & DLS Solvers</span>
        </div>

        <button
          onClick={handleSyncToCurrentEE}
          title="Copy current 3D end-effector pose into target inputs"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
        >
          <Copy className="w-3.5 h-3.5 text-black" />
          <span>Sync EE Pose</span>
        </button>
      </div>

      {/* Target Pose Inputs (2 rows of 3 columns, perfectly fitting right drawer) */}
      <div className="bg-white p-3.5 rounded-2xl border-2 border-stone-200/90 shadow-xs space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-black" />
            <span className="text-xs font-black text-black uppercase tracking-wide">Target Cartesian Pose</span>
          </div>
          <span className="text-[10px] text-stone-500 font-bold">World XYZ</span>
        </div>

        {/* 3x2 Numeric Input Grid */}
        <div className="grid grid-cols-3 gap-2 font-mono text-xs">
          {/* Position X */}
          <div className="p-1.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-sans font-black text-stone-700">Pos X</span>
              <span className="text-[9px] px-1 bg-rose-200 text-black font-bold rounded">m</span>
            </div>
            <input
              type="number"
              step="0.01"
              value={inputX}
              onChange={(e) => setInputX(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTarget()}
              className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-black font-black text-xs focus:border-black focus:outline-none"
            />
          </div>

          {/* Position Y */}
          <div className="p-1.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-sans font-black text-stone-700">Pos Y</span>
              <span className="text-[9px] px-1 bg-emerald-200 text-black font-bold rounded">m</span>
            </div>
            <input
              type="number"
              step="0.01"
              value={inputY}
              onChange={(e) => setInputY(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTarget()}
              className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-black font-black text-xs focus:border-black focus:outline-none"
            />
          </div>

          {/* Position Z */}
          <div className="p-1.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-sans font-black text-stone-700">Pos Z</span>
              <span className="text-[9px] px-1 bg-amber-200 text-black font-bold rounded">m</span>
            </div>
            <input
              type="number"
              step="0.01"
              value={inputZ}
              onChange={(e) => setInputZ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTarget()}
              className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-black font-black text-xs focus:border-black focus:outline-none"
            />
          </div>

          {/* Roll */}
          <div className="p-1.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-sans font-black text-stone-700">Roll (X)</span>
              <span className="text-[9px] px-1 bg-stone-200 text-black font-bold rounded">°</span>
            </div>
            <input
              type="number"
              step="1"
              value={inputRoll}
              onChange={(e) => setInputRoll(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTarget()}
              className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-black font-black text-xs focus:border-black focus:outline-none"
            />
          </div>

          {/* Pitch */}
          <div className="p-1.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-sans font-black text-stone-700">Pitch (Y)</span>
              <span className="text-[9px] px-1 bg-stone-200 text-black font-bold rounded">°</span>
            </div>
            <input
              type="number"
              step="1"
              value={inputPitch}
              onChange={(e) => setInputPitch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTarget()}
              className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-black font-black text-xs focus:border-black focus:outline-none"
            />
          </div>

          {/* Yaw */}
          <div className="p-1.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-sans font-black text-stone-700">Yaw (Z)</span>
              <span className="text-[9px] px-1 bg-stone-200 text-black font-bold rounded">°</span>
            </div>
            <input
              type="number"
              step="1"
              value={inputYaw}
              onChange={(e) => setInputYaw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTarget()}
              className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-black font-black text-xs focus:border-black focus:outline-none"
            />
          </div>
        </div>

        {/* Tactile Nudge Pad */}
        <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-black uppercase tracking-wide">Nudge Pad:</span>
            {/* Step size selector */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-stone-300 text-[11px]">
              {[1, 10, 50].map((step) => (
                <button
                  key={step}
                  onClick={() => setNudgeStepMm(step)}
                  className={`px-2 py-0.5 rounded font-black transition-all cursor-pointer ${
                    nudgeStepMm === step ? 'bg-amber-400 text-black shadow-2xs' : 'text-stone-600 hover:text-black'
                  }`}
                >
                  {step}mm
                </button>
              ))}
            </div>
          </div>

          {/* Directional Nudge Buttons */}
          <div className="grid grid-cols-3 gap-2 text-xs font-black">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleNudgeCartesian('x', -1)}
                className="flex-1 py-1.5 bg-rose-100 hover:bg-rose-200 active:scale-95 rounded-lg border border-rose-300 text-black transition-all cursor-pointer text-center"
              >
                -X
              </button>
              <button
                onClick={() => handleNudgeCartesian('x', 1)}
                className="flex-1 py-1.5 bg-rose-100 hover:bg-rose-200 active:scale-95 rounded-lg border border-rose-300 text-black transition-all cursor-pointer text-center"
              >
                +X
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleNudgeCartesian('y', -1)}
                className="flex-1 py-1.5 bg-emerald-100 hover:bg-emerald-200 active:scale-95 rounded-lg border border-emerald-300 text-black transition-all cursor-pointer text-center"
              >
                -Y
              </button>
              <button
                onClick={() => handleNudgeCartesian('y', 1)}
                className="flex-1 py-1.5 bg-emerald-100 hover:bg-emerald-200 active:scale-95 rounded-lg border border-emerald-300 text-black transition-all cursor-pointer text-center"
              >
                +Y
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleNudgeCartesian('z', -1)}
                className="flex-1 py-1.5 bg-amber-100 hover:bg-amber-200 active:scale-95 rounded-lg border border-amber-300 text-black transition-all cursor-pointer text-center"
              >
                -Z
              </button>
              <button
                onClick={() => handleNudgeCartesian('z', 1)}
                className="flex-1 py-1.5 bg-amber-100 hover:bg-amber-200 active:scale-95 rounded-lg border border-amber-300 text-black transition-all cursor-pointer text-center"
              >
                +Z
              </button>
            </div>
          </div>

          {/* Quick Tool Orientation Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-stone-200/80">
            <button
              onClick={() => handleOrientationPreset('down')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              Tool Down
            </button>
            <button
              onClick={() => handleOrientationPreset('forward')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              Forward
            </button>
            <button
              onClick={() => handleOrientationPreset('up')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              Tool Up
            </button>
            <button
              onClick={() => handleOrientationPreset('level')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Zero</span>
            </button>
          </div>
        </div>

        {/* Auto-Animate Toggle & Solve Action Button */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAnimate}
                onChange={(e) => setAutoAnimate(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-500"
              />
              <span className="text-xs font-black text-stone-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Auto-Animate to Best Solution</span>
              </span>
            </label>
            <span className="text-[10px] text-stone-500 font-medium">Quintic profile</span>
          </div>

          <button
            onClick={handleUpdateTarget}
            disabled={ikSolving}
            className="flex items-center justify-center gap-2.5 w-full py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 hover:from-amber-500 hover:to-orange-500 active:scale-98 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-xl border-2 border-stone-900 shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {ikSolving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Solving Kinematics...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black text-black" />
                <span>SOLVE & ANIMATE TARGET</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Discovered Solutions Section */}
      <div className="space-y-2.5 flex-1 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-black uppercase tracking-wider">
              Discovered Solutions ({ikResult?.solutions.length ?? 0})
            </h3>
            {ikResult && ikResult.solutions.length >= 2 && (
              <button
                onClick={() => setCompareMode(!compareMode)}
                aria-label="Toggle compare mode between solutions"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer shadow-2xs ${
                  compareMode
                    ? 'bg-amber-400 text-black border border-stone-900 shadow-xs'
                    : 'bg-white hover:bg-stone-100 text-black border border-stone-300'
                }`}
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>{compareMode ? 'Exit Compare' : 'Compare Solutions'}</span>
              </button>
            )}
          </div>
          {ikResult && (
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold">
              <span className="text-stone-600">{ikResult.computationTimeMs.toFixed(1)} ms</span>
              <span>•</span>
              <span
                className={
                  ikResult.converged
                    ? 'px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300 font-black'
                    : 'px-1.5 py-0.5 rounded bg-rose-100 text-rose-950 border border-rose-300 font-black'
                }
              >
                {ikResult.converged ? '✓ IK OK (Reachable)' : '✗ IK Failed (Unreachable)'}
              </span>
            </div>
          )}
        </div>

        {/* Temporary Preview Restore Banner */}
        {prePreviewQ !== null && (
          <div className="flex items-center justify-between p-3 bg-amber-100 border-2 border-amber-400 rounded-2xl text-xs font-black text-amber-950 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-800" />
              <span>Previewing IK Solution Pose in 3D</span>
            </div>
            <button
              onClick={handleRestorePose}
              aria-label="Restore pose before preview"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-black border-2 border-stone-900 rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95"
            >
              <Undo2 className="w-3.5 h-3.5 text-black" />
              <span>Restore Original Pose</span>
            </button>
          </div>
        )}

        {/* Compare Mode Side-by-Side View */}
        {compareMode && ikResult && ikResult.solutions.length >= 2 && (
          <div className="p-3.5 bg-white border-2 border-stone-300 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-black">
                <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                <span>Side-by-Side Solution Comparison</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-600 mb-1">
                  Solution A:
                </label>
                <select
                  value={compareAIdx}
                  onChange={(e) => setCompareAIdx(parseInt(e.target.value, 10))}
                  className="w-full bg-stone-100 border border-stone-300 rounded-lg p-1.5 font-mono font-bold text-xs"
                >
                  {ikResult.solutions.map((s, i) => (
                    <option key={i} value={i}>
                      Branch #{i + 1} ({s.solverType})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-600 mb-1">
                  Solution B:
                </label>
                <select
                  value={compareBIdx}
                  onChange={(e) => setCompareBIdx(parseInt(e.target.value, 10))}
                  className="w-full bg-stone-100 border border-stone-300 rounded-lg p-1.5 font-mono font-bold text-xs"
                >
                  {ikResult.solutions.map((s, i) => (
                    <option key={i} value={i}>
                      Branch #{i + 1} ({s.solverType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Joint Angles Comparison Diff Table */}
            {ikResult.solutions[compareAIdx] && ikResult.solutions[compareBIdx] && (
              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full text-xs text-left font-mono">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-200 text-black font-sans font-black">
                      <th className="py-2 px-2.5">Joint</th>
                      <th className="py-2 px-2.5 text-right">Branch #{compareAIdx + 1}</th>
                      <th className="py-2 px-2.5 text-right">Branch #{compareBIdx + 1}</th>
                      <th className="py-2 px-2.5 text-right">↔ Δq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {robot.joints.map((j, jIdx) => {
                      const isRev = j.type === 'revolute';
                      const qA = ikResult.solutions[compareAIdx].q[jIdx] ?? 0;
                      const qB = ikResult.solutions[compareBIdx].q[jIdx] ?? 0;
                      const diff = qB - qA;
                      const dispA = isRev ? `${(qA * RAD_TO_DEG).toFixed(2)}°` : `${(qA * 1000).toFixed(1)}mm`;
                      const dispB = isRev ? `${(qB * RAD_TO_DEG).toFixed(2)}°` : `${(qB * 1000).toFixed(1)}mm`;
                      const dispDiff = isRev ? `${(diff * RAD_TO_DEG).toFixed(2)}°` : `${(diff * 1000).toFixed(1)}mm`;
                      const isZero = Math.abs(diff) < 0.01;

                      return (
                        <tr key={j.id} className="hover:bg-stone-50">
                          <td className="py-1.5 px-2.5 font-black text-black font-sans">{j.name}</td>
                          <td className="py-1.5 px-2.5 text-right text-stone-800">{dispA}</td>
                          <td className="py-1.5 px-2.5 text-right text-stone-800">{dispB}</td>
                          <td
                            className={`py-1.5 px-2.5 text-right font-black ${
                              isZero ? 'text-emerald-700' : 'text-amber-800'
                            }`}
                          >
                            {dispDiff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Failure Message Display */}
        {ikResult && (!ikResult.converged || ikResult.solutions.length === 0) && (
          <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-black text-xs leading-relaxed shadow-2xs">
            <div className="flex items-center gap-2 font-black mb-1 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              <span className="uppercase tracking-wide">Target Outside Workspace</span>
            </div>
            <p className="text-[11px] text-stone-700 font-medium">
              {ikResult.failureReason ??
                `The specified target position is out of reach for ${robot.name}. Try adjusting coordinates or using the nudge buttons to bring it closer to the arm.`}
            </p>
          </div>
        )}

        {/* Candidate Solutions List (Responsive Cards for Right-Side Panel) */}
        {ikResult && ikResult.solutions.length > 0 ? (
          <div className="space-y-2">
            {ikResult.solutions.map((sol, idx) => {
              const isBest = sol === ikResult.bestSolution;
              const isCurrent = isCurrentPose(sol);
              const isSelected = activeSolIdx === idx;
              const posErrMm = sol.positionError * 1000;
              const oriErrDeg = sol.orientationError * RAD_TO_DEG;

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectSolution(sol, idx, true)}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer shadow-xs hover:border-black ${
                    isSelected || isBest
                      ? 'bg-amber-50/70 border-amber-500/80 ring-2 ring-amber-400/30'
                      : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-black text-xs text-black">Branch #{idx + 1}</span>
                      <span
                        className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                          sol.solverType?.includes('analytical')
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-purple-100 text-purple-900 border-purple-300'
                        }`}
                      >
                        {sol.solverType}
                      </span>
                      {isBest && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-400 text-black border border-stone-900 shadow-2xs">
                          BEST MATCH
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-emerald-100 text-emerald-950 border border-emerald-300">
                          ● ACTIVE POSE
                        </span>
                      )}
                    </div>

                    {/* Joint limits status pill */}
                    {sol.withinLimits ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-900 px-1.5 py-0.2 rounded bg-emerald-100 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-rose-900 px-1.5 py-0.2 rounded bg-rose-100 border border-rose-300">
                        <AlertTriangle className="w-3 h-3 text-rose-700" /> Limit
                      </span>
                    )}
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-1.5 py-1.5 text-[11px] font-mono bg-white/80 rounded-xl px-2 border border-stone-200 mb-2">
                    <div>
                      <div className="text-[9px] text-stone-500 uppercase font-sans font-bold">Pos Err</div>
                      <div className="font-black text-black">
                        {posErrMm < 0.001 ? `${(posErrMm * 1000).toFixed(0)} µm` : `${posErrMm.toFixed(3)} mm`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-stone-500 uppercase font-sans font-bold">Ori Err</div>
                      <div className="font-black text-black">{oriErrDeg.toFixed(2)}°</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-stone-500 uppercase font-sans font-bold">Manip (w)</div>
                      <div className="font-black text-black">{sol.manipulability.toFixed(3)}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Preview in 3D Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview3D(sol);
                      }}
                      title="Temporarily preview robot pose in 3D without trajectory"
                      aria-label={`Preview solution ${idx + 1} in 3D`}
                      className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-white hover:bg-stone-100 active:scale-95 text-stone-800 font-bold text-xs border border-stone-300 shadow-2xs transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-stone-700" />
                      <span>Preview in 3D</span>
                    </button>

                    {/* Animate to Pose Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSolution(sol, idx, true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-black font-black text-xs border border-stone-900 shadow-2xs transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-black text-black" />
                      <span>Animate</span>
                    </button>

                    {/* Snap Pose Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSolution(sol, idx, false);
                      }}
                      title="Instant Jump without trajectory animation"
                      className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-white hover:bg-stone-100 active:scale-95 text-stone-800 font-bold text-xs border border-stone-300 shadow-2xs transition-all cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-stone-700" />
                      <span>Snap</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !ikResult ? (
          <div className="p-6 text-center bg-white rounded-2xl border-2 border-dashed border-stone-300 text-stone-600 font-medium text-xs space-y-1">
            <p className="font-bold text-black">Ready to calculate IK</p>
            <p className="text-[11px] text-stone-500">
              Click "SOLVE & ANIMATE TARGET" or adjust the Cartesian target above.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
