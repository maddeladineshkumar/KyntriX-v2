import { describe, it, expect } from 'vitest';
import { forwardKinematics, computeGeometricJacobian } from '../../src/robotics/kinematics';
import { RobotDefinition } from '../../src/data/schema/robotSchema';
import { DEG_TO_RAD } from '../../src/robotics/math';

describe('Geometric Jacobian', () => {
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

  it('matches numerical central difference derivative for position', () => {
    const q = [30 * DEG_TO_RAD, 45 * DEG_TO_RAD];
    const jac = computeGeometricJacobian(planar2R, q);

    const delta = 1e-6;
    for (let i = 0; i < 2; i++) {
      const qPlus = [...q];
      const qMinus = [...q];
      qPlus[i] += delta;
      qMinus[i] -= delta;

      const pPlus = forwardKinematics(planar2R, qPlus).endEffectorPose.position;
      const pMinus = forwardKinematics(planar2R, qMinus).endEffectorPose.position;

      const numVx = (pPlus.x - pMinus.x) / (2 * delta);
      const numVy = (pPlus.y - pMinus.y) / (2 * delta);
      const numVz = (pPlus.z - pMinus.z) / (2 * delta);

      expect(jac.J[0][i]).toBeCloseTo(numVx, 4);
      expect(jac.J[1][i]).toBeCloseTo(numVy, 4);
      expect(jac.J[2][i]).toBeCloseTo(numVz, 4);
    }
  });

  it('detects boundary singularity when arm is fully extended (q2 = 0)', () => {
    // When q2 = 0, both links line up: cannot move along the radial direction
    const jacSingular = computeGeometricJacobian(planar2R, [0, 0]);
    expect(jacSingular.isSingular).toBe(true);
  });
});
