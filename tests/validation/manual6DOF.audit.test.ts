import { describe, expect, it } from 'vitest';
import robotJson from '../../src/data/robots/skeleton_6R.json';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import { solveIK } from '../../src/robotics/ik/ikPipeline';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import { Matrix4 } from '../../src/robotics/math/Matrix4';

const robot = robotJson as unknown as RobotDefinition;
const DEG = Math.PI / 180;

type Matrix = number[];

/** Independent Standard-DH reference implementation. */
function multiply4(a: Matrix, b: Matrix): Matrix {
  const out = new Array<number>(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      for (let k = 0; k < 4; k++) out[r * 4 + c] += a[r * 4 + k] * b[k * 4 + c];
    }
  }
  return out;
}

function standardDH(theta: number, d: number, a: number, alpha: number): Matrix {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  return [
    ct, -st * ca, st * sa, a * ct,
    st, ct * ca, -ct * sa, a * st,
    0, sa, ca, d,
    0, 0, 0, 1,
  ];
}

function referenceFK(robotDef: RobotDefinition, q: number[]): Matrix {
  let t: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (let i = 0; i < robotDef.joints.length; i++) {
    const joint = robotDef.joints[i];
    const qi = q[i] ?? 0;
    const theta = joint.type === 'revolute' ? joint.theta + qi + joint.offset : joint.theta;
    const d = joint.type === 'revolute' ? joint.d : joint.d + qi + joint.offset;
    t = multiply4(t, standardDH(theta, d, joint.a, joint.alpha));
  }
  return t;
}

function maxMatrixError(a: Matrix, b: ArrayLike<number>): number {
  let max = 0;
  for (let i = 0; i < 16; i++) max = Math.max(max, Math.abs(a[i] - b[i]));
  return max;
}

function positionError(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return Math.hypot(a[3] - b[3], a[7] - b[7], a[11] - b[11]);
}

function orientationError(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const r00 = a[0] * b[0] + a[4] * b[4] + a[8] * b[8];
  const r11 = a[1] * b[1] + a[5] * b[5] + a[9] * b[9];
  const r22 = a[2] * b[2] + a[6] * b[6] + a[10] * b[10];
  return Math.acos(Math.max(-1, Math.min(1, (r00 + r11 + r22 - 1) * 0.5)));
}

// Fifteen deliberately hand-selected configurations: home, wrist singularities,
// mixed signs, near-limit poses, and large wrist rotations. All are within the
// explicit skeleton_6R joint limits of [-180, +180] degrees.
const manualCases = [
  [0, 0, 0, 0, 0, 0],
  [30, -20, 15, 40, -35, 25],
  [-45, 25, -30, -60, 40, -20],
  [90, -30, 45, 0, 60, -90],
  [-90, 45, 20, 120, -50, 80],
  [15, 70, -55, -130, 25, -75],
  [-120, -40, 35, 75, -70, 140],
  [170, 10, -20, -170, 80, -160],
  [-170, -15, -45, 160, -80, 155],
  [0, 0, 0, 45, 0, -45],
  [60, -60, 60, 30, 30, -30],
  [-30, 80, -70, -45, -25, 110],
  [135, -10, 10, 90, 50, -120],
  [-135, 30, -15, -100, 65, 70],
  [20, -75, 75, 15, -85, -15],
].map((degrees) => degrees.map((value) => value * DEG));

describe('Strict manual 6-DOF FK/IK audit', () => {
  it('passes all 15 independently generated FK and IK cases', () => {
    expect(robot.dof).toBe(6);
    expect(robot.dhConvention).toBe('standard');
    expect(robot.joints).toHaveLength(6);
    expect(robot.joints.every((j) => j.type === 'revolute')).toBe(true);

    const rows: string[] = [];
    let maxFkMatrixError = 0;
    let maxIkPositionError = 0;
    let maxIkOrientationError = 0;

    manualCases.forEach((q, caseIndex) => {
      const reference = referenceFK(robot, q);
      const appFk = computeFK(robot, q).endEffectorTransform;
      const fkError = maxMatrixError(reference, appFk.elements);
      maxFkMatrixError = Math.max(maxFkMatrixError, fkError);

      const target = new Matrix4(reference);
      const result = solveIK(robot, target, {
        maxIterations: 100,
        positionTolerance: 1e-4,
        orientationTolerance: 1e-3,
        returnAllBranches: true,
      });

      expect(result.converged, `case ${caseIndex + 1} IK did not converge`).toBe(true);
      expect(result.bestSolution, `case ${caseIndex + 1} has no best solution`).not.toBeNull();
      const best = result.bestSolution!;
      expect(best.withinLimits, `case ${caseIndex + 1} violates joint limits`).toBe(true);
      expect(best.positionError, `case ${caseIndex + 1} position residual`).toBeLessThan(1e-4);
      expect(best.orientationError, `case ${caseIndex + 1} orientation residual`).toBeLessThan(1e-3);

      const verified = computeFK(robot, best.q).endEffectorTransform;
      const independentPositionError = positionError(verified.elements, reference);
      const independentOrientationError = orientationError(verified.elements, reference);
      maxIkPositionError = Math.max(maxIkPositionError, independentPositionError);
      maxIkOrientationError = Math.max(maxIkOrientationError, independentOrientationError);

      expect(independentPositionError, `case ${caseIndex + 1} independent position residual`)
        .toBeLessThan(1e-4);
      expect(independentOrientationError, `case ${caseIndex + 1} independent orientation residual`)
        .toBeLessThan(1e-3);

      rows.push(
        `${caseIndex + 1}|${q.map((v) => (v / DEG).toFixed(0)).join(',')}|${fkError.toExponential(3)}|${
          best.q.map((v) => (v / DEG).toFixed(3)).join(',')
        }|${independentPositionError.toExponential(3)}|${independentOrientationError.toExponential(3)}|${
          result.solutions.length
        }`
      );
    });

    console.log(`MANUAL_6DOF_AUDIT robot=${robot.id} cases=${manualCases.length}`);
    console.log(`MAX_FK_MATRIX_ERROR=${maxFkMatrixError.toExponential(12)}`);
    console.log(`MAX_IK_POSITION_ERROR=${maxIkPositionError.toExponential(12)}`);
    console.log(`MAX_IK_ORIENTATION_ERROR=${maxIkOrientationError.toExponential(12)}`);
    console.log('CASE|INPUT_DEG|FK_MAX_MATRIX_ERR|IK_Q_DEG|IK_POS_ERR_M|IK_ORI_ERR_RAD|SOLUTIONS');
    rows.forEach((row) => console.log(row));
  });
});
