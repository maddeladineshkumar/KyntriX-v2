import { describe, it, expect, beforeEach } from 'vitest';
import { useRobotStore } from '../../src/state/robotStore';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import type { RobotDefinition, JointDefinition } from '../../src/data/schema/robotSchema';

describe('DH Table Editing & FK Recomputation Tests', () => {
  beforeEach(async () => {
    await useRobotStore.getState().selectRobot('Puma560');
  });

  it('modifying joint.a in robot definition changes FK end-effector position', () => {
    const store = useRobotStore.getState();
    const originalRobot = store.robot;
    const initialEEPos = store.fkResult.endEffectorTransform.getPosition().clone();

    // Modify joint 3 'a' parameter (link length)
    const modifiedJoints = originalRobot.joints.map((j, idx) =>
      idx === 2 ? { ...j, a: j.a + 0.25 } : j
    );

    const updatedRobot: RobotDefinition = {
      ...originalRobot,
      joints: modifiedJoints,
    };

    store.setRobot(updatedRobot);

    const newEEPos = useRobotStore.getState().fkResult.endEffectorTransform.getPosition();
    expect(newEEPos.distanceTo(initialEEPos)).toBeGreaterThan(0.01);
  });

  it('changing joint.type from revolute to prismatic changes which parameter is active joint variable', () => {
    const store = useRobotStore.getState();
    const originalRobot = store.robot;

    // Convert joint 1 from revolute to prismatic
    const modifiedJoints = originalRobot.joints.map((j, idx) =>
      idx === 0
        ? {
            ...j,
            type: 'prismatic' as const,
            min: 0,
            max: 0.8,
            home: 0.2,
          }
        : j
    );

    const updatedRobot: RobotDefinition = {
      ...originalRobot,
      joints: modifiedJoints,
    };

    store.setRobot(updatedRobot);

    const state = useRobotStore.getState();
    expect(state.robot.joints[0].type).toBe('prismatic');

    // Test that moving joint 1 translates along Z (prismatic) rather than rotating
    const q1 = [0.1, 0, 0, 0, 0, 0];
    const q2 = [0.5, 0, 0, 0, 0, 0];

    const fk1 = computeFK(updatedRobot, q1);
    const fk2 = computeFK(updatedRobot, q2);

    // In a prismatic joint along z, the origin of frame 1 should shift in z by 0.4m
    const zDelta = Math.abs(fk2.origins[1].z - fk1.origins[1].z);
    expect(zDelta).toBeCloseTo(0.4, 3);
  });

  it('adding a joint and modifying alpha correctly recomputes FK', () => {
    const store = useRobotStore.getState();
    const originalRobot = store.robot;
    const initialDOF = originalRobot.dof;

    const initialEEPos = store.fkResult.endEffectorTransform.getPosition().clone();

    // Add a 7th joint with d=0.2, a=0.15, alpha = PI / 2
    const newJoint: JointDefinition = {
      id: `${originalRobot.id}_joint7`,
      name: 'Joint 7',
      index: initialDOF,
      type: 'revolute',
      theta: 0,
      d: 0.2,
      a: 0.15,
      alpha: Math.PI / 2,
      offset: 0,
      min: -Math.PI,
      max: Math.PI,
      home: 0,
    };

    const updatedRobot: RobotDefinition = {
      ...originalRobot,
      dof: initialDOF + 1,
      joints: [...originalRobot.joints, newJoint],
      links: [
        ...originalRobot.links,
        { id: `${originalRobot.id}_link7`, name: 'Link 7', index: initialDOF + 1 },
      ],
    };

    store.setRobot(updatedRobot);

    const stateAfterAdd = useRobotStore.getState();
    expect(stateAfterAdd.robot.dof).toBe(7);
    expect(stateAfterAdd.fkResult.frames.length).toBe(8); // Frame 0 + 7 frames
    expect(stateAfterAdd.q.length).toBe(7);

    // Adding joint 7 shifted end-effector position
    const eePosAfterAdd = stateAfterAdd.fkResult.endEffectorTransform.getPosition().clone();
    expect(eePosAfterAdd.distanceTo(initialEEPos)).toBeGreaterThan(0.05);

    // Now modify alpha of joint 2 and verify FK recomputes new end-effector position
    const modifiedJoints = stateAfterAdd.robot.joints.map((j, idx) =>
      idx === 1 ? { ...j, alpha: j.alpha + 0.3 } : j
    );

    const updatedRobot2: RobotDefinition = {
      ...stateAfterAdd.robot,
      joints: modifiedJoints,
    };

    store.setRobot(updatedRobot2);

    const stateAfterAlphaMod = useRobotStore.getState();
    const eePosAfterAlpha = stateAfterAlphaMod.fkResult.endEffectorTransform.getPosition();

    // Verify frames recomputed and end-effector position changed
    expect(stateAfterAlphaMod.fkResult.frames[7].matrix).toBeDefined();
    expect(eePosAfterAlpha.distanceTo(eePosAfterAdd)).toBeGreaterThan(0.01);
  });

  it('toggling dhConvention between standard and modified recomputes FK transforms', () => {
    const store = useRobotStore.getState();
    const originalRobot = store.robot;
    expect(originalRobot.dhConvention).toBe('standard');

    const standardEEPos = store.fkResult.endEffectorTransform.getPosition().clone();

    // Toggle convention to Craig modified DH
    const modifiedRobot: RobotDefinition = {
      ...originalRobot,
      dhConvention: 'modified',
    };

    store.setRobot(modifiedRobot);

    const stateAfterToggle = useRobotStore.getState();
    expect(stateAfterToggle.robot.dhConvention).toBe('modified');

    const modifiedEEPos = stateAfterToggle.fkResult.endEffectorTransform.getPosition();
    // In Puma560, Standard DH vs Craig Modified DH formulas evaluate to different transforms
    expect(modifiedEEPos.distanceTo(standardEEPos)).toBeGreaterThan(0.01);

    // Toggle back to standard
    store.setRobot({ ...stateAfterToggle.robot, dhConvention: 'standard' });
    const revertedEEPos = useRobotStore.getState().fkResult.endEffectorTransform.getPosition();
    expect(revertedEEPos.distanceTo(standardEEPos)).toBeLessThan(1e-5);
  });

  it('removing last joint correctly reduces DOF and updates FK frames and coordinates', () => {
    const store = useRobotStore.getState();
    const originalRobot = store.robot;
    const initialDOF = originalRobot.dof;
    expect(initialDOF).toBe(6);

    const updatedJoints = originalRobot.joints.slice(0, -1);
    const updatedLinks = originalRobot.links.slice(0, -1);

    store.setRobot({
      ...originalRobot,
      dof: updatedJoints.length,
      joints: updatedJoints,
      links: updatedLinks,
    });

    const state = useRobotStore.getState();
    expect(state.robot.dof).toBe(5);
    expect(state.robot.joints.length).toBe(5);
    expect(state.q.length).toBe(5);
    expect(state.fkResult.frames.length).toBe(6); // Frame 0 + 5 joints
    expect(state.fkResult.T.length).toBe(5);
  });
});
