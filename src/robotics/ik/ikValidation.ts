import type { RobotDefinition } from '../../data/schema/robotSchema';
import { Matrix4 } from '../math/Matrix4';
import { POSITION_TOLERANCE, ORIENTATION_TOLERANCE } from '../math/constants';
import { forwardKinematics } from '../kinematics/forwardKinematics';
import { computeGeometricJacobian } from '../kinematics/jacobian';
import type { IKSingleSolution } from './types';

export interface FinalizeSolutionOptions {
  positionTolerance?: number;
  orientationTolerance?: number;
  currentJoints?: number[];
  isOrientationFree?: boolean;
  requireJointLimits?: boolean;
}

/**
 * Universal validation and dexterity metric computation for all IK solvers.
 * Recomputes FK, real Jacobian, real manipulability, condition number, rank,
 * verifies joint limits, position/orientation error, and finite values.
 * Never marks a solution as converged if kinematic validation fails or if non-finite.
 */
export function finalizeIKSolution(
  robot: RobotDefinition,
  q: number[],
  target: Matrix4,
  solverType: 'analytical-3r' | 'analytical-6r' | 'analytical-scara' | 'numerical-dls',
  iterations: number,
  options: FinalizeSolutionOptions = {}
): IKSingleSolution {
  const {
    positionTolerance = POSITION_TOLERANCE,
    orientationTolerance = ORIENTATION_TOLERANCE,
    currentJoints,
    isOrientationFree = false,
    requireJointLimits = true,
  } = options;

  // 1. Strict finite check
  const allFinite =
    Array.isArray(q) &&
    q.length === robot.dof &&
    q.every((val) => typeof val === 'number' && Number.isFinite(val));

  if (!allFinite) {
    return {
      q: Array.isArray(q) ? [...q] : new Array(robot.dof).fill(NaN),
      converged: false,
      iterations,
      positionError: Infinity,
      orientationError: Infinity,
      withinLimits: false,
      manipulability: 0,
      conditionNumber: Infinity,
      rank: 0,
      isSingular: true,
      cost: Infinity,
      solverType,
    };
  }

  // 2. Strict joint limits check
  let withinLimits = true;
  const tol = 1e-4;
  for (let i = 0; i < robot.dof; i++) {
    const joint = robot.joints[i];
    if (joint) {
      if (q[i] < joint.min - tol || q[i] > joint.max + tol) {
        withinLimits = false;
        break;
      }
    }
  }

  // 3. Authoritative FK recomputation at returned q
  const fk = forwardKinematics(robot, q);
  const actualPos = fk.endEffectorTransform.getPosition();
  const actualRot = fk.endEffectorTransform.getRotation();

  const targetPos = target.getPosition();
  const targetRot = target.getRotation();

  const posError = actualPos.distanceTo(targetPos);
  const rotError = isOrientationFree ? 0 : targetRot.rotationError(actualRot).norm();

  // 4. Authoritative Jacobian and dexterity metrics at returned q
  const jac = computeGeometricJacobian(robot, q, fk);
  const manipulability = jac.manipulability;
  const conditionNumber = jac.conditionNumber;
  const rank = jac.rank;
  const isSingular = jac.isSingular;

  // 5. Convergence determination: must satisfy tolerance, finite values, and MANDATORY joint limit requirement
  const passesPosition = Number.isFinite(posError) && posError <= positionTolerance;
  const passesOrientation = isOrientationFree || (Number.isFinite(rotError) && rotError <= orientationTolerance);
  const converged = allFinite && withinLimits && passesPosition && passesOrientation && (!requireJointLimits || withinLimits);

  // 6. Consistent cost computation
  let cost = posError * 20 + (isOrientationFree ? 0 : rotError * 5);
  if (currentJoints && currentJoints.length === robot.dof) {
    let distSq = 0;
    for (let i = 0; i < robot.dof; i++) {
      distSq += Math.pow(q[i] - currentJoints[i], 2);
    }
    cost += Math.sqrt(distSq);
  }
  if (!withinLimits) cost += 1000;
  if (!converged) cost += 10000;

  return {
    q: [...q],
    converged,
    iterations,
    positionError: posError,
    orientationError: rotError,
    withinLimits,
    manipulability,
    conditionNumber,
    rank,
    isSingular,
    cost,
    solverType,
  };
}
