import { describe, it, expect } from 'vitest';
import { solveSCARA, isSCARARobot } from '../../src/robotics/ik/analyticalSCARA';
import { solveIK } from '../../src/robotics/ik/ikPipeline';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import { Matrix4, Vector3 } from '../../src/robotics/math';
import scaraJson from '../../src/data/robots/skeleton_SCARA.json';

const scara = scaraJson as unknown as RobotDefinition;

describe('Analytical SCARA Inverse Kinematics', () => {
  it('identifies skeleton_SCARA as a SCARA manipulator', () => {
    expect(isSCARARobot(scara)).toBe(true);
  });

  it('solves exact closed-form IK for SCARA and verifies with FK', () => {
    const q_true = [0.4, -0.7, 0.2, 0.5];
    const fk_true = computeFK(scara, q_true);
    const target = fk_true.endEffectorTransform;

    const solutions = solveSCARA(scara, target);
    expect(solutions.length).toBeGreaterThan(0);

    let matchCount = 0;
    for (const sol of solutions) {
      expect(sol.converged).toBe(true);
      expect(sol.positionError).toBeLessThan(1e-4);
      expect(sol.solverType).toBe('analytical-scara');

      // Forward kinematics check
      const fk_sol = computeFK(scara, sol.q);
      const posDist = fk_sol.endEffectorTransform.getPosition().distanceTo(target.getPosition());
      expect(posDist).toBeLessThan(1e-4);
      matchCount++;
    }
    expect(matchCount).toBeGreaterThanOrEqual(1);
  });

  it('dispatches to analytical-scara in solveIK pipeline', () => {
    const q_true = [-0.3, 0.8, 0.15, -0.2];
    const fk_true = computeFK(scara, q_true);
    const target = fk_true.endEffectorTransform;

    const result = solveIK(scara, target);
    expect(result.converged).toBe(true);
    expect(result.bestSolution).not.toBeNull();
    expect(result.bestSolution?.solverType).toBe('analytical-scara');
    expect(result.bestSolution?.positionError).toBeLessThan(1e-4);
  });

  it('gracefully returns empty array for unreachable targets', () => {
    // SCARA link1=0.2, link2=0.15 => max reach = 0.35m
    const unreachableTarget = Matrix4.translation(5.0, 5.0, 0.5);
    const solutions = solveSCARA(scara, unreachableTarget);
    expect(solutions.length).toBe(0);
  });

  it('solves analytical SCARA IK accurately with rotated baseTransform and tool offset', () => {
    const scaraWithOffsets: RobotDefinition = {
      ...scara,
      baseTransform: Matrix4.fromRotationTranslation(
        Matrix4.rotZ(Math.PI / 3).getRotation(),
        new Vector3(0.5, -0.3, 0.2)
      ),
      endEffectorOffset: Matrix4.trans(0.02, 0.01, 0.05),
    };

    const q_true = [0.3, -0.5, 0.18, 0.4];
    const fk_true = computeFK(scaraWithOffsets, q_true);
    const target = fk_true.endEffectorTransform;

    const solutions = solveSCARA(scaraWithOffsets, target);
    expect(solutions.length).toBeGreaterThan(0);

    for (const sol of solutions) {
      expect(sol.converged).toBe(true);
      expect(sol.positionError).toBeLessThan(1e-3);

      const fk_sol = computeFK(scaraWithOffsets, sol.q);
      const posDist = fk_sol.endEffectorTransform.getPosition().distanceTo(target.getPosition());
      expect(posDist).toBeLessThan(1e-3);
    }
  });

  it('rejects exact mathematical SCARA solutions outside declared joint limits', () => {
    // Joint 3 (prismatic) declared limits are [0.0, 0.5]. Target with d3 = 0.8 is physically reachable
    // geometrically without limits, but violates joint 3 limits.
    const qOutsideLimits = [0.4, -0.7, 0.8, 0.5];
    const fkTarget = computeFK(scara, qOutsideLimits);
    const targetPose = fkTarget.endEffectorTransform;

    const solutions = solveSCARA(scara, targetPose);
    expect(solutions.length).toBeGreaterThan(0);
    for (const sol of solutions) {
      expect(sol.withinLimits).toBe(false);
      expect(sol.converged).toBe(false);
    }

    const pipelineResult = solveIK(scara, targetPose);
    expect(pipelineResult.converged).toBe(false);
    expect(pipelineResult.bestSolution).toBeNull();
  });
});
