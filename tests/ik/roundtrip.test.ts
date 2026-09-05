import { describe, it, expect } from 'vitest';
import { solveIK } from '../../src/robotics/ik/ikPipeline';
import { solve3RPlanar } from '../../src/robotics/ik/analytical3R';
import { solveNumericalIK } from '../../src/robotics/ik/numericalIK';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import { RobotDefinition } from '../../src/data/schema/robotSchema';
import { Matrix4 } from '../../src/robotics/math/Matrix4';
import skeleton3RJson from '../../src/data/robots/skeleton_3R.json';
import pumaJson from '../../src/data/robots/Puma560.json';

const robot3R = skeleton3RJson as unknown as RobotDefinition;
const puma560 = pumaJson as unknown as RobotDefinition;

describe('Inverse Kinematics Pipeline', () => {
  it('solves 3R Planar IK analytically and verifies with FK', () => {
    // True joint angles
    const q_true = [0.3, 0.5, -0.4];
    const fk_true = computeFK(robot3R, q_true);
    const target = fk_true.endEffectorTransform;

    const solutions = solve3RPlanar(robot3R, target);
    expect(solutions.length).toBeGreaterThan(0);

    // At least one solution must match q_true or be the alternative branch
    let foundValid = false;
    for (const sol of solutions) {
      expect(sol.converged).toBe(true);
      expect(sol.positionError).toBeLessThan(1e-4);
      expect(sol.orientationError).toBeLessThan(1e-3);

      // Verify FK of the solution
      const fk_sol = computeFK(robot3R, sol.q);
      const posError = fk_sol.endEffectorTransform.getPosition().distanceTo(target.getPosition());
      expect(posError).toBeLessThan(1e-4);
      foundValid = true;
    }
    expect(foundValid).toBe(true);
  });

  it('solves 3R Planar IK numerically via DLS', () => {
    const q_true = [0.4, -0.3, 0.2];
    const fk_true = computeFK(robot3R, q_true);
    const target = fk_true.endEffectorTransform;

    const sol = solveNumericalIK(robot3R, target, {
      initialGuess: [0.0, 0.0, 0.0],
      maxIterations: 80,
    });

    expect(sol.converged).toBe(true);
    expect(sol.positionError).toBeLessThan(1e-4);

    const fk_sol = computeFK(robot3R, sol.q);
    const posError = fk_sol.endEffectorTransform.getPosition().distanceTo(target.getPosition());
    expect(posError).toBeLessThan(1e-4);
  });

  it('solves Puma 560 6R IK roundtrip from FK target', () => {
    // Pick a reachable pose within joint limits (joint 5 is [-280, -80] deg)
    const q_true = [0.2, 0.5, -0.6, 0.3, -2.5, -0.4];
    const fk_true = computeFK(puma560, q_true);
    const target = fk_true.endEffectorTransform;

    // Start with a nearby seed
    const q_seed = q_true.map((v) => v + 0.1);
    const result = solveIK(puma560, target, {
      initialGuess: q_seed,
      maxIterations: 100,
    });

    expect(result.converged).toBe(true);
    expect(result.bestSolution).not.toBeNull();

    const best = result.bestSolution!;
    expect(best.positionError).toBeLessThan(1e-4);
    expect(best.orientationError).toBeLessThan(1e-3);

    // Independent FK check
    const fk_best = computeFK(puma560, best.q);
    const posDiff = fk_best.endEffectorTransform.getPosition().distanceTo(target.getPosition());
    expect(posDiff).toBeLessThan(1e-4);
  });

  it('handles unreachable target safely without throwing or NaN', () => {
    // Puma 560 reach is under 1.2 meters, target at 10 meters is impossible
    const unreachableTarget = Matrix4.translation(10, 10, 10);
    const result = solveIK(puma560, unreachableTarget, {
      maxIterations: 20,
    });

    expect(result.converged).toBe(false);
    expect(result.solutions.every((s) => !s.q.some((v) => isNaN(v)))).toBe(true);
  });

  it('dampens gracefully near singularities without NaN', () => {
    // Wrist singularity: theta5 = 0
    const q_singular = [0, 0, 0, 0, 0, 0];
    const fk_singular = computeFK(puma560, q_singular);
    const target = fk_singular.endEffectorTransform;

    const sol = solveNumericalIK(puma560, target, {
      initialGuess: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
      maxIterations: 30,
    });

    expect(sol.q.some((v) => isNaN(v))).toBe(false);
    expect(sol.conditionNumber).toBeGreaterThan(0);
  });
});
