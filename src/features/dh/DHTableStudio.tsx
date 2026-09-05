import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRobotStore } from '../../state/robotStore';
import type { JointDefinition, JointType, LinkDefinition, RobotDefinition } from '../../data/schema/robotSchema';
import {
  Info,
  Copy,
  Check,
  FileSpreadsheet,
  Code,
  FileText,
  Plus,
  Trash2,
  ArrowUpDown,
  Sliders,
  Crosshair,
  Play,
  Pause,
  RotateCcw,
  Shuffle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  BookOpen,
} from 'lucide-react';
import { RAD_TO_DEG, DEG_TO_RAD } from '../../robotics/math/constants';
import {
  computeDHAnalysis,
  solveDHInverseKinematics,
  exportDHToCSV,
  exportDHToLaTeX,
  exportDHToJSON,
  exportDHToMarkdown,
  parseDHFromJSON,
  DH_PRESETS,
  createRobotFromPreset,
  type DHAnalysisResult,
} from '../../robotics/dh/dhAnalysis';
import { DHSimulation3DView } from './DHSimulation3DView';
import { processContinuousSweepShortcut } from './continuousSweepShortcuts';
import type { IKSingleSolution } from '../../robotics/ik/types';

type EditableField = 'theta' | 'd' | 'a' | 'alpha' | 'offset' | 'min' | 'max';
type StudioSubTab = 'table' | 'simulation3d' | 'pose' | 'matrices' | 'jacobian' | 'ik';

export const DHTableStudio: React.FC = () => {
  const {
    robot,
    q,
    jacobian,
    setRobot,
    setJointValue,
    setJoints,
    resetToHome,
  } = useRobotStore();

  const [useSI, setUseSI] = useState(false); // Default to RoboAnalyzer deg/mm display
  const [activeSubTab, setActiveSubTab] = useState<StudioSubTab>('table');
  const [copiedType, setCopiedType] = useState<'csv' | 'latex' | 'json' | 'md' | 'matrix' | null>(null);

  // Draft inputs and error tracking for DH parameter table: key is `${jointIndex}_${field}`
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
  const [cellErrors, setCellErrors] = useState<Record<string, boolean>>({});
  const cancelledKeysRef = useRef<Set<string>>(new Set());

  // Continuous sweep simulation state & smooth control configuration
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepSpeed, setSweepSpeed] = useState<number>(0.25); // Default to calm, slow 0.25x educational speed
  const [sweepMode, setSweepMode] = useState<'sequential' | 'harmonic' | 'single' | 'breathing'>('sequential'); // Default to sequential for DH inspection!
  const [sweepAmplitude, setSweepAmplitude] = useState<number>(0.30); // Safe 30% span (guaranteed zero clamping)
  const [activeSweepJointIdx, setActiveSweepJointIdx] = useState<number | null>(null);
  const [focusJointIdx, setFocusJointIdx] = useState<number>(0);
  const [traceResetKey, setTraceResetKey] = useState<number>(0);

  // Mutable refs to decouple animation loop from React render cycles and avoid GC pressure
  const sweepSpeedRef = useRef(sweepSpeed);
  const sweepModeRef = useRef(sweepMode);
  const sweepAmplitudeRef = useRef(sweepAmplitude);
  const focusJointIdxRef = useRef(focusJointIdx);
  const activeSweepJointIdxRef = useRef<number | null>(activeSweepJointIdx);

  useEffect(() => {
    sweepSpeedRef.current = sweepSpeed;
    sweepModeRef.current = sweepMode;
    sweepAmplitudeRef.current = sweepAmplitude;
    focusJointIdxRef.current = focusJointIdx;
    activeSweepJointIdxRef.current = activeSweepJointIdx;
  }, [sweepSpeed, sweepMode, sweepAmplitude, focusJointIdx, activeSweepJointIdx]);

  // Cleanly reset sweep & trace if active robot changes or DOF changes (idiomatic React render-time state adjustment)
  const [prevRobotId, setPrevRobotId] = useState(robot.id);
  const [prevRobotDof, setPrevRobotDof] = useState(robot.dof);
  if (prevRobotId !== robot.id || prevRobotDof !== robot.dof) {
    setPrevRobotId(robot.id);
    setPrevRobotDof(robot.dof);
    setIsSweeping(false);
    setActiveSweepJointIdx(null);
    setFocusJointIdx((prev) => Math.min(prev, Math.max(0, robot.joints.length - 1)));
    setTraceResetKey((k) => k + 1);
  }

  const lastToggleTimeRef = useRef<number>(0);
  const sweepAnimRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const lastDispatchTimeRef = useRef<number>(0);
  const startPoseRef = useRef<number[]>([]);
  const rampProgressRef = useRef<number>(1);

  // Selected transformation matrix frame index for Matrices tab
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number>(robot.dof);

  // Custom user target override for Inverse Kinematics tab (null means default to current EE)
  const [customIKTarget, setCustomIKTarget] = useState<{
    x: number;
    y: number;
    z: number;
    roll: number;
    pitch: number;
    yaw: number;
  } | null>(null);

  // Local string drafts for IK target inputs to allow typing '-', decimals, etc.
  const [ikTargetDrafts, setIkTargetDrafts] = useState<{
    x?: string;
    y?: string;
    z?: string;
    roll?: string;
    pitch?: string;
    yaw?: string;
  }>({});

  // Local string drafts for Joint Jogger numeric inputs
  const [jointDrafts, setJointDrafts] = useState<Record<number, string>>({});

  // Configurable Jog Step State (degrees for revolute, mm for prismatic)
  const [jogStepDeg, setJogStepDeg] = useState<number>(5);
  const [jogStepMm, setJogStepMm] = useState<number>(10);
  const [customJogInput, setCustomJogInput] = useState<string>('');

  const revStepPresets = [1, 2, 3, 4, 5, 10, 15, 30, 45];
  const prisStepPresets = [1, 5, 10, 25, 50, 100];

  const handleJogJoint = (jointIdx: number, direction: -1 | 1) => {
    setIsSweeping(false);
    const joint = robot.joints[jointIdx];
    if (!joint) return;
    const curQ = q[jointIdx] ?? 0;
    const step = joint.type === 'revolute'
      ? (jogStepDeg * DEG_TO_RAD)
      : (jogStepMm / 1000);
    const nextQ = Math.max(joint.min, Math.min(joint.max, curQ + direction * step));
    setJointValue(jointIdx, nextQ);
  };

  const handleCustomJogChange = (raw: string, isRevolute: boolean) => {
    setCustomJogInput(raw);
    const num = parseFloat(raw);
    if (Number.isFinite(num) && num > 0) {
      if (isRevolute) {
        setJogStepDeg(num);
      } else {
        setJogStepMm(num);
      }
    }
  };

  // Dynamic Inverse Kinematics Mode definition based on robot DOF
  const ikSolverMode = useMemo(() => {
    const dof = robot.dof;
    if (dof <= 1) {
      return {
        badge: '1-DOF Kinematic Curve Projection',
        description: 'Under-actuated (1-DOF): Solves for the closest reachable point on the 1D workspace curve minimizing Euclidean distance. Orientation is unconstrained.',
        canControlRoll: false,
        canControlPitch: false,
        canControlYaw: false,
      };
    } else if (dof === 2) {
      return {
        badge: '2-DOF Kinematic Surface Projection',
        description: 'Under-actuated (2-DOF): Solves for the orthogonal projection (closest point on the 2D surface manifold) to target position. Orientation is unconstrained.',
        canControlRoll: false,
        canControlPitch: false,
        canControlYaw: false,
      };
    } else if (dof === 3) {
      return {
        badge: '3-DOF Spatial Position Solver',
        description: 'Position-determined (3-DOF): Fully controls 3D Cartesian position [X, Y, Z]. 3 joints cannot independently constrain 3D orientation.',
        canControlRoll: false,
        canControlPitch: false,
        canControlYaw: false,
      };
    } else if (dof === 4) {
      return {
        badge: '4-DOF Position + Yaw Solver',
        description: '4-DOF Manipulator: Controls [X, Y, Z] position and Yaw (ψ rotation around Z). Roll and Pitch are unconstrained by the kinematic chain.',
        canControlRoll: false,
        canControlPitch: false,
        canControlYaw: true,
      };
    } else if (dof === 5) {
      return {
        badge: '5-DOF Position + Tool Vector Solver',
        description: '5-DOF Manipulator: Controls [X, Y, Z] position and Tool Approach Vector (Pitch & Yaw). Tool axial Roll is unconstrained.',
        canControlRoll: false,
        canControlPitch: true,
        canControlYaw: true,
      };
    } else if (dof === 6) {
      return {
        badge: 'Full 6-DOF SE(3) Spatial Solver',
        description: 'Fully-actuated (6-DOF): Controls complete 6-DOF pose [X, Y, Z, Roll, Pitch, Yaw]. Dispatches to analytical Pieper or DLS numerical solver.',
        canControlRoll: true,
        canControlPitch: true,
        canControlYaw: true,
      };
    } else {
      return {
        badge: '7-DOF+ Redundant Manipulator Solver',
        description: 'Redundant manipulator (n ≥ 7): Solves complete 6-DOF pose with active null-space joint limit avoidance and posture optimization.',
        canControlRoll: true,
        canControlPitch: true,
        canControlYaw: true,
      };
    }
  }, [robot.dof]);

  const [ikSolution, setIkSolution] = useState<IKSingleSolution | null>(null);
  const [ikResultStats, setIkResultStats] = useState<{
    converged: boolean;
    posErrorMm: number;
    oriErrorDeg: number;
    timeMs: number;
    branches: number;
  } | null>(null);
  const [ikSolving, setIkSolving] = useState(false);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStandard = robot.dhConvention === 'standard';

  // Compute authoritative full analysis for the current robot and joint angles
  // Reusing store jacobian directly avoids duplicate SVD iterations
  const analysis: DHAnalysisResult = useMemo(() => {
    return computeDHAnalysis(robot, q, jacobian);
  }, [robot, q, jacobian]);

  // Clamp selected frame index to valid range [0, robot.dof]
  const clampedFrameIdx = Math.min(selectedFrameIdx, robot.dof);

  // Continuous Sinusoidal Sweep Simulation Animation Loop (Smooth, Calm, Multi-mode, Paced)
  useEffect(() => {
    if (!isSweeping) {
      if (sweepAnimRef.current) {
        cancelAnimationFrame(sweepAnimRef.current);
        sweepAnimRef.current = null;
      }
      lastTimeRef.current = 0;
      return;
    }

    // Capture starting joint configuration for seamless ramp-in transition
    startPoseRef.current = [...useRobotStore.getState().q];
    rampProgressRef.current = 0;
    lastTimeRef.current = 0;
    lastDispatchTimeRef.current = 0;

    const sweepLoop = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }
      const dt = Math.min(0.08, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      // Advance continuous phase according to active speed multiplier
      const speed = sweepSpeedRef.current;
      phaseRef.current += dt * speed;
      const t = phaseRef.current;

      // Smooth ease-in ramp from the pose where sweep was triggered (0.8s ramp duration)
      if (rampProgressRef.current < 1) {
        rampProgressRef.current = Math.min(1, rampProgressRef.current + dt / 0.8);
      }
      const ramp = rampProgressRef.current;
      // Quintic smootherstep easing: 6r^5 - 15r^4 + 10r^3 for jerk-free startup
      const easeRamp = ramp * ramp * ramp * (ramp * (ramp * 6 - 15) + 10);

      const mode = sweepModeRef.current;
      const amp = sweepAmplitudeRef.current;
      const focusIdx = focusJointIdxRef.current;
      const currentRobot = useRobotStore.getState().robot;
      const numJoints = currentRobot.joints.length;

      let currentSequentialIdx: number | null = null;
      const targetQ = currentRobot.joints.map((joint, idx) => {
        const min = joint.min;
        const max = joint.max;
        const range = max - min;
        const center = (min + max) / 2;
        // Half-span strictly constrained to at most 40% of the half-range, ensuring at least 15% clearance from limits
        const safeHalfSpan = (range / 2) * Math.min(amp, 0.75) * 0.85;

        if (mode === 'sequential') {
          // One joint back and forth at a time: perfect for DH frame inspection
          const jointDuration = 4.0; // 4 seconds per joint at 1x speed (16s at 0.25x)
          const totalDuration = Math.max(1, numJoints) * jointDuration;
          const cycleTime = (t % totalDuration);
          const activeIdx = Math.floor(cycleTime / jointDuration);
          currentSequentialIdx = activeIdx;

          if (idx === activeIdx) {
            const localTime = cycleTime % jointDuration;
            // Smooth sine cycle: center -> +safeHalfSpan -> center -> -safeHalfSpan -> center
            const osc = Math.sin((localTime / jointDuration) * 2 * Math.PI);
            return center + safeHalfSpan * osc;
          } else {
            return center;
          }
        } else if (mode === 'single') {
          // Focus exclusively on a single selected joint
          currentSequentialIdx = focusIdx;
          if (idx === focusIdx) {
            const osc = Math.sin(t * 0.25 * 2 * Math.PI);
            return center + safeHalfSpan * osc;
          } else {
            return center;
          }
        } else if (mode === 'harmonic') {
          // Calm, organic harmonic wave across joints (frequencies 0.15 - 0.27 rad/s)
          const freq = 0.15 + (idx % 4) * 0.04;
          const phase = idx * (Math.PI / 4);
          return center + safeHalfSpan * Math.sin(t * freq + phase);
        } else {
          // 'breathing': synchronized in-phase oscillation
          const freq = 0.18;
          return center + safeHalfSpan * Math.sin(t * freq);
        }
      });

      const targetSweepIdx = mode === 'sequential' ? currentSequentialIdx : mode === 'single' ? focusIdx : null;
      if (activeSweepJointIdxRef.current !== targetSweepIdx) {
        activeSweepJointIdxRef.current = targetSweepIdx;
        setActiveSweepJointIdx(targetSweepIdx);
      }

      // Blend from initial pose using easeRamp
      const blendedQ = targetQ.map((val, idx) => {
        const sVal = startPoseRef.current[idx] ?? val;
        return sVal * (1 - easeRamp) + val * easeRamp;
      });

      // Throttle React state dispatch to ~48ms interval (~20 FPS)
      // Eliminates CPU lock, keeps DOM and sliders silky smooth, and guarantees 0ms UI input latency
      const timeSinceDispatch = time - lastDispatchTimeRef.current;
      if (timeSinceDispatch >= 48 || lastDispatchTimeRef.current === 0) {
        lastDispatchTimeRef.current = time;
        setJoints(blendedQ);
      }

      sweepAnimRef.current = requestAnimationFrame(sweepLoop);
    };

    sweepAnimRef.current = requestAnimationFrame(sweepLoop);

    return () => {
      if (sweepAnimRef.current) {
        cancelAnimationFrame(sweepAnimRef.current);
        sweepAnimRef.current = null;
      }
      setActiveSweepJointIdx(null);
    };
  }, [isSweeping, setJoints]);

  const handleToggleSweep = () => {
    lastToggleTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    setIsSweeping((prev) => {
      const next = !prev;
      if (next) {
        // Reset trace when starting a new sweep session to avoid visual artifacts
        setTraceResetKey((k) => k + 1);
      }
      return next;
    });
  };

  const handleClearTrace = () => {
    setTraceResetKey((k) => k + 1);
  };

  // Global keyboard shortcuts for Continuous Sweep (Space: Toggle Play/Pause, [: Slower, ]: Faster)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const action = processContinuousSweepShortcut(e, {
        minToggleIntervalMs: 150,
        lastToggleTime: lastToggleTimeRef.current,
        currentTime: now,
      });
      if (action === 'toggle-sweep') {
        lastToggleTimeRef.current = now;
        handleToggleSweep();
      } else if (action === 'speed-down') {
        setSweepSpeed((prev) => Math.max(0.05, Math.round((prev - 0.05) * 100) / 100));
      } else if (action === 'speed-up') {
        setSweepSpeed((prev) => Math.min(1.5, Math.round((prev + 0.05) * 100) / 100));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Copy feedback trigger
  const copyFeedback = (type: 'csv' | 'latex' | 'json' | 'md' | 'matrix') => {
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 1800);
  };

  // 1. Export Handlers
  const handleCopyCSV = () => {
    const csv = exportDHToCSV(robot, q, useSI);
    navigator.clipboard.writeText(csv);
    copyFeedback('csv');
  };

  const handleCopyLaTeX = () => {
    const latex = exportDHToLaTeX(robot, q, useSI);
    navigator.clipboard.writeText(latex);
    copyFeedback('latex');
  };

  const handleCopyJSON = () => {
    const json = exportDHToJSON(robot, q);
    navigator.clipboard.writeText(json);
    copyFeedback('json');
  };

  const handleCopyMarkdown = () => {
    const md = exportDHToMarkdown(robot, q, useSI);
    navigator.clipboard.writeText(md);
    copyFeedback('md');
  };

  const handleDownloadJSON = () => {
    const json = exportDHToJSON(robot, q);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${robot.id || 'robot'}_dh_parameters.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseDHFromJSON(content);
      if (parsed && parsed.joints && parsed.joints.length > 0) {
        const fullRobot: RobotDefinition = {
          id: parsed.id || `imported_${Date.now()}`,
          name: parsed.name || 'Imported DH Robot',
          dof: parsed.joints.length,
          dhConvention: parsed.dhConvention || 'standard',
          joints: parsed.joints as JointDefinition[],
          links: parsed.links as LinkDefinition[],
        };
        setRobot(fullRobot);
        setCellDrafts({});
        setCellErrors({});
        setIsSweeping(false);
        setTraceResetKey((k) => k + 1);
        setCustomIKTarget(null);
        setIkTargetDrafts({});
        setJointDrafts({});
      } else {
        alert('Invalid DH parameters JSON format. Please ensure JSON contains a joints array.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 2. Preset Selection Handler
  const handleSelectPreset = (presetId: string) => {
    const preset = DH_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const newRobot = createRobotFromPreset(preset);
    setRobot(newRobot);
    setCellDrafts({});
    setCellErrors({});
    setIsSweeping(false);
    setTraceResetKey((k) => k + 1);
    setCustomIKTarget(null);
    setIkTargetDrafts({});
    setJointDrafts({});
  };

  // 3. Unit display conversions
  const getDisplayValue = (joint: JointDefinition, field: EditableField): string => {
    const isRev = joint.type === 'revolute';
    switch (field) {
      case 'theta':
        return useSI ? joint.theta.toFixed(4) : (joint.theta * RAD_TO_DEG).toFixed(2);
      case 'd':
        return useSI ? joint.d.toFixed(4) : (joint.d * 1000).toFixed(1);
      case 'a':
        return useSI ? joint.a.toFixed(4) : (joint.a * 1000).toFixed(1);
      case 'alpha':
        return useSI ? joint.alpha.toFixed(4) : (joint.alpha * RAD_TO_DEG).toFixed(2);
      case 'offset':
        return isRev
          ? (useSI ? joint.offset.toFixed(4) : (joint.offset * RAD_TO_DEG).toFixed(2))
          : (useSI ? joint.offset.toFixed(4) : (joint.offset * 1000).toFixed(1));
      case 'min':
        return isRev
          ? (useSI ? joint.min.toFixed(4) : (joint.min * RAD_TO_DEG).toFixed(1))
          : (useSI ? joint.min.toFixed(4) : (joint.min * 1000).toFixed(1));
      case 'max':
        return isRev
          ? (useSI ? joint.max.toFixed(4) : (joint.max * RAD_TO_DEG).toFixed(1))
          : (useSI ? joint.max.toFixed(4) : (joint.max * 1000).toFixed(1));
    }
  };

  const convertDisplayToSI = (val: number, joint: JointDefinition, field: EditableField): number => {
    const isRev = joint.type === 'revolute';
    if (useSI) return val;

    switch (field) {
      case 'theta':
      case 'alpha':
        return val * DEG_TO_RAD;
      case 'd':
      case 'a':
        return val / 1000;
      case 'offset':
      case 'min':
      case 'max':
        return isRev ? val * DEG_TO_RAD : val / 1000;
    }
  };

  // 4. Validation Logic
  const validateField = (
    valStr: string,
    joint: JointDefinition,
    field: EditableField
  ): { isValid: boolean; siValue: number } => {
    if (valStr.trim() === '') {
      return { isValid: false, siValue: 0 };
    }
    const num = parseFloat(valStr);
    if (!Number.isFinite(num)) {
      return { isValid: false, siValue: 0 };
    }

    const siVal = convertDisplayToSI(num, joint, field);

    // Alpha check: outside ±2π
    if (field === 'alpha') {
      const limit = 2 * Math.PI + 1e-6;
      if (siVal < -limit || siVal > limit) {
        return { isValid: false, siValue: siVal };
      }
    }

    // Limit check: min > max
    if (field === 'min') {
      if (siVal > joint.max) {
        return { isValid: false, siValue: siVal };
      }
    }
    if (field === 'max') {
      if (siVal < joint.min) {
        return { isValid: false, siValue: siVal };
      }
    }

    return { isValid: true, siValue: siVal };
  };

  // 5. Commit cell value to store
  const commitCell = (jointIdx: number, field: EditableField) => {
    const key = `${jointIdx}_${field}`;
    if (cancelledKeysRef.current.has(key)) {
      cancelledKeysRef.current.delete(key);
      return;
    }

    const draftVal = cellDrafts[key];
    if (draftVal === undefined) return;

    const joint = robot.joints[jointIdx];
    if (!joint) return;

    const { isValid, siValue } = validateField(draftVal, joint, field);

    if (!isValid) {
      setCellErrors((prev) => ({ ...prev, [key]: true }));
      return;
    }

    setCellDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setCellErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    const updatedJoints = robot.joints.map((j, idx) => {
      if (idx !== jointIdx) return j;
      const updated = { ...j, [field]: siValue };
      if (field === 'min' || field === 'max') {
        updated.home = Math.max(updated.min, Math.min(updated.max, updated.home));
      }
      return updated;
    });

    const updatedRobot: RobotDefinition = {
      ...robot,
      joints: updatedJoints,
    };

    setRobot(updatedRobot);
    setTraceResetKey((k) => k + 1);
  };

  const handleCellChange = (jointIdx: number, field: EditableField, value: string) => {
    const key = `${jointIdx}_${field}`;
    cancelledKeysRef.current.delete(key);
    setCellDrafts((prev) => ({ ...prev, [key]: value }));

    const joint = robot.joints[jointIdx];
    if (joint) {
      const { isValid } = validateField(value, joint, field);
      setCellErrors((prev) => ({ ...prev, [key]: !isValid }));
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, jointIdx: number, field: EditableField) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const key = `${jointIdx}_${field}`;
      cancelledKeysRef.current.add(key);
      const joint = robot.joints[jointIdx];
      if (joint) {
        e.currentTarget.value = getDisplayValue(joint, field);
      }
      setCellDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setCellErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      e.currentTarget.blur();
    }
  };

  // 6. Joint Type Selection
  const handleTypeChange = (jointIdx: number, newType: JointType) => {
    const updatedJoints = robot.joints.map((j, idx) => {
      if (idx !== jointIdx) return j;
      const isPrismatic = newType === 'prismatic';
      return {
        ...j,
        type: newType,
        min: isPrismatic ? 0 : -Math.PI,
        max: isPrismatic ? 0.5 : Math.PI,
        home: isPrismatic ? 0.1 : 0,
      };
    });

    const updatedRobot: RobotDefinition = {
      ...robot,
      joints: updatedJoints,
    };
    setRobot(updatedRobot);
    setTraceResetKey((k) => k + 1);
  };

  // 7. Add / Remove Joints
  const handleAddJoint = () => {
    const newIdx = robot.joints.length;
    const newJoint: JointDefinition = {
      id: `${robot.id}_joint${newIdx + 1}`,
      name: `Joint ${newIdx + 1}`,
      index: newIdx,
      type: 'revolute',
      theta: 0,
      d: 0,
      a: 0.15,
      alpha: 0,
      offset: 0,
      min: -Math.PI,
      max: Math.PI,
      home: 0,
    };

    const newLink: LinkDefinition = {
      id: `${robot.id}_link${newIdx + 1}`,
      name: `Link ${newIdx + 1}`,
      index: newIdx + 1,
    };

    const updatedRobot: RobotDefinition = {
      ...robot,
      dof: robot.joints.length + 1,
      joints: [...robot.joints, newJoint],
      links: [...robot.links, newLink],
    };

    setRobot(updatedRobot);
    setTraceResetKey((k) => k + 1);
  };

  const handleRemoveLastJoint = () => {
    if (robot.joints.length <= 1) return;

    const updatedJoints = robot.joints.slice(0, -1);
    const keepLinksCount = robot.links.length > robot.joints.length ? updatedJoints.length + 1 : updatedJoints.length;
    const updatedLinks = robot.links.slice(0, Math.max(1, keepLinksCount));

    const updatedRobot: RobotDefinition = {
      ...robot,
      dof: updatedJoints.length,
      joints: updatedJoints,
      links: updatedLinks,
    };

    setRobot(updatedRobot);
    setTraceResetKey((k) => k + 1);
  };

  // 8. Toggle DH Convention (Standard <-> Modified Craig)
  const handleToggleConvention = () => {
    const nextConvention = robot.dhConvention === 'standard' ? 'modified' : 'standard';
    const updatedRobot: RobotDefinition = {
      ...robot,
      dhConvention: nextConvention,
    };
    setRobot(updatedRobot);
    setTraceResetKey((k) => k + 1);
  };

  // 9. Quick Joint Simulation Actions
  const handleZeroAllJoints = () => {
    setIsSweeping(false);
    setTraceResetKey((k) => k + 1);
    const zeroQ = robot.joints.map(() => 0);
    setJoints(zeroQ);
  };

  const handleResetHomePose = () => {
    setIsSweeping(false);
    setTraceResetKey((k) => k + 1);
    resetToHome();
  };

  const handleRandomPose = () => {
    setIsSweeping(false);
    setTraceResetKey((k) => k + 1);
    const randQ = robot.joints.map((j) => {
      const r = Math.random();
      return j.min + r * (j.max - j.min);
    });
    setJoints(randQ);
  };

  // 10. Direct Inverse Kinematics Solving for this DH chain
  // Values currently displayed in IK target inputs
  const currentIKTargetMeters = useMemo(() => {
    if (customIKTarget) {
      return {
        x: customIKTarget.x,
        y: customIKTarget.y,
        z: customIKTarget.z,
        roll: customIKTarget.roll,
        pitch: customIKTarget.pitch,
        yaw: customIKTarget.yaw,
      };
    }
    const eePos = analysis.endEffector.position;
    const eeEuler = analysis.endEffector.eulerXYZ;
    return {
      x: eePos.x,
      y: eePos.y,
      z: eePos.z,
      roll: eeEuler.rad[0],
      pitch: eeEuler.rad[1],
      yaw: eeEuler.rad[2],
    };
  }, [customIKTarget, analysis.endEffector]);

  const handleSolveIK = () => {
    setIkSolving(true);
    setIkSolution(null);
    setIkResultStats(null);

    const targetPosM = {
      x: currentIKTargetMeters.x,
      y: currentIKTargetMeters.y,
      z: currentIKTargetMeters.z,
    };
    const targetRotRad = {
      roll: currentIKTargetMeters.roll,
      pitch: currentIKTargetMeters.pitch,
      yaw: currentIKTargetMeters.yaw,
      order: 'XYZ' as const,
    };

    setTimeout(() => {
      const ikRes = solveDHInverseKinematics(robot, targetPosM, targetRotRad, q);
      setIkSolving(false);
      setIkSolution(ikRes.bestSolution);

      const isPositionOnly = robot.dof <= 3;
      const effectiveConverged = ikRes.bestSolution
        ? (isPositionOnly ? ikRes.bestSolution.positionError <= 1e-3 : ikRes.converged)
        : false;

      setIkResultStats({
        converged: effectiveConverged,
        posErrorMm: ikRes.bestSolution ? ikRes.bestSolution.positionError * 1000 : Infinity,
        oriErrorDeg: ikRes.bestSolution ? ikRes.bestSolution.orientationError * RAD_TO_DEG : Infinity,
        timeMs: ikRes.computationTimeMs,
        branches: ikRes.allTestedBranches,
      });
    }, 20);
  };

  const handleApplyIKSolution = () => {
    if (ikSolution) {
      setIsSweeping(false);
      setTraceResetKey((k) => k + 1);
      setJoints(ikSolution.q);
    }
  };

  const handleResetIKTargetToCurrentEE = () => {
    setCustomIKTarget(null);
    setIkTargetDrafts({});
    setIkSolution(null);
    setIkResultStats(null);
  };

  // Matrix Copy for Transformations tab
  const handleCopySelectedMatrix = (mat: number[][]) => {
    const formatted = mat.map((row) => row.map((v) => v.toFixed(6)).join('\t')).join('\n');
    navigator.clipboard.writeText(formatted);
    copyFeedback('matrix');
  };

  // Target point coordinates for 3D visualizer in meters
  const targetPointFor3D = useMemo(() => {
    return {
      x: currentIKTargetMeters.x,
      y: currentIKTargetMeters.y,
      z: currentIKTargetMeters.z,
    };
  }, [currentIKTargetMeters]);

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] text-black p-4 lg:p-6 overflow-y-auto select-none space-y-4">
      {/* Hidden File Input for Importing DH JSON */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json"
        className="hidden"
        aria-hidden="true"
      />

      {/* 1. MASTER TOOLBAR & PRESETS CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border-2 border-stone-200 rounded-2xl shadow-xs">
        {/* Left: Preset Selector & Convention & Units */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Architectures Dropdown */}
          <div className="flex items-center gap-1.5 bg-stone-100 px-2.5 py-1 rounded-xl border border-stone-300">
            <BookOpen className="w-3.5 h-3.5 text-stone-700" />
            <select
              onChange={(e) => {
                if (e.target.value) handleSelectPreset(e.target.value);
              }}
              defaultValue=""
              aria-label="Select Calibrated DH Robot Preset"
              className="text-xs font-black bg-transparent border-none outline-hidden cursor-pointer text-stone-900"
            >
              <option value="" disabled>
                Load DH Preset...
              </option>
              {DH_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.dof} DOF)
                </option>
              ))}
            </select>
          </div>

          {/* Clickable Convention Badge */}
          <button
            onClick={handleToggleConvention}
            title="Click to toggle between Standard and Craig's Modified DH convention"
            aria-label="Toggle DH Convention"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-amber-100 hover:bg-amber-200 text-black border border-amber-300 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-800" />
            <span>{isStandard ? 'Standard DH' : 'Modified DH (Craig)'}</span>
          </button>

          {/* Unit Toggle */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-300 text-xs font-black">
            <button
              onClick={() => {
                setUseSI(false);
                setCellDrafts({});
                setCellErrors({});
                setIkTargetDrafts({});
                setJointDrafts({});
              }}
              aria-label="Display units in degrees and millimeters"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                !useSI ? 'bg-amber-400 text-black shadow-xs font-black' : 'text-stone-700 hover:text-black'
              }`}
            >
              deg / mm
            </button>
            <button
              onClick={() => {
                setUseSI(true);
                setCellDrafts({});
                setCellErrors({});
                setIkTargetDrafts({});
                setJointDrafts({});
              }}
              aria-label="Display units in radians and meters"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                useSI ? 'bg-amber-400 text-black shadow-xs font-black' : 'text-stone-700 hover:text-black'
              }`}
            >
              rad / m
            </button>
          </div>

          {/* Add / Remove Joints */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAddJoint}
              title="Add a new joint to the kinematic chain"
              aria-label="Add Joint"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-800" />
              <span>Add Joint</span>
            </button>

            <button
              onClick={handleRemoveLastJoint}
              disabled={robot.joints.length <= 1}
              title="Remove the last joint from the kinematic chain"
              aria-label="Remove Last Joint"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 disabled:opacity-40 disabled:pointer-events-none text-rose-950 border border-rose-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-800" />
              <span>Remove Last</span>
            </button>
          </div>
        </div>

        {/* Right: Import / Export Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import DH Parameters from JSON File"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-black text-black transition-all cursor-pointer active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            title="Download complete DH robot definition as JSON"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-black text-black transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
          <button
            onClick={handleCopyCSV}
            aria-label="Copy DH parameters table as CSV"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-black text-black transition-all cursor-pointer active:scale-95"
          >
            {copiedType === 'csv' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>CSV</span>
          </button>
          <button
            onClick={handleCopyLaTeX}
            aria-label="Copy DH parameters table as LaTeX"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-black text-black transition-all cursor-pointer active:scale-95"
          >
            {copiedType === 'latex' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5" />}
            <span>LaTeX</span>
          </button>
          <button
            onClick={handleCopyMarkdown}
            aria-label="Copy DH parameters table as Markdown"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-black text-black transition-all cursor-pointer active:scale-95"
          >
            {copiedType === 'md' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5" />}
            <span>Markdown</span>
          </button>
          <button
            onClick={handleCopyJSON}
            aria-label="Copy DH parameters table as JSON"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-black text-black transition-all cursor-pointer active:scale-95"
          >
            {copiedType === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME JOINT SIMULATION / ACTUATION BAR */}
      <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-400 text-black">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-black">Kinematic Chain Simulation Actuation</span>
              <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 border border-stone-300 font-bold">
                {robot.name} • {robot.dof} DOF
              </span>
            </div>
          </div>

          {/* Quick Simulation Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSweep}
              title="Toggle Continuous Sweep Simulation (Keyboard Shortcut: Space)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-xs active:scale-95 ${
                isSweeping
                  ? 'bg-rose-500 text-white border border-rose-600 animate-pulse'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300'
              }`}
            >
              {isSweeping ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSweeping ? 'Pause Sweep (Space)' : 'Continuous Sweep (Space)'}</span>
            </button>
            <button
              onClick={handleZeroAllJoints}
              title="Set all joint coordinates to 0"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-black cursor-pointer active:scale-95"
            >
              <span>0° Zero</span>
            </button>
            <button
              onClick={handleResetHomePose}
              title="Reset robot to calibrated home pose"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-black cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <button
              onClick={handleRandomPose}
              title="Generate random valid joint configuration within limits"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-black cursor-pointer active:scale-95"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random</span>
            </button>
          </div>
        </div>

        {/* Continuous Sweep Dynamic Speed, Pattern & Telemetry Bar */}
        <div
          className={`p-3 rounded-xl border transition-all text-xs ${
            isSweeping
              ? 'bg-amber-50/90 border-amber-300 shadow-xs'
              : 'bg-[#faf8f5] border-stone-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Speed Configuration */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">
                Sweep Speed:
              </span>
              {[
                { label: '0.1x (Inspect)', val: 0.1 },
                { label: '0.25x (Slow Edu)', val: 0.25 },
                { label: '0.5x (Gentle)', val: 0.5 },
                { label: '1.0x (Active)', val: 1.0 },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => setSweepSpeed(s.val)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                    Math.abs(sweepSpeed - s.val) < 0.01
                      ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                      : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-1 bg-white px-2 py-0.5 rounded-lg border border-stone-300">
                <input
                  type="range"
                  min="0.05"
                  max="1.5"
                  step="0.05"
                  value={sweepSpeed}
                  onChange={(e) => setSweepSpeed(parseFloat(e.target.value))}
                  aria-label="Continuous sweep speed slider"
                  className="w-16 accent-amber-500 cursor-pointer h-1.5 bg-stone-200 rounded"
                />
                <span className="font-mono text-[11px] font-black text-amber-900 min-w-[34px]">
                  {sweepSpeed.toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Sweep Mode Selection */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">Pattern:</span>
              <button
                onClick={() => setSweepMode('sequential')}
                className={`px-2 py-0.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                  sweepMode === 'sequential'
                    ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                }`}
                title="Isolate and sweep one joint at a time in sequence to inspect each DH parameter (Recommended)"
              >
                🔢 Sequential DH
              </button>
              <button
                onClick={() => setSweepMode('harmonic')}
                className={`px-2 py-0.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                  sweepMode === 'harmonic'
                    ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                }`}
                title="Smooth multi-frequency harmonic wave across all joints"
              >
                🌊 Harmonic
              </button>
              <button
                onClick={() => setSweepMode('single')}
                className={`px-2 py-0.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                  sweepMode === 'single'
                    ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                }`}
                title="Isolate and sweep a single selected joint continuously"
              >
                🎯 Single Joint
              </button>
              <button
                onClick={() => setSweepMode('breathing')}
                className={`px-2 py-0.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                  sweepMode === 'breathing'
                    ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                }`}
                title="Synchronized in-phase breathing oscillation"
              >
                🫁 Breathing
              </button>
            </div>

            {/* If Single Joint Mode: Joint Selector */}
            {sweepMode === 'single' && (
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-300">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 mr-1">Focus Joint:</span>
                {robot.joints.map((j, i) => (
                  <button
                    key={j.id || i}
                    onClick={() => setFocusJointIdx(i)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black border transition-all cursor-pointer ${
                      focusJointIdx === i
                        ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    J{i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Sweep Amplitude */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">Range:</span>
              {[
                { label: '20% Subtle', val: 0.20 },
                { label: '30% Educational', val: 0.30 },
                { label: '45% Wide', val: 0.45 },
              ].map((a) => (
                <button
                  key={a.val}
                  onClick={() => setSweepAmplitude(a.val)}
                  className={`px-1.5 py-0.5 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                    Math.abs(sweepAmplitude - a.val) < 0.01
                      ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                      : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Sweep Telemetry Badge */}
          {isSweeping && (
            <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-amber-200/80 text-[11px] text-amber-950 font-medium">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold">
                  {sweepMode === 'sequential' && activeSweepJointIdx !== null
                    ? `Actuating Joint ${activeSweepJointIdx + 1} (${robot.joints[activeSweepJointIdx]?.name || ''}) • Step-by-Step DH Inspection`
                    : sweepMode === 'single'
                    ? `Inspecting Joint ${focusJointIdx + 1} (${robot.joints[focusJointIdx]?.name || ''}) DH Parameter Row Exclusively`
                    : sweepMode === 'harmonic'
                    ? `Harmonic Multi-frequency Smooth Wave at ${sweepSpeed.toFixed(2)}x Speed`
                    : `Synchronous Breathing Oscillation at ${sweepSpeed.toFixed(2)}x Speed`}
                </span>
              </div>
              <span className="font-mono text-[10px] text-amber-800 hidden md:inline font-bold">
                Guaranteed Non-Clamping Kinematics • Zero-Lag 20 FPS Telemetry • Space to Pause
              </span>
            </div>
          )}
        </div>

        {/* Jog Increment Configuration Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#faf8f5] rounded-xl border border-stone-200 text-xs font-black">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">Jog Step:</span>
            {revStepPresets.map((stepVal) => (
              <button
                key={stepVal}
                onClick={() => {
                  setJogStepDeg(stepVal);
                  setCustomJogInput('');
                }}
                className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                  jogStepDeg === stepVal
                    ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                {stepVal}°
              </button>
            ))}
            <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-stone-300 text-xs">
              <span className="text-stone-500 font-mono text-[10px]">Custom:</span>
              <input
                type="text"
                inputMode="decimal"
                value={customJogInput}
                placeholder="e.g. 3"
                onChange={(e) => handleCustomJogChange(e.target.value, true)}
                className="w-10 px-1 py-0.2 text-right font-mono text-xs font-bold rounded border border-stone-200 bg-[#faf8f5]"
              />
              <span className="text-stone-600 font-mono text-[10px]">°</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-stone-600 font-sans font-medium">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">Prismatic:</span>
            {prisStepPresets.map((stepVal) => (
              <button
                key={stepVal}
                onClick={() => setJogStepMm(stepVal)}
                className={`px-1.5 py-0.5 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                  jogStepMm === stepVal
                    ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                {stepVal}mm
              </button>
            ))}
          </div>
        </div>

        {/* Joint Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
          {robot.joints.map((joint, idx) => {
            const isRev = joint.type === 'revolute';
            const curQ = q[idx] ?? 0;
            const minDisp = isRev ? joint.min * RAD_TO_DEG : joint.min * 1000;
            const maxDisp = isRev ? joint.max * RAD_TO_DEG : joint.max * 1000;
            const curDisp = isRev ? curQ * RAD_TO_DEG : curQ * 1000;
            const unitLabel = isRev ? (useSI ? 'rad' : '°') : (useSI ? 'm' : 'mm');
            const valueText = useSI
              ? `${curQ.toFixed(3)} ${unitLabel}`
              : `${curDisp.toFixed(1)} ${unitLabel}`;

            const isPrimarySweepJoint = isSweeping && (
              (sweepMode === 'sequential' && activeSweepJointIdx === idx) ||
              (sweepMode === 'single' && focusJointIdx === idx)
            );
            const isSecondarySweep = isSweeping && (sweepMode === 'harmonic' || sweepMode === 'breathing');

            return (
              <div
                key={joint.id || idx}
                className={`flex flex-col p-2.5 rounded-xl border shadow-2xs transition-all ${
                  isPrimarySweepJoint
                    ? 'border-amber-500 bg-amber-50/95 ring-2 ring-amber-400/80 shadow-xs'
                    : isSecondarySweep
                    ? 'border-amber-300/80 bg-amber-50/40'
                    : 'border-stone-200 bg-[#faf8f5] hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-black">
                      J{idx + 1}: {joint.name}
                    </span>
                    {isPrimarySweepJoint && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500 text-white font-black animate-pulse">
                        SWEEPING
                      </span>
                    )}
                    {isSecondarySweep && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-400 text-black font-black">
                        WAVE
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 font-bold border border-amber-300">
                    {joint.type === 'revolute' ? 'REV' : 'PRIS'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleJogJoint(idx, -1)}
                    title={`Jog ${joint.name} -${isRev ? jogStepDeg + '°' : jogStepMm + 'mm'}`}
                    aria-label={`Jog ${joint.name} minus`}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-white hover:bg-amber-200 text-black font-black border border-stone-300 active:scale-95 transition-all cursor-pointer shadow-2xs text-xs"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={joint.min}
                    max={joint.max}
                    step={isRev ? 0.005 : 0.002}
                    value={curQ}
                    onChange={(e) => {
                      setIsSweeping(false);
                      setJointValue(idx, parseFloat(e.target.value));
                    }}
                    aria-label={`Simulation Joint ${idx + 1} ${isRev ? 'angle' : 'displacement'}`}
                    aria-valuemin={joint.min}
                    aria-valuemax={joint.max}
                    aria-valuenow={curQ}
                    aria-valuetext={valueText}
                    className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-stone-200 rounded-lg"
                  />
                  <button
                    onClick={() => handleJogJoint(idx, 1)}
                    title={`Jog ${joint.name} +${isRev ? jogStepDeg + '°' : jogStepMm + 'mm'}`}
                    aria-label={`Jog ${joint.name} plus`}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-white hover:bg-amber-200 text-black font-black border border-stone-300 active:scale-95 transition-all cursor-pointer shadow-2xs text-xs"
                  >
                    +
                  </button>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={jointDrafts[idx] !== undefined ? jointDrafts[idx] : (useSI ? curQ.toFixed(3) : curDisp.toFixed(1))}
                    onChange={(e) => {
                      setIsSweeping(false);
                      const raw = e.target.value;
                      setJointDrafts((prev) => ({ ...prev, [idx]: raw }));
                      const num = parseFloat(raw);
                      if (Number.isFinite(num)) {
                        const siVal = useSI
                          ? num
                          : isRev
                          ? num * DEG_TO_RAD
                          : num / 1000;
                        setJointValue(idx, Math.max(joint.min, Math.min(joint.max, siVal)));
                      }
                    }}
                    onBlur={() => {
                      setJointDrafts((prev) => {
                        const next = { ...prev };
                        delete next[idx];
                        return next;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    aria-label={`Simulation Joint ${idx + 1} numeric input`}
                    className="w-16 px-1.5 py-0.5 text-right font-mono text-xs font-bold rounded border border-stone-300 bg-white"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mt-1">
                  <span>{useSI ? joint.min.toFixed(2) : minDisp.toFixed(0)}{unitLabel}</span>
                  <span className="font-bold text-black">{valueText}</span>
                  <span>{useSI ? joint.max.toFixed(2) : maxDisp.toFixed(0)}{unitLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. DEEP KINEMATICS ANALYSIS NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-200/70 rounded-2xl border border-stone-300 overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveSubTab('table')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'table'
              ? 'bg-white text-black shadow-sm'
              : 'text-stone-700 hover:text-black hover:bg-stone-100/50'
          }`}
        >
          <span>📋 DH Parameters Table</span>
        </button>

        <button
          onClick={() => setActiveSubTab('simulation3d')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'simulation3d'
              ? 'bg-amber-400 text-black shadow-sm'
              : 'text-stone-700 hover:text-black hover:bg-stone-100/50'
          }`}
        >
          <span>🌐 3D Chain Simulation</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pose')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'pose'
              ? 'bg-white text-black shadow-sm'
              : 'text-stone-700 hover:text-black hover:bg-stone-100/50'
          }`}
        >
          <span>🎯 End-Effector 6-DOF Pose</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'matrices'
              ? 'bg-white text-black shadow-sm'
              : 'text-stone-700 hover:text-black hover:bg-stone-100/50'
          }`}
        >
          <span>📐 Matrices A & T</span>
        </button>

        <button
          onClick={() => setActiveSubTab('jacobian')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'jacobian'
              ? 'bg-white text-black shadow-sm'
              : 'text-stone-700 hover:text-black hover:bg-stone-100/50'
          }`}
        >
          <span>⚡ Jacobian & Singularity</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ik')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'ik'
              ? 'bg-white text-black shadow-sm'
              : 'text-stone-700 hover:text-black hover:bg-stone-100/50'
          }`}
        >
          <span>🎯 Inverse Kinematics</span>
        </button>
      </div>

      {/* 4. TAB PANELS CONTENT */}

      {/* TAB 1: DH PARAMETERS TABLE */}
      {activeSubTab === 'table' && (
        <div className="space-y-4">
          {/* Formula Explanation Banner */}
          <div className="flex items-start gap-3 p-3.5 bg-white border-2 border-stone-200 rounded-2xl text-xs text-black shadow-xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-black uppercase tracking-wide">Transformation Formulation:</span>
                {isStandard ? (
                  <code className="text-black font-mono font-bold bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-300">
                    A_i = Rot_Z(θ_i) · Trans_Z(d_i) · Trans_X(a_i) · Rot_X(α_i)
                  </code>
                ) : (
                  <code className="text-black font-mono font-bold bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-300">
                    A_i = Rot_X(α_(i-1)) · Trans_X(a_(i-1)) · Rot_Z(θ_i) · Trans_Z(d_i)
                  </code>
                )}
              </div>
              <div className="text-stone-600 text-[11px] mt-1 font-medium">
                Click any cell to edit DH parameters. Press <kbd className="px-1 py-0.5 font-mono bg-stone-200 rounded text-[10px]">Enter</kbd> to save or <kbd className="px-1 py-0.5 font-mono bg-stone-200 rounded text-[10px]">Esc</kbd> to cancel. Gold column highlights the active coordinate driven by the joint jogger.
              </div>
            </div>
          </div>

          {/* Quick Joint Jog Step Selector for DH Table */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white border-2 border-stone-200 rounded-2xl text-xs font-black shadow-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">Table Jog Step:</span>
              {revStepPresets.map((stepVal) => (
                <button
                  key={stepVal}
                  onClick={() => {
                    setJogStepDeg(stepVal);
                    setCustomJogInput('');
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                    jogStepDeg === stepVal
                      ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                  }`}
                >
                  {stepVal}°
                </button>
              ))}
              <div className="flex items-center gap-1 bg-stone-100 px-1.5 py-0.5 rounded-lg border border-stone-300 text-xs">
                <span className="text-stone-500 font-mono text-[10px]">Custom:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={customJogInput}
                  placeholder="e.g. 3"
                  onChange={(e) => handleCustomJogChange(e.target.value, true)}
                  className="w-10 px-1 py-0.2 text-right font-mono text-xs font-bold rounded border border-stone-200 bg-white"
                />
                <span className="text-stone-600 font-mono text-[10px]">°</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-stone-600 font-sans font-medium">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">Prismatic:</span>
              {prisStepPresets.map((stepVal) => (
                <button
                  key={stepVal}
                  onClick={() => setJogStepMm(stepVal)}
                  className={`px-1.5 py-0.5 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                    jogStepMm === stepVal
                      ? 'bg-amber-400 text-black border-amber-500 shadow-2xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                  }`}
                >
                  {stepVal}mm
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border-2 border-stone-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-stone-100 border-b-2 border-stone-200 text-black font-sans">
                  <th className="py-3 px-3 font-black whitespace-nowrap">Joint</th>
                  <th className="py-3 px-3 font-black whitespace-nowrap">Type</th>
                  <th className="py-3 px-3 font-black text-right whitespace-nowrap bg-amber-50 border-x border-amber-200">
                    q_i (Active)
                  </th>
                  <th className="py-3 px-3 font-black text-right whitespace-nowrap">
                    θ_i ({useSI ? 'rad' : '°'})
                  </th>
                  <th className="py-3 px-3 font-black text-right whitespace-nowrap">
                    d_i ({useSI ? 'm' : 'mm'})
                  </th>
                  <th className="py-3 px-3 font-black text-right whitespace-nowrap">
                    a_i ({useSI ? 'm' : 'mm'})
                  </th>
                  <th className="py-3 px-3 font-black text-right whitespace-nowrap">
                    α_i ({useSI ? 'rad' : '°'})
                  </th>
                  <th className="py-3 px-3 font-black text-right whitespace-nowrap">
                    Offset ({useSI ? 'rad/m' : '°/mm'})
                  </th>
                  <th className="py-3 px-3 font-black text-right whitespace-nowrap">
                    Min ({useSI ? 'rad/m' : '°/mm'})
                  </th>
                  <th className="py-3 px-3 font-black text-right whitespace-nowrap">
                    Max ({useSI ? 'rad/m' : '°/mm'})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {robot.joints.map((joint, idx) => {
                  const isRevolute = joint.type === 'revolute';
                  const currentQ = q[idx] ?? 0;

                  const activeQDisp = isRevolute
                    ? (useSI ? currentQ.toFixed(4) + ' rad' : (currentQ * RAD_TO_DEG).toFixed(2) + '°')
                    : (useSI ? currentQ.toFixed(4) + ' m' : (currentQ * 1000).toFixed(1) + ' mm');

                  const renderEditableCell = (field: EditableField, step: string = 'any') => {
                    const key = `${idx}_${field}`;
                    const val = cellDrafts[key] ?? getDisplayValue(joint, field);
                    const isError = !!cellErrors[key];

                    return (
                      <td key={field} className="py-2 px-2 text-right">
                        <input
                          type="number"
                          step={step}
                          value={val}
                          onChange={(e) => handleCellChange(idx, field, e.target.value)}
                          onBlur={() => commitCell(idx, field)}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, field)}
                          aria-label={`Joint ${idx + 1} ${field}`}
                          className={`w-20 px-2 py-1 text-right font-mono text-xs font-bold rounded-lg border transition-all ${
                            isError
                              ? 'border-red-500 bg-red-50 text-red-900 ring-1 ring-red-500'
                              : 'border-stone-300 bg-stone-50 text-black focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-400'
                          }`}
                        />
                      </td>
                    );
                  };

                  const isPrimarySweepJoint = isSweeping && (
                    (sweepMode === 'sequential' && activeSweepJointIdx === idx) ||
                    (sweepMode === 'single' && focusJointIdx === idx)
                  );
                  const isSecondarySweep = isSweeping && (sweepMode === 'harmonic' || sweepMode === 'breathing');

                  return (
                    <tr
                      key={joint.id || idx}
                      className={`transition-all ${
                        isPrimarySweepJoint
                          ? 'bg-amber-100/90 border-l-4 border-l-amber-500 shadow-2xs'
                          : isSecondarySweep
                          ? 'bg-amber-50/40 hover:bg-amber-50/70'
                          : 'hover:bg-stone-50'
                      }`}
                    >
                      {/* Joint Name */}
                      <td className="py-2.5 px-3 font-black text-black font-sans whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{joint.name}</span>
                          {isPrimarySweepJoint && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-black animate-pulse shadow-2xs">
                              SWEEPING
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Joint Type Select */}
                      <td className="py-2 px-2.5">
                        <select
                          value={joint.type}
                          onChange={(e) => handleTypeChange(idx, e.target.value as JointType)}
                          aria-label={`Joint ${idx + 1} type`}
                          className={`text-xs font-black px-2 py-1 rounded-lg border cursor-pointer font-sans transition-colors ${
                            isRevolute
                              ? 'bg-amber-100 text-black border-amber-300 hover:bg-amber-200'
                              : 'bg-emerald-100 text-black border-emerald-300 hover:bg-emerald-200'
                          }`}
                        >
                          <option value="revolute">Revolute (R)</option>
                          <option value="prismatic">Prismatic (P)</option>
                        </select>
                      </td>

                      {/* Active q_i with direct jog buttons */}
                      <td className={`py-2 px-2 text-right font-black border-x whitespace-nowrap font-mono transition-colors ${
                        isPrimarySweepJoint
                          ? 'text-black bg-amber-200/90 border-amber-400 ring-1 ring-amber-400'
                          : 'text-amber-950 bg-amber-100/70 border-amber-200'
                      }`}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleJogJoint(idx, -1)}
                            title={`Jog ${joint.name} -${isRevolute ? jogStepDeg + '°' : jogStepMm + ' mm'}`}
                            aria-label={`Jog ${joint.name} minus`}
                            className="w-5 h-5 flex items-center justify-center rounded bg-amber-200 hover:bg-amber-300 text-black font-black cursor-pointer active:scale-90 transition-all text-xs"
                          >
                            -
                          </button>
                          <span className="min-w-[58px] text-right font-black">{activeQDisp}</span>
                          <button
                            onClick={() => handleJogJoint(idx, 1)}
                            title={`Jog ${joint.name} +${isRevolute ? jogStepDeg + '°' : jogStepMm + ' mm'}`}
                            aria-label={`Jog ${joint.name} plus`}
                            className="w-5 h-5 flex items-center justify-center rounded bg-amber-200 hover:bg-amber-300 text-black font-black cursor-pointer active:scale-90 transition-all text-xs"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Editable Fields */}
                      {renderEditableCell('theta')}
                      {renderEditableCell('d')}
                      {renderEditableCell('a')}
                      {renderEditableCell('alpha')}
                      {renderEditableCell('offset')}
                      {renderEditableCell('min')}
                      {renderEditableCell('max')}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: 3D KINEMATIC CHAIN SIMULATION VIEWPORT */}
      {activeSubTab === 'simulation3d' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-600 font-medium px-1">
            <span>
              Real-time 3D simulation of {robot.name} with coordinate frames ($F_0 \ldots F_n$) and end-effector motion trail
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-800 font-bold">
                Current EE: [{analysis.endEffector.position.xMm.toFixed(1)}, {analysis.endEffector.position.yMm.toFixed(1)}, {analysis.endEffector.position.zMm.toFixed(1)}] mm
              </span>
              <button
                onClick={handleClearTrace}
                title="Clear End-Effector Motion Trail"
                aria-label="Clear trace trail"
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-[11px] transition-all cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-stone-600" />
                <span>Clear Trace</span>
              </button>
            </div>
          </div>
          <DHSimulation3DView
            robot={robot}
            fk={analysis.fk}
            q={q}
            targetPoint={targetPointFor3D}
            height="480px"
            useSI={useSI}
            onJointChange={(jointIdx, val) => {
              setIsSweeping(false);
              setJointValue(jointIdx, val);
            }}
            onResetHome={handleResetHomePose}
            onZeroAll={handleZeroAllJoints}
            isSweeping={isSweeping}
            onToggleSweep={handleToggleSweep}
            activeJogStepDeg={jogStepDeg}
            activeJogStepMm={jogStepMm}
            onJogStepDegChange={setJogStepDeg}
            onJogStepMmChange={setJogStepMm}
            sweepSpeed={sweepSpeed}
            onSweepSpeedChange={setSweepSpeed}
            sweepMode={sweepMode}
            onSweepModeChange={setSweepMode}
            sweepAmplitude={sweepAmplitude}
            onSweepAmplitudeChange={setSweepAmplitude}
            activeSweepJointIdx={activeSweepJointIdx}
            focusJointIdx={focusJointIdx}
            onFocusJointIdxChange={setFocusJointIdx}
            traceResetKey={traceResetKey}
            onClearTrace={handleClearTrace}
          />
        </div>
      )}

      {/* TAB 3: END-EFFECTOR 6-DOF POSE */}
      {activeSubTab === 'pose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Position & Reach Card */}
          <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-black">End-Effector Cartesian Position</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-bold border border-emerald-300">
                Norm: {useSI ? `${analysis.endEffector.position.norm.toFixed(4)} m` : `${analysis.endEffector.position.normMm.toFixed(1)} mm`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-[10px] text-stone-500 font-sans font-bold">X Position</span>
                <div className="text-base font-black text-black mt-1">
                  {useSI ? analysis.endEffector.position.x.toFixed(4) : analysis.endEffector.position.xMm.toFixed(1)}
                  <span className="text-xs font-normal text-stone-500 ml-1">{useSI ? 'm' : 'mm'}</span>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-[10px] text-stone-500 font-sans font-bold">Y Position</span>
                <div className="text-base font-black text-black mt-1">
                  {useSI ? analysis.endEffector.position.y.toFixed(4) : analysis.endEffector.position.yMm.toFixed(1)}
                  <span className="text-xs font-normal text-stone-500 ml-1">{useSI ? 'm' : 'mm'}</span>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-[10px] text-stone-500 font-sans font-bold">Z Position</span>
                <div className="text-base font-black text-black mt-1">
                  {useSI ? analysis.endEffector.position.z.toFixed(4) : analysis.endEffector.position.zMm.toFixed(1)}
                  <span className="text-xs font-normal text-stone-500 ml-1">{useSI ? 'm' : 'mm'}</span>
                </div>
              </div>
            </div>

            {/* Reach Capacity Gauge */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-sans font-black text-stone-700">Workspace Extension:</span>
                <span className="font-mono font-black text-black">
                  {(analysis.reach.extensionRatio * 100).toFixed(1)}% of Theoretical Max ({useSI ? `${analysis.reach.maxTheoreticalReachM.toFixed(3)} m` : `${analysis.reach.maxTheoreticalReachMm.toFixed(0)} mm`})
                </span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, analysis.reach.extensionRatio * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3x3 Rotation Matrix Card */}
          <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                Rotation Matrix R = [n, s, a]
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-bold border border-stone-300">
                  det(R) = {analysis.endEffector.rotationDeterminant.toFixed(5)}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-bold border border-emerald-300">
                  Orthogonal ✓
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {[0, 1, 2].map((r) => (
                <React.Fragment key={r}>
                  {[0, 1, 2].map((c) => {
                    const val = analysis.endEffector.rotationMatrix.get(r, c);
                    return (
                      <div
                        key={`${r}_${c}`}
                        className="p-2 bg-stone-50 border border-stone-200 rounded-lg text-right font-black text-black"
                      >
                        {val.toFixed(4)}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="text-[10px] text-stone-500 font-mono flex justify-between">
              <span>n = Normal (Col 0)</span>
              <span>s = Slide (Col 1)</span>
              <span>a = Approach (Col 2)</span>
            </div>
          </div>

          {/* Euler Angles Card */}
          <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                Euler Angles (Multiple Representations)
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                <div className="text-[10px] font-sans font-bold text-stone-600 mb-1">
                  Roll-Pitch-Yaw / XYZ: Rot_X(α) · Rot_Y(β) · Rot_Z(γ)
                </div>
                <div className="flex justify-between font-black text-black">
                  <span>α: {analysis.endEffector.eulerXYZ.deg[0].toFixed(2)}° ({analysis.endEffector.eulerXYZ.rad[0].toFixed(3)} rad)</span>
                  <span>β: {analysis.endEffector.eulerXYZ.deg[1].toFixed(2)}° ({analysis.endEffector.eulerXYZ.rad[1].toFixed(3)} rad)</span>
                  <span>γ: {analysis.endEffector.eulerXYZ.deg[2].toFixed(2)}° ({analysis.endEffector.eulerXYZ.rad[2].toFixed(3)} rad)</span>
                </div>
              </div>

              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                <div className="text-[10px] font-sans font-bold text-stone-600 mb-1">
                  Aeronautical ZYX: Yaw(ψ) · Pitch(θ) · Roll(φ)
                </div>
                <div className="flex justify-between font-black text-black">
                  <span>ψ: {analysis.endEffector.eulerZYX.deg[0].toFixed(2)}° ({analysis.endEffector.eulerZYX.rad[0].toFixed(3)} rad)</span>
                  <span>θ: {analysis.endEffector.eulerZYX.deg[1].toFixed(2)}° ({analysis.endEffector.eulerZYX.rad[1].toFixed(3)} rad)</span>
                  <span>φ: {analysis.endEffector.eulerZYX.deg[2].toFixed(2)}° ({analysis.endEffector.eulerZYX.rad[2].toFixed(3)} rad)</span>
                </div>
              </div>

              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                <div className="text-[10px] font-sans font-bold text-stone-600 mb-1">
                  Euler ZYZ (Spherical Wrist Sequence):
                </div>
                <div className="flex justify-between font-black text-black">
                  <span>φ: {analysis.endEffector.eulerZYZ.deg[0].toFixed(2)}° ({analysis.endEffector.eulerZYZ.rad[0].toFixed(3)} rad)</span>
                  <span>θ: {analysis.endEffector.eulerZYZ.deg[1].toFixed(2)}° ({analysis.endEffector.eulerZYZ.rad[1].toFixed(3)} rad)</span>
                  <span>ψ: {analysis.endEffector.eulerZYZ.deg[2].toFixed(2)}° ({analysis.endEffector.eulerZYZ.rad[2].toFixed(3)} rad)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Unit Quaternion Card */}
          <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                Unit Quaternion q = [w, x, y, z]
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-bold border border-emerald-300">
                ||q|| = {analysis.endEffector.quaternion.norm.toFixed(5)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center font-mono">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-[10px] text-stone-500 font-sans font-bold">w (scalar)</span>
                <div className="text-sm font-black text-black mt-1">
                  {analysis.endEffector.quaternion.w.toFixed(4)}
                </div>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-[10px] text-stone-500 font-sans font-bold">x (vector)</span>
                <div className="text-sm font-black text-black mt-1">
                  {analysis.endEffector.quaternion.x.toFixed(4)}
                </div>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-[10px] text-stone-500 font-sans font-bold">y (vector)</span>
                <div className="text-sm font-black text-black mt-1">
                  {analysis.endEffector.quaternion.y.toFixed(4)}
                </div>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-[10px] text-stone-500 font-sans font-bold">z (vector)</span>
                <div className="text-sm font-black text-black mt-1">
                  {analysis.endEffector.quaternion.z.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] font-mono text-amber-950">
              q = {analysis.endEffector.quaternion.w.toFixed(4)} + {analysis.endEffector.quaternion.x.toFixed(4)}i + {analysis.endEffector.quaternion.y.toFixed(4)}j + {analysis.endEffector.quaternion.z.toFixed(4)}k
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MATRICES A & T */}
      {activeSubTab === 'matrices' && (
        <div className="space-y-4">
          {/* Frame Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 rounded-2xl border-2 border-stone-200 shadow-xs">
            <button
              onClick={() => setSelectedFrameIdx(0)}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                clampedFrameIdx === 0
                  ? 'bg-amber-400 text-black shadow-xs'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              Frame 0 (Base)
            </button>
            {robot.joints.map((_, idx) => {
              const fIdx = idx + 1;
              const isEE = fIdx === robot.dof;
              return (
                <button
                  key={fIdx}
                  onClick={() => setSelectedFrameIdx(fIdx)}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    clampedFrameIdx === fIdx
                      ? 'bg-amber-400 text-black shadow-xs'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Frame {fIdx} {isEE && '(EE)'}
                </button>
              );
            })}
          </div>

          {/* Matrix Detail Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Relative Transform A_i */}
            <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-black">
                    {clampedFrameIdx === 0 ? 'Base Transform (T_0)' : `Relative Transform A_${clampedFrameIdx}`}
                  </span>
                  <p className="text-[10px] text-stone-500 font-sans mt-0.5">
                    {clampedFrameIdx === 0
                      ? 'Coordinate system of Base'
                      : `From Frame ${clampedFrameIdx - 1} to Frame ${clampedFrameIdx}`}
                  </p>
                </div>
                {clampedFrameIdx > 0 && (
                  <button
                    onClick={() => {
                      const A = analysis.perJointBreakdown[clampedFrameIdx - 1]?.A;
                      if (A) handleCopySelectedMatrix(A.formatForDisplay(6).map((row) => row.map(parseFloat)));
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-black bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300 transition-all cursor-pointer"
                  >
                    {copiedType === 'matrix' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                )}
              </div>

              {clampedFrameIdx === 0 ? (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs text-center text-stone-600">
                  Identity Matrix (World Origin)
                </div>
              ) : (
                (() => {
                  const A = analysis.perJointBreakdown[clampedFrameIdx - 1]?.A;
                  if (!A) return null;
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right font-mono text-xs">
                        <tbody>
                          {[0, 1, 2, 3].map((r) => (
                            <tr key={r} className="border-b border-stone-100 last:border-none">
                              {[0, 1, 2, 3].map((c) => {
                                const val = A.get(r, c);
                                return (
                                  <td
                                    key={c}
                                    className={`py-2 px-2.5 font-bold ${
                                      c === 3 ? 'text-amber-800 bg-amber-50/50' : 'text-black'
                                    }`}
                                  >
                                    {val.toFixed(4)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Cumulative Transform T_0i */}
            <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-black">
                    Cumulative Transform T_0{clampedFrameIdx}
                  </span>
                  <p className="text-[10px] text-stone-500 font-sans mt-0.5">
                    From Base Frame 0 to Frame {clampedFrameIdx}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const T = clampedFrameIdx === 0
                      ? analysis.fk.frames[0]?.matrix
                      : analysis.perJointBreakdown[clampedFrameIdx - 1]?.T;
                    if (T) handleCopySelectedMatrix(T.formatForDisplay(6).map((row) => row.map(parseFloat)));
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-black bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300 transition-all cursor-pointer"
                >
                  {copiedType === 'matrix' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>

              {(() => {
                const T = clampedFrameIdx === 0
                  ? analysis.fk.frames[0]?.matrix
                  : analysis.perJointBreakdown[clampedFrameIdx - 1]?.T;
                if (!T) return null;
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right font-mono text-xs">
                      <tbody>
                        {[0, 1, 2, 3].map((r) => (
                          <tr key={r} className="border-b border-stone-100 last:border-none">
                            {[0, 1, 2, 3].map((c) => {
                              const val = T.get(r, c);
                              return (
                                <td
                                  key={c}
                                  className={`py-2 px-2.5 font-bold ${
                                    c === 3 ? 'text-amber-800 bg-amber-50/50' : 'text-black'
                                  }`}
                                >
                                  {val.toFixed(4)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: JACOBIAN & SINGULARITY */}
      {activeSubTab === 'jacobian' && (
        <div className="space-y-4">
          {/* Metrics summary banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white border-2 border-stone-200 rounded-2xl shadow-xs text-center font-mono">
              <span className="text-[10px] text-stone-500 font-sans font-bold">Jacobian Rank</span>
              <div className="text-lg font-black text-black mt-0.5">
                {analysis.jacobian.rank} / {analysis.jacobian.taskRows}
              </div>
            </div>

            <div className="p-3.5 bg-white border-2 border-stone-200 rounded-2xl shadow-xs text-center font-mono">
              <span className="text-[10px] text-stone-500 font-sans font-bold">Condition Number κ</span>
              <div className="text-lg font-black text-black mt-0.5">
                {Number.isFinite(analysis.jacobian.conditionNumber)
                  ? analysis.jacobian.conditionNumber.toFixed(2)
                  : '∞ (Singular)'}
              </div>
            </div>

            <div className="p-3.5 bg-white border-2 border-stone-200 rounded-2xl shadow-xs text-center font-mono">
              <span className="text-[10px] text-stone-500 font-sans font-bold">Yoshikawa Manipulability w</span>
              <div className="text-lg font-black text-black mt-0.5">
                {analysis.jacobian.manipulability.toFixed(4)}
              </div>
            </div>

            <div className={`p-3.5 border-2 rounded-2xl shadow-xs text-center font-mono flex flex-col justify-center items-center ${
              analysis.jacobian.isSingular
                ? 'bg-amber-100 border-amber-300 text-amber-950'
                : 'bg-emerald-100 border-emerald-300 text-emerald-950'
            }`}>
              <div className="flex items-center gap-1.5 font-sans font-black text-xs">
                {analysis.jacobian.isSingular ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Singular State</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Feasible Pose</span>
                  </>
                )}
              </div>
              <span className="text-[10px] font-bold mt-0.5 opacity-80">
                {analysis.jacobian.isSingular ? 'Loss of DOF / Infinite velocity' : 'Non-singular workspace'}
              </span>
            </div>
          </div>

          {/* Singular Values Spectrum */}
          <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-black">
              Singular Values Spectrum σ_i (Eigenvalues of J J^T)
            </span>
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
              {analysis.jacobian.singularValues.map((sigma, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl font-bold text-black"
                >
                  σ_{idx + 1} = {sigma.toFixed(4)}
                </div>
              ))}
            </div>
          </div>

          {/* Geometric Jacobian Matrix Table (6 x n) */}
          <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                Geometric Jacobian Matrix J(q) [6 × {robot.dof}]
              </span>
              <button
                onClick={() => handleCopySelectedMatrix(analysis.jacobian.matrix)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-black bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300 transition-all cursor-pointer"
              >
                {copiedType === 'matrix' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Matrix</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-200 font-sans">
                    <th className="py-2 px-3 text-left font-black">DOF Row</th>
                    {robot.joints.map((j, idx) => (
                      <th key={idx} className="py-2 px-3 font-black">
                        J_{idx + 1} ({j.name})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {['v_x (m/s)', 'v_y (m/s)', 'v_z (m/s)', 'ω_x (rad/s)', 'ω_y (rad/s)', 'ω_z (rad/s)'].map((label, r) => (
                    <tr key={r} className={r === 3 ? 'border-t-2 border-amber-300' : ''}>
                      <td className="py-2 px-3 text-left font-bold text-stone-700 bg-stone-50 font-sans text-[11px]">
                        {label}
                      </td>
                      {analysis.jacobian.matrix[r].map((val, c) => (
                        <td
                          key={c}
                          className={`py-2 px-3 font-bold ${
                            Math.abs(val) < 1e-5
                              ? 'text-stone-300'
                              : val > 0
                              ? 'text-emerald-700'
                              : 'text-blue-700'
                          }`}
                        >
                          {val.toFixed(4)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: INVERSE KINEMATICS */}
      {activeSubTab === 'ik' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Target Configuration Card */}
          <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                Desired Cartesian Target Pose
              </span>
              <button
                onClick={handleResetIKTargetToCurrentEE}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-xs font-black transition-all cursor-pointer"
              >
                Target = Current EE
              </button>
            </div>

            {/* Dynamic Kinematics Mode Badge & Research Grounding Banner */}
            <div className="p-2.5 bg-[#faf8f5] border border-amber-300 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200 text-black font-black uppercase tracking-wider">
                  {ikSolverMode.badge}
                </span>
                <span className="text-[10px] font-mono font-bold text-stone-600">
                  Chain: {robot.dof} DOF
                </span>
              </div>
              <p className="text-[11px] text-stone-600 font-sans leading-relaxed">
                {ikSolverMode.description}
              </p>
            </div>

            {/* Position Inputs */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-stone-700">Target Position ({useSI ? 'meters' : 'millimeters'}):</span>
              <div className="grid grid-cols-3 gap-2 font-mono">
                <div>
                  <span className="text-[10px] text-stone-500 font-sans">X:</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      ikTargetDrafts.x !== undefined
                        ? ikTargetDrafts.x
                        : useSI
                        ? currentIKTargetMeters.x.toFixed(4)
                        : (currentIKTargetMeters.x * 1000).toFixed(1)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setIkTargetDrafts((prev) => ({ ...prev, x: raw }));
                      const num = parseFloat(raw);
                      if (Number.isFinite(num)) {
                        setCustomIKTarget({
                          ...currentIKTargetMeters,
                          x: useSI ? num : num / 1000,
                        });
                      }
                    }}
                    onBlur={() => {
                      setIkTargetDrafts((prev) => {
                        const next = { ...prev };
                        delete next.x;
                        return next;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full px-2 py-1 text-right text-xs font-bold border border-stone-300 rounded-lg bg-stone-50 focus:bg-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 font-sans">Y:</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      ikTargetDrafts.y !== undefined
                        ? ikTargetDrafts.y
                        : useSI
                        ? currentIKTargetMeters.y.toFixed(4)
                        : (currentIKTargetMeters.y * 1000).toFixed(1)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setIkTargetDrafts((prev) => ({ ...prev, y: raw }));
                      const num = parseFloat(raw);
                      if (Number.isFinite(num)) {
                        setCustomIKTarget({
                          ...currentIKTargetMeters,
                          y: useSI ? num : num / 1000,
                        });
                      }
                    }}
                    onBlur={() => {
                      setIkTargetDrafts((prev) => {
                        const next = { ...prev };
                        delete next.y;
                        return next;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full px-2 py-1 text-right text-xs font-bold border border-stone-300 rounded-lg bg-stone-50 focus:bg-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 font-sans">Z:</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      ikTargetDrafts.z !== undefined
                        ? ikTargetDrafts.z
                        : useSI
                        ? currentIKTargetMeters.z.toFixed(4)
                        : (currentIKTargetMeters.z * 1000).toFixed(1)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setIkTargetDrafts((prev) => ({ ...prev, z: raw }));
                      const num = parseFloat(raw);
                      if (Number.isFinite(num)) {
                        setCustomIKTarget({
                          ...currentIKTargetMeters,
                          z: useSI ? num : num / 1000,
                        });
                      }
                    }}
                    onBlur={() => {
                      setIkTargetDrafts((prev) => {
                        const next = { ...prev };
                        delete next.z;
                        return next;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full px-2 py-1 text-right text-xs font-bold border border-stone-300 rounded-lg bg-stone-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Orientation Inputs */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">Target Orientation Euler XYZ ({useSI ? 'radians' : 'degrees'}):</span>
                {!ikSolverMode.canControlRoll && !ikSolverMode.canControlPitch && !ikSolverMode.canControlYaw ? (
                  <span className="text-[10px] font-mono font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    Unconstrained (3-DOF Position)
                  </span>
                ) : !ikSolverMode.canControlRoll && !ikSolverMode.canControlPitch ? (
                  <span className="text-[10px] font-mono font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    Yaw Controllable • Roll/Pitch Free
                  </span>
                ) : !ikSolverMode.canControlRoll ? (
                  <span className="text-[10px] font-mono font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    Tool Vector Controllable • Roll Free
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                    Full SE(3) Active
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono">
                <div className={!ikSolverMode.canControlRoll ? 'opacity-50' : ''}>
                  <span className="text-[10px] text-stone-500 font-sans flex items-center justify-between">
                    <span>Roll (X):</span>
                    {!ikSolverMode.canControlRoll && <span className="text-[9px] text-stone-400 font-bold">Unconstrained</span>}
                  </span>
                  <input
                    type="text"
                    disabled={!ikSolverMode.canControlRoll}
                    inputMode="decimal"
                    value={
                      ikTargetDrafts.roll !== undefined
                        ? ikTargetDrafts.roll
                        : useSI
                        ? currentIKTargetMeters.roll.toFixed(4)
                        : (currentIKTargetMeters.roll * RAD_TO_DEG).toFixed(1)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setIkTargetDrafts((prev) => ({ ...prev, roll: raw }));
                      const num = parseFloat(raw);
                      if (Number.isFinite(num)) {
                        setCustomIKTarget({
                          ...currentIKTargetMeters,
                          roll: useSI ? num : num * DEG_TO_RAD,
                        });
                      }
                    }}
                    onBlur={() => {
                      setIkTargetDrafts((prev) => {
                        const next = { ...prev };
                        delete next.roll;
                        return next;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full px-2 py-1 text-right text-xs font-bold border border-stone-300 rounded-lg bg-stone-50 focus:bg-white disabled:bg-stone-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div className={!ikSolverMode.canControlPitch ? 'opacity-50' : ''}>
                  <span className="text-[10px] text-stone-500 font-sans flex items-center justify-between">
                    <span>Pitch (Y):</span>
                    {!ikSolverMode.canControlPitch && <span className="text-[9px] text-stone-400 font-bold">Unconstrained</span>}
                  </span>
                  <input
                    type="text"
                    disabled={!ikSolverMode.canControlPitch}
                    inputMode="decimal"
                    value={
                      ikTargetDrafts.pitch !== undefined
                        ? ikTargetDrafts.pitch
                        : useSI
                        ? currentIKTargetMeters.pitch.toFixed(4)
                        : (currentIKTargetMeters.pitch * RAD_TO_DEG).toFixed(1)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setIkTargetDrafts((prev) => ({ ...prev, pitch: raw }));
                      const num = parseFloat(raw);
                      if (Number.isFinite(num)) {
                        setCustomIKTarget({
                          ...currentIKTargetMeters,
                          pitch: useSI ? num : num * DEG_TO_RAD,
                        });
                      }
                    }}
                    onBlur={() => {
                      setIkTargetDrafts((prev) => {
                        const next = { ...prev };
                        delete next.pitch;
                        return next;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full px-2 py-1 text-right text-xs font-bold border border-stone-300 rounded-lg bg-stone-50 focus:bg-white disabled:bg-stone-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div className={!ikSolverMode.canControlYaw ? 'opacity-50' : ''}>
                  <span className="text-[10px] text-stone-500 font-sans flex items-center justify-between">
                    <span>Yaw (Z):</span>
                    {!ikSolverMode.canControlYaw && <span className="text-[9px] text-stone-400 font-bold">Unconstrained</span>}
                  </span>
                  <input
                    type="text"
                    disabled={!ikSolverMode.canControlYaw}
                    inputMode="decimal"
                    value={
                      ikTargetDrafts.yaw !== undefined
                        ? ikTargetDrafts.yaw
                        : useSI
                        ? currentIKTargetMeters.yaw.toFixed(4)
                        : (currentIKTargetMeters.yaw * RAD_TO_DEG).toFixed(1)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setIkTargetDrafts((prev) => ({ ...prev, yaw: raw }));
                      const num = parseFloat(raw);
                      if (Number.isFinite(num)) {
                        setCustomIKTarget({
                          ...currentIKTargetMeters,
                          yaw: useSI ? num : num * DEG_TO_RAD,
                        });
                      }
                    }}
                    onBlur={() => {
                      setIkTargetDrafts((prev) => {
                        const next = { ...prev };
                        delete next.yaw;
                        return next;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full px-2 py-1 text-right text-xs font-bold border border-stone-300 rounded-lg bg-stone-50 focus:bg-white disabled:bg-stone-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Solve IK Action Button */}
            <button
              onClick={handleSolveIK}
              disabled={ikSolving}
              className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-500 text-black font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 mt-3"
            >
              <Crosshair className="w-4 h-4" />
              <span>{ikSolving ? 'Solving Inverse Kinematics...' : 'Solve Inverse Kinematics for DH Chain'}</span>
            </button>
          </div>

          {/* IK Solution Result Card */}
          <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                IK Solution Status
              </span>
              {ikResultStats && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black border ${
                  ikResultStats.converged
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : 'bg-rose-100 text-rose-950 border-rose-300'
                }`}>
                  {ikResultStats.converged ? 'Converged ✓' : 'Failed to reach'}
                </span>
              )}
            </div>

            {ikResultStats ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                    <span className="text-[10px] text-stone-500 font-sans">Pos Error</span>
                    <div className="text-sm font-black text-black mt-0.5">
                      {Number.isFinite(ikResultStats.posErrorMm) ? `${ikResultStats.posErrorMm.toFixed(3)} mm` : 'Out of Reach'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                    <span className="text-[10px] text-stone-500 font-sans">Ori Error</span>
                    <div className="text-sm font-black text-black mt-0.5">
                      {robot.dof <= 3
                        ? 'Unconstrained'
                        : Number.isFinite(ikResultStats.oriErrorDeg)
                        ? `${ikResultStats.oriErrorDeg.toFixed(2)}°`
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                {!ikResultStats.converged && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] font-sans">
                    Target is beyond kinematic reach or requires unreachable orientation angles for this DH chain.
                  </div>
                )}

                {/* Solved Joint Angles */}
                {ikSolution && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-sans font-black text-stone-700">Solved Joint Angles:</span>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {ikSolution.q.map((solQ, idx) => {
                        const joint = robot.joints[idx];
                        const isRev = joint?.type === 'revolute';
                        const disp = isRev ? solQ * RAD_TO_DEG : solQ * 1000;
                        const unit = isRev ? (useSI ? 'rad' : '°') : (useSI ? 'm' : 'mm');
                        const valStr = useSI ? solQ.toFixed(4) : disp.toFixed(2);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 bg-stone-50 border border-stone-200 rounded-lg"
                          >
                            <span className="font-bold text-stone-700">J{idx + 1} ({joint?.name}):</span>
                            <span className="font-black text-black">{valStr} {unit}</span>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleApplyIKSolution}
                      className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 mt-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Apply Solved Angles to Simulation</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-stone-400 font-sans text-xs">
                Configure your desired target position and orientation, then click &quot;Solve Inverse Kinematics for DH Chain&quot;.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
