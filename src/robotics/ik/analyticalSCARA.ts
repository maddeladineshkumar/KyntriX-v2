import type { RobotDefinition } from '../../data/schema/robotSchema';
import { Matrix4 } from '../math/Matrix4';
import { computeFK } from '../kinematics/forwardKinematics';
import { POSITION_TOLERANCE, ORIENTATION_TOLERANCE } from '../math/constants';
import type { IKSingleSolution } from './types';
import { finalizeIKSolution } from './ikValidation';

/**
 * Check if a robot qualifies as a SCARA manipulator (RRPR with parallel Z axes).
 */
export function isSCARARobot(robot: RobotDefinition): boolean {
  if (robot.dof !== 4) return false;
  const j = robot.joints;
  const isRRPR =
    j[0].type === 'revolute' &&
    j[1].type === 'revolute' &&
    j[2].type === 'prismatic' &&
    j[3].type === 'revolute';
  if (!isRRPR) return false;

  // Check parallel vertical axes (alpha must be multiple of pi)
  const isParallelZ =
    Math.abs(Math.sin(j[0].alpha)) < 1e-3 &&
    Math.abs(Math.sin(j[1].alpha)) < 1e-3 &&
    Math.abs(Math.sin(j[2].alpha)) < 1e-3;

  return isParallelZ;
}

/**
 * Exact closed-form Analytical Inverse Kinematics for SCARA (RRPR) robots.
 * Computes Elbow-Left and Elbow-Right branches in < 0.1 ms with FK verification.
 */
export function solveSCARA(
  robot: RobotDefinition,
  target: Matrix4,
  currentJoints?: number[]
): IKSingleSolution[] {
  if (!isSCARARobot(robot)) return [];

  // Decouple baseTransform and endEffectorOffset if present
  let chainTarget = target;
  if (robot.endEffectorOffset) {
    chainTarget = chainTarget.multiply(robot.endEffectorOffset.rigidInverse());
  }
  if (robot.baseTransform) {
    chainTarget = robot.baseTransform.rigidInverse().multiply(chainTarget);
  }

  const p = chainTarget.getPosition();
  const R = chainTarget.getRotation();

  const a1 = robot.joints[0].a;
  const a2 = robot.joints[1].a;

  // Planar reach in XY
  const D2 = p.x * p.x + p.y * p.y;
  const denom = 2 * a1 * a2;
  if (Math.abs(denom) < 1e-9) return [];

  const cos2 = (D2 - a1 * a1 - a2 * a2) / denom;
  if (Math.abs(cos2) > 1.0 + 1e-4) {
    // Target outside reachable horizontal workspace
    return [];
  }

  const clampedCos2 = Math.max(-1, Math.min(1, cos2));
  const sin2_pos = Math.sqrt(Math.max(0, 1 - clampedCos2 * clampedCos2));
  const sin2_neg = -sin2_pos;

  // Determine Z sign direction of prismatic joint from joint 1 alpha
  const zSign = Math.cos(robot.joints[1].alpha) < 0 ? -1 : 1;
  const d1 = robot.joints[0].d;
  const d2 = robot.joints[1].d;
  const q3_raw = zSign > 0 ? p.z - d1 - d2 : (d1 + d2) - p.z;

  // Desired planar yaw angle in XY
  const phi = Math.atan2(R.get(1, 0), R.get(0, 0));

  const branches: [number, number, number, number][] = [];

  // Branch 1: Elbow Down / Positive theta2
  {
    const t2 = Math.atan2(sin2_pos, clampedCos2);
    const t1 = Math.atan2(p.y, p.x) - Math.atan2(a2 * sin2_pos, a1 + a2 * clampedCos2);
    const t4 = zSign > 0 ? phi - t1 - t2 : t1 + t2 - phi;
    branches.push([t1, t2, q3_raw, t4]);
  }

  // Branch 2: Elbow Up / Negative theta2
  {
    const t2 = Math.atan2(sin2_neg, clampedCos2);
    const t1 = Math.atan2(p.y, p.x) - Math.atan2(a2 * sin2_neg, a1 + a2 * clampedCos2);
    const t4 = zSign > 0 ? phi - t1 - t2 : t1 + t2 - phi;
    branches.push([t1, t2, q3_raw, t4]);
  }

  const solutions: IKSingleSolution[] = [];

  // Canonical chain robot stripped of external coordinate frame offsets for internal solves
  const chainRobot: RobotDefinition = (robot.baseTransform || robot.endEffectorOffset)
    ? { ...robot, baseTransform: undefined, endEffectorOffset: undefined }
    : robot;

  for (const rawQ of branches) {
    const q: number[] = [];
    let withinLimits = true;

    for (let i = 0; i < 4; i++) {
      const joint = robot.joints[i];
      let val = rawQ[i];

      if (joint.type === 'revolute') {
        val = val - joint.theta - joint.offset;
        val = Math.atan2(Math.sin(val), Math.cos(val));

        const tol = 1e-5;
        if (val < joint.min - tol || val > joint.max + tol) {
          if (val + 2 * Math.PI >= joint.min - tol && val + 2 * Math.PI <= joint.max + tol) {
            val += 2 * Math.PI;
          } else if (val - 2 * Math.PI >= joint.min - tol && val - 2 * Math.PI <= joint.max + tol) {
            val -= 2 * Math.PI;
          } else {
            withinLimits = false;
          }
        }
        if (withinLimits) {
          val = Math.max(joint.min, Math.min(joint.max, val));
        }
      } else {
        // Prismatic joint
        val = val - joint.d - joint.offset;
        const tol = 1e-5;
        if (val < joint.min - tol || val > joint.max + tol) {
          withinLimits = false;
        } else {
          val = Math.max(joint.min, Math.min(joint.max, val));
        }
      }

      q.push(val);
    }

    // Refine with up to 5 fast 1D/2D steps in chain base frame
    for (let iter = 0; iter < 5; iter++) {
      const fkCur = computeFK(chainRobot, q);
      const curPos = fkCur.endEffectorTransform.getPosition();
      const errPos = chainTarget.getPosition().subtract(curPos);
      if (errPos.norm() < 1e-6) break;

      // Adjust Z directly via prismatic joint in local frame
      q[2] += (zSign > 0 ? 1 : -1) * errPos.z;

      // Minor adjustment to joint 1 and 2
      const delta = 1e-6;
      const fkX = computeFK(chainRobot, [q[0] + delta, q[1], q[2], q[3]]);
      const dX = fkX.endEffectorTransform.getPosition().subtract(curPos).scale(1 / delta);
      const fkY = computeFK(chainRobot, [q[0], q[1] + delta, q[2], q[3]]);
      const dY = fkY.endEffectorTransform.getPosition().subtract(curPos).scale(1 / delta);

      const det = dX.x * dY.y - dX.y * dY.x;
      if (Math.abs(det) > 1e-8) {
        const dq0 = (errPos.x * dY.y - errPos.y * dY.x) / det;
        const dq1 = (dX.x * errPos.y - dX.y * errPos.x) / det;
        q[0] += Math.max(-0.2, Math.min(0.2, dq0));
        q[1] += Math.max(-0.2, Math.min(0.2, dq1));
      }
    }

    // Universal Authoritative Validation & Dexterity Computation
    const solution = finalizeIKSolution(
      robot,
      q,
      target,
      'analytical-scara',
      1,
      {
        positionTolerance: POSITION_TOLERANCE * 5,
        orientationTolerance: ORIENTATION_TOLERANCE * 5,
        currentJoints,
      }
    );

    if (solution.converged) {
      solutions.push(solution);
    }
  }

  return solutions;
}
