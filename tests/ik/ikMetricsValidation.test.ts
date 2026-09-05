import { describe, it, expect } from 'vitest';
import { solve6RSpherical } from '../../src/robotics/ik/analytical6R';
import { solve3RPlanar } from '../../src/robotics/ik/analytical3R';
import { solveSCARA } from '../../src/robotics/ik/analyticalSCARA';
import { solveNumericalIK } from '../../src/robotics/ik/numericalIK';
import { solveIK } from '../../src/robotics/ik/ikPipeline';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import { computeGeometricJacobian } from '../../src/robotics/kinematics/jacobian';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import { Matrix4, Vector3 } from '../../src/robotics/math';
import pumaJson from '../../src/data/robots/Puma560.json';
import skeleton3RJson from '../../src/data/robots/skeleton_3R.json';
import scaraJson from '../../src/data/robots/skeleton_SCARA.json';

const pumaRobot = pumaJson as unknown as RobotDefinition;
const robot3R = skeleton3RJson as unknown as RobotDefinition;
const scaraRobot = scaraJson as unknown as RobotDefinition;

describe('IK Result Metrics and Validation Hardening', () => {
  it('analytical 6R solver reports real computed dexterity metrics matching authoritative Jacobian', () => {
    // Known reachable configuration
    const qKnown = [0.2, 0.5, -0.6, 0.3, -2.5, -0.4];
    const fkTarget = computeFK(pumaRobot, qKnown);
    const targetPose = fkTarget.endEffectorTransform;

    const solutions = solve6RSpherical(pumaRobot, targetPose, qKnown);
    expect(solutions.length).toBeGreaterThan(0);

    for (const sol of solutions) {
      // Recompute authoritative FK and Jacobian independently
      const freshFK = computeFK(pumaRobot, sol.q);
      const freshJac = computeGeometricJacobian(pumaRobot, sol.q, freshFK);

      // Verify FK matches target
      const posErr = freshFK.endEffectorTransform.getPosition().distanceTo(targetPose.getPosition());
      expect(sol.positionError).toBeCloseTo(posErr, 6);

      // Proving metrics are NOT placeholder 1.0
      expect(sol.manipulability).toBeCloseTo(freshJac.manipulability, 6);
      expect(sol.conditionNumber).toBeCloseTo(freshJac.conditionNumber, 6);
      expect(sol.manipulability).not.toBe(1.0);
      expect(sol.conditionNumber).not.toBe(1.0);

      if (sol.rank !== undefined) {
        expect(sol.rank).toBe(freshJac.rank);
      }
      if (sol.isSingular !== undefined) {
        expect(sol.isSingular).toBe(freshJac.isSingular);
      }
    }
  });

  it('analytical 3R solver reports real computed dexterity metrics matching authoritative Jacobian', () => {
    const qKnown = [0.4, 0.6, -0.5];
    const fkTarget = computeFK(robot3R, qKnown);
    const targetPose = fkTarget.endEffectorTransform;

    const solutions = solve3RPlanar(robot3R, targetPose);
    expect(solutions.length).toBeGreaterThan(0);

    for (const sol of solutions) {
      const freshFK = computeFK(robot3R, sol.q);
      const freshJac = computeGeometricJacobian(robot3R, sol.q, freshFK);

      expect(sol.manipulability).toBeCloseTo(freshJac.manipulability, 6);
      expect(sol.conditionNumber).toBeCloseTo(freshJac.conditionNumber, 6);
      expect(sol.manipulability).not.toBe(1.0);
    }
  });

  it('analytical SCARA solver reports real computed dexterity metrics matching authoritative Jacobian', () => {
    const qKnown = [0.3, -0.5, 0.15, 0.4];
    const fkTarget = computeFK(scaraRobot, qKnown);
    const targetPose = fkTarget.endEffectorTransform;

    const solutions = solveSCARA(scaraRobot, targetPose);
    expect(solutions.length).toBeGreaterThan(0);

    for (const sol of solutions) {
      const freshFK = computeFK(scaraRobot, sol.q);
      const freshJac = computeGeometricJacobian(scaraRobot, sol.q, freshFK);

      expect(sol.manipulability).toBeCloseTo(freshJac.manipulability, 6);
      expect(sol.conditionNumber).toBeCloseTo(freshJac.conditionNumber, 6);
      expect(sol.manipulability).not.toBe(1.0);
    }
  });

  it('numerical DLS solver reports real computed dexterity metrics matching authoritative Jacobian', () => {
    const qKnown = [0.2, 0.4, -0.3, 0.5, -2.2, 0.3];
    const fkTarget = computeFK(pumaRobot, qKnown);
    const targetPose = fkTarget.endEffectorTransform;

    const sol = solveNumericalIK(pumaRobot, targetPose, {
      initialGuess: [0.1, 0.3, -0.2, 0.4, -2.0, 0.2],
      maxIterations: 60,
    });

    expect(sol.converged).toBe(true);
    const freshFK = computeFK(pumaRobot, sol.q);
    const freshJac = computeGeometricJacobian(pumaRobot, sol.q, freshFK);

    expect(sol.manipulability).toBeCloseTo(freshJac.manipulability, 6);
    expect(sol.conditionNumber).toBeCloseTo(freshJac.conditionNumber, 6);
  });

  it('corrects frame inconsistencies for analytical 3R with baseTransform and endEffectorOffset', () => {
    const baseTransform = Matrix4.fromRotationTranslation(
      Matrix4.rotZ(Math.PI / 4).getRotation(),
      new Vector3(1.0, 0.5, 0.2)
    );
    const endEffectorOffset = Matrix4.trans(0.05, 0.0, 0.0);

    const robotWithOffsets: RobotDefinition = {
      ...robot3R,
      baseTransform,
      endEffectorOffset,
    };

    const qTrue = [0.3, 0.4, -0.2];
    const fkTrue = computeFK(robotWithOffsets, qTrue);
    const targetWorld = fkTrue.endEffectorTransform;

    const solutions = solve3RPlanar(robotWithOffsets, targetWorld);
    expect(solutions.length).toBeGreaterThan(0);

    for (const sol of solutions) {
      const fkSol = computeFK(robotWithOffsets, sol.q);
      const posDist = fkSol.endEffectorTransform.getPosition().distanceTo(targetWorld.getPosition());
      expect(posDist).toBeLessThan(1e-4);
      expect(sol.positionError).toBeLessThan(1e-4);
    }
  });

  it('never marks a solution as converged if target is unreachable', () => {
    const unreachableTarget = Matrix4.trans(100.0, 100.0, 100.0);
    const result = solveIK(pumaRobot, unreachableTarget);

    expect(result.converged).toBe(false);
    if (result.bestSolution) {
      expect(result.bestSolution.converged).toBe(false);
    }
  });
});
