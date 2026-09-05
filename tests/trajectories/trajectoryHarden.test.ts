import { describe, it, expect, beforeEach } from 'vitest';
import { generateJointTrajectory } from '../../src/robotics/trajectories/jointTrajectory';
import { generateCartesianTrajectory } from '../../src/robotics/trajectories/cartesianTrajectory';
import { useRobotStore } from '../../src/state/robotStore';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import { Matrix4 } from '../../src/robotics/math';
import pumaJson from '../../src/data/robots/Puma560.json';
import skeleton3RJson from '../../src/data/robots/skeleton_3R.json';

const pumaRobot = pumaJson as unknown as RobotDefinition;
const robot3R = skeleton3RJson as unknown as RobotDefinition;

describe('Trajectory Hardening & Emergency Stop Tests', () => {
  beforeEach(() => {
    const store = useRobotStore.getState();
    store.setRobot(pumaRobot);
    store.resetToHome();
  });

  it('rejects invalid duration or sample count in joint trajectory', () => {
    const startQ = [0, 0, 0];
    const goalQ = [0.1, 0.2, 0.3];

    const badDuration = generateJointTrajectory(robot3R, {
      startQ,
      goalQ,
      duration: -1.0,
      samples: 50,
    });
    expect(badDuration.isValid).toBe(false);
    expect(badDuration.failureReason).toBeDefined();

    const zeroDuration = generateJointTrajectory(robot3R, {
      startQ,
      goalQ,
      duration: 0,
      samples: 50,
    });
    expect(zeroDuration.isValid).toBe(false);

    const badSamples = generateJointTrajectory(robot3R, {
      startQ,
      goalQ,
      duration: 2.0,
      samples: 1,
    });
    expect(badSamples.isValid).toBe(false);

    const nonFiniteQ = generateJointTrajectory(robot3R, {
      startQ: [NaN, 0, 0],
      goalQ,
      duration: 2.0,
      samples: 50,
    });
    expect(nonFiniteQ.isValid).toBe(false);
  });

  it('rejects invalid duration or sample count in Cartesian trajectory', () => {
    const startPose = Matrix4.identity();
    const goalPose = Matrix4.trans(0.2, 0.1, 0.3);

    const badDur = generateCartesianTrajectory(robot3R, {
      startPose,
      goalPose,
      startQ: [0, 0, 0],
      duration: -2.0,
      samples: 20,
    });
    expect(badDur.isValid).toBe(false);
    expect(badDur.failureReason).toBeDefined();

    const badSamples = generateCartesianTrajectory(robot3R, {
      startPose,
      goalPose,
      startQ: [0, 0, 0],
      duration: 2.0,
      samples: 0,
    });
    expect(badSamples.isValid).toBe(false);
  });

  it('reports failure when Cartesian target is unreachable', () => {
    const startPose = computeFK(robot3R, [0, 0, 0]).endEffectorTransform;
    // Goal 100 meters away — completely unreachable for 3R arm
    const goalPose = Matrix4.trans(100.0, 100.0, 100.0);

    const traj = generateCartesianTrajectory(robot3R, {
      startPose,
      goalPose,
      startQ: [0, 0, 0],
      duration: 2.0,
      samples: 20,
    });

    expect(traj.isValid).toBe(false);
    expect(traj.hasIKFailure).toBe(true);
    expect(traj.failedSampleIndices && traj.failedSampleIndices.length).toBeGreaterThan(0);
    expect(traj.failureReason).toContain('Cartesian path unreachable');
  });

  it('interpolates revolute joints across +/- pi without unnatural discontinuities when within limits', () => {
    // 1-DOF revolute robot with [-pi, pi] limits
    const revolute1R: RobotDefinition = {
      id: 'rev1R',
      name: '1R Arm',
      dof: 1,
      dhConvention: 'standard',
      joints: [
        { id: 'j1', name: 'J1', index: 0, type: 'revolute', theta: 0, d: 0, a: 1.0, alpha: 0, offset: 0, min: -2 * Math.PI, max: 2 * Math.PI, home: 0 },
      ],
      links: [
        { id: 'l0', name: 'Base', index: 0 },
        { id: 'l1', name: 'Link 1', index: 1 },
      ],
    };

    // +170 deg to -170 deg (a 20 deg step across +/- pi)
    const startQ = [170 * (Math.PI / 180)];
    const goalQ = [-170 * (Math.PI / 180)];

    const traj = generateJointTrajectory(revolute1R, {
      startQ,
      goalQ,
      duration: 1.0,
      samples: 11,
    });

    expect(traj.isValid).toBe(true);
    // Delta should be ~ +20 deg (0.349 rad) rather than -340 deg (-5.93 rad)
    const totalDisplacement = Math.abs(traj.positions[traj.positions.length - 1][0] - traj.positions[0][0]);
    expect(totalDisplacement).toBeLessThan(1.0); // 20 deg is ~0.35 rad < 1.0 rad
  });

  it('computes real finite non-zero velocities and accelerations for THANKS trajectory', async () => {
    const store = useRobotStore.getState();
    store.loadThanksTraj();

    // Wait for batch processing to complete
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        const state = useRobotStore.getState();
        if (state.thanksLoadingProgress === null && state.activeTrajectory !== null) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });

    const activeTraj = useRobotStore.getState().activeTrajectory!;
    expect(activeTraj).not.toBeNull();
    expect(activeTraj.states.length).toBeGreaterThan(50);

    // Verify duration equals final timeStep
    const finalTime = activeTraj.timeSteps[activeTraj.timeSteps.length - 1];
    expect(activeTraj.duration).toBeCloseTo(finalTime, 4);

    // Verify velocities are NOT all zero
    let hasNonZeroVelocity = false;
    let hasNonZeroAcceleration = false;

    for (let k = 1; k < activeTraj.states.length - 1; k++) {
      const v = activeTraj.velocities[k];
      const a = activeTraj.accelerations[k];

      for (let j = 0; j < pumaRobot.dof; j++) {
        expect(Number.isFinite(v[j])).toBe(true);
        expect(Number.isFinite(a[j])).toBe(true);
        if (Math.abs(v[j]) > 1e-4) hasNonZeroVelocity = true;
        if (Math.abs(a[j]) > 1e-4) hasNonZeroAcceleration = true;
      }
    }

    expect(hasNonZeroVelocity).toBe(true);
    expect(hasNonZeroAcceleration).toBe(true);
  }, 25000);

  it('stepForward and stepBackward step by the exact sample interval', () => {
    const startQ = [0, 0, 0];
    const goalQ = [0.5, -0.3, 0.4];
    const duration = 2.0;
    const samples = 11; // dt = 2.0 / 10 = 0.2s

    const traj = generateJointTrajectory(robot3R, {
      startQ,
      goalQ,
      duration,
      samples,
    });

    const store = useRobotStore.getState();
    store.setRobot(robot3R);
    useRobotStore.setState({
      activeTrajectory: traj,
      playback: { isPlaying: false, isLooping: false, currentTime: 0.0, speed: 1.0 },
    });

    // Step forward: 0.0 -> 0.2s
    store.stepForward();
    expect(useRobotStore.getState().playback.currentTime).toBeCloseTo(0.2, 4);

    // Step forward again: 0.2 -> 0.4s
    store.stepForward();
    expect(useRobotStore.getState().playback.currentTime).toBeCloseTo(0.4, 4);

    // Step backward: 0.4 -> 0.2s
    store.stepBackward();
    expect(useRobotStore.getState().playback.currentTime).toBeCloseTo(0.2, 4);
  });

  it('Emergency stop immediately halts playback while preserving current pose and playback time', () => {
    const startQ = [0.1, 0.2, -0.3, 0.4, -2.0, 0.1];
    const goalQ = [0.5, -0.4, 0.6, -0.2, -2.5, 0.7];

    const traj = generateJointTrajectory(pumaRobot, {
      startQ,
      goalQ,
      duration: 2.0,
      samples: 21,
    });

    const store = useRobotStore.getState();
    store.setRobot(pumaRobot);
    useRobotStore.setState({
      activeTrajectory: traj,
      playback: { isPlaying: true, isLooping: false, currentTime: 0.0, speed: 1.0 },
    });

    // Seek to midway point (t = 1.0s)
    store.seekTrajectory(1.0);
    const midQ = [...useRobotStore.getState().q];
    const midTime = useRobotStore.getState().playback.currentTime;

    expect(midTime).toBeCloseTo(1.0, 4);

    // Trigger Emergency Stop
    store.emergencyStop();

    const afterEstop = useRobotStore.getState();
    // 1. Playback must be halted immediately
    expect(afterEstop.playback.isPlaying).toBe(false);

    // 2. Playback time must be strictly preserved (NOT rewound to 0)
    expect(afterEstop.playback.currentTime).toBeCloseTo(1.0, 4);

    // 3. Joint coordinates must be strictly preserved (NOT reset to home or start)
    for (let j = 0; j < pumaRobot.dof; j++) {
      expect(afterEstop.q[j]).toBeCloseTo(midQ[j], 5);
    }
    expect(afterEstop.isEStopped).toBe(true);

    // 4. Further stepping or playing must be blocked while E-stopped
    store.stepForward();
    expect(useRobotStore.getState().playback.currentTime).toBeCloseTo(1.0, 4);

    store.stepBackward();
    expect(useRobotStore.getState().playback.currentTime).toBeCloseTo(1.0, 4);

    store.playTrajectory();
    expect(useRobotStore.getState().playback.isPlaying).toBe(false);

    // 5. Resume from E-stop restores playback
    store.resumeFromEStop();
    expect(useRobotStore.getState().isEStopped).toBe(false);
    expect(useRobotStore.getState().playback.isPlaying).toBe(true);
  });
});
