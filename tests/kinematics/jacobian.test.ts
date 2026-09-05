import { describe, it, expect } from 'vitest';
import { forwardKinematics, computeGeometricJacobian } from '../../src/robotics/kinematics';
import { RobotDefinition } from '../../src/data/schema/robotSchema';
import { DEG_TO_RAD, Matrix4, Vector3 } from '../../src/robotics/math';

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

  it('matches finite differences for Modified DH 6R robot with nonzero alpha and link offsets', () => {
    const modified6R: RobotDefinition = {
      id: 'modified6R',
      name: 'Modified 6R Manipulator',
      dof: 6,
      dhConvention: 'modified',
      joints: [
        { id: 'j1', name: 'J1', index: 0, type: 'revolute', theta: 0.1, d: 0.35, a: 0.15, alpha: Math.PI / 4, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j2', name: 'J2', index: 1, type: 'revolute', theta: -0.2, d: 0.1, a: 0.45, alpha: -Math.PI / 3, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j3', name: 'J3', index: 2, type: 'revolute', theta: 0.3, d: 0.25, a: 0.3, alpha: Math.PI / 6, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j4', name: 'J4', index: 3, type: 'revolute', theta: -0.4, d: 0.4, a: 0.1, alpha: -Math.PI / 2, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j5', name: 'J5', index: 4, type: 'revolute', theta: 0.5, d: 0.15, a: 0.2, alpha: Math.PI / 3, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j6', name: 'J6', index: 5, type: 'revolute', theta: -0.15, d: 0.1, a: 0.05, alpha: -Math.PI / 4, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
      ],
      links: Array.from({ length: 7 }, (_, i) => ({ id: `l${i}`, name: `Link ${i}`, index: i })),
    };

    const q = [0.35, -0.42, 0.51, -0.28, 0.63, -0.19];
    const jac = computeGeometricJacobian(modified6R, q);

    const delta = 1e-6;
    let maxPosError = 0;
    let maxOriError = 0;

    for (let i = 0; i < 6; i++) {
      const qPlus = [...q];
      const qMinus = [...q];
      qPlus[i] += delta;
      qMinus[i] -= delta;

      const fkPlus = forwardKinematics(modified6R, qPlus);
      const fkMinus = forwardKinematics(modified6R, qMinus);

      const pPlus = fkPlus.endEffectorPose.position;
      const pMinus = fkMinus.endEffectorPose.position;

      const numVx = (pPlus.x - pMinus.x) / (2 * delta);
      const numVy = (pPlus.y - pMinus.y) / (2 * delta);
      const numVz = (pPlus.z - pMinus.z) / (2 * delta);

      const errX = Math.abs(jac.J[0][i] - numVx);
      const errY = Math.abs(jac.J[1][i] - numVy);
      const errZ = Math.abs(jac.J[2][i] - numVz);
      maxPosError = Math.max(maxPosError, errX, errY, errZ);

      // Angular velocity derivative via central difference of relative rotation
      const Rminus = fkMinus.endEffectorPose.rotation;
      const Rplus = fkPlus.endEffectorPose.rotation;
      const rotVec = Rminus.rotationError(Rplus);
      const numOmegaX = rotVec.x / (2 * delta);
      const numOmegaY = rotVec.y / (2 * delta);
      const numOmegaZ = rotVec.z / (2 * delta);

      const errWx = Math.abs(jac.J[3][i] - numOmegaX);
      const errWy = Math.abs(jac.J[4][i] - numOmegaY);
      const errWz = Math.abs(jac.J[5][i] - numOmegaZ);
      maxOriError = Math.max(maxOriError, errWx, errWy, errWz);
    }

    expect(maxPosError).toBeLessThan(1e-4);
    expect(maxOriError).toBeLessThan(1e-4);
  });

  it('matches finite differences for Modified DH robot with prismatic joints, base transform, and end-effector offset', () => {
    const baseTransform = Matrix4.fromRotationTranslation(
      Matrix4.rotZ(Math.PI / 4).getRotation(),
      new Vector3(0.5, -0.2, 0.1)
    );
    const endEffectorOffset = Matrix4.fromRotationTranslation(
      Matrix4.rotX(Math.PI / 6).getRotation(),
      new Vector3(0.05, 0.08, 0.12)
    );

    const modifiedHybrid: RobotDefinition = {
      id: 'modifiedHybrid',
      name: 'Modified Hybrid RPR',
      dof: 3,
      dhConvention: 'modified',
      baseTransform,
      endEffectorOffset,
      joints: [
        { id: 'j1', name: 'J1', index: 0, type: 'revolute', theta: 0, d: 0.3, a: 0.2, alpha: Math.PI / 3, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j2', name: 'J2', index: 1, type: 'prismatic', theta: Math.PI / 4, d: 0.1, a: 0.35, alpha: -Math.PI / 4, offset: 0, min: 0, max: 1.0, home: 0.2 },
        { id: 'j3', name: 'J3', index: 2, type: 'revolute', theta: 0, d: 0.25, a: 0.15, alpha: Math.PI / 2, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
      ],
      links: Array.from({ length: 4 }, (_, i) => ({ id: `l${i}`, name: `Link ${i}`, index: i })),
    };

    const q = [0.4, 0.25, -0.6];
    const jac = computeGeometricJacobian(modifiedHybrid, q);

    const delta = 1e-6;
    let maxPosError = 0;
    let maxOriError = 0;

    for (let i = 0; i < 3; i++) {
      const qPlus = [...q];
      const qMinus = [...q];
      qPlus[i] += delta;
      qMinus[i] -= delta;

      const fkPlus = forwardKinematics(modifiedHybrid, qPlus);
      const fkMinus = forwardKinematics(modifiedHybrid, qMinus);

      const pPlus = fkPlus.endEffectorPose.position;
      const pMinus = fkMinus.endEffectorPose.position;

      const numVx = (pPlus.x - pMinus.x) / (2 * delta);
      const numVy = (pPlus.y - pMinus.y) / (2 * delta);
      const numVz = (pPlus.z - pMinus.z) / (2 * delta);

      const errX = Math.abs(jac.J[0][i] - numVx);
      const errY = Math.abs(jac.J[1][i] - numVy);
      const errZ = Math.abs(jac.J[2][i] - numVz);
      maxPosError = Math.max(maxPosError, errX, errY, errZ);

      const Rminus = fkMinus.endEffectorPose.rotation;
      const Rplus = fkPlus.endEffectorPose.rotation;
      const rotVec = Rminus.rotationError(Rplus);
      const numOmegaX = rotVec.x / (2 * delta);
      const numOmegaY = rotVec.y / (2 * delta);
      const numOmegaZ = rotVec.z / (2 * delta);

      const errWx = Math.abs(jac.J[3][i] - numOmegaX);
      const errWy = Math.abs(jac.J[4][i] - numOmegaY);
      const errWz = Math.abs(jac.J[5][i] - numOmegaZ);
      maxOriError = Math.max(maxOriError, errWx, errWy, errWz);
    }

    expect(maxPosError).toBeLessThan(1e-4);
    expect(maxOriError).toBeLessThan(1e-4);
  });

  it('matches finite differences for Standard DH 6R robot with base transform and end-effector offset', () => {
    const baseTransform = Matrix4.fromRotationTranslation(
      Matrix4.rotZ(Math.PI / 3).getRotation(),
      new Vector3(-0.3, 0.4, 0.2)
    );
    const endEffectorOffset = Matrix4.fromRotationTranslation(
      Matrix4.rotY(Math.PI / 4).getRotation(),
      new Vector3(0.02, -0.04, 0.1)
    );

    const standard6R: RobotDefinition = {
      id: 'standard6R',
      name: 'Standard 6R Manipulator',
      dof: 6,
      dhConvention: 'standard',
      baseTransform,
      endEffectorOffset,
      joints: [
        { id: 'j1', name: 'J1', index: 0, type: 'revolute', theta: 0, d: 0.4, a: 0.1, alpha: Math.PI / 2, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j2', name: 'J2', index: 1, type: 'revolute', theta: 0, d: 0, a: 0.5, alpha: 0, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j3', name: 'J3', index: 2, type: 'revolute', theta: 0, d: 0, a: 0.15, alpha: -Math.PI / 2, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j4', name: 'J4', index: 3, type: 'revolute', theta: 0, d: 0.45, a: 0, alpha: Math.PI / 2, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j5', name: 'J5', index: 4, type: 'revolute', theta: 0, d: 0, a: 0, alpha: -Math.PI / 2, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
        { id: 'j6', name: 'J6', index: 5, type: 'revolute', theta: 0, d: 0.1, a: 0, alpha: 0, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
      ],
      links: Array.from({ length: 7 }, (_, i) => ({ id: `l${i}`, name: `Link ${i}`, index: i })),
    };

    const q = [0.2, -0.5, 0.8, -0.3, 0.6, -0.7];
    const jac = computeGeometricJacobian(standard6R, q);

    const delta = 1e-6;
    let maxPosError = 0;
    let maxOriError = 0;

    for (let i = 0; i < 6; i++) {
      const qPlus = [...q];
      const qMinus = [...q];
      qPlus[i] += delta;
      qMinus[i] -= delta;

      const fkPlus = forwardKinematics(standard6R, qPlus);
      const fkMinus = forwardKinematics(standard6R, qMinus);

      const pPlus = fkPlus.endEffectorPose.position;
      const pMinus = fkMinus.endEffectorPose.position;

      const numVx = (pPlus.x - pMinus.x) / (2 * delta);
      const numVy = (pPlus.y - pMinus.y) / (2 * delta);
      const numVz = (pPlus.z - pMinus.z) / (2 * delta);

      const errX = Math.abs(jac.J[0][i] - numVx);
      const errY = Math.abs(jac.J[1][i] - numVy);
      const errZ = Math.abs(jac.J[2][i] - numVz);
      maxPosError = Math.max(maxPosError, errX, errY, errZ);

      const Rminus = fkMinus.endEffectorPose.rotation;
      const Rplus = fkPlus.endEffectorPose.rotation;
      const rotVec = Rminus.rotationError(Rplus);
      const numOmegaX = rotVec.x / (2 * delta);
      const numOmegaY = rotVec.y / (2 * delta);
      const numOmegaZ = rotVec.z / (2 * delta);

      const errWx = Math.abs(jac.J[3][i] - numOmegaX);
      const errWy = Math.abs(jac.J[4][i] - numOmegaY);
      const errWz = Math.abs(jac.J[5][i] - numOmegaZ);
      maxOriError = Math.max(maxOriError, errWx, errWy, errWz);
    }

    expect(maxPosError).toBeLessThan(1e-4);
    expect(maxOriError).toBeLessThan(1e-4);
  });
});
