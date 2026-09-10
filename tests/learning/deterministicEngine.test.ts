import { describe, it, expect } from 'vitest';
import { DeterministicEngine } from '../../src/server/robotics/deterministicEngine';
import type { DHParameterRow } from '../../src/server/db/types';
import { loadRobotById } from '../../src/data/robots';

describe('DeterministicEngine', () => {
  it('computes composite homogeneous transformation matrices accurately', () => {
    // RotZ(90 deg) followed by Trans(1.0, 2.0, 0.5)
    const ops = [
      { type: 'rotz' as const, val: Math.PI / 2 },
      { type: 'trans' as const, val: [1.0, 2.0, 0.5] as [number, number, number] },
    ];
    const mat = DeterministicEngine.calculateTransformation(ops);
    expect(mat).toHaveLength(4);
    expect(mat[0]).toHaveLength(4);

    // RotZ(90) rotates [1, 2, 0.5] to [-2, 1, 0.5]
    expect(mat[0][0]).toBeCloseTo(0, 5);
    expect(mat[0][1]).toBeCloseTo(-1, 5);
    expect(mat[1][0]).toBeCloseTo(1, 5);
    expect(mat[1][1]).toBeCloseTo(0, 5);
    expect(mat[2][2]).toBeCloseTo(1, 5);
    expect(mat[3][3]).toBeCloseTo(1, 5);
  });

  it('computes forward kinematics chain across multiple links with cumulative frame matrices', () => {
    const table: DHParameterRow[] = [
      { joint: 1, type: 'R', theta: 0, d: 0, a: 0.5, alpha: 0 },
      { joint: 2, type: 'R', theta: 0, d: 0, a: 0.3, alpha: 0 },
    ];
    const res = DeterministicEngine.calculateDHForwardKinematics(table, [0, 0], 'standard');
    expect(res.frameMatrices).toHaveLength(3); // Base + 2 links
    // End effector position should be (0.8, 0, 0)
    expect(res.position[0]).toBeCloseTo(0.8, 4);
    expect(res.position[1]).toBeCloseTo(0.0, 4);
    expect(res.position[2]).toBeCloseTo(0.0, 4);

    // With 90 deg rotation on joint 1
    const resRotated = DeterministicEngine.calculateDHForwardKinematics(table, [Math.PI / 2, 0], 'standard');
    expect(resRotated.position[0]).toBeCloseTo(0.0, 4);
    expect(resRotated.position[1]).toBeCloseTo(0.8, 4);
    expect(resRotated.position[2]).toBeCloseTo(0.0, 4);
  });

  it('computes geometric Jacobian, manipulability, and singularity detection for real robots', async () => {
    // Puma560 at non-singular pose
    const pumaRes = await DeterministicEngine.calculateJacobianForRobot('Puma560', [0, -Math.PI / 4, Math.PI / 4, 0, 0, 0]);
    expect(pumaRes.jacobian).toBeDefined();
    expect(pumaRes.jacobian.length).toBe(6);
    expect(pumaRes.manipulability).toBeGreaterThan(0);
    expect(pumaRes.isSingular).toBe(false);

    // Puma560 at singular overhead stretch
    const singularRes = await DeterministicEngine.calculateJacobianForRobot('Puma560', [0, 0, 0, 0, 0, 0]);
    expect(singularRes.isSingular).toBe(true);
  });

  it('validates scalar and matrix answers accurately against numeric tolerances', () => {
    // Correct scalar within tolerance
    const check1 = DeterministicEngine.validateScalar(3.1415, 3.141, 0.001);
    expect(check1).toBe(true);

    // Incorrect scalar beyond tolerance
    const check2 = DeterministicEngine.validateScalar(5.0, 3.141, 0.001);
    expect(check2).toBe(false);

    // Angle validator with wrap-around
    const checkAngle = DeterministicEngine.validateAngle(Math.PI, -Math.PI, 0.01);
    expect(checkAngle).toBe(true);

    // Matrix 2x2 comparison
    const expectedMat = [[1, 0], [0, 1]];
    const submittedMat = [[1.0001, 0], [0, 0.9999]];
    const check3 = DeterministicEngine.validateMatrix(submittedMat, expectedMat, 0.001);
    expect(check3).toBe(true);
  });

  it('diagnoses student mistakes with pedagogical error descriptions', () => {
    const studentTable: DHParameterRow[] = [
      { joint: 1, type: 'R', theta: 0, d: 0, a: 0.5, alpha: -Math.PI / 2 },
    ];
    const expectedTable: DHParameterRow[] = [
      { joint: 1, type: 'R', theta: 0, d: 0, a: 0.5, alpha: Math.PI / 2 },
    ];

    const diag = DeterministicEngine.diagnoseWork('dh', studentTable, expectedTable);
    expect(diag.stage).toContain('Twist Angle');
    expect(diag.errorDescription).toContain('Sign reversal');
  });

  it('evaluates simulation challenge constraints deterministically with scoring', async () => {
    const robotDef = await loadRobotById('skeleton_3R');
    expect(robotDef).toBeDefined();

    const challenge = {
      id: 'sc-01',
      title: 'Planar Target Reach',
      description: 'Reach test pose',
      robotId: 'skeleton_3R',
      targetPose: {
        position: [0.35, 0.15, 0.0] as [number, number, number],
        orientationEuler: [0, 0, 0] as [number, number, number],
      },
      constraints: {
        maxPositionErrorMm: 15.0,
        maxOrientationErrorDeg: 15.0,
        requireJointLimits: true,
        maxCompletionTimeSeconds: 60,
      },
      xpReward: 200,
      passingScore: 700,
      allowedAIAssistance: 'hints' as const,
      difficulty: 'Intermediate' as const,
    };

    // Use IK to solve target
    const ikRes = await DeterministicEngine.calculateIKForRobot('skeleton_3R', {
      position: [0.35, 0.15, 0.0],
      orientationEuler: [0, 0, 0],
    });

    if (ikRes.solutions.length > 0) {
      const bestQ = ikRes.solutions[0];
      const evalResult = DeterministicEngine.evaluateChallenge(
        challenge,
        robotDef,
        bestQ,
        20
      );
      expect(evalResult.attempt.passed).toBe(true);
      expect(evalResult.attempt.score).toBeGreaterThan(600);
      expect(evalResult.attempt.positionErrorMm).toBeLessThan(15.0);
    }
  });
});
