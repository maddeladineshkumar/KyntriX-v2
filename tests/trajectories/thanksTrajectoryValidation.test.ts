import { describe, it, expect, beforeEach } from 'vitest';
import { useRobotStore } from '../../src/state/robotStore';
import thanksJson from '../../src/data/robots/thanksTrajectory.json';
import { generateJointTrajectory } from '../../src/robotics/trajectories/jointTrajectory';
import pumaJson from '../../src/data/robots/Puma560.json';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';

describe('THANKS Trajectory & Strict Trajectory Validation Suite', () => {
  const puma = pumaJson as unknown as RobotDefinition;

  beforeEach(async () => {
    await useRobotStore.getState().selectRobot('Puma560');
    useRobotStore.getState().resetEStop();
    useRobotStore.getState().resetToHome();
  });

  it('verifies that every waypoint in thanksTrajectory.json has finite coordinates and valid format', () => {
    expect(thanksJson.waypoints).toHaveLength(280);
    expect(thanksJson.count).toBe(280);

    for (let k = 0; k < thanksJson.waypoints.length; k++) {
      const wp = thanksJson.waypoints[k];
      expect(wp.index).toBe(k);
      expect(wp.position).toHaveLength(3);
      expect(wp.euler).toHaveLength(3);

      for (let i = 0; i < 3; i++) {
        expect(Number.isFinite(wp.position[i])).toBe(true);
        expect(Number.isFinite(wp.euler[i])).toBe(true);
      }
    }
  });

  it('tracks THANKS trajectory on Puma560 with 100% convergence, strict error thresholds, and zero violations', async () => {
    const store = useRobotStore.getState();
    store.loadThanksTraj();

    // Wait for batch processing to complete
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        const state = useRobotStore.getState();
        if (state.thanksLoadingProgress === null && state.activeTrajectory !== null) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });

    const activeTraj = useRobotStore.getState().activeTrajectory!;
    expect(activeTraj).not.toBeNull();
    expect(activeTraj.states).toHaveLength(280);

    // Trajectory is physically valid and playable on Puma560
    expect(activeTraj.hasIKFailure).toBe(false);
    expect(activeTraj.isValid).toBe(true);
    expect(activeTraj.failedSampleIndices).toHaveLength(0);
    expect(activeTraj.failureReason).toBeUndefined();

    // Playback starts automatically when valid and not E-stopped
    expect(useRobotStore.getState().playback.isPlaying).toBe(true);
    expect(useRobotStore.getState().statusAnnouncement).toContain('loaded successfully');

    let maxPositionError = 0;
    let maxOrientationError = 0;

    for (let k = 0; k < activeTraj.states.length; k++) {
      const state = activeTraj.states[k];
      const sourceWp = thanksJson.waypoints[k];

      // 1. Every waypoint must be an accepted valid IK solution
      expect(state.ikSuccess).toBe(true);

      // 2. Strict threshold checks: position error < 1e-4 meters, orientation error < 1e-3 radians
      expect(state.positionError).toBeLessThan(1e-4);
      expect(state.orientationError).toBeLessThan(1e-3);

      if (state.positionError > maxPositionError) maxPositionError = state.positionError;
      if (state.orientationError > maxOrientationError) maxOrientationError = state.orientationError;

      // 3. Compare forward kinematics position against target coordinates
      const fk = computeFK(puma, state.q);
      const pos = fk.endEffectorTransform.getPosition();
      const posDist = Math.sqrt(
        Math.pow(pos.x - sourceWp.position[0], 2) +
        Math.pow(pos.y - sourceWp.position[1], 2) +
        Math.pow(pos.z - sourceWp.position[2], 2)
      );
      expect(posDist).toBeLessThan(1e-4);

      // 4. Joint limit violations must be strictly zero
      for (let j = 0; j < puma.dof; j++) {
        expect(state.q[j]).toBeGreaterThanOrEqual(puma.joints[j].min - 1e-5);
        expect(state.q[j]).toBeLessThanOrEqual(puma.joints[j].max + 1e-5);
        expect(Number.isFinite(state.q[j])).toBe(true);
      }
    }

    console.log(`Puma560 THANKS trajectory validation: 280/280 waypoints passed.`);
    console.log(`Max position error: ${maxPositionError.toExponential(3)} m (threshold 1e-4 m)`);
    console.log(`Max orientation error: ${maxOrientationError.toExponential(3)} rad (threshold 1e-3 rad)`);
  }, 25000);

  it('honestly rejects unreachable trajectories, records failure indices, and blocks autoplay on incompatible robots', async () => {
    // Switch to 1-DOF planar arm which cannot reach 6-DOF 3D waypoints
    await useRobotStore.getState().selectRobot('skeleton_1R');
    const store = useRobotStore.getState();
    store.loadThanksTraj();

    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        const state = useRobotStore.getState();
        if (state.thanksLoadingProgress === null && state.activeTrajectory !== null) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });

    const activeTraj = useRobotStore.getState().activeTrajectory!;
    expect(activeTraj).not.toBeNull();
    expect(activeTraj.hasIKFailure).toBe(true);
    expect(activeTraj.isValid).toBe(false);
    expect(activeTraj.failedSampleIndices.length).toBeGreaterThan(0);
    expect(activeTraj.failureReason).toContain('failed');

    // Never autoplay a failed trajectory
    expect(useRobotStore.getState().playback.isPlaying).toBe(false);
    expect(useRobotStore.getState().statusAnnouncement).toContain('Playback blocked');
  }, 25000);

  it('guarantees that no NaN or Infinity can enter the robot state via setJoints or setJointValue', () => {
    const store = useRobotStore.getState();
    const initialQ = [...store.q];

    // Attempting to set NaN or Infinity via setJoints is strictly ignored
    store.setJoints([NaN, 0, 0, 0, 0, 0]);
    expect(useRobotStore.getState().q).toEqual(initialQ);

    store.setJoints([0, Infinity, 0, 0, 0, 0]);
    expect(useRobotStore.getState().q).toEqual(initialQ);

    store.setJoints([0, -Infinity, 0, 0, 0, 0]);
    expect(useRobotStore.getState().q).toEqual(initialQ);

    // Attempting to set NaN or Infinity via setJointValue is strictly ignored
    store.setJointValue(0, NaN);
    expect(useRobotStore.getState().q).toEqual(initialQ);

    store.setJointValue(1, Infinity);
    expect(useRobotStore.getState().q).toEqual(initialQ);
  });

  it('strictly rejects startQ or goalQ that exceed joint limits in generateJointTrajectory', () => {
    const homeQ = puma.joints.map((j) => j.home);

    // Start joint 0 out of limits
    const badStartQ = [...homeQ];
    badStartQ[0] = puma.joints[0].max + 0.5;

    const res1 = generateJointTrajectory(puma, {
      startQ: badStartQ,
      goalQ: homeQ,
      duration: 2.0,
    });
    expect(res1.isValid).toBe(false);
    expect(res1.failureReason).toContain('Start joint 0');
    expect(res1.failureReason).toContain('exceeds limits');

    // Goal joint 1 out of limits
    const badGoalQ = [...homeQ];
    badGoalQ[1] = puma.joints[1].min - 0.5;

    const res2 = generateJointTrajectory(puma, {
      startQ: homeQ,
      goalQ: badGoalQ,
      duration: 2.0,
    });
    expect(res2.isValid).toBe(false);
    expect(res2.failureReason).toContain('Goal joint 1');
    expect(res2.failureReason).toContain('exceeds limits');

    // Non-finite coordinates
    const nanGoalQ = [...homeQ];
    nanGoalQ[2] = NaN;

    const res3 = generateJointTrajectory(puma, {
      startQ: homeQ,
      goalQ: nanGoalQ,
      duration: 2.0,
    });
    expect(res3.isValid).toBe(false);
    expect(res3.failureReason).toContain('finite numbers');
  });

  it('strictly rejects trajectories where interpolated samples violate joint limits', () => {
    // Construct a custom single-joint robot with very narrow limits [-0.1, 0.1]
    const narrowRobot: RobotDefinition = {
      ...puma,
      dof: 1,
      joints: [
        {
          ...puma.joints[0],
          min: -0.1,
          max: 0.1,
          home: 0.0,
        },
      ],
    };

    // start=0, goal=0.08 is within limits, but start=0, goal=0.2 is out
    const res = generateJointTrajectory(narrowRobot, {
      startQ: [0.0],
      goalQ: [0.2],
      duration: 1.0,
    });
    expect(res.isValid).toBe(false);
    expect(res.failureReason).toContain('exceeds limits');
  });

  it('strictly prevents motion and state corruption during emergency stop', () => {
    const store = useRobotStore.getState();
    const initialQ = [...store.q];

    // Engage emergency stop
    store.emergencyStop();
    expect(useRobotStore.getState().isEStopped).toBe(true);
    expect(useRobotStore.getState().playback.isPlaying).toBe(false);

    // 1. setJoints must be blocked
    store.setJoints([1.0, 1.0, 1.0, 1.0, 1.0, 1.0]);
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

    // Reset emergency stop restores functionality
    store.resetEStop();
    expect(useRobotStore.getState().isEStopped).toBe(false);
    store.setJointValue(0, 0.2);
    expect(useRobotStore.getState().q[0]).toBeCloseTo(0.2, 5);
  });
});
