import { describe, it, expect, beforeEach } from 'vitest';
import { useRobotStore } from '../../src/state/robotStore';
import { Matrix4 } from '../../src/robotics/math';

describe('Smoke-Test Failure Conditions & Authoritative Error Reporting Suite', () => {
  beforeEach(async () => {
    await useRobotStore.getState().selectRobot('Puma560');
    useRobotStore.getState().resetEStop();
    useRobotStore.getState().resetToHome();
  });

  it('detects and honestly announces unreachable IK targets without claiming convergence', async () => {
    const store = useRobotStore.getState();
    const farTarget = Matrix4.translation(10.0, 10.0, 10.0);
    store.setTargetPose(farTarget, false);

    // Synchronous or asynchronous IK solve
    store.triggerSolveIK(false, false);

    // Allow worker or sync solve to complete
    await new Promise((r) => setTimeout(r, 200));

    const state = useRobotStore.getState();
    expect(state.ikResult).not.toBeNull();
    expect(state.ikResult!.converged).toBe(false);
    expect(state.ikResult!.bestSolution === null || !state.ikResult!.bestSolution.converged).toBe(true);
    expect(
      state.statusAnnouncement.toLowerCase().includes('failed') ||
      state.statusAnnouncement.toLowerCase().includes('unreachable')
    ).toBe(true);
  });

  it('rejects joint trajectories with out-of-limit goals and provides descriptive failure reason', () => {
    const store = useRobotStore.getState();
    // Puma 560 Joint 5 limit is [-4.8869, -1.3962]. Goal of 5.0 is completely out of range.
    store.generateJointTraj([0.3, 1.2, -0.5, 0.2, 5.0, 0.1], 3.0, 'quintic');

    const state = useRobotStore.getState();
    expect(state.activeTrajectory).not.toBeNull();
    expect(state.activeTrajectory!.isValid).toBe(false);
    expect(state.activeTrajectory!.failureReason).toBeDefined();
    expect(state.activeTrajectory!.failureReason!.toLowerCase()).toContain('limit');
    expect(state.playback.isPlaying).toBe(false);
    expect(state.statusAnnouncement.toLowerCase()).toContain('failed');
  });

  it('strictly prevents motion, playback, or scrubbing during active emergency stop', () => {
    const store = useRobotStore.getState();
    const initialQ = [...store.q];

    // Engage emergency stop
    store.emergencyStop();
    expect(useRobotStore.getState().isEStopped).toBe(true);
    expect(useRobotStore.getState().playback.isPlaying).toBe(false);

    // 1. setJoints must be completely blocked
    store.setJoints([1.0, 1.0, 1.0, 1.0, -3.0, 1.0]);
    expect(useRobotStore.getState().q).toEqual(initialQ);

    // 2. setJointValue must be blocked
    store.setJointValue(0, 0.5);
    expect(useRobotStore.getState().q).toEqual(initialQ);

    // 3. resetToHome must be blocked
    store.resetToHome();
    expect(useRobotStore.getState().q).toEqual(initialQ);

    // 4. seekTrajectory must be blocked
    store.seekTrajectory(1.5);
    expect(useRobotStore.getState().playback.currentTime).toBe(0);

    // 5. playTrajectory must be blocked
    store.playTrajectory();
    expect(useRobotStore.getState().playback.isPlaying).toBe(false);

    // 6. stepForward / stepBackward must be blocked
    store.stepForward();
    expect(useRobotStore.getState().playback.currentTime).toBe(0);
    store.stepBackward();
    expect(useRobotStore.getState().playback.currentTime).toBe(0);

    // Resetting emergency stop restores control
    store.resetEStop();
    expect(useRobotStore.getState().isEStopped).toBe(false);
  });

  it('honestly validates every THANKS waypoint, recording failure indices and blocking autoplay when physically unreachable', async () => {
    await useRobotStore.getState().selectRobot('skeleton_1R');
    const store = useRobotStore.getState();
    store.loadThanksTraj();

    // Wait for batch processing to finish
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        const s = useRobotStore.getState();
        if (s.thanksLoadingProgress === null && s.activeTrajectory !== null) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });

    const activeTraj = useRobotStore.getState().activeTrajectory!;
    expect(activeTraj).not.toBeNull();
    // Puma 560 cannot reach far-edge waypoints: must honestly record failure
    expect(activeTraj.hasIKFailure).toBe(true);
    expect(activeTraj.isValid).toBe(false);
    expect(activeTraj.failedSampleIndices!.length).toBeGreaterThan(0);
    expect(useRobotStore.getState().playback.isPlaying).toBe(false);
    expect(useRobotStore.getState().statusAnnouncement).toContain('Playback blocked');
  }, 25000);
});
