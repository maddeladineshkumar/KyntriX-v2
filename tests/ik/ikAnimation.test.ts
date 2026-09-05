import { describe, it, expect, beforeEach } from 'vitest';
import { useRobotStore } from '../../src/state/robotStore';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import pumaJson from '../../src/data/robots/Puma560.json';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import { solveDHInverseKinematics } from '../../src/robotics/dh/dhAnalysis';

const pumaRobot = pumaJson as unknown as RobotDefinition;

describe('IK Animation & Robustness', () => {
  beforeEach(() => {
    const store = useRobotStore.getState();
    store.setRobot(pumaRobot);
    store.resetToHome();
  });

  it('applyIKSolution with animate=true initiates smooth quintic trajectory playback', () => {
    const store = useRobotStore.getState();
    const currentQ = [...store.q];
    const targetQ = currentQ.map((v, i) => v + (i === 1 ? 0.3 : 0.1));

    store.applyIKSolution(
      {
        q: targetQ,
        converged: true,
        iterations: 5,
        positionError: 0.0001,
        orientationError: 0.0001,
        withinLimits: true,
        manipulability: 0.5,
        conditionNumber: 2.0,
        cost: 0.1,
        solverType: 'analytical-6r',
      },
      true
    );

    const updated = useRobotStore.getState();
    expect(updated.playback.isPlaying).toBe(true);
    expect(updated.playback.isLooping).toBe(false);
    expect(updated.playback.currentTime).toBe(0);
    expect(updated.activeTrajectory).not.toBeNull();
    expect(updated.activeTrajectory!.states.length).toBeGreaterThan(10);

    // Verify start pose of trajectory matches currentQ and final matches targetQ
    const firstState = updated.activeTrajectory!.states[0];
    const lastState = updated.activeTrajectory!.states[updated.activeTrajectory!.states.length - 1];

    for (let i = 0; i < pumaRobot.dof; i++) {
      expect(firstState.q[i]).toBeCloseTo(currentQ[i], 3);
      expect(lastState.q[i]).toBeCloseTo(targetQ[i], 3);
    }
  });

  it('applyIKSolution with animate=false snaps immediately without starting playback', () => {
    const store = useRobotStore.getState();
    const targetQ = store.q.map((v, i) => v + (i === 2 ? -0.25 : 0.05));

    store.applyIKSolution(
      {
        q: targetQ,
        converged: true,
        iterations: 1,
        positionError: 0.0001,
        orientationError: 0.0001,
        withinLimits: true,
        manipulability: 0.5,
        conditionNumber: 2.0,
        cost: 0.1,
        solverType: 'analytical-6r',
      },
      false
    );

    const updated = useRobotStore.getState();
    expect(updated.playback.isPlaying).toBe(false);
    for (let i = 0; i < pumaRobot.dof; i++) {
      expect(updated.q[i]).toBeCloseTo(targetQ[i], 4);
    }
  });

  it('solves IK and auto-animates when requested', () => {
    const store = useRobotStore.getState();
    const qKnown = [0.1, 0.4, -0.3, 0.2, -2.5, -0.2];
    const fkTarget = computeFK(pumaRobot, qKnown);
    const targetPose = fkTarget.endEffectorTransform;

    store.setTargetPose(targetPose);
    // Trigger solve with autoAnimate = true (synchronous fallback in node/vitest)
    store.triggerSolveIK(true);

    const updated = useRobotStore.getState();
    expect(updated.ikResult).not.toBeNull();
    expect(updated.ikResult!.converged).toBe(true);
    expect(updated.playback.isPlaying).toBe(true);
    expect(updated.activeTrajectory).not.toBeNull();
  });

  it('solving when already at target pose converges without starting unnecessary animation', () => {
    const store = useRobotStore.getState();
    const currentFK = computeFK(pumaRobot, store.q);
    store.setTargetPose(currentFK.endEffectorTransform);

    // Solve for the exact same pose
    store.triggerSolveIK(true, true);

    const updated = useRobotStore.getState();
    expect(updated.ikResult).not.toBeNull();
    expect(updated.ikResult!.converged).toBe(true);
    // When already at the pose, playback should not be playing
    expect(updated.playback.isPlaying).toBe(false);
  });

  it('DH IK solver finds multiple candidate branches for 6-DOF spherical wrist robot', () => {
    const homeFK = computeFK(pumaRobot, pumaRobot.joints.map((j) => j.home ?? 0));
    const targetPos = homeFK.endEffectorTransform.getPosition();
    const targetEuler = homeFK.endEffectorTransform.getEuler('XYZ');

    const result = solveDHInverseKinematics(
      pumaRobot,
      { x: targetPos.x, y: targetPos.y, z: targetPos.z },
      { roll: targetEuler.x, pitch: targetEuler.y, yaw: targetEuler.z }
    );

    expect(result.converged).toBe(true);
    expect(result.solutions.length).toBeGreaterThan(0);
    expect(result.bestSolution).not.toBeNull();
    expect(result.bestSolution!.positionError).toBeLessThan(1e-3);
  });

  it('applyIKSolution rejects solutions with non-finite or empty joint angles without corrupting state', () => {
    const store = useRobotStore.getState();
    const originalQ = [...store.q];

    // Attempt to apply solution with NaN
    store.applyIKSolution({
      q: [NaN, 0, 0, 0, 0, 0],
      positionError: 0,
      orientationError: 0,
      withinLimits: true,
      manipulability: 1,
      iterations: 1,
    } as any, true);

    expect(useRobotStore.getState().q).toEqual(originalQ);
    expect(useRobotStore.getState().playback.isPlaying).toBe(false);

    // Attempt to apply empty solution
    store.applyIKSolution({
      q: [],
      positionError: 0,
      orientationError: 0,
      withinLimits: true,
      manipulability: 1,
      iterations: 1,
    } as any, false);

    expect(useRobotStore.getState().q).toEqual(originalQ);
  });

  it('setViewOption and setActiveTab manage target gizmo visibility cleanly', () => {
    const store = useRobotStore.getState();

    // Switching to IK enables target gizmo
    store.setActiveTab('ik');
    expect(useRobotStore.getState().viewOptions.showTargetGizmo).toBe(true);

    // Switching to FK disables target gizmo
    store.setActiveTab('fk');
    expect(useRobotStore.getState().viewOptions.showTargetGizmo).toBe(false);

    // setViewOption sets explicit boolean
    store.setViewOption('showTargetGizmo', true);
    expect(useRobotStore.getState().viewOptions.showTargetGizmo).toBe(true);

    store.setViewOption('showTargetGizmo', false);
    expect(useRobotStore.getState().viewOptions.showTargetGizmo).toBe(false);
  });
});

