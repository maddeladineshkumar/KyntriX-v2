import React, { useEffect, useRef, useState } from 'react';
import { useRobotStore, type CameraViewPreset } from '../../state/robotStore';
import { RobotScene } from '../../simulation/RobotScene';
import { RAD_TO_DEG } from '../../robotics/math/constants';
import {
  Camera,
  Eye,
  EyeOff,
  Activity,
  Trash2,
  Crosshair,
  Layers,
  Terminal,
  CheckCircle2,
  Loader2,
  X,
  Maximize2,
} from 'lucide-react';

const CAMERA_OPTIONS: { id: CameraViewPreset; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'top', label: 'Top' },
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'isometric', label: 'Isometric' },
  { id: 'fit-robot', label: 'Fit' },
];

const LOADING_STEPS = [
  'Loading robot...',
  'Loading geometry...',
  'Building kinematic chain...',
  'Validating model...',
  'Ready',
];

export const Viewport3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RobotScene | null>(null);

  const {
    robot,
    q,
    fkResult,
    jacobian,
    ikResult,
    targetPose,
    viewOptions,
    workspacePoints,
    toggleViewOption,
    setCameraView,
  } = useRobotStore();

  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [fps, setFps] = useState<number>(60);

  // Poll FPS from RobotScene every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      if (sceneRef.current) {
        setFps(sceneRef.current.getFPS());
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // 1. Initialize RobotScene once
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new RobotScene();
    scene.attach(containerRef.current);
    sceneRef.current = scene;

    // Listen to 3D target dragging
    scene.onTargetChanged((newTarget) => {
      useRobotStore.getState().setTargetPose(newTarget);
    });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        scene.resize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // 2. Load robot whenever robot changes with animated loading steps (PRD §97)
  const robotId = robot?.id;
  useEffect(() => {
    if (!sceneRef.current || !robotId) return;
    let active = true;

    const load = async () => {
      const targetRobot = useRobotStore.getState().robot;
      if (!targetRobot) return;

      setLoadingStep(0); // Loading robot...
      await new Promise((r) => setTimeout(r, 60));
      if (!active) return;

      setLoadingStep(1); // Loading geometry...
      await sceneRef.current?.loadRobot(targetRobot);
      if (!active) return;

      setLoadingStep(2); // Building kinematic chain...
      const currentFK = useRobotStore.getState().fkResult;
      if (currentFK) {
        sceneRef.current?.updatePose(currentFK, targetRobot);
      }
      await new Promise((r) => setTimeout(r, 60));
      if (!active) return;

      setLoadingStep(3); // Validating model...
      await new Promise((r) => setTimeout(r, 60));
      if (!active) return;

      setLoadingStep(4); // Ready
      setTimeout(() => {
        if (active) setLoadingStep(null);
      }, 350);
    };

    load();

    return () => {
      active = false;
    };
  }, [robotId]);

  // 3. Update pose whenever fkResult or robot definition changes
  useEffect(() => {
    if (sceneRef.current && fkResult) {
      sceneRef.current.updatePose(fkResult, robot);
    }
  }, [fkResult, robot]);

  // 4. Synchronize target pose and options
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTargetPose(targetPose);
    }
  }, [targetPose]);

  useEffect(() => {
    if (sceneRef.current) {
      if (viewOptions.stepMode) {
        sceneRef.current.setFrameVisibility(true);
        sceneRef.current.showFramesUpTo(viewOptions.stepFrameIndex);
      } else {
        sceneRef.current.setFrameVisibility(viewOptions.showFrames);
        sceneRef.current.showFramesUpTo(-1);
      }
      sceneRef.current.setMeshVisibility(viewOptions.showMeshes);
      sceneRef.current.setTraceVisibility(viewOptions.showTrace);
    }
  }, [
    viewOptions.showFrames,
    viewOptions.showMeshes,
    viewOptions.showTrace,
    viewOptions.stepMode,
    viewOptions.stepFrameIndex,
  ]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setCameraView(viewOptions.cameraView);
    }
  }, [viewOptions.cameraView]);

  useEffect(() => {
    if (sceneRef.current) {
      if (workspacePoints && workspacePoints.length > 0) {
        sceneRef.current.setWorkspacePointCloud(workspacePoints);
      } else {
        sceneRef.current.clearWorkspacePointCloud();
      }
    }
  }, [workspacePoints]);

  // 5. Trajectory Playback Driver
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const store = useRobotStore.getState();
      if (store.playback.isPlaying && store.activeTrajectory) {
        const traj = store.activeTrajectory;
        let nextTime = store.playback.currentTime + dt * store.playback.speed;
        if (nextTime > traj.duration) {
          if (store.playback.isLooping) {
            nextTime = 0;
          } else {
            nextTime = traj.duration;
            store.pauseTrajectory();
          }
        }
        store.seekTrajectory(nextTime);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleClearTrace = () => {
    sceneRef.current?.clearTrace();
  };

  const eePos = fkResult.endEffectorTransform.getPosition();
  const eeEuler = fkResult.endEffectorPose.euler;

  return (
    <div className="relative w-full h-full min-h-[400px] bg-[#f7f4ed] overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
      />

      {/* Floating Viewport Toolbar - Light Beige Glass Pill */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-1.5 bg-white/90 backdrop-blur-xl px-3 py-1.5 rounded-2xl border-2 border-stone-300/80 shadow-md text-xs text-black">
        {/* Camera Views Selector */}
        <div className="flex items-center gap-1 pr-2 border-r border-stone-200">
          <Camera className="w-3.5 h-3.5 text-black" />
          <button
            onClick={() => setCameraView('home')}
            aria-label="Camera Home"
            className={`px-2.5 py-1 rounded-xl font-black transition-all cursor-pointer ${
              viewOptions.cameraView === 'home'
                ? 'bg-black text-white shadow-xs'
                : 'hover:bg-stone-100 text-black'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setCameraView('top')}
            aria-label="Camera Top"
            className={`px-2.5 py-1 rounded-xl font-black transition-all cursor-pointer ${
              viewOptions.cameraView === 'top'
                ? 'bg-black text-white shadow-xs'
                : 'hover:bg-stone-100 text-black'
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setCameraView('front')}
            aria-label="Camera Front"
            className={`px-2.5 py-1 rounded-xl font-black transition-all cursor-pointer ${
              viewOptions.cameraView === 'front'
                ? 'bg-black text-white shadow-xs'
                : 'hover:bg-stone-100 text-black'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setCameraView('isometric')}
            aria-label="Camera Isometric"
            className={`px-2.5 py-1 rounded-xl font-black transition-all cursor-pointer ${
              viewOptions.cameraView === 'isometric'
                ? 'bg-black text-white shadow-xs'
                : 'hover:bg-stone-100 text-black'
            }`}
          >
            Iso
          </button>

          {/* Extended Camera Dropdown */}
          <select
            value={viewOptions.cameraView}
            onChange={(e) => setCameraView(e.target.value as CameraViewPreset)}
            aria-label="Extended Camera Views"
            className="bg-stone-100 border border-stone-300 text-black text-xs rounded-xl px-2 py-1 font-black focus:outline-none focus:border-black cursor-pointer"
          >
            {CAMERA_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setCameraView('fit-robot')}
            title="Fit Robot in View"
            aria-label="Fit Robot in View"
            className="p-1 hover:bg-stone-100 text-black rounded-lg transition-colors ml-0.5 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Visibility Toggles */}
        <div className="flex items-center gap-1 pl-1">
          <button
            onClick={() => toggleViewOption('showFrames')}
            title="Toggle Coordinate Frames"
            aria-label="Toggle Coordinate Frames"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-black transition-all cursor-pointer ${
              viewOptions.showFrames
                ? 'bg-emerald-100 text-black border border-emerald-300 shadow-2xs'
                : 'hover:bg-stone-100 text-black'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Frames
          </button>

          <button
            onClick={() => toggleViewOption('showMeshes')}
            title="Toggle 3D CAD Meshes"
            aria-label="Toggle 3D CAD Meshes"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-black transition-all cursor-pointer ${
              viewOptions.showMeshes
                ? 'bg-orange-100 text-black border border-orange-300 shadow-2xs'
                : 'hover:bg-stone-100 text-black'
            }`}
          >
            {viewOptions.showMeshes ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            Meshes
          </button>

          <button
            onClick={() => toggleViewOption('showTrace')}
            title="Toggle End-Effector Trace"
            aria-label="Toggle End-Effector Trace"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-black transition-all cursor-pointer ${
              viewOptions.showTrace
                ? 'bg-amber-100 text-black border border-amber-300 shadow-2xs'
                : 'hover:bg-stone-100 text-black'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Trace
          </button>

          <button
            onClick={() => toggleViewOption('showTargetGizmo')}
            title="Toggle IK Target Gizmo"
            aria-label="Toggle IK Target Gizmo"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-black transition-all cursor-pointer ${
              viewOptions.showTargetGizmo
                ? 'bg-rose-100 text-black border border-rose-300 shadow-2xs'
                : 'hover:bg-stone-100 text-black'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            Target
          </button>

          {/* Debug HUD Toggle */}
          <button
            onClick={() => toggleViewOption('showDebug')}
            title="Toggle Simulation HUD / Debug Overlay"
            aria-label="Toggle Simulation HUD"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-black transition-all cursor-pointer ${
              viewOptions.showDebug
                ? 'bg-purple-100 text-black border border-purple-300 shadow-2xs'
                : 'hover:bg-stone-100 text-black'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Debug
          </button>

          <button
            onClick={handleClearTrace}
            title="Clear Trajectory Trail"
            aria-label="Clear Trajectory Trail"
            className="p-1 hover:bg-rose-100 text-black rounded-lg transition-colors ml-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-700" />
          </button>
        </div>
      </div>

      {/* PRD §97 Loading Experience Overlay - Light Mode Card */}
      {loadingStep !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs pointer-events-auto transition-opacity duration-300">
          <div className="bg-white/95 backdrop-blur-2xl border-2 border-stone-300 rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              {loadingStep < 4 ? (
                <Loader2 className="w-6 h-6 text-black animate-spin" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              )}
              <div>
                <h3 className="text-sm font-black text-black">{robot.name}</h3>
                <p className="text-xs text-black font-black">{LOADING_STEPS[loadingStep]}</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-stone-200">
              {LOADING_STEPS.map((stepName, sIdx) => {
                const isCurrent = loadingStep === sIdx;
                const isPassed = loadingStep > sIdx;
                return (
                  <div
                    key={stepName}
                    className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-amber-100 text-black font-black'
                        : isPassed
                        ? 'text-emerald-800 font-bold'
                        : 'text-stone-500'
                    }`}
                  >
                    <span>{stepName}</span>
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-black animate-spin" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PRD §64/65 Semi-transparent dark Debug Overlay */}
      {viewOptions.showDebug && (
        <div className="absolute top-16 right-4 z-20 w-84 bg-black/85 backdrop-blur-md p-4 rounded-2xl border border-stone-700/80 shadow-2xl text-xs font-mono text-stone-100 select-text space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-stone-700/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black text-amber-400 tracking-wider">DEBUG</span>
            </div>
            <button
              onClick={() => toggleViewOption('showDebug')}
              className="text-stone-400 hover:text-white p-0.5 rounded cursor-pointer"
              aria-label="Close Debug Overlay"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px] leading-relaxed">
            <div className="flex justify-between">
              <span className="text-stone-400">Robot:</span>
              <span className="text-white font-bold">{robot.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">DOF:</span>
              <span className="text-white font-bold">{robot.dof}</span>
            </div>
            <div>
              <div className="text-stone-400">q:</div>
              <div className="text-amber-300 pl-2 text-[10px] font-bold">
                [{q.map((val) => val.toFixed(2)).join(', ')}] rad
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">EE Pos:</span>
              <span className="text-white font-bold">
                [{eePos.x.toFixed(3)}, {eePos.y.toFixed(3)}, {eePos.z.toFixed(3)}] m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">EE Euler:</span>
              <span className="text-white font-bold">
                [{(eeEuler.x * RAD_TO_DEG).toFixed(1)}°, {(eeEuler.y * RAD_TO_DEG).toFixed(1)}°,{' '}
                {(eeEuler.z * RAD_TO_DEG).toFixed(1)}°] XYZ
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Manip. w:</span>
              <span className="text-white font-bold">{jacobian.manipulability.toFixed(5)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Cond. κ:</span>
              <span className="text-white font-bold">
                {Number.isFinite(jacobian.conditionNumber)
                  ? jacobian.conditionNumber.toFixed(2)
                  : '∞'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Singular:</span>
              <span
                className={
                  jacobian.isSingular ? 'text-rose-400 font-black' : 'text-emerald-400 font-bold'
                }
              >
                {jacobian.isSingular ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">IK iter:</span>
              <span className="text-white font-bold">
                {ikResult ? (ikResult.converged ? String(ikResult.bestSolution?.iterations ?? 1) : '—') : '—'}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-stone-800">
              <span className="text-stone-400">FPS:</span>
              <span className="text-emerald-400 font-bold">{fps}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Info Overlay (Bottom-Left) */}
      <div className="absolute bottom-5 left-5 z-10 bg-white/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl border-2 border-stone-300/80 text-xs text-black pointer-events-none shadow-md">
        <div className="font-black text-black">
          {robot.name} ({robot.dof}-DOF)
        </div>
        <div className="text-[11px] text-stone-700 font-mono font-bold mt-0.5">
          EE Pos: [{eePos.x.toFixed(3)}, {eePos.y.toFixed(3)}, {eePos.z.toFixed(3)}] m
        </div>
      </div>
    </div>
  );
};
