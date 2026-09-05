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

interface Viewport3DProps {
  isPaused?: boolean;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({ isPaused = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RobotScene | null>(null);

  // Pause/resume render loop when obscured by modal studios
  useEffect(() => {
    if (sceneRef.current) {
      if (isPaused) {
        sceneRef.current.pause();
      } else {
        sceneRef.current.resume();
      }
    }
  }, [isPaused]);

  const robot = useRobotStore((s) => s.robot);
  const q = useRobotStore((s) => s.q);
  const fkResult = useRobotStore((s) => s.fkResult);
  const jacobian = useRobotStore((s) => s.jacobian);
  const ikResult = useRobotStore((s) => s.ikResult);
  const targetPose = useRobotStore((s) => s.targetPose);
  const viewOptions = useRobotStore((s) => s.viewOptions);
  const workspacePoints = useRobotStore((s) => s.workspacePoints);
  const toggleViewOption = useRobotStore((s) => s.toggleViewOption);
  const setCameraView = useRobotStore((s) => s.setCameraView);
  const loadError = useRobotStore((s) => s.loadError);
  const clearLoadError = useRobotStore((s) => s.clearLoadError);
  const selectRobot = useRobotStore((s) => s.selectRobot);

  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      try {
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
      } catch (err) {
        if (!active) return;
        setLoadingStep(null);
        useRobotStore.setState({
          loadError: `Failed to load robot visual meshes: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
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
      sceneRef.current.setTargetVisibility(viewOptions.showTargetGizmo);
    }
  }, [
    viewOptions.showFrames,
    viewOptions.showMeshes,
    viewOptions.showTrace,
    viewOptions.showTargetGizmo,
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
    let wasPlaying = false;

    const loop = (now: number) => {
      const store = useRobotStore.getState();
      const isPlaying = store.playback.isPlaying && !!store.activeTrajectory;

      // When playback transitions from false to true, reset lastTime to avoid huge dt
      if (isPlaying && !wasPlaying) {
        lastTime = now;
      }
      wasPlaying = isPlaying;

      const rawDt = (now - lastTime) / 1000;
      // Clamp dt to 50ms maximum to prevent skipping trajectory on lag spikes or tab focus changes
      const dt = Math.min(0.05, Math.max(0, rawDt));
      lastTime = now;

      if (isPlaying) {
        const traj = store.activeTrajectory!;
        let nextTime = store.playback.currentTime + dt * store.playback.speed;
        if (nextTime >= traj.duration) {
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
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 max-w-[calc(100vw-32px)]">
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xl px-3 py-1.5 rounded-2xl border-2 border-stone-300/80 shadow-md text-xs text-black">
          {/* Camera Views Selector */}
          <div className="flex items-center gap-1 pr-2 border-r border-stone-200">
            <Camera className="w-3.5 h-3.5 text-black shrink-0" />
            <button
              onClick={() => setCameraView('home')}
              aria-label="Camera Home"
              className={`px-2.5 py-1 min-h-[32px] rounded-xl font-black transition-all cursor-pointer ${
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
              className={`px-2.5 py-1 min-h-[32px] rounded-xl font-black transition-all cursor-pointer ${
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
              className={`hidden sm:inline-block px-2.5 py-1 min-h-[32px] rounded-xl font-black transition-all cursor-pointer ${
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
              className={`hidden sm:inline-block px-2.5 py-1 min-h-[32px] rounded-xl font-black transition-all cursor-pointer ${
                viewOptions.cameraView === 'isometric'
                  ? 'bg-black text-white shadow-xs'
                  : 'hover:bg-stone-100 text-black'
              }`}
            >
              Iso
            </button>

            {/* Extended Camera Dropdown - Desktop */}
            <select
              value={viewOptions.cameraView}
              onChange={(e) => setCameraView(e.target.value as CameraViewPreset)}
              aria-label="Extended Camera Views"
              className="hidden lg:inline-block bg-stone-100 border border-stone-300 text-black text-xs rounded-xl px-2 py-1 font-black focus:outline-none focus:border-black cursor-pointer"
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
              className="p-1 min-h-[32px] min-w-[32px] flex items-center justify-center hover:bg-stone-100 text-black rounded-lg transition-colors ml-0.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Desktop Full Visibility Toggles */}
          <div className="hidden md:flex items-center gap-1 pl-1">
            <button
              onClick={() => toggleViewOption('showFrames')}
              title="Toggle Coordinate Frames"
              aria-label="Toggle Coordinate Frames"
              aria-pressed={viewOptions.showFrames}
              className={`flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-xl font-black transition-all cursor-pointer ${
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
              aria-pressed={viewOptions.showMeshes}
              className={`flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-xl font-black transition-all cursor-pointer ${
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
              aria-pressed={viewOptions.showTrace}
              className={`flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-xl font-black transition-all cursor-pointer ${
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
              aria-pressed={viewOptions.showTargetGizmo}
              className={`flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-xl font-black transition-all cursor-pointer ${
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
              aria-pressed={viewOptions.showDebug}
              className={`flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-xl font-black transition-all cursor-pointer ${
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
              className="p-1 min-h-[32px] min-w-[32px] flex items-center justify-center hover:bg-rose-100 text-black rounded-lg transition-colors ml-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-700" />
            </button>
          </div>

          {/* Mobile Collapsible View ▾ Button */}
          <div className="md:hidden flex items-center pl-1">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle View Options Menu"
              aria-expanded={mobileMenuOpen}
              className={`flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-xl font-black transition-all cursor-pointer ${
                mobileMenuOpen
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-black'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>View ▾</span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Popover Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-2 border-stone-300/90 rounded-2xl p-2.5 shadow-xl space-y-2 text-xs text-black animate-in fade-in duration-100">
            <div className="text-[11px] font-black uppercase text-stone-500 tracking-wider px-1">
              Display & Layers
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => toggleViewOption('showFrames')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black transition-all cursor-pointer ${
                  viewOptions.showFrames
                    ? 'bg-emerald-100 text-black border border-emerald-300'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Frames
              </button>
              <button
                onClick={() => toggleViewOption('showMeshes')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black transition-all cursor-pointer ${
                  viewOptions.showMeshes
                    ? 'bg-orange-100 text-black border border-orange-300'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Meshes
              </button>
              <button
                onClick={() => toggleViewOption('showTrace')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black transition-all cursor-pointer ${
                  viewOptions.showTrace
                    ? 'bg-amber-100 text-black border border-amber-300'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Trace
              </button>
              <button
                onClick={() => toggleViewOption('showTargetGizmo')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black transition-all cursor-pointer ${
                  viewOptions.showTargetGizmo
                    ? 'bg-rose-100 text-black border border-rose-300'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                Target
              </button>
              <button
                onClick={() => toggleViewOption('showDebug')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black transition-all cursor-pointer ${
                  viewOptions.showDebug
                    ? 'bg-purple-100 text-black border border-purple-300'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Debug
              </button>
              <button
                onClick={handleClearTrace}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Trace
              </button>
            </div>
            <div className="pt-1.5 border-t border-stone-200">
              <label htmlFor="mobile-camera-select" className="text-[10px] font-black uppercase text-stone-500 tracking-wider px-1 block mb-1">
                Camera Angle
              </label>
              <select
                id="mobile-camera-select"
                value={viewOptions.cameraView}
                onChange={(e) => {
                  setCameraView(e.target.value as CameraViewPreset);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-stone-100 border border-stone-300 text-black text-xs rounded-xl px-2.5 py-1.5 font-black focus:outline-none focus:border-black cursor-pointer"
              >
                {CAMERA_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
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

      {/* Robot Loading Error Banner */}
      {loadError && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-md w-[90%] bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 shadow-xl text-rose-950 flex flex-col gap-2"
        >
          <div className="flex items-start gap-2.5">
            <span className="text-rose-600 font-bold text-lg leading-none mt-0.5">⚠️</span>
            <div className="flex-1 text-xs">
              <div className="font-black text-rose-900">Robot Model Load Error</div>
              <p className="mt-0.5 text-rose-800 leading-relaxed">{loadError}</p>
            </div>
            <button
              onClick={clearLoadError}
              aria-label="Dismiss error"
              className="p-1 rounded-lg hover:bg-rose-200 text-rose-800 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-rose-200">
            <button
              onClick={() => {
                clearLoadError();
                selectRobot(robot.id);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              Retry Loading
            </button>
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
