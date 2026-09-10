import { EPSILON, SINGULARITY_THRESHOLD } from '../math';
import type { RobotDefinition, FKResult, JacobianResult } from '../../data/schema/robotSchema';
import { forwardKinematics } from './forwardKinematics';

/**
 * Computes the 6 x n Geometric Jacobian for a serial manipulator:
 * J = [ J_v ]
 *     [ J_w ]
 */
export function computeGeometricJacobian(
  robot: RobotDefinition,
  q: number[],
  fkResult?: FKResult
): JacobianResult {
  const fk = fkResult ?? forwardKinematics(robot, q);
  const n = robot.joints.length;
  const pe = fk.endEffectorPose.position;

  // J is 6 x n matrix initialized to 0
  const J: number[][] = Array.from({ length: 6 }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    const joint = robot.joints[i];
    // Origin and axis of joint i in world coordinates
    const pi = fk.jointOrigins
      ? fk.jointOrigins[i]
      : (robot.dhConvention === 'modified' ? fk.origins[i + 1] : fk.origins[i]);
    const zi = fk.axes[i];

    if (joint.type === 'revolute') {
      // J_v = z_i x (p_e - p_i)
      const r = pe.sub(pi);
      const jv = zi.cross(r);
      J[0][i] = jv.x;
      J[1][i] = jv.y;
      J[2][i] = jv.z;

      // J_w = z_i
      J[3][i] = zi.x;
      J[4][i] = zi.y;
      J[5][i] = zi.z;
    } else {
      // Prismatic: J_v = z_i, J_w = 0
      J[0][i] = zi.x;
      J[1][i] = zi.y;
      J[2][i] = zi.z;

      J[3][i] = 0;
      J[4][i] = 0;
      J[5][i] = 0;
    }
  }

  // For n <= 3 (e.g. planar 2R, 3R, cartesian 3P), the primary task space is position (J_v in R^{3 x n})
  // For n >= 6, the task space is full SE(3) (J in R^{6 x n})
  const isPositionOnlyArm = n <= 3;
  const taskRows = isPositionOnlyArm ? Math.min(3, n) : Math.min(6, n);
  const matrixToAnalyze = isPositionOnlyArm ? J.slice(0, 3) : J;

  const M: number[][] = Array.from({ length: matrixToAnalyze.length }, () =>
    new Array(matrixToAnalyze.length).fill(0)
  );

  for (let r = 0; r < matrixToAnalyze.length; r++) {
    for (let c = 0; c < matrixToAnalyze.length; c++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += matrixToAnalyze[r][k] * matrixToAnalyze[c][k];
      }
      M[r][c] = sum;
    }
  }

  // Jacobi eigenvalue algorithm on M (symmetric positive semi-definite matrix)
  const eigenvalues = computeSymmetricEigenvalues(M, matrixToAnalyze.length);
  const singularValues = eigenvalues
    .map((lambda) => Math.sqrt(Math.max(0, lambda)))
    .sort((a, b) => b - a);

  const sigmaMax = singularValues[0] || 0;
  const activeSingularValues = singularValues.slice(0, taskRows);
  const sigmaMin = activeSingularValues[taskRows - 1] || 0;

  const rank = activeSingularValues.filter((s) => s > 1e-4).length;
  const conditionNumber = sigmaMin > EPSILON ? sigmaMax / sigmaMin : Infinity;

  // Yoshikawa manipulability measure: product of singular values
  let manipulability = 1;
  for (let i = 0; i < taskRows; i++) {
    manipulability *= activeSingularValues[i] || 0;
  }

  const isSingular = rank < taskRows || conditionNumber > (1 / SINGULARITY_THRESHOLD);

  return {
    J,
    rank,
    conditionNumber,
    manipulability,
    isSingular,
    singularValues,
  };
}

/**
 * Classical Jacobi rotation method for computing eigenvalues of symmetric matrix.
 */
export function computeSymmetricEigenvalues(A_orig: number[][], size: number): number[] {
  const A = A_orig.map((row) => [...row]);
  const maxIter = Math.max(100, size * size * 10);

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxOff = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) {
        const val = Math.abs(A[i][j]);
        if (val > maxOff) {
          maxOff = val;
          p = i;
          q = j;
        }
      }
    }

    if (maxOff < 1e-9) break;

    // Compute Jacobi rotation angle
    const diff = A[q][q] - A[p][p];
    let t: number;
    if (Math.abs(A[p][q]) < Math.abs(diff) * 1e-15) {
      t = A[p][q] / diff;
    } else {
      const phi = diff / (2.0 * A[p][q]);
      t = 1.0 / (Math.abs(phi) + Math.sqrt(phi * phi + 1.0));
      if (phi < 0.0) t = -t;
    }

    const c = 1.0 / Math.sqrt(t * t + 1.0);
    const s = t * c;
    const tau = s / (1.0 + c);

    const Apq = A[p][q];
    A[p][q] = 0;
    A[p][p] -= t * Apq;
    A[q][q] += t * Apq;

    for (let i = 0; i < p; i++) {
      const aip = A[i][p];
      const aiq = A[i][q];
      A[i][p] = aip - s * (aiq + aip * tau);
      A[i][q] = aiq + s * (aip - aiq * tau);
    }
    for (let i = p + 1; i < q; i++) {
      const api = A[p][i];
      const aiq = A[i][q];
      A[p][i] = api - s * (aiq + api * tau);
      A[i][q] = aiq + s * (api - aiq * tau);
    }
    for (let i = q + 1; i < size; i++) {
      const api = A[p][i];
      const aqi = A[q][i];
      A[p][i] = api - s * (aqi + api * tau);
      A[q][i] = aqi + s * (api - aqi * tau);
    }
  }

  const eigenvalues: number[] = [];
  for (let i = 0; i < size; i++) {
    eigenvalues.push(A[i][i]);
  }
  return eigenvalues;
}

export const computeJacobian = computeGeometricJacobian;
