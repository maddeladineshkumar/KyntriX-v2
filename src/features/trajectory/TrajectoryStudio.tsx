import React, { useState } from 'react';
import { useRobotStore } from '../../state/robotStore';
import type { TrajectoryProfile } from '../../robotics/trajectories/types';
import { Matrix4 } from '../../robotics/math/Matrix4';
import { Vector3 } from '../../robotics/math/Vector3';
import { DEG_TO_RAD, RAD_TO_DEG } from '../../robotics/math/constants';
import {
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Sparkles,
  Sliders,
  MoveUpRight,
  Clock,
  FastForward,
  Square,
  SkipForward,
  SkipBack,
  Loader2,
} from 'lucide-react';

export const TrajectoryStudio: React.FC = () => {
  const {
    robot,
    activeTrajectory,
    playback,
    thanksLoadingProgress,
    generateJointTraj,
    generateCartesianTraj,
    loadThanksTraj,
    playTrajectory,
    pauseTrajectory,
    stopTrajectory,
    stepForward,
    stepBackward,
    seekTrajectory,
    setPlaybackSpeed,
    toggleLooping,
  } = useRobotStore();

  const [mode, setMode] = useState<'joint' | 'cartesian'>('joint');
  const [profile, setProfile] = useState<TrajectoryProfile>('quintic');
  const [duration, setDuration] = useState<number>(3.0);

  // Goal Joint values for joint trajectory
  const [goalQ, setGoalQ] = useState<number[]>(() =>
    robot.joints.map((j) => (j.home !== undefined ? j.home + 0.3 : (j.min + j.max) / 2))
  );

  // Delta displacement for Cartesian straight line (X, Y, Z offsets)
  const [cartesianDeltaX, setCartesianDeltaX] = useState('0.15');
  const [cartesianDeltaY, setCartesianDeltaY] = useState('0.15');
  const [cartesianDeltaZ, setCartesianDeltaZ] = useState('-0.10');

  const handleRunJointTraj = () => {
    generateJointTraj(goalQ, duration, profile);
  };

  const handleRunCartesianTraj = () => {
    const { fkResult } = useRobotStore.getState();
    const currentPose = fkResult.endEffectorTransform;
    const currentPos = currentPose.getPosition();

    const targetPos = new Vector3(
      currentPos.x + parseFloat(cartesianDeltaX || '0'),
      currentPos.y + parseFloat(cartesianDeltaY || '0'),
      currentPos.z + parseFloat(cartesianDeltaZ || '0')
    );

    const targetPose = Matrix4.fromRotationTranslation(currentPose.getRotation(), targetPos);
    generateCartesianTraj(targetPose, duration, profile);
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] text-black p-5 overflow-y-auto select-none space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-200">
        <span className="text-xs text-stone-600 font-medium">
          Plan smooth quintic/cubic polynomial trajectories or straight Cartesian paths:
        </span>

        {/* Signature Thanks Trajectory button */}
        <button
          onClick={loadThanksTraj}
          disabled={thanksLoadingProgress !== null}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-black font-black text-xs rounded-xl border-2 border-stone-900 shadow-md transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed"
        >
          {thanksLoadingProgress !== null ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Computing IK: {thanksLoadingProgress}%</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-black text-black" />
              <span>LOAD ROBOANALYZER "THANKS" TRAJECTORY</span>
            </>
          )}
        </button>
      </div>

      {/* Trajectory Config Card */}
      <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-sm space-y-4">
        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-xl border border-stone-300 shadow-xs">
            <button
              onClick={() => setMode('joint')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                mode === 'joint' ? 'bg-amber-400 text-black border border-stone-900 shadow-xs' : 'text-black hover:bg-white'
              }`}
            >
              <Sliders className="w-4 h-4 text-black" />
              <span>Joint Space (q₀ → q_goal)</span>
            </button>
            <button
              onClick={() => setMode('cartesian')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                mode === 'cartesian' ? 'bg-amber-400 text-black border border-stone-900 shadow-xs' : 'text-black hover:bg-white'
              }`}
            >
              <MoveUpRight className="w-4 h-4 text-black" />
              <span>Cartesian Straight Line</span>
            </button>
          </div>

          {/* Profile & Duration Settings */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-black font-black uppercase">Profile:</span>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value as TrajectoryProfile)}
                className="bg-white border-2 border-stone-300 rounded-xl px-3 py-1.5 text-black font-black focus:border-stone-900 focus:outline-none cursor-pointer"
              >
                <option value="quintic">Quintic (C² Smooth)</option>
                <option value="cubic">Cubic Polynomial</option>
                <option value="trapezoidal">Trapezoidal (LSPB)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-black" />
              <span className="text-black font-black uppercase">Duration:</span>
              <input
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value) || 2.0)}
                className="w-16 px-2 py-1.5 bg-white border-2 border-stone-300 rounded-xl text-black text-center font-mono font-black focus:border-stone-900 focus:outline-none"
              />
              <span className="text-black font-black">s</span>
            </div>
          </div>
        </div>

        {/* Mode Specific Inputs */}
        {mode === 'joint' ? (
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-black uppercase tracking-wide">Target Configuration q_goal</span>
              <button
                onClick={() => setGoalQ(robot.joints.map((j) => (j.home !== undefined ? j.home : 0)))}
                className="text-xs text-black font-black hover:underline cursor-pointer bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg border border-stone-300 transition-all"
              >
                Reset Goal to Home
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {robot.joints.map((joint, idx) => {
                const isRev = joint.type === 'revolute';
                const currentVal = goalQ[idx] ?? 0;
                const degVal = isRev ? currentVal * RAD_TO_DEG : currentVal * 1000;

                return (
                  <div key={joint.id} className="p-2 bg-stone-50 rounded-xl border border-stone-300 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-black text-black uppercase">
                      <span className="truncate">{joint.name}</span>
                      <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-stone-900 rounded font-bold">{isRev ? '°' : 'mm'}</span>
                    </div>
                    <input
                      type="number"
                      step={isRev ? '1' : '5'}
                      value={degVal.toFixed(1)}
                      onChange={(e) => {
                        const num = parseFloat(e.target.value) || 0;
                        const next = [...goalQ];
                        next[idx] = isRev ? num * DEG_TO_RAD : num / 1000;
                        setGoalQ(next);
                      }}
                      className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-mono font-black text-black text-center focus:border-black focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleRunJointTraj}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 hover:from-amber-500 hover:to-orange-500 active:scale-98 text-black font-black text-xs rounded-xl border-2 border-stone-900 shadow-md transition-all cursor-pointer uppercase tracking-wider"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>Generate & Play Joint Trajectory</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-black uppercase tracking-wide">
                Cartesian Delta Offsets from Current EE Pose
              </span>
              {/* Quick Offset Chips */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setCartesianDeltaX('0.15');
                    setCartesianDeltaY('0.15');
                    setCartesianDeltaZ('-0.10');
                  }}
                  className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-stone-100 text-black border border-stone-300 hover:bg-stone-200 cursor-pointer transition-all"
                >
                  Preset Diagonal
                </button>
                <button
                  onClick={() => {
                    setCartesianDeltaX('0.00');
                    setCartesianDeltaY('0.00');
                    setCartesianDeltaZ('0.15');
                  }}
                  className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-stone-100 text-black border border-stone-300 hover:bg-stone-200 cursor-pointer transition-all"
                >
                  Preset Vertical Lift
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="space-y-1 p-2.5 bg-stone-50 rounded-xl border border-stone-300">
                <label className="text-xs text-black font-black font-sans flex items-center justify-between">
                  <span>ΔX</span>
                  <span className="text-[9px] px-1 bg-rose-200 text-black rounded font-bold">m</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={cartesianDeltaX}
                  onChange={(e) => setCartesianDeltaX(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-black font-mono font-black text-xs focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 p-2.5 bg-stone-50 rounded-xl border border-stone-300">
                <label className="text-xs text-black font-black font-sans flex items-center justify-between">
                  <span>ΔY</span>
                  <span className="text-[9px] px-1 bg-emerald-200 text-black rounded font-bold">m</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={cartesianDeltaY}
                  onChange={(e) => setCartesianDeltaY(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-black font-mono font-black text-xs focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 p-2.5 bg-stone-50 rounded-xl border border-stone-300">
                <label className="text-xs text-black font-black font-sans flex items-center justify-between">
                  <span>ΔZ</span>
                  <span className="text-[9px] px-1 bg-amber-200 text-black rounded font-bold">m</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={cartesianDeltaZ}
                  onChange={(e) => setCartesianDeltaZ(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-black font-mono font-black text-xs focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleRunCartesianTraj}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 hover:from-amber-500 hover:to-orange-500 active:scale-98 text-black font-black text-xs rounded-xl border-2 border-stone-900 shadow-md transition-all cursor-pointer uppercase tracking-wider"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>Generate & Play Cartesian Trajectory</span>
            </button>
          </div>
        )}
      </div>

      {/* Trajectory Playback Control Bar */}
      {activeTrajectory && (
        <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-black flex items-center gap-2 uppercase tracking-wide">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse border border-emerald-700" />
              Simulation Playback ({activeTrajectory.states.length} Waypoints)
            </span>
            <span className="font-mono text-black font-black bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-300">
              {playback.currentTime.toFixed(2)}s / {activeTrajectory.duration.toFixed(2)}s
            </span>
          </div>

          {/* Scrubber Timeline Bar */}
          <input
            type="range"
            min="0"
            max={activeTrajectory.duration}
            step="0.02"
            value={playback.currentTime}
            onChange={(e) => seekTrajectory(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-600 transition-colors"
          />

          {/* Transport Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => seekTrajectory(0)}
                title="Rewind to Start"
                className="p-2.5 rounded-xl bg-white hover:bg-stone-100 text-black border-2 border-stone-300 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-black" />
              </button>

              <button
                onClick={stepBackward}
                title="Step Backward"
                className="p-2.5 rounded-xl bg-white hover:bg-stone-100 text-black border-2 border-stone-300 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <SkipBack className="w-4 h-4 text-black" />
              </button>

              {playback.isPlaying ? (
                <button
                  onClick={pauseTrajectory}
                  title="Pause Trajectory"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-black font-black text-xs border-2 border-stone-900 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Pause className="w-4 h-4 fill-black text-black" />
                  <span>PAUSE</span>
                </button>
              ) : (
                <button
                  onClick={playTrajectory}
                  title="Play Trajectory"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-black font-black text-xs border-2 border-stone-900 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>PLAY</span>
                </button>
              )}

              <button
                onClick={stopTrajectory}
                title="Stop and Reset"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-black border-2 border-rose-300 font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-black text-black" />
                <span>STOP</span>
              </button>

              <button
                onClick={stepForward}
                title="Step Forward"
                className="p-2.5 rounded-xl bg-white hover:bg-stone-100 text-black border-2 border-stone-300 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <SkipForward className="w-4 h-4 text-black" />
              </button>

              <button
                onClick={toggleLooping}
                title="Toggle Looping"
                className={`p-2.5 rounded-xl border-2 transition-all active:scale-95 cursor-pointer shadow-xs ${
                  playback.isLooping
                    ? 'bg-amber-400 text-black border-stone-900'
                    : 'bg-white text-black border-stone-300 hover:bg-stone-100'
                }`}
              >
                <Repeat className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Speed Multiplier */}
            <div className="flex items-center gap-1.5 text-xs">
              <FastForward className="w-4 h-4 text-black" />
              {[0.1, 0.25, 0.5, 1.0, 2.0, 5.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-black transition-all cursor-pointer ${
                    playback.speed === spd
                      ? 'bg-amber-400 text-black border border-stone-900 shadow-xs'
                      : 'bg-white text-black border border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
