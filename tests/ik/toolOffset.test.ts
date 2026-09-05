import { describe, it, expect } from 'vitest';
import { solveIK } from '../../src/robotics/ik/ikPipeline';
import { solve6RSpherical } from '../../src/robotics/ik/analytical6R';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import { Matrix4, Vector3, Matrix3 } from '../../src/robotics/math';
import pumaJson from '../../src/data/robots/Puma560.json';

const basePuma = pumaJson as unknown as RobotDefinition;

describe('Kinematics with Base Transform and Tool Offset', () => {
  // Create a Puma 560 with an elevated pedestal (base translation) and a 120mm welding torch tool
  const pumaWithTool: RobotDefinition = {
    ...basePuma,
    id: 'puma_with_tool',
    baseTransform: Matrix4.fromRotationTranslation(
      Matrix3.rotZ(Math.PI / 4), // 45 deg base rotation
      new Vector3(0.5, -0.2, 0.8) // pedestal offset
    ),
    endEffectorOffset: Matrix4.fromRotationTranslation(
      Matrix3.rotX(Math.PI / 6), // 30 deg tool pitch
      new Vector3(0.0, 0.0, 0.12) // 120mm tool length along Z
    ),
  };

  it('correctly incorporates base and tool offset into forward kinematics', () => {
    const q_home = pumaWithTool.joints.map((j) => j.home ?? 0);
    const fk = computeFK(pumaWithTool, q_home);

    // Frame 0 origin must equal baseTransform origin
    expect(fk.frames[0].origin.equals(new Vector3(0.5, -0.2, 0.8), 1e-5)).toBe(true);

    // End-effector transform must differ from Frame 6 cumulative transform
    const T6 = fk.T[fk.T.length - 1];
    const T_ee = fk.endEffectorTransform;
    expect(T_ee.equals(T6, 1e-4)).toBe(false);

    // Distance between Frame 6 and EE tip must equal 120mm (tool length)
    const toolDist = T_ee.getPosition().distanceTo(T6.getPosition());
    expect(toolDist).toBeCloseTo(0.12, 3);
  });

  it('solves analytical 6R IK on arm with tool offset and validates with FK', () => {
    const q_true = [0.2, 0.4, -0.5, 0.3, -2.4, -0.2];
    const fk_true = computeFK(pumaWithTool, q_true);
    const target = fk_true.endEffectorTransform;

    const solutions = solve6RSpherical(pumaWithTool, target);
    expect(solutions.length).toBeGreaterThan(0);

    const sol = solutions[0];
    expect(sol.converged).toBe(true);
    expect(sol.positionError).toBeLessThan(1e-4);
    expect(sol.orientationError).toBeLessThan(1e-3);

    // Verify independent FK of solution matches tool target
    const fk_sol = computeFK(pumaWithTool, sol.q);
    const posErr = fk_sol.endEffectorTransform.getPosition().distanceTo(target.getPosition());
    expect(posErr).toBeLessThan(1e-4);
  });

  it('solves full IK pipeline on arm with base and tool offsets', () => {
    const q_true = [0.1, 0.3, -0.4, 0.2, -2.5, -0.1];
    const fk_true = computeFK(pumaWithTool, q_true);
    const target = fk_true.endEffectorTransform;

    const result = solveIK(pumaWithTool, target);
    expect(result.converged).toBe(true);
    expect(result.bestSolution).not.toBeNull();
    expect(result.bestSolution?.positionError).toBeLessThan(1e-4);

    const fk_sol = computeFK(pumaWithTool, result.bestSolution!.q);
    const posErr = fk_sol.endEffectorTransform.getPosition().distanceTo(target.getPosition());
    expect(posErr).toBeLessThan(1e-4);
  });
});
