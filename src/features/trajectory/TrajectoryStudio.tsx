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
  AlertTriangle,
  Home,
} from 'lucide-react';

export const TrajectoryStudio: React.FC = () => {
  const {
    robot,
    activeTrajectory,
    playback,
    thanksLoadingProgress,
    isEStopped,
    emergencyStop,
    resetEStop,
    resetToHome,
    generateJointTraj,
    generateCartesianTraj,
    loadThanksTraj,
    playTrajectory,
    pauseTrajectory,
    stopTrajectory,
    rewindTrajectory,
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
    <div className="flex flex-col h-full bg-[#faf8f5] text-black p-5 overflow-y-auto space-y-4">
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
              <span>LOAD KyntriX "THANKS" TRAJECTORY</span>
            </>
          )}
        </button>
      </div>

      {/* Trajectory Config Card */}
      <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-sm space-y-4">
        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-xl border border-stone-300 shadow-xs" role="tablist" aria-label="Trajectory planning modes">
            <button
              role="tab"
              aria-selected={mode === 'joint'}
              onClick={() => setMode('joint')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                mode === 'joint' ? 'bg-amber-400 text-black border border-stone-900 shadow-xs' : 'text-black hover:bg-white'
              }`}
            >
              <Sliders className="w-4 h-4 text-black" />
              <span>Joint Space (q₀ → q_goal)</span>
            </button>
            <button
              role="tab"
              aria-selected={mode === 'cartesian'}
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
              <label htmlFor="traj-profile-select" className="text-black font-black uppercase">Profile:</label>
              <select
                id="traj-profile-select"
                value={profile}
                aria-label="Trajectory velocity profile"
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
              <label htmlFor="traj-duration-input" className="text-black font-black uppercase">Duration:</label>
              <input
                id="traj-duration-input"
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={duration}
                aria-label="Trajectory duration in seconds"
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
                <label htmlFor="cartesian-dx-input" className="text-xs text-black font-black font-sans flex items-center justify-between">
                  <span>ΔX</span>
                  <span className="text-[9px] px-1 bg-rose-200 text-black rounded font-bold">m</span>
                </label>
                <input
                  id="cartesian-dx-input"
                  type="number"
                  step="0.05"
                  value={cartesianDeltaX}
                  aria-label="Cartesian delta X displacement in meters"
                  onChange={(e) => setCartesianDeltaX(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-black font-mono font-black text-xs focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 p-2.5 bg-stone-50 rounded-xl border border-stone-300">
                <label htmlFor="cartesian-dy-input" className="text-xs text-black font-black font-sans flex items-center justify-between">
                  <span>ΔY</span>
                  <span className="text-[9px] px-1 bg-emerald-200 text-black rounded font-bold">m</span>
                </label>
                <input
                  id="cartesian-dy-input"
                  type="number"
                  step="0.05"
                  value={cartesianDeltaY}
                  aria-label="Cartesian delta Y displacement in meters"
                  onChange={(e) => setCartesianDeltaY(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-black font-mono font-black text-xs focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 p-2.5 bg-stone-50 rounded-xl border border-stone-300">
                <label htmlFor="cartesian-dz-input" className="text-xs text-black font-black font-sans flex items-center justify-between">
                  <span>ΔZ</span>
                  <span className="text-[9px] px-1 bg-amber-200 text-black rounded font-bold">m</span>
                </label>
                <input
                  id="cartesian-dz-input"
                  type="number"
                  step="0.05"
                  value={cartesianDeltaZ}
                  aria-label="Cartesian delta Z displacement in meters"
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

      {/* Trajectory Failure / Unreachable Waypoints Banner */}
      {activeTrajectory && (activeTrajectory.hasIKFailure || !activeTrajectory.isValid) && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-950 space-y-2 shadow-sm animate-in fade-in duration-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-black text-rose-900 uppercase tracking-wide">
                Trajectory Planning Failure / Unreachable Waypoint
              </div>
              <p className="text-rose-800 leading-relaxed font-medium">
                {activeTrajectory.failureReason || 'One or more Cartesian waypoints exceed the robot reach or violate joint limits.'}
              </p>
              <p className="text-stone-700 text-[11px] font-sans">
                <strong>Recovery suggestion:</strong> Reduce the Cartesian delta displacement, ensure the target is within the robot's physical reach envelope, or choose an alternate starting joint configuration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Stop Active Warning Banner */}
      {isEStopped && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center justify-between p-3.5 bg-rose-600 text-white rounded-2xl text-xs font-black shadow-md animate-pulse"
        >
          <div className="flex items-center gap-2">
            <Square className="w-4 h-4 fill-white" />
            <span>EMERGENCY STOP ACTIVE: Trajectory halted and robot pose preserved.</span>
          </div>
          <button
            onClick={resetEStop}
            className="px-3 py-1 bg-white text-rose-700 rounded-lg text-xs font-black hover:bg-stone-100 cursor-pointer transition-colors shadow-xs"
          >
            Release E-Stop
          </button>
        </div>
      )}

      {/* Trajectory Playback Control Bar */}
      {activeTrajectory && (
        <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-black flex items-center gap-2 uppercase tracking-wide">
              <span className={`w-3 h-3 rounded-full border ${activeTrajectory.hasIKFailure ? 'bg-rose-500 border-rose-700' : 'bg-emerald-500 border-emerald-700 animate-pulse'}`} />
              Simulation Playback ({activeTrajectory.states.length} Waypoints)
              {activeTrajectory.hasIKFailure && (
                <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black border border-rose-300">
                  Unreachable IK Waypoints
                </span>
              )}
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
            aria-label="Trajectory playback scrubber"
            className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-600 transition-colors"
          />

          {/* Transport Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={rewindTrajectory}
                title="Rewind trajectory to start (0.0s)"
                aria-label="Rewind to start"
                className="p-2.5 rounded-xl bg-white hover:bg-stone-100 text-black border-2 border-stone-300 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-black" />
              </button>

              <button
                type="button"
                onClick={stepBackward}
                title="Step backward by 1 waypoint interval"
                aria-label="Step backward"
                className="p-2.5 rounded-xl bg-white hover:bg-stone-100 text-black border-2 border-stone-300 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <SkipBack className="w-4 h-4 text-black" />
              </button>

              {playback.isPlaying ? (
                <button
                  type="button"
                  onClick={pauseTrajectory}
                  title="Pause trajectory playback (hold current pose)"
                  aria-label="Pause trajectory"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-black font-black text-xs border-2 border-stone-900 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Pause className="w-4 h-4 fill-black text-black" />
                  <span>PAUSE</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={playTrajectory}
                  disabled={isEStopped}
                  title={isEStopped ? 'Cannot play while Emergency Stop is engaged' : 'Play trajectory animation'}
                  aria-label="Play trajectory"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50 text-black font-black text-xs border-2 border-stone-900 shadow-sm transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>PLAY</span>
                </button>
              )}

              <button
                type="button"
                onClick={stopTrajectory}
                title="Stop trajectory playback and rewind to time 0"
                aria-label="Stop trajectory"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 border-2 border-stone-300 font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-stone-700 text-stone-700" />
                <span>STOP</span>
              </button>

              <button
                type="button"
                onClick={stepForward}
                title="Step forward by 1 waypoint interval"
                aria-label="Step forward"
                className="p-2.5 rounded-xl bg-white hover:bg-stone-100 text-black border-2 border-stone-300 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <SkipForward className="w-4 h-4 text-black" />
              </button>

              <button
                type="button"
                onClick={toggleLooping}
                title="Toggle continuous looping"
                aria-label="Toggle trajectory looping"
                aria-pressed={playback.isLooping}
                className={`p-2.5 rounded-xl border-2 transition-all active:scale-95 cursor-pointer shadow-xs ${
                  playback.isLooping
                    ? 'bg-amber-400 text-black border-stone-900'
                    : 'bg-white text-black border-stone-300 hover:bg-stone-100'
                }`}
              >
                <Repeat className="w-4 h-4 text-black" />
              </button>

              {/* Reset to Home Action */}
              <button
                type="button"
                onClick={resetToHome}
                title="Reset robot joints to calibrated home position"
                aria-label="Reset robot to home pose"
                className="p-2.5 rounded-xl bg-white hover:bg-stone-100 text-black border-2 border-stone-300 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Home className="w-4 h-4 text-black" />
              </button>

              {/* Explicit Emergency Stop Button */}
              <button
                type="button"
                onClick={isEStopped ? resetEStop : emergencyStop}
                title={isEStopped ? 'Emergency Stop active: Click to release E-Stop' : 'Emergency Stop: Immediately halt trajectory and freeze current joint pose'}
                aria-label={isEStopped ? 'Emergency Stop is active. Click to reset.' : 'Emergency Stop'}
                aria-pressed={isEStopped}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-sm active:scale-95 ${
                  isEStopped
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-2 ring-rose-400'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <Square className="w-3.5 h-3.5 fill-white text-white" />
                <span>{isEStopped ? 'E-STOPPED (Reset)' : 'E-STOP'}</span>
              </button>
            </div>

            {/* Speed Multiplier */}
            <div className="flex items-center gap-1.5 text-xs">
              <FastForward className="w-4 h-4 text-black" />
              {[0.1, 0.25, 0.5, 1.0, 2.0, 5.0].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  aria-label={`Playback speed ${spd}x`}
                  aria-pressed={playback.speed === spd}
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
