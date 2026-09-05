import { describe, it, expect } from 'vitest';
import { forwardKinematics } from '../../src/robotics/kinematics';
import { RobotDefinition } from '../../src/data/schema/robotSchema';
import { DEG_TO_RAD, Vector3 } from '../../src/robotics/math';

describe('Forward Kinematics', () => {
  const planar2R: RobotDefinition = {
    id: 'planar2R',
    name: 'Planar 2R',
    dof: 2,
    dhConvention: 'standard',
    joints: [
      { id: 'j1', name: 'Joint 1', index: 0, type: 'revolute', theta: 0, d: 0, a: 0.5, alpha: 0, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
      { id: 'j2', name: 'Joint 2', index: 1, type: 'revolute', theta: 0, d: 0, a: 0.3, alpha: 0, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
    ],
    links: [
      { id: 'l0', name: 'Base', index: 0 },
      { id: 'l1', name: 'Link 1', index: 1 },
      { id: 'l2', name: 'Link 2', index: 2 },
    ],
  };

  it('computes 2R planar extended position at q = [0, 0]', () => {
    const fk = forwardKinematics(planar2R, [0, 0]);
    const pos = fk.endEffectorPose.position;
    expect(pos.equals(new Vector3(0.8, 0, 0), 1e-6)).toBe(true);
  });

  it('computes 2R planar rotated position at q = [90 deg, 0]', () => {
    const fk = forwardKinematics(planar2R, [90 * DEG_TO_RAD, 0]);
    const pos = fk.endEffectorPose.position;
    expect(pos.equals(new Vector3(0, 0.8, 0), 1e-6)).toBe(true);
  });

  it('computes 2R planar folded position at q = [0, 90 deg]', () => {
    const fk = forwardKinematics(planar2R, [0, 90 * DEG_TO_RAD]);
    const pos = fk.endEffectorPose.position;
    // x = 0.5 + 0.3 * cos(90) = 0.5, y = 0.3 * sin(90) = 0.3
    expect(pos.equals(new Vector3(0.5, 0.3, 0), 1e-6)).toBe(true);
  });

  const scaraRRPR: RobotDefinition = {
    id: 'scara',
    name: 'SCARA',
    dof: 4,
    dhConvention: 'standard',
    joints: [
      { id: 'j1', name: 'J1', index: 0, type: 'revolute', theta: 0, d: 0.3, a: 0.4, alpha: 0, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
      { id: 'j2', name: 'J2', index: 1, type: 'revolute', theta: 0, d: 0, a: 0.25, alpha: Math.PI, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
      { id: 'j3', name: 'J3', index: 2, type: 'prismatic', theta: 0, d: 0, a: 0, alpha: 0, offset: 0, min: 0, max: 0.2, home: 0 },
      { id: 'j4', name: 'J4', index: 3, type: 'revolute', theta: 0, d: 0, a: 0, alpha: 0, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
    ],
    links: [
      { id: 'l0', name: 'Base', index: 0 },
      { id: 'l1', name: 'Link 1', index: 1 },
      { id: 'l2', name: 'Link 2', index: 2 },
      { id: 'l3', name: 'Link 3', index: 3 },
      { id: 'l4', name: 'Link 4', index: 4 },
    ],
  };

  it('translates along Z when prismatic joint 3 changes in SCARA', () => {
    const fk0 = forwardKinematics(scaraRRPR, [0, 0, 0, 0]);
    const fk10 = forwardKinematics(scaraRRPR, [0, 0, 0.1, 0]);

    expect(fk0.endEffectorPose.position.z).toBeCloseTo(0.3);
    expect(fk10.endEffectorPose.position.z).toBeCloseTo(0.2); // J2 has alpha=PI, so Z is flipped
  });
});
