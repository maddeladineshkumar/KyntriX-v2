import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { RobotDefinition, FKResult } from '../../data/schema/robotSchema';
import { ProceduralSkeleton } from '../../simulation/ProceduralSkeleton';
import { CoordinateFramesManager } from '../../simulation/CoordinateFrames';
import { EndEffectorTrace } from '../../simulation/EndEffectorTrace';
import {
  Camera,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Target,
} from 'lucide-react';
import { RAD_TO_DEG, DEG_TO_RAD } from '../../robotics/math/constants';

interface DHSimulation3DViewProps {
  robot: RobotDefinition;
  fk: FKResult;
  q?: number[];
  targetPoint?: { x: number; y: number; z: number } | null;
  className?: string;
  height?: string;
  useSI?: boolean;
  onJointChange?: (jointIndex: number, value: number) => void;
  onResetHome?: () => void;
  onZeroAll?: () => void;
  isSweeping?: boolean;
  onToggleSweep?: () => void;
  sweepSpeed?: number;
  onSweepSpeedChange?: (speed: number) => void;
  sweepMode?: 'sequential' | 'harmonic' | 'single' | 'breathing';
  onSweepModeChange?: (mode: 'sequential' | 'harmonic' | 'single' | 'breathing') => void;
  sweepAmplitude?: number;
  onSweepAmplitudeChange?: (amp: number) => void;
  activeSweepJointIdx?: number | null;
  focusJointIdx?: number;
  onFocusJointIdxChange?: (idx: number) => void;
  activeJogStepDeg?: number;
  activeJogStepMm?: number;
  onJogStepDegChange?: (step: number) => void;
  onJogStepMmChange?: (step: number) => void;
  traceResetKey?: string | number;
  onClearTrace?: () => void;
}

let cachedWebGLSupport: boolean | null = null;

function checkWebGLSupport(): boolean {
  if (cachedWebGLSupport !== null) return cachedWebGLSupport;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    cachedWebGLSupport = false;
    return false;
  }
  // Check WebGL availability without allocating a throwaway WebGL context that wastes browser quota
  cachedWebGLSupport = !!window.WebGLRenderingContext;
  return cachedWebGLSupport;
}

export const DHSimulation3DView: React.FC<DHSimulation3DViewProps> = ({
  robot,
  fk,
  q,
  targetPoint = null,
  className = '',
  height = '360px',
  useSI = false,
  onJointChange,
  onResetHome,
  onZeroAll,
  isSweeping = false,
  onToggleSweep,
  sweepSpeed = 0.25,
  onSweepSpeedChange,
  sweepMode = 'sequential',
  onSweepModeChange,
  sweepAmplitude = 0.30,
  onSweepAmplitudeChange,
  activeSweepJointIdx = null,
  focusJointIdx = 0,
  onFocusJointIdxChange,
  activeJogStepDeg = 5,
  activeJogStepMm = 10,
  onJogStepDegChange,
  onJogStepMmChange,
  traceResetKey,
  onClearTrace,
}) => {
  const isWebGLSupported = checkWebGLSupport();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const skeletonRef = useRef<ProceduralSkeleton | null>(null);
  const framesRef = useRef<CoordinateFramesManager | null>(null);
  const traceRef = useRef<EndEffectorTrace | null>(null);
  const targetMeshRef = useRef<THREE.Mesh | null>(null);

  const prevRobotRef = useRef<RobotDefinition>(robot);
  const prevRobotIdRef = useRef<string>(robot.id);
  const prevDofRef = useRef<number>(robot.dof);
  const prevSweepingRef = useRef<boolean>(isSweeping);
  const prevTraceResetKeyRef = useRef<string | number | undefined>(traceResetKey);

  const [showFrames, setShowFrames] = useState(true);
  const [showTrace, setShowTrace] = useState(true);
  const animFrameIdRef = useRef<number | null>(null);

  // In-viewport joint actuator state
  const [selectedJointIdx, setSelectedJointIdx] = useState(0);
  const [isActuatorExpanded, setIsActuatorExpanded] = useState(false);
  const [customStepInput, setCustomStepInput] = useState('');

  const clampedJointIdx = Math.min(selectedJointIdx, Math.max(0, robot.joints.length - 1));
  const activeJoint = robot.joints[clampedJointIdx];
  const isRev = activeJoint ? activeJoint.type === 'revolute' : true;
  const currentJointVal = q ? (q[clampedJointIdx] ?? 0) : 0;

  // Step presets
  const revStepPresets = [1, 2, 3, 4, 5, 10, 15, 30, 45];
  const prisStepPresets = [1, 5, 10, 25, 50, 100];

  const handleJog = (direction: -1 | 1) => {
    if (!onJointChange || !q || !activeJoint) return;
    const step = isRev
      ? (activeJogStepDeg * DEG_TO_RAD)
      : (activeJogStepMm / 1000);
    const nextQ = Math.max(activeJoint.min, Math.min(activeJoint.max, currentJointVal + direction * step));
    onJointChange(clampedJointIdx, nextQ);
  };

  const handleCustomStepChange = (raw: string) => {
    setCustomStepInput(raw);
    const num = parseFloat(raw);
    if (Number.isFinite(num) && num > 0) {
      if (isRev && onJogStepDegChange) {
        onJogStepDegChange(num);
      } else if (!isRev && onJogStepMmChange) {
        onJogStepMmChange(num);
      }
    }
  };

  // 1. Scene Setup
  useEffect(() => {
    if (!isWebGLSupported || !containerRef.current) return;
    const container = containerRef.current;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      console.warn('DHSimulation3DView: WebGLRenderer init failed', err);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f3ea); // warm CAD studio ivory
    sceneRef.current = scene;

    const width = container.clientWidth || 400;
    const heightPx = container.clientHeight || 360;

    // Robotics coordinate convention: Z is UP!
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.05, 50);
    camera.up.set(0, 0, 1);
    camera.position.set(1.4, -1.8, 1.2);
    cameraRef.current = camera;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, heightPx);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.outline = 'none';
    renderer.domElement.style.userSelect = 'none';
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // WebGL Context loss & recovery event handling
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('DHSimulation3DView: WebGL context lost.');
    };
    const handleContextRestored = () => {
      console.info('DHSimulation3DView: WebGL context restored.');
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0.3);
    controlsRef.current = controls;

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xf5eedc, 0.95);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 1.3);
    dirLight1.position.set(3, -4, 5);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xe8dcc4, 0.6);
    dirLight2.position.set(-3, 3, 2);
    scene.add(dirLight2);

    // Grid Floor (XY plane in Z-up convention)
    const gridHelper = new THREE.GridHelper(3, 30, 0x8c8270, 0xdcd4c4);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = 0;
    scene.add(gridHelper);

    // Visual elements
    const skeleton = new ProceduralSkeleton();
    scene.add(skeleton);
    skeletonRef.current = skeleton;

    const frames = new CoordinateFramesManager();
    scene.add(frames);
    framesRef.current = frames;

    const trace = new EndEffectorTrace(2000);
    scene.add(trace);
    traceRef.current = trace;

    // Target marker sphere
    const targetGeom = new THREE.SphereGeometry(0.02, 16, 16);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });
    const targetMesh = new THREE.Mesh(targetGeom, targetMat);
    targetMesh.visible = false;
    scene.add(targetMesh);
    targetMeshRef.current = targetMesh;

    // Render loop with exception safety
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      try {
        controls.update();
        renderer.render(scene, camera);
      } catch (err) {
        console.error('DHSimulation3DView render error:', err);
      }
    };
    animate();

    // Resize Observer with change-detection guard (prevents blank canvas buffer resets)
    let lastW = Math.round(width);
    let lastH = Math.round(heightPx);
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0 && (Math.abs(w - lastW) >= 2 || Math.abs(h - lastH) >= 2)) {
          lastW = w;
          lastH = h;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
          try {
            renderer.render(scene, camera);
          } catch {}
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      skeleton.dispose();
      frames.dispose();
      targetGeom.dispose();
      targetMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isWebGLSupported]);

  // Sync external reset key changes (e.g. from parent DHTableStudio resets/preset change/edits)
  useEffect(() => {
    if (prevTraceResetKeyRef.current !== traceResetKey) {
      prevTraceResetKeyRef.current = traceResetKey;
      if (traceRef.current) {
        traceRef.current.resetTrail();
        if (fk && showTrace) {
          const eePos = fk.endEffectorTransform.getPosition();
          traceRef.current.addPoint(eePos);
        }
      }
    }
  }, [traceResetKey, fk, showTrace]);

  // Cleanly clear trace whenever starting a new continuous sweep session (false -> true)
  useEffect(() => {
    if (!prevSweepingRef.current && isSweeping) {
      if (traceRef.current) {
        traceRef.current.resetTrail();
        if (fk && showTrace) {
          const eePos = fk.endEffectorTransform.getPosition();
          traceRef.current.addPoint(eePos);
        }
      }
    }
    prevSweepingRef.current = isSweeping;
  }, [isSweeping, fk, showTrace]);

  // 2. Update Pose
  useEffect(() => {
    if (!fk || !robot) return;

    // Guard: switching robots or modifying kinematic architecture must reset end-effector trace
    if (
      prevRobotRef.current !== robot ||
      prevRobotIdRef.current !== robot.id ||
      prevDofRef.current !== robot.dof
    ) {
      prevRobotRef.current = robot;
      prevRobotIdRef.current = robot.id;
      prevDofRef.current = robot.dof;
      if (traceRef.current) {
        traceRef.current.resetTrail();
      }
    }

    if (skeletonRef.current) {
      skeletonRef.current.updateSkeleton(fk);
    }
    if (framesRef.current) {
      framesRef.current.updateFrames(fk.frames);
    }
    if (traceRef.current && showTrace) {
      const eePos = fk.endEffectorTransform.getPosition();
      traceRef.current.addPoint(eePos);
    }
  }, [fk, robot, showTrace]);

  // 3. Update Frames visibility
  useEffect(() => {
    if (framesRef.current) {
      framesRef.current.visible = showFrames;
    }
  }, [showFrames]);

  // 4. Update Trace visibility
  useEffect(() => {
    if (traceRef.current) {
      traceRef.current.visible = showTrace;
    }
  }, [showTrace]);

  // 5. Update Target Point marker
  useEffect(() => {
    if (targetMeshRef.current) {
      if (targetPoint && Number.isFinite(targetPoint.x) && Number.isFinite(targetPoint.y) && Number.isFinite(targetPoint.z)) {
        targetMeshRef.current.position.set(targetPoint.x, targetPoint.y, targetPoint.z);
        targetMeshRef.current.visible = true;
      } else {
        targetMeshRef.current.visible = false;
      }
    }
  }, [targetPoint]);

  // Camera presets
  const handleSetCamera = (view: 'home' | 'top' | 'front' | 'side' | 'iso') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const dist = 2.0;

    switch (view) {
      case 'home':
        cam.position.set(1.4, -1.8, 1.2);
        cam.up.set(0, 0, 1);
        ctrl.target.set(0, 0, 0.3);
        break;
      case 'top':
        cam.position.set(0, 0, dist * 1.2);
        cam.up.set(0, 1, 0);
        ctrl.target.set(0, 0, 0.1);
        break;
      case 'front':
        cam.position.set(0, -dist, 0.3);
        cam.up.set(0, 0, 1);
        ctrl.target.set(0, 0, 0.3);
        break;
      case 'side':
        cam.position.set(dist, 0, 0.3);
        cam.up.set(0, 0, 1);
        ctrl.target.set(0, 0, 0.3);
        break;
      case 'iso':
        cam.position.set(1.5, -1.5, 1.3);
        cam.up.set(0, 0, 1);
        ctrl.target.set(0, 0, 0.3);
        break;
    }
    ctrl.update();
  };

  const handleClearTrace = () => {
    if (traceRef.current) {
      traceRef.current.resetTrail();
    }
    if (onClearTrace) {
      onClearTrace();
    }
  };

  const handleZeroAllWithTrace = () => {
    if (traceRef.current) {
      traceRef.current.resetTrail();
    }
    if (onZeroAll) {
      onZeroAll();
    }
  };

  const handleResetHomeWithTrace = () => {
    if (traceRef.current) {
      traceRef.current.resetTrail();
    }
    if (onResetHome) {
      onResetHome();
    }
  };

  const handleToggleSweepWithTrace = () => {
    if (!isSweeping && traceRef.current) {
      traceRef.current.resetTrail();
    }
    if (onToggleSweep) {
      onToggleSweep();
    }
  };

  if (!isWebGLSupported) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-stone-300 bg-[#f6f3ea] ${className}`}
        style={{ height }}
      >
        <div className="p-3 bg-amber-100 border border-amber-300 rounded-2xl text-amber-900 mb-3">
          <Camera className="w-6 h-6" />
        </div>
        <span className="font-black text-sm text-stone-900 mb-1">
          3D Kinematic Chain Viewport
        </span>
        <p className="text-xs text-stone-600 max-w-md">
          WebGL acceleration is unavailable in this environment. Forward and Inverse Kinematics, Jacobian, Transformation Matrices, and DH table analysis remain active and fully accurate.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border-2 border-stone-300 bg-[#f6f3ea] shadow-inner select-none ${className}`}
      style={{ height }}
    >
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Controls Overlay */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-white/95 px-2.5 py-1.5 rounded-xl border border-stone-300 shadow-md text-xs font-black">
        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-bold mr-1">3D Chain</span>
        <button
          onClick={() => setShowFrames((prev) => !prev)}
          title="Toggle Coordinate Frame Triads"
          aria-label="Toggle Coordinate Frames"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
            showFrames ? 'bg-amber-100 text-black border-amber-300' : 'bg-stone-100 text-stone-500 border-stone-200'
          }`}
        >
          {showFrames ? <Eye className="w-3 h-3 text-amber-700" /> : <EyeOff className="w-3 h-3" />}
          <span>Frames</span>
        </button>
        <button
          onClick={() => setShowTrace((prev) => !prev)}
          title="Toggle End-Effector Motion Trace"
          aria-label="Toggle End-Effector Trace"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
            showTrace ? 'bg-cyan-100 text-black border-cyan-300' : 'bg-stone-100 text-stone-500 border-stone-200'
          }`}
        >
          <span>Trace</span>
        </button>
        <button
          onClick={handleClearTrace}
          title="Clear Trace Trail"
          aria-label="Clear Trace"
          className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-all cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Camera View Selector Overlay */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/95 p-1 rounded-xl border border-stone-300 shadow-md text-[10px] font-black">
        <Camera className="w-3.5 h-3.5 text-stone-600 ml-1.5 mr-0.5" />
        <button
          onClick={() => handleSetCamera('home')}
          className="px-1.5 py-0.5 rounded hover:bg-stone-200 text-stone-700 cursor-pointer"
        >
          Home
        </button>
        <button
          onClick={() => handleSetCamera('top')}
          className="px-1.5 py-0.5 rounded hover:bg-stone-200 text-stone-700 cursor-pointer"
        >
          Top
        </button>
        <button
          onClick={() => handleSetCamera('front')}
          className="px-1.5 py-0.5 rounded hover:bg-stone-200 text-stone-700 cursor-pointer"
        >
          Front
        </button>
        <button
          onClick={() => handleSetCamera('side')}
          className="px-1.5 py-0.5 rounded hover:bg-stone-200 text-stone-700 cursor-pointer"
        >
          Side
        </button>
        <button
          onClick={() => handleSetCamera('iso')}
          className="px-1.5 py-0.5 rounded hover:bg-stone-200 text-stone-700 cursor-pointer"
        >
          Iso
        </button>
      </div>

      {/* Real-Time End-Effector HUD Badge */}
      {fk && (
        <div className="absolute top-11 right-2.5 bg-white/95 px-2.5 py-1.5 rounded-xl border border-stone-300 shadow-md text-[10px] font-mono pointer-events-none">
          <div className="flex items-center gap-1 text-stone-600 font-bold mb-0.5">
            <Target className="w-3 h-3 text-amber-600" />
            <span className="font-sans font-black uppercase text-stone-800">EE Coordinate</span>
          </div>
          <div className="text-black font-black">
            {useSI ? (
              <span>
                [{fk.endEffectorTransform.getPosition().x.toFixed(3)}, {fk.endEffectorTransform.getPosition().y.toFixed(3)}, {fk.endEffectorTransform.getPosition().z.toFixed(3)}] m
              </span>
            ) : (
              <span>
                [{(fk.endEffectorTransform.getPosition().x * 1000).toFixed(1)}, {(fk.endEffectorTransform.getPosition().y * 1000).toFixed(1)}, {(fk.endEffectorTransform.getPosition().z * 1000).toFixed(1)}] mm
              </span>
            )}
          </div>
        </div>
      )}

      {/* Floating 3D Viewport Joint Actuator & Jogger Panel */}
      {onJointChange && q && activeJoint && (
        <div className="absolute bottom-2.5 left-2.5 z-10 max-w-[92%] sm:max-w-md bg-white/98 border-2 border-stone-300 rounded-2xl shadow-xl p-2.5 text-xs text-black transition-all">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 whitespace-nowrap">
                3D Jogger
              </span>
              {robot.joints.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedJointIdx(idx)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border transition-all cursor-pointer whitespace-nowrap ${
                    clampedJointIdx === idx
                      ? 'bg-amber-400 text-black border-amber-500 shadow-2xs font-black'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                  }`}
                >
                  J{idx + 1}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Collapsed Fast Jog Buttons */}
              {!isActuatorExpanded && (
                <div className="flex items-center gap-1 bg-stone-100 px-1 py-0.5 rounded-lg border border-stone-300">
                  <button
                    onClick={() => handleJog(-1)}
                    title={`Jog J${clampedJointIdx + 1} -${isRev ? activeJogStepDeg + '°' : activeJogStepMm + 'mm'}`}
                    className="p-0.5 rounded hover:bg-stone-200 text-black font-black cursor-pointer active:scale-95"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] font-mono font-black text-black px-1">
                    {isRev
                      ? (useSI ? currentJointVal.toFixed(2) + ' rad' : (currentJointVal * RAD_TO_DEG).toFixed(1) + '°')
                      : (useSI ? currentJointVal.toFixed(3) + ' m' : (currentJointVal * 1000).toFixed(0) + ' mm')}
                  </span>
                  <button
                    onClick={() => handleJog(1)}
                    title={`Jog J${clampedJointIdx + 1} +${isRev ? activeJogStepDeg + '°' : activeJogStepMm + 'mm'}`}
                    className="p-0.5 rounded hover:bg-stone-200 text-black font-black cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsActuatorExpanded((prev) => !prev)}
                title={isActuatorExpanded ? 'Collapse Jogger Panel' : 'Expand Full Jogger Panel'}
                className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              >
                {isActuatorExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Expanded Jogger Body */}
          {isActuatorExpanded && (
            <div className="space-y-2 mt-2 pt-2 border-t border-stone-200">
              {/* Joint Details & Angle */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-stone-800">
                  J{clampedJointIdx + 1}: {activeJoint.name}
                </span>
                <span className="font-mono font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  {isRev
                    ? `${(currentJointVal * RAD_TO_DEG).toFixed(1)}° (${currentJointVal.toFixed(3)} rad)`
                    : `${(currentJointVal * 1000).toFixed(1)} mm (${currentJointVal.toFixed(3)} m)`}
                </span>
              </div>

              {/* Step Increments Selector */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-stone-600 font-bold">
                  <span>Jog Step Increment:</span>
                  <span className="font-mono text-amber-800 font-black">
                    Current: {isRev ? `${activeJogStepDeg}°` : `${activeJogStepMm} mm`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {(isRev ? revStepPresets : prisStepPresets).map((stepVal) => {
                    const isSelected = isRev ? activeJogStepDeg === stepVal : activeJogStepMm === stepVal;
                    return (
                      <button
                        key={stepVal}
                        onClick={() => {
                          if (isRev && onJogStepDegChange) onJogStepDegChange(stepVal);
                          if (!isRev && onJogStepMmChange) onJogStepMmChange(stepVal);
                          setCustomStepInput('');
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-black border-amber-500 shadow-2xs font-black'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                        }`}
                      >
                        {stepVal}{isRev ? '°' : 'mm'}
                      </button>
                    );
                  })}
                  <div className="flex items-center gap-0.5 bg-stone-100 px-1 py-0.5 rounded border border-stone-300 text-[10px]">
                    <span className="text-stone-500 font-mono">Custom:</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customStepInput}
                      placeholder={isRev ? 'e.g. 3' : 'e.g. 5'}
                      onChange={(e) => handleCustomStepChange(e.target.value)}
                      className="w-10 px-1 py-0.2 text-right font-mono text-[10px] font-bold rounded border border-stone-300 bg-white"
                    />
                    <span className="text-stone-600 font-mono">{isRev ? '°' : 'mm'}</span>
                  </div>
                </div>
              </div>

              {/* Tactile Jog Controls & Slider */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={() => handleJog(-1)}
                  title={`Decrease joint by ${isRev ? activeJogStepDeg + '°' : activeJogStepMm + ' mm'}`}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-black border border-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>-{isRev ? `${activeJogStepDeg}°` : `${activeJogStepMm}mm`}</span>
                </button>

                <input
                  type="range"
                  min={activeJoint.min}
                  max={activeJoint.max}
                  step={isRev ? 0.005 : 0.002}
                  value={currentJointVal}
                  onChange={(e) => {
                    onJointChange(clampedJointIdx, parseFloat(e.target.value));
                  }}
                  aria-label={`Viewport Joint ${clampedJointIdx + 1} slider`}
                  className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-stone-200 rounded-lg"
                />

                <button
                  onClick={() => handleJog(1)}
                  title={`Increase joint by ${isRev ? activeJogStepDeg + '°' : activeJogStepMm + ' mm'}`}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-black border border-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+{isRev ? `${activeJogStepDeg}°` : `${activeJogStepMm}mm`}</span>
                </button>
              </div>

              {/* Quick Actions Row */}
              <div className="flex items-center justify-between gap-1.5 pt-1 text-[10px]">
                <div className="flex items-center gap-1">
                  {onZeroAll && (
                    <button
                      onClick={handleZeroAllWithTrace}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded font-black cursor-pointer active:scale-95"
                    >
                      0° Zero
                    </button>
                  )}
                  {onResetHome && (
                    <button
                      onClick={handleResetHomeWithTrace}
                      className="flex items-center gap-1 px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded font-black cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Home</span>
                    </button>
                  )}
                </div>

                {onToggleSweep && (
                  <div className="flex items-center gap-1.5 bg-white/95 p-1 rounded-xl border border-stone-300 shadow-xs flex-wrap">
                    <button
                      onClick={handleToggleSweepWithTrace}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-[11px] transition-all cursor-pointer active:scale-95 ${
                        isSweeping
                          ? 'bg-rose-500 text-white border border-rose-600 animate-pulse'
                          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300'
                      }`}
                    >
                      {isSweeping ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isSweeping ? 'Pause' : 'Sweep'}</span>
                    </button>

                    {onSweepSpeedChange && (
                      <select
                        value={sweepSpeed}
                        onChange={(e) => onSweepSpeedChange(parseFloat(e.target.value))}
                        aria-label="Sweep speed"
                        className="bg-stone-100 hover:bg-stone-200 text-black text-[10px] font-mono font-bold px-1.5 py-1 rounded-lg border border-stone-300 cursor-pointer"
                      >
                        <option value="0.1">0.10x Inspect</option>
                        <option value="0.25">0.25x Slow Edu</option>
                        <option value="0.5">0.50x Gentle</option>
                        <option value="1.0">1.00x Active</option>
                      </select>
                    )}

                    {onSweepModeChange && (
                      <select
                        value={sweepMode}
                        onChange={(e) => onSweepModeChange(e.target.value as 'sequential' | 'harmonic' | 'single' | 'breathing')}
                        aria-label="Sweep mode"
                        className="bg-stone-100 hover:bg-stone-200 text-black text-[10px] font-bold px-1.5 py-1 rounded-lg border border-stone-300 cursor-pointer"
                      >
                        <option value="sequential">🔢 Sequential</option>
                        <option value="harmonic">🌊 Harmonic</option>
                        <option value="single">🎯 Single Joint</option>
                        <option value="breathing">🫁 Breathing</option>
                      </select>
                    )}

                    {onSweepAmplitudeChange && (
                      <select
                        value={sweepAmplitude}
                        onChange={(e) => onSweepAmplitudeChange(parseFloat(e.target.value))}
                        aria-label="Sweep amplitude"
                        className="bg-stone-100 hover:bg-stone-200 text-black text-[10px] font-bold px-1.5 py-1 rounded-lg border border-stone-300 cursor-pointer"
                      >
                        <option value="0.2">20% Subtle</option>
                        <option value="0.3">30% Safe</option>
                        <option value="0.45">45% Wide</option>
                      </select>
                    )}

                    {sweepMode === 'single' && onFocusJointIdxChange && (
                      <select
                        value={focusJointIdx}
                        onChange={(e) => onFocusJointIdxChange(parseInt(e.target.value, 10))}
                        aria-label="Focus joint"
                        className="bg-amber-100 text-amber-950 text-[10px] font-mono font-black px-1.5 py-1 rounded-lg border border-amber-300 cursor-pointer"
                      >
                        {robot.joints.map((j, i) => (
                          <option key={j.id || i} value={i}>
                            J{i + 1} ({j.name})
                          </option>
                        ))}
                      </select>
                    )}

                    {isSweeping && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-100/90 border border-amber-300 text-[10px] font-mono font-bold text-amber-950">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        <span>
                          {sweepMode === 'sequential' && activeSweepJointIdx !== null
                            ? `J${activeSweepJointIdx + 1} (${robot.joints[activeSweepJointIdx]?.name || ''})`
                            : sweepMode === 'single'
                            ? `J${focusJointIdx + 1} Focus`
                            : sweepMode === 'harmonic'
                            ? 'Harmonic'
                            : 'Breathing'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-2 right-3 text-[10px] text-stone-500 font-mono pointer-events-none hidden sm:block">
        Left-click to Rotate • Right-click to Pan • Scroll to Zoom
      </div>
    </div>
  );
};
