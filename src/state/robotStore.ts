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
  robotLoading: boolean;
  statusAnnouncement: string | null;
  setAnnouncement: (msg: string | null) => void;

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
  isEStopped: boolean;

  // UI / Viewport State
  activeTab: StudioTab;
  viewOptions: ViewOptions;

  // Actions
  selectRobot: (id: string) => Promise<void>;
  setRobot: (robot: RobotDefinition) => void;
  setJoints: (q: number[]) => void;
  setJointValue: (index: number, val: number) => void;
  resetToHome: () => void;
  setTargetPose: (pose: Matrix4, autoSolve?: boolean) => void;
  triggerSolveIK: (autoAnimate?: boolean, applySolution?: boolean) => void;
  applyIKSolution: (sol: IKSingleSolution, animate?: boolean) => void;

  // Trajectory Actions
  generateJointTraj: (goalQ: number[], duration: number, profile?: TrajectoryProfile) => void;
  generateCartesianTraj: (goalPose: Matrix4, duration: number, profile?: TrajectoryProfile) => void;
  loadThanksTraj: () => void;
  playTrajectory: () => void;
  pauseTrajectory: () => void;
  emergencyStop: () => void;
  resetEStop: () => void;
  resumeFromEStop: () => void;
  stopTrajectory: () => void;
  rewindTrajectory: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  seekTrajectory: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleLooping: () => void;

  // View Actions
  setActiveTab: (tab: StudioTab) => void;
  toggleViewOption: (key: keyof ViewOptions) => void;
  setViewOption: (key: keyof ViewOptions, value: boolean) => void;
  setFrameScale: (scale: number) => void;
  setCameraView: (view: CameraViewPreset) => void;
  setStepMode: (enabled: boolean) => void;
  setStepFrameIndex: (idx: number) => void;
}

let ikWorkerInstance: Worker | null = null;
let ikRequestId = 0;
let ikTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
let targetSolveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const pendingIKCallbacks = new Map<number, (res: SerializedIKResult) => void>();
let selectRobotGeneration = 0;

function getIKWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!ikWorkerInstance) {
    try {
      ikWorkerInstance = new Worker(new URL('../workers/ikWorker.ts', import.meta.url), {
        type: 'module',
      });
      ikWorkerInstance.onmessage = (e: MessageEvent<IKWorkerResponse>) => {
        if (e.data) {
          const cb = pendingIKCallbacks.get(e.data.id);
          if (cb) {
            pendingIKCallbacks.delete(e.data.id);
            cb(e.data.result);
          }
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
  robotLoading: false,
  statusAnnouncement: null,
  setAnnouncement: (msg: string | null) => set({ statusAnnouncement: msg }),

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
  isEStopped: false,

  activeTab: 'fk',
  viewOptions: initialViewOptions,

  selectRobot: async (id: string) => {
    const gen = ++selectRobotGeneration;
    try {
      set({ loadError: null, robotLoading: true, statusAnnouncement: `Loading robot model ${id}...` });
      const newRobot = await loadRobotById(id);
      if (gen !== selectRobotGeneration) return;
      get().setRobot(newRobot);
      saveSettings({ selectedRobotId: id });
      set({ statusAnnouncement: `Robot ${newRobot.name} (${newRobot.dof} DOF) loaded successfully.` });
    } catch (err) {
      if (gen !== selectRobotGeneration) return;
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Failed to switch robot:', err);
      set({
        loadError: `Failed to load robot "${id}": ${msg}`,
        statusAnnouncement: `Failed to load robot "${id}": ${msg}`,
      });
    } finally {
      if (gen === selectRobotGeneration) {
        set({ robotLoading: false });
      }
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
    set({ statusAnnouncement: 'Robot reset to home configuration.' });
  },

  setTargetPose: (pose: Matrix4, autoSolve: boolean = true) => {
    set({ targetPose: pose });
    if (get().activeTab === 'ik' && autoSolve) {
      if (targetSolveDebounceTimer) clearTimeout(targetSolveDebounceTimer);
      targetSolveDebounceTimer = setTimeout(() => {
        get().triggerSolveIK(false, false);
      }, 120);
    }
  },

  triggerSolveIK: (autoAnimate: boolean = false, applySolution: boolean = true) => {
    const { robot, targetPose, q } = get();
    set({ ikSolving: true, statusAnnouncement: 'Solving inverse kinematics...' });

    // Cancel any pending background debounce timer to prevent overriding explicit solve requests
    if (targetSolveDebounceTimer) {
      clearTimeout(targetSolveDebounceTimer);
      targetSolveDebounceTimer = null;
    }

    if (ikTimeoutTimer) {
      clearTimeout(ikTimeoutTimer);
      ikTimeoutTimer = null;
    }

    const currentReqId = ++ikRequestId;

    // 1500ms safety watchdog: guarantees ikSolving is reset even if worker stalls
    ikTimeoutTimer = setTimeout(() => {
      if (ikRequestId === currentReqId) {
        console.warn('IK calculation timed out after 1500ms.');
        pendingIKCallbacks.delete(currentReqId);
        set({ ikSolving: false, statusAnnouncement: 'IK calculation timed out after 1500ms.' });
      }
    }, 1500);

    const worker = getIKWorker();
    if (worker) {
      // Clear previous callbacks so outdated results are dropped
      pendingIKCallbacks.clear();

      pendingIKCallbacks.set(currentReqId, (res) => {
        if (ikTimeoutTimer) {
          clearTimeout(ikTimeoutTimer);
          ikTimeoutTimer = null;
        }
        const pipelineResult: IKPipelineResult = {
          target: new Matrix4(res.targetElements),
          solutions: res.solutions,
          bestSolution: res.bestSolution,
          converged: res.converged,
          computationTimeMs: res.computationTimeMs,
          allTestedBranches: res.allTestedBranches,
          failureReason: res.failureReason,
        };
        const statusMsg = pipelineResult.converged && pipelineResult.bestSolution
          ? `IK solved successfully in ${pipelineResult.computationTimeMs.toFixed(0)}ms (error: ${(pipelineResult.bestSolution.positionError * 1000).toFixed(1)}mm).`
          : `IK solve failed: ${pipelineResult.failureReason || 'Target unreachable or outside joint limits.'}`;
        set({ ikResult: pipelineResult, ikSolving: false, statusAnnouncement: statusMsg });

        if (applySolution && pipelineResult.bestSolution && pipelineResult.converged) {
          get().applyIKSolution(pipelineResult.bestSolution, autoAnimate);
        }
      });

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
        const statusMsg = result.converged && result.bestSolution
          ? `IK solved successfully in ${result.computationTimeMs.toFixed(0)}ms (error: ${(result.bestSolution.positionError * 1000).toFixed(1)}mm).`
          : `IK solve failed: ${result.failureReason || 'Target unreachable or outside joint limits.'}`;
        set({ ikResult: result, ikSolving: false, statusAnnouncement: statusMsg });
        if (applySolution && result.bestSolution && result.converged) {
          get().applyIKSolution(result.bestSolution, autoAnimate);
        }
      } catch (err) {
        console.error('IK solve error:', err);
        if (ikTimeoutTimer) {
          clearTimeout(ikTimeoutTimer);
          ikTimeoutTimer = null;
        }
        set({ ikSolving: false, statusAnnouncement: 'IK solver encountered an error.' });
      }
    }
  },

  applyIKSolution: (sol: IKSingleSolution, animate: boolean = true) => {
    if (!sol || !Array.isArray(sol.q) || sol.q.length === 0) return;
    const { robot, q } = get();
    for (let i = 0; i < robot.dof; i++) {
      if (!Number.isFinite(sol.q[i])) {
        console.warn('IK solution contains non-finite joint value at index', i, sol.q);
        return;
      }
    }

    if (animate) {
      let maxDiff = 0;
      for (let i = 0; i < robot.dof; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(sol.q[i] - (q[i] ?? 0)));
      }
      if (maxDiff < 1e-4) {
        get().setJoints(sol.q);
        return;
      }
      // Dynamic duration based on displacement (between 0.6s and 1.8s)
      const duration = Math.min(1.8, Math.max(0.6, maxDiff * 0.5));
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
    const willPlay = Boolean(traj.isValid);
    set({
      activeTrajectory: traj,
      playback: { ...get().playback, isPlaying: willPlay, currentTime: 0 },
      statusAnnouncement: willPlay
        ? `Joint trajectory generated with ${traj.states.length} waypoints.`
        : `Joint trajectory failed: ${traj.failureReason || 'Invalid parameters.'}`,
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
    const willPlay = Boolean(traj.isValid && !traj.hasIKFailure);
    set({
      activeTrajectory: traj,
      playback: { ...get().playback, isPlaying: willPlay, currentTime: 0 },
      statusAnnouncement: willPlay
        ? `Cartesian trajectory generated with ${traj.states.length} waypoints.`
        : `Cartesian trajectory failed: ${traj.failureReason || 'Path unreachable or exceeds joint limits.'}`,
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
        // Compute real numerical derivatives for velocities and accelerations across actual timing (dt = 0.05s)
        const dt = 0.05;
        const trajDuration = (nSteps - 1) * dt;

        for (let k = 0; k < nSteps; k++) {
          const v = new Array(robot.dof).fill(0);
          const a = new Array(robot.dof).fill(0);

          if (nSteps >= 2) {
            if (k === 0) {
              for (let j = 0; j < robot.dof; j++) {
                v[j] = (positions[1][j] - positions[0][j]) / dt;
                if (nSteps >= 3) {
                  a[j] = (positions[2][j] - 2 * positions[1][j] + positions[0][j]) / (dt * dt);
                }
              }
            } else if (k === nSteps - 1) {
              for (let j = 0; j < robot.dof; j++) {
                v[j] = (positions[nSteps - 1][j] - positions[nSteps - 2][j]) / dt;
                if (nSteps >= 3) {
                  a[j] = (positions[nSteps - 1][j] - 2 * positions[nSteps - 2][j] + positions[nSteps - 3][j]) / (dt * dt);
                }
              }
            } else {
              for (let j = 0; j < robot.dof; j++) {
                v[j] = (positions[k + 1][j] - positions[k - 1][j]) / (2 * dt);
                a[j] = (positions[k + 1][j] - 2 * positions[k][j] + positions[k - 1][j]) / (dt * dt);
              }
            }
          }

          velocities[k] = v;
          accelerations[k] = a;
          states[k].qDot = v;
          states[k].qDdot = a;
        }

        const traj: TrajectoryDataset = {
          duration: trajDuration,
          timeSteps,
          positions,
          velocities,
          accelerations,
          endEffectorPositions,
          endEffectorOrientations,
          manipulabilities,
          conditionNumbers,
          states,
          isValid: true,
          hasIKFailure: false,
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
    if (get().isEStopped) return;
    set({ playback: { ...get().playback, isPlaying: true }, statusAnnouncement: 'Trajectory playback playing.' });
  },

  pauseTrajectory: () => {
    set({ playback: { ...get().playback, isPlaying: false }, statusAnnouncement: 'Trajectory playback paused.' });
  },

  emergencyStop: () => {
    // Halts immediately while strictly preserving current joint pose and playback time
    set({
      isEStopped: true,
      playback: { ...get().playback, isPlaying: false },
      statusAnnouncement: 'EMERGENCY STOP engaged. All robot motion is halted and pose preserved.',
    });
  },

  resetEStop: () => {
    set({ isEStopped: false, statusAnnouncement: 'Emergency stop cleared.' });
  },

  resumeFromEStop: () => {
    set({
      isEStopped: false,
      playback: { ...get().playback, isPlaying: true },
      statusAnnouncement: 'Resumed trajectory playback from emergency stop.',
    });
  },

  stopTrajectory: () => {
    set({
      isEStopped: false,
      playback: { ...get().playback, isPlaying: false, currentTime: 0 },
      statusAnnouncement: 'Trajectory playback stopped and reset to time zero.',
    });
    get().seekTrajectory(0);
  },

  rewindTrajectory: () => {
    const { activeTrajectory } = get();
    if (!activeTrajectory) return;
    set({
      playback: { ...get().playback, isPlaying: false, currentTime: 0 },
      statusAnnouncement: 'Trajectory rewound to start (time 0.0s).',
    });
    get().seekTrajectory(0);
  },

  stepForward: () => {
    if (get().isEStopped) return;
    const { activeTrajectory, playback } = get();
    if (!activeTrajectory || activeTrajectory.states.length === 0) return;
    const dt = activeTrajectory.timeSteps.length > 1
      ? (activeTrajectory.timeSteps[1] - activeTrajectory.timeSteps[0])
      : (activeTrajectory.duration / Math.max(1, activeTrajectory.states.length - 1));
    get().seekTrajectory(Math.min(playback.currentTime + dt, activeTrajectory.duration));
  },

  stepBackward: () => {
    if (get().isEStopped) return;
    const { activeTrajectory, playback } = get();
    if (!activeTrajectory || activeTrajectory.states.length === 0) return;
    const dt = activeTrajectory.timeSteps.length > 1
      ? (activeTrajectory.timeSteps[1] - activeTrajectory.timeSteps[0])
      : (activeTrajectory.duration / Math.max(1, activeTrajectory.states.length - 1));
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

  setViewOption: (key: keyof ViewOptions, value: boolean) => {
    const { viewOptions } = get();
    const updated = {
      ...viewOptions,
      [key]: value,
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
