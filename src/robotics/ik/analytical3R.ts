import type { RobotDefinition } from '../../data/schema/robotSchema';
import { Matrix4 } from '../math/Matrix4';
import { POSITION_TOLERANCE, ORIENTATION_TOLERANCE } from '../math/constants';
import type { IKSingleSolution } from './types';
import { finalizeIKSolution } from './ikValidation';

/**
 * Solves Inverse Kinematics for a 3R Planar Robot.
 * Link axes must all be parallel to Z (or alpha = 0).
 */
export function solve3RPlanar(
  robot: RobotDefinition,
  target: Matrix4,
  currentJoints?: number[]
): IKSingleSolution[] {
  if (robot.dof < 3) return [];

  const a1 = robot.joints[0].a;
  const a2 = robot.joints[1].a;
  const a3 = robot.joints[2].a;

  // Decouple baseTransform and endEffectorOffset if present
  let chainTarget = target;
  if (robot.endEffectorOffset) {
    chainTarget = chainTarget.multiply(robot.endEffectorOffset.rigidInverse());
  }
  if (robot.baseTransform) {
    chainTarget = robot.baseTransform.rigidInverse().multiply(chainTarget);
  }

  // Position and orientation in XY plane of Frame 0
  const p = chainTarget.getPosition();
  const r = chainTarget.getRotation();
  const phi = Math.atan2(r.get(1, 0), r.get(0, 0)); // End-effector planar angle

  // Position of joint 3 (wrist)
  const x2 = p.x - a3 * Math.cos(phi);
  const y2 = p.y - a3 * Math.sin(phi);

  const D2 = x2 * x2 + y2 * y2;
  const denom = 2 * a1 * a2;
  if (Math.abs(denom) < 1e-9) return [];

  const cos2 = (D2 - a1 * a1 - a2 * a2) / denom;
  if (Math.abs(cos2) > 1.0 + 1e-5) {
    // Out of reachable workspace
    return [];
  }

  const clampedCos2 = Math.max(-1, Math.min(1, cos2));
  const sin2_pos = Math.sqrt(Math.max(0, 1 - clampedCos2 * clampedCos2));
  const sin2_neg = -sin2_pos;

  const candidateAngles: number[][] = [];

  // Branch 1: Elbow Down
  const t2_1 = Math.atan2(sin2_pos, clampedCos2);
  const t1_1 = Math.atan2(y2, x2) - Math.atan2(a2 * sin2_pos, a1 + a2 * clampedCos2);
  const t3_1 = phi - t1_1 - t2_1;
  candidateAngles.push([t1_1, t2_1, t3_1]);

  // Branch 2: Elbow Up
  const t2_2 = Math.atan2(sin2_neg, clampedCos2);
  const t1_2 = Math.atan2(y2, x2) - Math.atan2(a2 * sin2_neg, a1 + a2 * clampedCos2);
  const t3_2 = phi - t1_2 - t2_2;
  candidateAngles.push([t1_2, t2_2, t3_2]);

  const solutions: IKSingleSolution[] = [];

  for (const rawAngles of candidateAngles) {
    const q: number[] = [];
    let withinLimits = true;

    for (let i = 0; i < 3; i++) {
      const joint = robot.joints[i];
      // Subtract joint.theta and joint.offset to get generalized coordinate q_i
      let angle = rawAngles[i] - joint.theta - joint.offset;
      // Normalize to [-pi, pi]
      angle = Math.atan2(Math.sin(angle), Math.cos(angle));

      // Check limits
      const tol = 1e-5;
      if (angle < joint.min - tol || angle > joint.max + tol) {
        // Try unwrapping by +/- 2pi
        if (angle + 2 * Math.PI >= joint.min - tol && angle + 2 * Math.PI <= joint.max + tol) {
          angle += 2 * Math.PI;
        } else if (angle - 2 * Math.PI >= joint.min - tol && angle - 2 * Math.PI <= joint.max + tol) {
          angle -= 2 * Math.PI;
        } else {
          withinLimits = false;
        }
      }
      if (withinLimits) {
        angle = Math.max(joint.min, Math.min(joint.max, angle));
      }
      q.push(angle);
    }

    // Universal Authoritative Validation & Dexterity Computation
    const solution = finalizeIKSolution(
      robot,
      q,
      target,
      'analytical-3r',
      1,
      {
        positionTolerance: POSITION_TOLERANCE * 5,
        orientationTolerance: ORIENTATION_TOLERANCE * 5,
        currentJoints,
      }
    );
    solutions.push(solution);
  }

  return solutions;
}
