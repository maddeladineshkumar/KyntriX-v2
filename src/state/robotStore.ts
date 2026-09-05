import { create } from 'zustand';
import type { RobotDefinition, FKResult, JacobianResult } from '../data/schema/robotSchema';
import { getDefaultRobot, loadRobotById } from '../data/robots';
import { computeFK } from '../robotics/kinematics/forwardKinematics';
import { computeJacobian } from '../robotics/kinematics/jacobian';
import { Matrix4 } from '../robotics/math/Matrix4';
import { Vector3 } from '../robotics/math/Vector3';
import { Euler } from '../robotics/math/Euler';
import { solveIK } from '../robotics/ik/ikPipeline';
import type { IKPipelineResult, IKSingleSolution } from '../robotics/ik/types';
import type { IKWorkerResponse, IKWorkerRequest, SerializedIKResult } from '../workers/ikWorker';
import { generateJointTrajectory } from '../robotics/trajectories/jointTrajectory';
import { generateCartesianTrajectory } from '../robotics/trajectories/cartesianTrajectory';
import type { TrajectoryDataset, TrajectoryProfile } from '../robotics/trajectories/types';
import thanksJson from '../data/robots/thanksTrajectory.json';
import { saveSettings, loadSettings } from './persistence';

export type StudioTab = 'fk' | 'ik' | 'dh' | 'transform' | 'trajectory' | 'analysis' | 'catalog' | 'custom' | 'workspace';
export type CameraViewPreset =
  | 'home'
  | 'top'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'bottom'
  | 'isometric'
  | 'side'
  | 'fit-robot';

export interface TrajectoryPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  isLooping: boolean;
}

export interface ViewOptions {
  showFrames: boolean;
  showMeshes: boolean;
  showTrace: boolean;
  showTargetGizmo: boolean;
  showDebug: boolean;
  stepMode: boolean;
  stepFrameIndex: number;
  frameScale: number;
  cameraView: CameraViewPreset;
}

export interface RobotState {
  robot: RobotDefinition;
  q: number[];
  fkResult: FKResult;
  jacobian: JacobianResult;

  // Error / Loading status
  loadError: string | null;
  clearLoadError: () => void;

  // IK State
  targetPose: Matrix4;
  ikResult: IKPipelineResult | null;
  ikSolving: boolean;

  // Workspace Sampling State
  workspacePoints: { x: number; y: number; z: number }[] | null;
  setWorkspacePoints: (pts: { x: number; y: number; z: number }[] | null) => void;
  clearWorkspacePoints: () => void;

  // Trajectory State
  activeTrajectory: TrajectoryDataset | null;
  playback: TrajectoryPlaybackState;
  thanksLoadingProgress: number | null;

  // UI / Viewport State
  activeTab: StudioTab;
  viewOptions: ViewOptions;

  // Actions
  selectRobot: (id: string) => Promise<void>;
  setRobot: (robot: RobotDefinition) => void;
  setJoints: (q: number[]) => void;
  setJointValue: (index: number, val: number) => void;
  resetToHome: () => void;
  setTargetPose: (pose: Matrix4) => void;
  triggerSolveIK: (autoAnimate?: boolean) => void;
  applyIKSolution: (sol: IKSingleSolution, animate?: boolean) => void;

  // Trajectory Actions
  generateJointTraj: (goalQ: number[], duration: number, profile?: TrajectoryProfile) => void;
  generateCartesianTraj: (goalPose: Matrix4, duration: number, profile?: TrajectoryProfile) => void;
  loadThanksTraj: () => void;
  playTrajectory: () => void;
  pauseTrajectory: () => void;
  stopTrajectory: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  seekTrajectory: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleLooping: () => void;

  // View Actions
  setActiveTab: (tab: StudioTab) => void;
  toggleViewOption: (key: keyof ViewOptions) => void;
  setFrameScale: (scale: number) => void;
  setCameraView: (view: CameraViewPreset) => void;
  setStepMode: (enabled: boolean) => void;
  setStepFrameIndex: (idx: number) => void;
}

let ikWorkerInstance: Worker | null = null;
let ikRequestId = 0;
let ikTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
let targetSolveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let activeIKCallback: ((res: SerializedIKResult, reqId: number) => void) | null = null;

function getIKWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!ikWorkerInstance) {
    try {
      ikWorkerInstance = new Worker(new URL('../workers/ikWorker.ts', import.meta.url), {
        type: 'module',
      });
      ikWorkerInstance.onmessage = (e: MessageEvent<IKWorkerResponse>) => {
        if (activeIKCallback && e.data) {
          activeIKCallback(e.data.result, e.data.id);
        }
      };
      ikWorkerInstance.onerror = (err) => {
        console.warn('IK Web Worker encountered an error:', err);
      };
    } catch (e) {
      console.warn('Could not initialize IK Web Worker, using synchronous fallback:', e);
      return null;
    }
  }
  return ikWorkerInstance;
}

// Restore persisted settings if available
const persisted = loadSettings();
const initialRobot = getDefaultRobot();
const initialQ = initialRobot.joints.map((j) => (j.home !== undefined ? j.home : (j.min + j.max) / 2));
const initialFK = computeFK(initialRobot, initialQ);
const initialJacobian = computeJacobian(initialRobot, initialQ, initialFK);
const initialTarget = initialFK.endEffectorTransform.clone();

const initialViewOptions: ViewOptions = {
  showFrames: true,
  showMeshes: true,
  showTrace: true,
  showTargetGizmo: false,
  showDebug: false,
  stepMode: false,
  stepFrameIndex: initialRobot.dof,
  frameScale: 0.12,
  cameraView: 'home',
  ...(persisted?.viewOptions ?? {}),
};

export const useRobotStore = create<RobotState>((set, get) => ({
  robot: initialRobot,
  q: initialQ,
  fkResult: initialFK,
  jacobian: initialJacobian,

  loadError: null,
  clearLoadError: () => set({ loadError: null }),

  targetPose: initialTarget,
  ikResult: null,
  ikSolving: false,

  workspacePoints: null,
  setWorkspacePoints: (pts) => set({ workspacePoints: pts }),
  clearWorkspacePoints: () => set({ workspacePoints: null }),

  activeTrajectory: null,
  playback: {
    isPlaying: false,
    currentTime: 0,
    speed: 1.0,
    isLooping: true,
  },
  thanksLoadingProgress: null,

  activeTab: 'fk',
  viewOptions: initialViewOptions,

  selectRobot: async (id: string) => {
    try {
      set({ loadError: null });
      const newRobot = await loadRobotById(id);
      get().setRobot(newRobot);
      saveSettings({ selectedRobotId: id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Failed to switch robot:', err);
      set({ loadError: `Failed to load robot "${id}": ${msg}` });
    }
  },

  setRobot: (newRobot: RobotDefinition) => {
    const prevQ = get().q;
    const sameRobot = get().robot && get().robot.id === newRobot.id;
    const q = newRobot.joints.map((j, idx) => {
      if (sameRobot && prevQ && idx < prevQ.length && Number.isFinite(prevQ[idx])) {
        return Math.max(j.min, Math.min(j.max, prevQ[idx]));
      }
      return j.home !== undefined ? j.home : (j.min + j.max) / 2;
    });
    const fkResult = computeFK(newRobot, q);
    const jacobian = computeJacobian(newRobot, q, fkResult);
    const targetPose = fkResult.endEffectorTransform.clone();

    set({
      robot: newRobot,
      q,
      fkResult,
      jacobian,
      targetPose,
      ikResult: null,
      activeTrajectory: null,
      workspacePoints: null,
      playback: { ...get().playback, isPlaying: false, currentTime: 0 },
      viewOptions: {
        ...get().viewOptions,
        stepFrameIndex: Math.min(get().viewOptions.stepFrameIndex, newRobot.dof),
      },
    });
  },

  setJoints: (newQ: number[]) => {
    const { robot } = get();
    const fkResult = computeFK(robot, newQ);
    const jacobian = computeJacobian(robot, newQ, fkResult);
    set({ q: newQ, fkResult, jacobian });
  },

  setJointValue: (index: number, val: number) => {
    const { q, setJoints } = get();
    const nextQ = [...q];
    nextQ[index] = val;
    setJoints(nextQ);
  },

  resetToHome: () => {
    const { robot, setJoints } = get();
    const homeQ = robot.joints.map((j) => (j.home !== undefined ? j.home : (j.min + j.max) / 2));
    setJoints(homeQ);
  },

  setTargetPose: (pose: Matrix4) => {
    set({ targetPose: pose });
    if (get().activeTab === 'ik') {
      if (targetSolveDebounceTimer) clearTimeout(targetSolveDebounceTimer);
      targetSolveDebounceTimer = setTimeout(() => {
        get().triggerSolveIK(false);
      }, 120);
    }
  },

  triggerSolveIK: (autoAnimate: boolean = false) => {
    const { robot, targetPose, q } = get();
    set({ ikSolving: true });

    if (ikTimeoutTimer) {
      clearTimeout(ikTimeoutTimer);
      ikTimeoutTimer = null;
    }

    const currentReqId = ++ikRequestId;

    // 1500ms safety watchdog: guarantees ikSolving is reset even if worker stalls
    ikTimeoutTimer = setTimeout(() => {
      if (ikRequestId === currentReqId) {
        console.warn('IK calculation timed out after 1500ms.');
        set({ ikSolving: false });
      }
    }, 1500);

    const worker = getIKWorker();
    if (worker) {
      activeIKCallback = (res, reqId) => {
        if (reqId !== currentReqId) return;
        if (ikTimeoutTimer) {
          clearTimeout(ikTimeoutTimer);
          ikTimeoutTimer = null;
        }
        activeIKCallback = null;
        const pipelineResult: IKPipelineResult = {
          target: new Matrix4(res.targetElements),
          solutions: res.solutions,
          bestSolution: res.bestSolution,
          converged: res.converged,
          computationTimeMs: res.computationTimeMs,
          allTestedBranches: res.allTestedBranches,
          failureReason: res.failureReason,
        };
        set({ ikResult: pipelineResult, ikSolving: false });

        if (autoAnimate && pipelineResult.bestSolution && pipelineResult.converged) {
          get().applyIKSolution(pipelineResult.bestSolution, true);
        }
      };

      const req: IKWorkerRequest = {
        id: currentReqId,
        robot,
        targetElements: Array.from(targetPose.elements),
        options: {
          initialGuess: q,
          currentJoints: q,
          returnAllBranches: true,
        },
      };
      worker.postMessage(req);
    } else {
      // Synchronous fallback
      try {
        const result = solveIK(robot, targetPose, {
          initialGuess: q,
          currentJoints: q,
          returnAllBranches: true,
        });
        if (ikTimeoutTimer) {
          clearTimeout(ikTimeoutTimer);
          ikTimeoutTimer = null;
        }
        set({ ikResult: result, ikSolving: false });
        if (autoAnimate && result.bestSolution && result.converged) {
          get().applyIKSolution(result.bestSolution, true);
        }
      } catch (err) {
        console.error('IK solve error:', err);
        if (ikTimeoutTimer) {
          clearTimeout(ikTimeoutTimer);
          ikTimeoutTimer = null;
        }
        set({ ikSolving: false });
      }
    }
  },

  applyIKSolution: (sol: IKSingleSolution, animate: boolean = true) => {
    if (animate) {
      const { robot, q } = get();
      let maxDiff = 0;
      for (let i = 0; i < robot.dof; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(sol.q[i] - (q[i] ?? 0)));
      }
      if (maxDiff < 1e-3) {
        get().setJoints(sol.q);
        return;
      }
      // Dynamic duration based on displacement (between 0.8s and 1.8s)
      const duration = Math.min(1.8, Math.max(0.8, maxDiff * 0.5));
      const traj = generateJointTrajectory(robot, {
        startQ: q,
        goalQ: sol.q,
        duration,
        profile: 'quintic',
        samples: 60,
      });
      set({
        activeTrajectory: traj,
        playback: {
          ...get().playback,
          isPlaying: true,
          currentTime: 0,
          isLooping: false,
        },
      });
    } else {
      get().setJoints(sol.q);
    }
  },

  generateJointTraj: (goalQ: number[], duration: number, profile: TrajectoryProfile = 'quintic') => {
    const { robot, q } = get();
    const traj = generateJointTrajectory(robot, {
      startQ: q,
      goalQ,
      duration,
      profile,
      samples: 120,
    });
    set({
      activeTrajectory: traj,
      playback: { ...get().playback, isPlaying: true, currentTime: 0 },
    });
  },

  generateCartesianTraj: (goalPose: Matrix4, duration: number, profile: TrajectoryProfile = 'quintic') => {
    const { robot, q, fkResult } = get();
    const startPose = fkResult.endEffectorTransform;
    const traj = generateCartesianTrajectory(robot, {
      startPose,
      goalPose,
      startQ: q,
      duration,
      profile,
      samples: 80,
    });
    set({
      activeTrajectory: traj,
      playback: { ...get().playback, isPlaying: true, currentTime: 0 },
    });
  },

  loadThanksTraj: () => {
    const { robot, q: currentQ } = get();
    interface ThanksWp {
      index: number;
      position: number[];
      euler: number[];
    }
    const waypoints = (thanksJson as unknown as { waypoints: ThanksWp[] }).waypoints;
    const nSteps = waypoints.length;
    const duration = nSteps * 0.05; // ~14 seconds
    const timeSteps: number[] = [];
    const positions: number[][] = [];
    const velocities: number[][] = [];
    const accelerations: number[][] = [];
    const endEffectorPositions: Vector3[] = [];
    const endEffectorOrientations: Euler[] = [];
    const manipulabilities: number[] = [];
    const conditionNumbers: number[] = [];
    const states: TrajectoryDataset['states'] = [];

    let seedQ = [...currentQ];
    const batchSize = 25;
    let currentK = 0;

    set({ thanksLoadingProgress: 0 });

    const processBatch = () => {
      const endK = Math.min(currentK + batchSize, nSteps);

      for (let k = currentK; k < endK; k++) {
        const t = k * 0.05;
        const wp = waypoints[k];
        const p = new Vector3(wp.position[0], wp.position[1], wp.position[2]);
        const euler = new Euler(wp.euler[0], wp.euler[1], wp.euler[2], 'XYZ');
        const R = euler.toRotationMatrix();
        const targetT = Matrix4.fromRotationTranslation(R, p);

        const ik = solveIK(robot, targetT, {
          initialGuess: seedQ,
          currentJoints: seedQ,
          maxIterations: 40,
        });

        if (ik.bestSolution) {
          seedQ = [...ik.bestSolution.q];
        }

        const fk = computeFK(robot, seedQ);
        const jac = computeJacobian(robot, seedQ, fk);

        timeSteps.push(t);
        positions.push(seedQ);
        velocities.push(new Array(robot.dof).fill(0));
        accelerations.push(new Array(robot.dof).fill(0));
        endEffectorPositions.push(fk.endEffectorTransform.getPosition());
        endEffectorOrientations.push(fk.endEffectorPose.euler);
        manipulabilities.push(jac.manipulability);
        conditionNumbers.push(jac.conditionNumber);

        states.push({
          time: t,
          q: seedQ,
          qDot: new Array(robot.dof).fill(0),
          qDdot: new Array(robot.dof).fill(0),
          endEffectorTransform: fk.endEffectorTransform,
          position: fk.endEffectorTransform.getPosition(),
          euler: fk.endEffectorPose.euler,
          manipulability: jac.manipulability,
          conditionNumber: jac.conditionNumber,
        });
      }

      currentK = endK;
      const progress = Math.round((currentK / nSteps) * 100);
      set({ thanksLoadingProgress: progress });

      if (currentK < nSteps) {
        setTimeout(processBatch, 0);
      } else {
        const traj: TrajectoryDataset = {
          duration,
          timeSteps,
          positions,
          velocities,
          accelerations,
          endEffectorPositions,
          endEffectorOrientations,
          manipulabilities,
          conditionNumbers,
          states,
        };

        set({
          activeTrajectory: traj,
          playback: { ...get().playback, isPlaying: true, currentTime: 0 },
          thanksLoadingProgress: null,
        });
      }
    };

    processBatch();
  },

  playTrajectory: () => {
    set({ playback: { ...get().playback, isPlaying: true } });
  },

  pauseTrajectory: () => {
    set({ playback: { ...get().playback, isPlaying: false } });
  },

  stopTrajectory: () => {
    set({ playback: { ...get().playback, isPlaying: false, currentTime: 0 } });
    get().seekTrajectory(0);
  },

  stepForward: () => {
    const { activeTrajectory, playback } = get();
    if (!activeTrajectory || activeTrajectory.states.length === 0) return;
    const dt = activeTrajectory.duration / activeTrajectory.states.length;
    get().seekTrajectory(Math.min(playback.currentTime + dt, activeTrajectory.duration));
  },

  stepBackward: () => {
    const { activeTrajectory, playback } = get();
    if (!activeTrajectory || activeTrajectory.states.length === 0) return;
    const dt = activeTrajectory.duration / activeTrajectory.states.length;
    get().seekTrajectory(Math.max(playback.currentTime - dt, 0));
  },

  seekTrajectory: (time: number) => {
    const { activeTrajectory, setJoints } = get();
    if (!activeTrajectory || activeTrajectory.states.length === 0) return;

    const clampedTime = Math.max(0, Math.min(activeTrajectory.duration, time));
    const timeSteps = activeTrajectory.timeSteps;
    const positions = activeTrajectory.positions;

    // Linear interpolation between surrounding sample points (BUG-05 fix)
    if (clampedTime <= timeSteps[0]) {
      setJoints(positions[0]);
    } else if (clampedTime >= timeSteps[timeSteps.length - 1]) {
      setJoints(positions[positions.length - 1]);
    } else {
      // Find surrounding indices k0 and k1
      let k0 = 0;
      let k1 = timeSteps.length - 1;
      while (k0 <= k1) {
        const mid = Math.floor((k0 + k1) / 2);
        if (timeSteps[mid] <= clampedTime) {
          k0 = mid + 1;
        } else {
          k1 = mid - 1;
        }
      }
      const idx0 = Math.max(0, k1);
      const idx1 = Math.min(timeSteps.length - 1, idx0 + 1);

      const t0 = timeSteps[idx0];
      const t1 = timeSteps[idx1];
      const dt = t1 - t0;
      const alpha = dt > 1e-6 ? (clampedTime - t0) / dt : 0;

      const q0 = positions[idx0];
      const q1 = positions[idx1];
      const dof = q0.length;
      const interpolatedQ = new Array(dof);
      for (let j = 0; j < dof; j++) {
        interpolatedQ[j] = q0[j] + alpha * (q1[j] - q0[j]);
      }
      setJoints(interpolatedQ);
    }

    set({ playback: { ...get().playback, currentTime: clampedTime } });
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playback: { ...get().playback, speed } });
  },

  toggleLooping: () => {
    const { playback } = get();
    set({ playback: { ...playback, isLooping: !playback.isLooping } });
  },

  setActiveTab: (tab: StudioTab) => {
    const { viewOptions } = get();
    set({
      activeTab: tab,
      viewOptions: {
        ...viewOptions,
        showTargetGizmo: tab === 'ik',
      },
    });
  },

  toggleViewOption: (key: keyof ViewOptions) => {
    const { viewOptions } = get();
    const updated = {
      ...viewOptions,
      [key]: !viewOptions[key],
    };
    set({ viewOptions: updated });
    saveSettings({ viewOptions: updated });
  },

  setFrameScale: (scale: number) => {
    const { viewOptions } = get();
    const updated = { ...viewOptions, frameScale: scale };
    set({ viewOptions: updated });
    saveSettings({ viewOptions: updated });
  },

  setCameraView: (view: CameraViewPreset) => {
    const { viewOptions } = get();
    const updated = { ...viewOptions, cameraView: view };
    set({ viewOptions: updated });
    saveSettings({ viewOptions: updated });
  },

  setStepMode: (enabled: boolean) => {
    const { viewOptions, robot } = get();
    set({
      viewOptions: {
        ...viewOptions,
        stepMode: enabled,
        stepFrameIndex: enabled ? 1 : robot.dof,
      },
    });
  },

  setStepFrameIndex: (idx: number) => {
    const { viewOptions, robot } = get();
    const clamped = Math.max(0, Math.min(robot.dof, idx));
    set({
      viewOptions: {
        ...viewOptions,
        stepFrameIndex: clamped,
      },
    });
  },
}));
