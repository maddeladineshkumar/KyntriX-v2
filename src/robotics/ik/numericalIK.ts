import type { RobotDefinition } from '../../data/schema/robotSchema';
import { Matrix4 } from '../math/Matrix4';
import { computeFK } from '../kinematics/forwardKinematics';
import { computeJacobian } from '../kinematics/jacobian';
import { POSITION_TOLERANCE, ORIENTATION_TOLERANCE } from '../math/constants';
import type { IKOptions, IKSingleSolution } from './types';

/**
 * Solve Ax = b for an NxN matrix (e.g. 3x3 for position only).
 */
function solveNxN(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    M.push([...A[i], b[i]]);
  }

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) {
      M[col][col] += 1e-6;
    } else if (maxRow !== col) {
      const tmp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = tmp;
    }

    let pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) {
      pivot = pivot >= 0 ? 1e-6 : -1e-6;
      M[col][col] = pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col] / pivot;
      for (let k = col; k <= n; k++) {
        M[row][k] -= factor * M[col][k];
      }
    }
  }

  const x = new Array(n);
  for (let i = 0; i < n; i++) {
    const denom = M[i][i];
    const val = Math.abs(denom) > 1e-12 ? M[i][n] / denom : 0;
    x[i] = Number.isFinite(val) ? val : 0;
  }
  return x;
}

/**
 * Numerical Inverse Kinematics using Levenberg-Marquardt / Damped Least Squares (DLS).
 */
export function solveNumericalIK(
  robot: RobotDefinition,
  target: Matrix4,
  options: IKOptions = {}
): IKSingleSolution {
  const maxIter = options.maxIterations ?? 80;
  const posTol = options.positionTolerance ?? POSITION_TOLERANCE;
  const oriTol = options.orientationTolerance ?? ORIENTATION_TOLERANCE;
  const initialDamping = options.damping ?? 0.05;
  const use6DOF = robot.dof >= 6;

  // Initialize q
  let q: number[];
  if (options.initialGuess && options.initialGuess.length === robot.dof) {
    q = [...options.initialGuess];
  } else {
    q = robot.joints.map((j) => (j.home !== undefined ? j.home : (j.min + j.max) / 2));
  }

  const targetPos = target.getPosition();
  const targetRot = target.getRotation();

  let iter = 0;
  let posError = Infinity;
  let oriError = Infinity;
  let finalManipulability = 0;
  let finalConditionNumber = Infinity;

  let bestQ = [...q];
  let minCombinedError = Infinity;
  let stagnantCount = 0;

  const mRows = use6DOF ? 6 : 3;

  for (iter = 0; iter < maxIter; iter++) {
    // 1. Forward Kinematics at current q
    const fk = computeFK(robot, q);
    const currPos = fk.endEffectorTransform.getPosition();
    const currRot = fk.endEffectorTransform.getRotation();

    // 2. Position error
    const dp = targetPos.subtract(currPos);
    posError = dp.norm();

    // 3. Orientation error (Lyapunov error)
    const do_rot = currRot.rotationError(targetRot);
    oriError = do_rot.norm();

    // Track best solution & stagnation
    const combinedError = posError + (use6DOF ? oriError * 0.1 : 0);
    if (combinedError < minCombinedError - 1e-9) {
      minCombinedError = combinedError;
      bestQ = [...q];
      stagnantCount = 0;
    } else {
      stagnantCount++;
      if (stagnantCount >= 22 && iter >= 35) {
        break; // Early termination on true stagnation
      }
    }

    // Check convergence
    if (posError <= posTol && (!use6DOF || oriError <= oriTol)) {
      break;
    }

    // 4. Compute Jacobian
    const jacResult = computeJacobian(robot, q);
    finalManipulability = jacResult.manipulability;
    finalConditionNumber = jacResult.conditionNumber;

    // Build task-space error vector
    let e: number[];
    let J: number[][];

    if (use6DOF) {
      e = [dp.x, dp.y, dp.z, do_rot.x, do_rot.y, do_rot.z];
      J = jacResult.J;
    } else {
      e = [dp.x, dp.y, dp.z];
      J = jacResult.J.slice(0, 3);
    }

    // Adaptive damping: lambda increases near singularities and decays for fine terminal convergence
    let lambda = initialDamping;
    const thresh = 0.02;
    if (finalManipulability < thresh) {
      const ratio = 1 - finalManipulability / thresh;
      lambda = initialDamping + 0.1 * ratio * ratio;
    } else if (posError < 0.005) {
      // Terminal Gauss-Newton transition for high precision sub-millimeter convergence
      lambda = Math.max(1e-4, lambda * (posError / 0.005));
    }

    // 5. Form A = J^T * J + lambda^2 * I  (size: dof x dof)
    const lambdaSq = lambda * lambda;
    const dof = robot.dof;
    const A: number[][] = [];
    for (let j = 0; j < dof; j++) {
      A[j] = new Array(dof).fill(0);
      for (let k = 0; k < dof; k++) {
        let sum = 0;
        for (let i = 0; i < mRows; i++) {
          sum += J[i][j] * J[i][k];
        }
        A[j][k] = sum + (j === k ? lambdaSq : 0);
      }
    }

    // 6. Compute gradient g = J^T * e  (size: dof)
    const g: number[] = new Array(dof).fill(0);
    for (let j = 0; j < dof; j++) {
      let sum = 0;
      for (let i = 0; i < mRows; i++) {
        sum += J[i][j] * e[i];
      }
      g[j] = sum;
    }

    // 7. Solve A * deltaQ = g
    const deltaQ = solveNxN(A, g);

    // 8. Exact Null-space projection for joint limit avoidance (secondary task)
    const activeNullSpace = options.enableNullSpace ?? (robot.dof > mRows);
    if (activeNullSpace && robot.dof > mRows) {
      // Gradient of quadratic joint limit distance penalty function
      const gradH: number[] = new Array(robot.dof);
      for (let j = 0; j < robot.dof; j++) {
        const joint = robot.joints[j];
        const mid = (joint.min + joint.max) / 2;
        const range = Math.max(0.1, joint.max - joint.min);
        // Normalized gradient pointing toward joint center
        gradH[j] = -0.3 * ((q[j] - mid) / (range * range));
      }

      // Project into null space: (I - J^# J) gradH = gradH - A^-1 * (J^T * J * gradH)
      // Step 1: vTask = J * gradH (dimension mRows)
      const vTask: number[] = new Array(mRows).fill(0);
      for (let i = 0; i < mRows; i++) {
        let sum = 0;
        for (let j = 0; j < dof; j++) {
          sum += J[i][j] * gradH[j];
        }
        vTask[i] = sum;
      }

      // Step 2: w = J^T * vTask (dimension dof)
      const w: number[] = new Array(dof).fill(0);
      for (let j = 0; j < dof; j++) {
        let sum = 0;
        for (let i = 0; i < mRows; i++) {
          sum += J[i][j] * vTask[i];
        }
        w[j] = sum;
      }

      // Step 3: z = A^-1 * w
      const z = solveNxN(A, w);

      // Step 4: Add exact nullspace component deltaQ_null = gradH - z
      for (let j = 0; j < dof; j++) {
        deltaQ[j] += (gradH[j] - z[j]);
      }
    }

    // 9. Step limiting (prevent massive jumps)
    let maxStep = 0;
    for (let j = 0; j < robot.dof; j++) {
      maxStep = Math.max(maxStep, Math.abs(deltaQ[j]));
    }
    const maxAllowedStep = 0.35; // radians/meters max step
    if (maxStep > maxAllowedStep) {
      const scale = maxAllowedStep / maxStep;
      for (let j = 0; j < robot.dof; j++) {
        deltaQ[j] *= scale;
      }
    }

    // 10. Update q and enforce joint limits
    for (let j = 0; j < robot.dof; j++) {
      q[j] += deltaQ[j];
      const joint = robot.joints[j];
      if (joint.type === 'revolute') {
        // Continuous rotation handling
        if (q[j] > joint.max) {
          if (q[j] - 2 * Math.PI >= joint.min) {
            q[j] -= 2 * Math.PI;
          } else {
            q[j] = joint.max;
          }
        } else if (q[j] < joint.min) {
          if (q[j] + 2 * Math.PI <= joint.max) {
            q[j] += 2 * Math.PI;
          } else {
            q[j] = joint.min;
          }
        }
      } else {
        q[j] = Math.max(joint.min, Math.min(joint.max, q[j]));
      }
    }
  }

  // If not strictly converged, use the best configuration encountered
  let evalQ = q;
  if (posError > posTol || (use6DOF && oriError > oriTol)) {
    const currentCombined = posError + (use6DOF ? oriError * 0.1 : 0);
    if (minCombinedError < currentCombined) {
      evalQ = bestQ;
    }
  }

  // Final FK Verification
  const finalFK = computeFK(robot, evalQ);
  const finalPos = finalFK.endEffectorTransform.getPosition();
  const finalRot = finalFK.endEffectorTransform.getRotation();

  posError = finalPos.distanceTo(targetPos);
  oriError = finalRot.rotationError(targetRot).norm();

  const converged = posError <= posTol && (!use6DOF || oriError <= oriTol);

  // Check joint limits
  let withinLimits = true;
  for (let j = 0; j < robot.dof; j++) {
    const joint = robot.joints[j];
    if (evalQ[j] < joint.min - 1e-4 || evalQ[j] > joint.max + 1e-4) {
      withinLimits = false;
      break;
    }
  }

  let cost = posError * 100 + (use6DOF ? oriError * 10 : 0);
  if (options.currentJoints && options.currentJoints.length === robot.dof) {
    let motionDist = 0;
    for (let j = 0; j < robot.dof; j++) {
      motionDist += Math.pow(evalQ[j] - options.currentJoints[j], 2);
    }
    cost += Math.sqrt(motionDist);
  }
  if (!withinLimits) cost += 1000;
  if (!converged) cost += 10000;

  return {
    q: evalQ,
    converged,
    iterations: iter,
    positionError: posError,
    orientationError: oriError,
    withinLimits,
    manipulability: finalManipulability,
    conditionNumber: finalConditionNumber,
    cost,
    solverType: 'numerical-dls',
  };
}
