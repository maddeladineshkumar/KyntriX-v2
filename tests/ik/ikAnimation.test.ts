import { describe, it, expect, beforeEach } from 'vitest';
import { useRobotStore } from '../../src/state/robotStore';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import pumaJson from '../../src/data/robots/Puma560.json';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';

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
});
