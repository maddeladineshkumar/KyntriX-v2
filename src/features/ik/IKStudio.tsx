import React, { useState, useEffect, useMemo } from 'react';
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
  Bug,
  Crosshair,
  ShieldCheck,
} from 'lucide-react';

export const IKStudio: React.FC = () => {
  const {
    robot,
    q,
    fkResult,
    targetPose,
    ikResult,
    ikSolving,
    activeTrajectory,
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
  const [positionOnly, setPositionOnly] = useState<boolean>(false);
  const [showDebugMode, setShowDebugMode] = useState<boolean>(false);
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
    setTargetPose(newTarget, false);
    if (shouldSolve) {
      triggerSolveIK(autoAnimate, true, positionOnly);
    }
  };

  // Trajectory proximity & correlation telemetry
  const nearestTrajectoryInfo = useMemo(() => {
    if (!activeTrajectory || !activeTrajectory.endEffectorPositions || activeTrajectory.endEffectorPositions.length === 0) {
      return null;
    }
    const targetPos = targetPose.getPosition();
    let minDist = Infinity;
    let minIdx = -1;
    let minPoint: Vector3 | null = null;
    let minEuler: Euler | null = null;

    for (let i = 0; i < activeTrajectory.endEffectorPositions.length; i++) {
      const p = activeTrajectory.endEffectorPositions[i];
      const dist = targetPos.distanceTo(p);
      if (dist < minDist) {
        minDist = dist;
        minIdx = i;
        minPoint = p;
        minEuler = activeTrajectory.endEffectorOrientations[i] ?? null;
      }
    }

    if (!minPoint) return null;

    const isOnTrajectory = minDist <= 0.005; // within 5mm

    let orientationDiffDeg = 0;
    if (minEuler) {
      const R_target = targetPose.getRotation();
      const R_traj = minEuler.toRotationMatrix();
      const rotErrRad = R_target.rotationError(R_traj).norm();
      orientationDiffDeg = rotErrRad * RAD_TO_DEG;
    }

    return {
      nearestIdx: minIdx,
      nearestPoint: minPoint,
      nearestEuler: minEuler,
      distanceMeters: minDist,
      distanceMm: minDist * 1000,
      isOnTrajectory,
      orientationDiffDeg,
      totalTrajectoryPoints: activeTrajectory.endEffectorPositions.length,
    };
  }, [activeTrajectory, targetPose]);

  const handleSnapToTrajectoryPose = () => {
    if (!nearestTrajectoryInfo || !nearestTrajectoryInfo.nearestPoint || !nearestTrajectoryInfo.nearestEuler) return;
    const p = nearestTrajectoryInfo.nearestPoint;
    const e = nearestTrajectoryInfo.nearestEuler;
    applyPoseValues(
      p.x,
      p.y,
      p.z,
      e.x * RAD_TO_DEG,
      e.y * RAD_TO_DEG,
      e.z * RAD_TO_DEG,
      true
    );
  };

  const handleUpdateTarget = () => {
    const curPos = targetPose.getPosition();
    const curEuler = targetPose.getEuler('XYZ');
    const x = Number.isFinite(parseFloat(inputX)) ? parseFloat(inputX) : curPos.x;
    const y = Number.isFinite(parseFloat(inputY)) ? parseFloat(inputY) : curPos.y;
    const z = Number.isFinite(parseFloat(inputZ)) ? parseFloat(inputZ) : curPos.z;
    const r = Number.isFinite(parseFloat(inputRoll)) ? parseFloat(inputRoll) : curEuler.x * RAD_TO_DEG;
    const p = Number.isFinite(parseFloat(inputPitch)) ? parseFloat(inputPitch) : curEuler.y * RAD_TO_DEG;
    const yaw = Number.isFinite(parseFloat(inputYaw)) ? parseFloat(inputYaw) : curEuler.z * RAD_TO_DEG;
    applyPoseValues(x, y, z, r, p, yaw, true);
  };

  const handleNudgeCartesian = (axis: 'x' | 'y' | 'z', sign: 1 | -1) => {
    const deltaMeters = (sign * nudgeStepMm) / 1000;
    const curPos = targetPose.getPosition();
    const curEuler = targetPose.getEuler('XYZ');
    const curX = Number.isFinite(parseFloat(inputX)) ? parseFloat(inputX) : curPos.x;
    const curY = Number.isFinite(parseFloat(inputY)) ? parseFloat(inputY) : curPos.y;
    const curZ = Number.isFinite(parseFloat(inputZ)) ? parseFloat(inputZ) : curPos.z;
    const curR = Number.isFinite(parseFloat(inputRoll)) ? parseFloat(inputRoll) : curEuler.x * RAD_TO_DEG;
    const curP = Number.isFinite(parseFloat(inputPitch)) ? parseFloat(inputPitch) : curEuler.y * RAD_TO_DEG;
    const curYaw = Number.isFinite(parseFloat(inputYaw)) ? parseFloat(inputYaw) : curEuler.z * RAD_TO_DEG;

    const nextX = axis === 'x' ? curX + deltaMeters : curX;
    const nextY = axis === 'y' ? curY + deltaMeters : curY;
    const nextZ = axis === 'z' ? curZ + deltaMeters : curZ;

    applyPoseValues(nextX, nextY, nextZ, curR, curP, curYaw, true);
  };

  const handleOrientationPreset = (preset: 'down' | 'forward' | 'up' | 'level') => {
    const curPos = targetPose.getPosition();
    const curX = Number.isFinite(parseFloat(inputX)) ? parseFloat(inputX) : curPos.x;
    const curY = Number.isFinite(parseFloat(inputY)) ? parseFloat(inputY) : curPos.y;
    const curZ = Number.isFinite(parseFloat(inputZ)) ? parseFloat(inputZ) : curPos.z;

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

  const handleTargetPreset = (preset: 'offsetZ' | 'offsetX' | 'offsetY' | 'workPose') => {
    const curPos = targetPose.getPosition();
    const curEuler = targetPose.getEuler('XYZ');
    let nextX = Number.isFinite(parseFloat(inputX)) ? parseFloat(inputX) : curPos.x;
    let nextY = Number.isFinite(parseFloat(inputY)) ? parseFloat(inputY) : curPos.y;
    let nextZ = Number.isFinite(parseFloat(inputZ)) ? parseFloat(inputZ) : curPos.z;
    let nextR = Number.isFinite(parseFloat(inputRoll)) ? parseFloat(inputRoll) : curEuler.x * RAD_TO_DEG;
    let nextP = Number.isFinite(parseFloat(inputPitch)) ? parseFloat(inputPitch) : curEuler.y * RAD_TO_DEG;
    let nextYw = Number.isFinite(parseFloat(inputYaw)) ? parseFloat(inputYaw) : curEuler.z * RAD_TO_DEG;

    if (preset === 'offsetZ') {
      nextZ += 0.1;
    } else if (preset === 'offsetX') {
      nextX += 0.1;
    } else if (preset === 'offsetY') {
      nextY += 0.1;
    } else if (preset === 'workPose') {
      const signX = Math.sign(curPos.x) || 1;
      nextX = signX * 0.40;
      nextY = 0.20;
      nextZ = 0.35;
      nextR = 0;
      nextP = 90;
      nextYw = 0;
    }
    applyPoseValues(nextX, nextY, nextZ, nextR, nextP, nextYw, true);
  };

  const handleSelectSolution = (sol: IKSingleSolution, idx: number, animate: boolean) => {
    if (!sol.converged || !sol.withinLimits) return;
    setActiveSolIdx(idx);
    setPrePreviewQ(null);
    applyIKSolution(sol, animate);
  };

  const handlePreview3D = (sol: IKSingleSolution) => {
    if (!sol.converged || !sol.withinLimits) return;
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
    if (!sol || !Array.isArray(sol.q) || sol.q.length < robot.dof) return false;
    for (let i = 0; i < robot.dof; i++) {
      if (Math.abs(sol.q[i] - (q[i] ?? 0)) > 0.02) return false;
    }
    return true;
  };

  const isAlreadyAtTargetPose = (sol: IKSingleSolution) => {
    if (!sol || !Array.isArray(sol.q) || sol.q.length < robot.dof) return false;
    for (let i = 0; i < robot.dof; i++) {
      if (Math.abs(sol.q[i] - (q[i] ?? 0)) > 1e-4) return false;
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
              id="ik-target-x"
              aria-label="Target X Position in meters"
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
              id="ik-target-y"
              aria-label="Target Y Position in meters"
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
              id="ik-target-z"
              aria-label="Target Z Position in meters"
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
              id="ik-target-roll"
              aria-label="Target Roll Angle in degrees"
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
              id="ik-target-pitch"
              aria-label="Target Pitch Angle in degrees"
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
              id="ik-target-yaw"
              aria-label="Target Yaw Angle in degrees"
              step="1"
              value={inputYaw}
              onChange={(e) => setInputYaw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTarget()}
              className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-black font-black text-xs focus:border-black focus:outline-none"
            />
          </div>
        </div>

        {/* Tactile Nudge Pad & Reach Presets */}
        <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200 space-y-2.5">
          {/* Quick Reach Presets */}
          <div className="space-y-1.5 pb-2 border-b border-stone-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-black uppercase tracking-wide">Reach Presets:</span>
              <span className="text-[10px] text-stone-500 font-medium">Offsets & poses</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                id="ik-preset-offset-z"
                onClick={() => handleTargetPreset('offsetZ')}
                className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                +100mm Z
              </button>
              <button
                type="button"
                id="ik-preset-offset-x"
                onClick={() => handleTargetPreset('offsetX')}
                className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                +100mm X
              </button>
              <button
                type="button"
                id="ik-preset-offset-y"
                onClick={() => handleTargetPreset('offsetY')}
                className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                +100mm Y
              </button>
              <button
                type="button"
                id="ik-preset-work-pose"
                onClick={() => handleTargetPreset('workPose')}
                className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                Work Pose
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-black uppercase tracking-wide">Nudge Pad:</span>
            {/* Step size selector */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-stone-300 text-[11px]">
              {[1, 10, 50].map((step) => (
                <button
                  key={step}
                  type="button"
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
                type="button"
                id="ik-nudge-neg-x"
                onClick={() => handleNudgeCartesian('x', -1)}
                className="flex-1 py-1.5 bg-rose-100 hover:bg-rose-200 active:scale-95 rounded-lg border border-rose-300 text-black transition-all cursor-pointer text-center"
              >
                -X
              </button>
              <button
                type="button"
                id="ik-nudge-pos-x"
                onClick={() => handleNudgeCartesian('x', 1)}
                className="flex-1 py-1.5 bg-rose-100 hover:bg-rose-200 active:scale-95 rounded-lg border border-rose-300 text-black transition-all cursor-pointer text-center"
              >
                +X
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                id="ik-nudge-neg-y"
                onClick={() => handleNudgeCartesian('y', -1)}
                className="flex-1 py-1.5 bg-emerald-100 hover:bg-emerald-200 active:scale-95 rounded-lg border border-emerald-300 text-black transition-all cursor-pointer text-center"
              >
                -Y
              </button>
              <button
                type="button"
                id="ik-nudge-pos-y"
                onClick={() => handleNudgeCartesian('y', 1)}
                className="flex-1 py-1.5 bg-emerald-100 hover:bg-emerald-200 active:scale-95 rounded-lg border border-emerald-300 text-black transition-all cursor-pointer text-center"
              >
                +Y
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                id="ik-nudge-neg-z"
                onClick={() => handleNudgeCartesian('z', -1)}
                className="flex-1 py-1.5 bg-amber-100 hover:bg-amber-200 active:scale-95 rounded-lg border border-amber-300 text-black transition-all cursor-pointer text-center"
              >
                -Z
              </button>
              <button
                type="button"
                id="ik-nudge-pos-z"
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
              type="button"
              id="ik-orient-down"
              onClick={() => handleOrientationPreset('down')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              Tool Down
            </button>
            <button
              type="button"
              id="ik-orient-forward"
              onClick={() => handleOrientationPreset('forward')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              Forward
            </button>
            <button
              type="button"
              id="ik-orient-up"
              onClick={() => handleOrientationPreset('up')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              Tool Up
            </button>
            <button
              type="button"
              id="ik-orient-zero"
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
                id="ik-auto-animate"
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

          <div className="flex items-center justify-between px-1">
            <label
              className="flex items-center gap-2 cursor-pointer"
              title="Solve 3-DOF position only, ignoring tool orientation constraints"
            >
              <input
                type="checkbox"
                id="ik-position-only"
                checked={positionOnly}
                onChange={(e) => {
                  const val = e.target.checked;
                  setPositionOnly(val);
                  triggerSolveIK(autoAnimate, true, val);
                }}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-500"
              />
              <span className="text-xs font-black text-stone-800">
                Position Only (Free Orientation)
              </span>
            </label>
            <span className="text-[10px] text-stone-500 font-medium">3-DOF Reach</span>
          </div>

          <button
            type="button"
            id="ik-solve-btn"
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
                <span>{autoAnimate ? 'SOLVE & ANIMATE TARGET' : 'SOLVE TARGET (SNAP)'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Discovered Solutions Section */}
      <div className="space-y-2.5 flex-1 pb-4">
        {/* Informative banner if robot is already converged at target pose */}
        {ikResult && ikResult.converged && ikResult.bestSolution && isAlreadyAtTargetPose(ikResult.bestSolution) && (
          <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-xs text-emerald-950 font-sans shadow-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-black">Robot is already converged at this target pose.</span>
              <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                Use Reach Presets (+100mm Z, +100mm X, Work Pose) or Nudge Pad above to displace the target, or pick an alternative candidate branch below.
              </p>
            </div>
          </div>
        )}

        {/* Banner when Target is ON active trajectory */}
        {nearestTrajectoryInfo?.isOnTrajectory && (
          <div className="p-3.5 bg-cyan-50 border-2 border-cyan-400 rounded-2xl text-xs text-cyan-950 font-sans shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-cyan-950">
                <Crosshair className="w-4 h-4 text-cyan-700 shrink-0" />
                <span className="uppercase tracking-wider">Target lies ON Active TCP Trajectory</span>
              </div>
              <span className="text-[10px] font-mono bg-cyan-200 text-cyan-900 px-2 py-0.5 rounded font-black">
                {nearestTrajectoryInfo.distanceMm.toFixed(2)} mm to Trace
              </span>
            </div>
            <p className="text-[11px] text-cyan-900 font-medium leading-relaxed">
              This Cartesian point is mathematically verified to be visited by the robot during motion.
              {nearestTrajectoryInfo.orientationDiffDeg > 1.0 ? (
                <span>
                  {' '}However, your target orientation differs from the trajectory tool orientation by{' '}
                  <strong>{nearestTrajectoryInfo.orientationDiffDeg.toFixed(1)}°</strong>, which may exceed wrist limits.
                </span>
              ) : (
                <span> Both position and orientation align with the trajectory waypoint.</span>
              )}
            </p>
            {nearestTrajectoryInfo.orientationDiffDeg > 1.0 && (
              <button
                type="button"
                onClick={handleSnapToTrajectoryPose}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Align Target with Trajectory Orientation (Solve 100%)</span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-black uppercase tracking-wider">
              Discovered Solutions ({ikResult?.solutions.length ?? 0})
            </h3>
            {ikResult && ikResult.solutions.length >= 2 && (
              <button
                type="button"
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
            <button
              type="button"
              onClick={() => setShowDebugMode(!showDebugMode)}
              aria-label="Toggle Kinematic Debug Telemetry"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer shadow-2xs ${
                showDebugMode
                  ? 'bg-purple-600 text-white border border-purple-700 shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-black border border-stone-300'
              }`}
            >
              <Bug className="w-3 h-3" />
              <span>{showDebugMode ? 'Hide Debug' : 'Debug Telemetry'}</span>
            </button>
          </div>
          {ikResult && (
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold">
              <span className="text-stone-600">{ikResult.computationTimeMs.toFixed(1)} ms</span>
              <span>•</span>
              <span
                className={
                  ikResult.converged
                    ? (ikResult.isSingular
                        ? 'px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 font-black'
                        : 'px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300 font-black')
                    : ikResult.isPositionReachable
                    ? 'px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 font-black'
                    : 'px-1.5 py-0.5 rounded bg-rose-100 text-rose-950 border border-rose-300 font-black'
                }
              >
                {ikResult.converged
                  ? (positionOnly
                      ? '✓ Pos OK (Reachable)'
                      : (ikResult.isSingular
                          ? '⚠ Reachable (Near Singularity)'
                          : '✓ Pose OK (Dexterous)'))
                  : ikResult.isPositionReachable
                  ? '⚠ Pos OK (Ori Exceeds Limits)'
                  : '✗ IK Failed (Unreachable)'}
              </span>
            </div>
          )}
        </div>

        {/* Section 18: Kinematic & Trajectory Debug Inspector */}
        {showDebugMode && (
          <div className="p-4 bg-purple-50/70 border-2 border-purple-300 rounded-2xl text-black text-xs space-y-3.5 shadow-sm font-sans">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2">
              <div className="flex items-center gap-2 font-black text-purple-950">
                <Bug className="w-4 h-4 text-purple-700 shrink-0" />
                <span className="uppercase tracking-wider">Kinematic & Trajectory Diagnostic Telemetry</span>
              </div>
              <span className="text-[10px] font-mono bg-purple-200 text-purple-900 px-2 py-0.5 rounded font-black">
                DEBUG MODE
              </span>
            </div>

            {/* Target Coordinates */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-600 tracking-wider">
                1. Target Coordinates & Pose
              </span>
              <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-purple-200 font-mono text-[11px]">
                <div>
                  <span className="text-stone-500 font-sans font-bold block text-[10px]">Position (m):</span>
                  <span>X: {currentPos.x.toFixed(4)}, Y: {currentPos.y.toFixed(4)}, Z: {currentPos.z.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-sans font-bold block text-[10px]">Orientation (deg):</span>
                  <span>R: {(currentEuler.x * RAD_TO_DEG).toFixed(1)}°, P: {(currentEuler.y * RAD_TO_DEG).toFixed(1)}°, Y: {(currentEuler.z * RAD_TO_DEG).toFixed(1)}°</span>
                </div>
              </div>
            </div>

            {/* Trajectory Proximity Correlation */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-600 tracking-wider">
                2. Trajectory Proximity Correlation (Blue Trace)
              </span>
              <div className="bg-white p-2.5 rounded-xl border border-purple-200 space-y-2">
                {nearestTrajectoryInfo ? (
                  <>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <div>
                        <span className="text-stone-500 font-sans font-bold text-[10px] block">Distance to Trajectory:</span>
                        <span className={nearestTrajectoryInfo.isOnTrajectory ? 'text-emerald-700 font-black' : 'text-stone-800'}>
                          {nearestTrajectoryInfo.distanceMm.toFixed(2)} mm {nearestTrajectoryInfo.isOnTrajectory ? '(ON TRAJECTORY)' : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-stone-500 font-sans font-bold text-[10px] block">Nearest Waypoint:</span>
                        <span>#{nearestTrajectoryInfo.nearestIdx + 1} of {nearestTrajectoryInfo.totalTrajectoryPoints}</span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-stone-700">
                      <div>Waypoint XYZ: [{nearestTrajectoryInfo.nearestPoint.x.toFixed(4)}, {nearestTrajectoryInfo.nearestPoint.y.toFixed(4)}, {nearestTrajectoryInfo.nearestPoint.z.toFixed(4)}] m</div>
                      {nearestTrajectoryInfo.nearestEuler && (
                        <div>Waypoint RPY: [{(nearestTrajectoryInfo.nearestEuler.x * RAD_TO_DEG).toFixed(1)}°, {(nearestTrajectoryInfo.nearestEuler.y * RAD_TO_DEG).toFixed(1)}°, {(nearestTrajectoryInfo.nearestEuler.z * RAD_TO_DEG).toFixed(1)}°]</div>
                      )}
                      <div>Orientation Difference: {nearestTrajectoryInfo.orientationDiffDeg.toFixed(2)}°</div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSnapToTrajectoryPose}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-black text-[11px] rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>Snap Target to Trajectory Pose (Guaranteed Reachable)</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-stone-600 font-medium">
                    No planned trajectory dataset is currently active. The blue line in 3D reflects the real-time forward kinematics end-effector history. Generate a trajectory in Trajectory Studio to enable waypoint-by-waypoint correlation.
                  </div>
                )}
              </div>
            </div>

            {/* Reachability & Feasibility Status */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-600 tracking-wider">
                3. Kinematic Feasibility Verdict
              </span>
              <div className="bg-white p-2.5 rounded-xl border border-purple-200 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-700">Verdict:</span>
                  <span className="font-black px-2 py-0.5 rounded bg-stone-100 text-black">
                    {ikResult?.converged
                      ? (ikResult.isSingular ? 'Reachable (Near Singularity)' : 'Reachable (Dexterous)')
                      : ikResult?.isPositionReachable
                      ? 'Position Reachable Only (Orientation Outside Limits)'
                      : (ikResult?.failureReason?.includes('outside') ? 'Outside Reachable Envelope' : 'Kinematically Unreachable')}
                  </span>
                </div>
                <p className="text-stone-600 font-medium leading-relaxed">
                  {ikResult?.failureReason ??
                    (ikResult?.converged
                      ? 'Target pose is mathematically confirmed reachable and satisfies all joint limits.'
                      : 'Inverse kinematics did not converge to a valid joint solution.')}
                </p>
              </div>
            </div>

            {/* Selected Solution Kinematics & Manipulability */}
            {ikResult?.bestSolution && (
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-stone-600 tracking-wider">
                  4. Solution Kinematic Quality & Jacobian Metrics
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-xl border border-purple-200 font-mono text-[11px]">
                  <div>
                    <span className="text-stone-500 font-sans font-bold text-[10px] block">Solver:</span>
                    <span>{ikResult.bestSolution.solverType}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-sans font-bold text-[10px] block">Pos Error:</span>
                    <span>{(ikResult.bestSolution.positionError * 1000).toFixed(4)} mm</span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-sans font-bold text-[10px] block">Ori Error:</span>
                    <span>{(ikResult.bestSolution.orientationError * RAD_TO_DEG).toFixed(3)}°</span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-sans font-bold text-[10px] block">Manipulability w:</span>
                    <span>{ikResult.bestSolution.manipulability.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-sans font-bold text-[10px] block">Condition κ:</span>
                    <span>{Number.isFinite(ikResult.bestSolution.conditionNumber) ? ikResult.bestSolution.conditionNumber.toFixed(1) : '∞'}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-sans font-bold text-[10px] block">Singularity:</span>
                    <span className={ikResult.bestSolution.isSingular ? 'text-amber-700 font-black' : 'text-emerald-700 font-black'}>
                      {ikResult.bestSolution.isSingular ? 'Near Singular' : 'Dexterous'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-sans font-bold text-[10px] block">Iterations:</span>
                    <span>{ikResult.bestSolution.iterations}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-sans font-bold text-[10px] block">Time:</span>
                    <span>{ikResult.computationTimeMs.toFixed(1)} ms</span>
                  </div>
                </div>
              </div>
            )}

            {/* Joint Limits Status Table */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-600 tracking-wider">
                5. Joint Limits Status ({robot.name})
              </span>
              <div className="overflow-x-auto bg-white rounded-xl border border-purple-200">
                <table className="w-full text-[10px] text-left font-mono">
                  <thead>
                    <tr className="bg-purple-100/60 border-b border-purple-200 text-black font-sans font-black">
                      <th className="py-1 px-2">Joint</th>
                      <th className="py-1 px-2 text-right">Target Angle</th>
                      <th className="py-1 px-2 text-right">Min Limit</th>
                      <th className="py-1 px-2 text-right">Max Limit</th>
                      <th className="py-1 px-2 text-right">Limit Margin</th>
                      <th className="py-1 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {robot.joints.map((j, idx) => {
                      const angleRad = ikResult?.bestSolution ? ikResult.bestSolution.q[idx] : q[idx];
                      const isRev = j.type === 'revolute';
                      const angleDeg = isRev ? angleRad * RAD_TO_DEG : angleRad * 1000;
                      const minDeg = isRev ? j.min * RAD_TO_DEG : j.min * 1000;
                      const maxDeg = isRev ? j.max * RAD_TO_DEG : j.max * 1000;
                      const unit = isRev ? '°' : ' mm';
                      const distToMin = Math.abs(angleRad - j.min);
                      const distToMax = Math.abs(angleRad - j.max);
                      const marginRad = Math.min(distToMin, distToMax);
                      const marginDeg = isRev ? marginRad * RAD_TO_DEG : marginRad * 1000;
                      const isViolated = angleRad < j.min - 1e-4 || angleRad > j.max + 1e-4;

                      return (
                        <tr key={j.id} className={isViolated ? 'bg-rose-50/80 text-rose-900 font-bold' : ''}>
                          <td className="py-1 px-2 font-bold font-sans">{j.name}</td>
                          <td className="py-1 px-2 text-right">{angleDeg.toFixed(1)}{unit}</td>
                          <td className="py-1 px-2 text-right">{minDeg.toFixed(1)}{unit}</td>
                          <td className="py-1 px-2 text-right">{maxDeg.toFixed(1)}{unit}</td>
                          <td className="py-1 px-2 text-right">{marginDeg.toFixed(1)}{unit}</td>
                          <td className="py-1 px-2 text-center">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                              isViolated ? 'bg-rose-200 text-rose-950' : 'bg-emerald-100 text-emerald-950'
                            }`}>
                              {isViolated ? 'VIOLATED' : 'OK'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Collision & Environmental Clearance Status */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-600 tracking-wider">
                6. Collision & Environmental Clearance
              </span>
              <div className="bg-white p-2.5 rounded-xl border border-purple-200 flex items-start gap-2 text-[11px] text-stone-700">
                <ShieldCheck className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-black">Collision Checking: Kinematic Simulation Only</span>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">
                    Environment obstacle collisions and link-link self-collision meshes are currently disabled. Kinematic feasibility verifies mathematical reachability and joint angle limits only.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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
          ikResult.isPositionReachable ? (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-black text-xs leading-relaxed shadow-2xs">
              <div className="flex items-center gap-2 font-black mb-1 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="uppercase tracking-wide">Position Reachable — Orientation Outside Limits</span>
              </div>
              <p className="text-[11px] text-stone-700 font-medium mb-2.5">
                {ikResult.failureReason ??
                  `Target position is reachable by ${robot.name}, but the requested tool orientation cannot be achieved within physical joint limits.`}
              </p>
              <button
                type="button"
                id="ik-solve-pos-only-btn"
                onClick={() => {
                  setPositionOnly(true);
                  triggerSolveIK(autoAnimate, true, true);
                }}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 active:scale-95 text-black font-black text-xs rounded-xl border border-stone-900 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Solve Position Only (Free Orientation)</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-black text-xs leading-relaxed shadow-2xs">
              <div className="flex items-center gap-2 font-black mb-1 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span className="uppercase tracking-wide">Target Outside Reachable Workspace</span>
              </div>
              <p className="text-[11px] text-stone-700 font-medium">
                {ikResult.failureReason ??
                  `The specified target position is out of reach for ${robot.name}. Try adjusting coordinates or using the nudge buttons to bring it closer to the arm.`}
              </p>
            </div>
          )
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
                  onClick={() => {
                    if (sol.converged && sol.withinLimits) {
                      handleSelectSolution(sol, idx, true);
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 transition-all shadow-xs ${
                    !sol.converged || !sol.withinLimits
                      ? 'bg-stone-100/80 border-stone-200 opacity-75 cursor-not-allowed'
                      : isSelected || isBest
                      ? 'bg-amber-50/70 border-amber-500/80 ring-2 ring-amber-400/30 cursor-pointer hover:border-black'
                      : 'bg-white border-stone-200 hover:bg-stone-50 cursor-pointer hover:border-black'
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
                    {sol.withinLimits && sol.converged ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-900 px-1.5 py-0.2 rounded bg-emerald-100 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-rose-900 px-1.5 py-0.2 rounded bg-rose-100 border border-rose-300">
                        <AlertTriangle className="w-3 h-3 text-rose-700" /> {!sol.withinLimits ? 'Limit Exceeded' : 'Not Converged'}
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
                      disabled={!sol.withinLimits || !sol.converged}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview3D(sol);
                      }}
                      title="Temporarily preview robot pose in 3D without trajectory"
                      aria-label={`Preview solution ${idx + 1} in 3D`}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-stone-800 font-bold text-xs border border-stone-300 shadow-2xs transition-all ${
                        !sol.withinLimits || !sol.converged
                          ? 'opacity-40 cursor-not-allowed bg-stone-100'
                          : 'bg-white hover:bg-stone-100 active:scale-95 cursor-pointer'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-stone-700" />
                      <span>Preview in 3D</span>
                    </button>

                    {/* Animate to Pose Button */}
                    <button
                      type="button"
                      disabled={!sol.withinLimits || !sol.converged}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSolution(sol, idx, true);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl font-black text-xs border shadow-2xs transition-all ${
                        !sol.withinLimits || !sol.converged
                          ? 'opacity-40 cursor-not-allowed bg-stone-200 text-stone-500 border-stone-300'
                          : 'bg-amber-400 hover:bg-amber-500 active:scale-95 text-black border-stone-900 cursor-pointer'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-black text-black" />
                      <span>Animate</span>
                    </button>

                    {/* Snap Pose Button */}
                    <button
                      type="button"
                      disabled={!sol.withinLimits || !sol.converged}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSolution(sol, idx, false);
                      }}
                      title="Instant Jump without trajectory animation"
                      className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl font-bold text-xs border border-stone-300 shadow-2xs transition-all ${
                        !sol.withinLimits || !sol.converged
                          ? 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-400'
                          : 'bg-white hover:bg-stone-100 active:scale-95 text-stone-800 cursor-pointer'
                      }`}
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
