/**
 * Independent Inverse Kinematics Validation Module
 *
 * Verifies solutions strictly according to kinematic reality:
 * 1. Independent FK recomputation
 * 2. Position residual norm ||p(q) - p_target||
 * 3. Orientation residual norm ||rotationVectorError(R(q), R_target)||
 * 4. Strict joint limits check with tolerance
 * 5. Complete numerical finiteness check
 * 6. Singularities, rank, and condition number check
 * 7. Mapping to authoritative status codes
 */

import type { RobotDefinition } from '../../../data/schema/robotSchema';
import { Matrix4 } from '../../math/Matrix4';
import { forwardKinematics } from '../../kinematics/forwardKinematics';
import { computeGeometricJacobian } from '../../kinematics/jacobian';
import { RAD_TO_DEG } from '../../math/constants';
import type { ValidationReport, IKSolverStatus } from './types';

export interface ValidationInput {
  robot: RobotDefinition;
  q: number[];
  target: Matrix4;
  positionTolerance: number; // meters
  orientationTolerance: number; // radians
  positionOnly: boolean;
  maxIterationsReached: boolean;
  refinementImproved: boolean;
  executionTimeMs: number;
}

export function validateIKSolution(input: ValidationInput): ValidationReport {
  const {
    robot,
    q,
    target,
    positionTolerance,
    orientationTolerance,
    positionOnly,
    maxIterationsReached,
    refinementImproved,
    executionTimeMs,
  } = input;

  // 1. Strict Finiteness Check
  const jointsFinite =
    Array.isArray(q) &&
    q.length === robot.dof &&
    q.every((val) => typeof val === 'number' && Number.isFinite(val));

  const targetPos = target.getPosition();
  const targetFinite =
    Number.isFinite(targetPos.x) &&
    Number.isFinite(targetPos.y) &&
    Number.isFinite(targetPos.z) &&
    target.elements.every((el) => Number.isFinite(el));

  const allFinite = jointsFinite && targetFinite;

  if (!allFinite) {
    return {
      status: 'NUMERICAL_FAILURE',
      statusMessage: !jointsFinite
        ? 'Numerical failure: One or more joint angles contain NaN or Infinity.'
        : 'Numerical failure: Target pose matrix contains non-finite (NaN/Infinity) coordinates.',
      converged: false,
      finalJoints: Array.isArray(q) ? [...q] : [],
      positionErrorMeters: Infinity,
      positionErrorMm: Infinity,
      orientationErrorRadians: Infinity,
      orientationErrorDegrees: Infinity,
      withinJointLimits: false,
      jointLimitViolations: [],
      allFinite: false,
      manipulability: 0,
      conditionNumber: Infinity,
      isSingular: true,
      executionTimeMs,
    };
  }

  // 2. Strict Joint Limits Check
  const jointLimitViolations: ValidationReport['jointLimitViolations'] = [];
  const limitTolerance = 1e-4; // 0.1 mm or ~0.005 deg boundary tolerance

  for (let i = 0; i < robot.dof; i++) {
    const joint = robot.joints[i];
    if (joint) {
      if (q[i] < joint.min - limitTolerance || q[i] > joint.max + limitTolerance) {
        jointLimitViolations.push({
          jointIndex: i,
          jointName: joint.name,
          value: q[i],
          min: joint.min,
          max: joint.max,
        });
      }
    }
  }

  const withinJointLimits = jointLimitViolations.length === 0;

  // 3. Independent Forward Kinematics Recomputation
  const fk = forwardKinematics(robot, q);
  const actualPos = fk.endEffectorTransform.getPosition();
  const actualRot = fk.endEffectorTransform.getRotation();

  const targetRot = target.getRotation();

  const posError = actualPos.distanceTo(targetPos);
  const rotError = positionOnly ? 0 : actualRot.rotationError(targetRot).norm();

  // 4. Jacobian & Dexterity Metrics at solution
  const jac = computeGeometricJacobian(robot, q, fk);
  const manipulability = jac.manipulability;
  const conditionNumber = jac.conditionNumber;
  const isSingular = jac.isSingular;

  // 5. Tolerance checks
  const passesPosition = Number.isFinite(posError) && posError <= positionTolerance;
  const passesOrientation = positionOnly || (Number.isFinite(rotError) && rotError <= orientationTolerance);

  // 6. Authoritative Status Determination
  let status: IKSolverStatus;
  let statusMessage: string;

  if (!withinJointLimits) {
    status = 'CONSTRAINT_VIOLATION';
    statusMessage = `Joint limit violation: ${jointLimitViolations.length} joint(s) outside permissible bounds.`;
  } else if (!refinementImproved && (posError > 0.1 || (!positionOnly && rotError > 0.5))) {
    status = 'REFINEMENT_FAILED';
    statusMessage = 'Refinement failed to produce an acceptable descent from exploration seed.';
  } else if (passesPosition && passesOrientation) {
    status = 'CONVERGED';
    statusMessage = `Successfully converged! Position error: ${(posError * 1000).toFixed(3)} mm (tol ${(positionTolerance * 1000).toFixed(3)} mm)${
      positionOnly ? '' : `, orientation error: ${(rotError * RAD_TO_DEG).toFixed(3)} deg (tol ${(orientationTolerance * RAD_TO_DEG).toFixed(3)} deg)`
    }.`;
  } else {
    // Check if target is likely infeasible/outside reach
    const maxRobotReach = robot.joints.reduce((acc, j) => acc + Math.abs(j.d || 0) + Math.abs(j.a || 0), 0);
    const targetDistance = targetPos.norm();

    if (targetDistance > maxRobotReach * 1.05) {
      status = 'INFEASIBLE_OR_UNREACHABLE_TARGET';
      statusMessage = `Infeasible target: Target distance (${targetDistance.toFixed(3)} m) exceeds theoretical robot reach (${maxRobotReach.toFixed(3)} m).`;
    } else if (maxIterationsReached) {
      status = 'MAXIMUM_ITERATIONS_REACHED';
      statusMessage = `Iteration limit reached: Residual error ${(posError * 1000).toFixed(3)} mm exceeds tolerance ${(positionTolerance * 1000).toFixed(3)} mm.`;
    } else {
      status = 'TOLERANCE_NOT_REACHED';
      statusMessage = `Solver terminated without meeting requested tolerance: Pos error ${(posError * 1000).toFixed(3)} mm.`;
    }
  }

  return {
    status,
    statusMessage,
    converged: status === 'CONVERGED',
    finalJoints: [...q],
    positionErrorMeters: posError,
    positionErrorMm: posError * 1000,
    orientationErrorRadians: rotError,
    orientationErrorDegrees: rotError * RAD_TO_DEG,
    withinJointLimits,
    jointLimitViolations,
    allFinite,
    manipulability,
    conditionNumber,
    isSingular,
    executionTimeMs,
  };
}
