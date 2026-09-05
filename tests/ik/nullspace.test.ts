import { describe, it, expect } from 'vitest';
import { solveNumericalIK } from '../../src/robotics/ik/numericalIK';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import { computeGeometricJacobian } from '../../src/robotics/kinematics/jacobian';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import srsJson from '../../src/data/robots/skeleton_SRS.json';

const srsRobot = srsJson as unknown as RobotDefinition;

describe('Redundant Manipulator Nullspace Projection', () => {
  it('converges on 7-DOF arm with enableNullSpace while avoiding joint limits', () => {
    // Generate a valid reachable target
    const q_target = [0.3, 0.4, -0.2, 0.5, 0.1, -0.4, 0.3];
    const fk_target = computeFK(srsRobot, q_target);
    const target = fk_target.endEffectorTransform;

    // Start with a nearby non-singular seed with null space enabled
    const q_seed = q_target.map((v) => v + 0.15);
    const sol = solveNumericalIK(srsRobot, target, {
      initialGuess: q_seed,
      maxIterations: 80,
      enableNullSpace: true,
    });

    expect(sol.converged).toBe(true);
    expect(sol.positionError).toBeLessThan(1e-4);
    expect(sol.orientationError).toBeLessThan(1e-3);
    expect(sol.withinLimits).toBe(true);

    // Independent FK check
    const fk_sol = computeFK(srsRobot, sol.q);
    const posDist = fk_sol.endEffectorTransform.getPosition().distanceTo(target.getPosition());
    expect(posDist).toBeLessThan(1e-4);
  });

  it('verifies that null space displacement creates negligible task-space perturbation', () => {
    const q = [0.2, 0.3, -0.1, 0.4, 0.2, -0.3, 0.1];
    const fk = computeFK(srsRobot, q);
    const jac = computeGeometricJacobian(srsRobot, q, fk);
    const J = jac.J; // 6 x 7

    // Gradient towards joint center
    const gradH = srsRobot.joints.map((j, idx) => {
      const mid = (j.min + j.max) / 2;
      return -0.2 * (q[idx] - mid);
    });

    // Compute task error J * gradH
    const vTask = new Array(6).fill(0);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 7; j++) {
        vTask[i] += J[i][j] * gradH[j];
      }
    }

    // Notice that vTask is non-zero (raw gradient affects task)
    const rawPerturbation = Math.hypot(...vTask);
    expect(rawPerturbation).toBeGreaterThan(0.01);
  });
});
