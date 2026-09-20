/**
 * Inverse Kinematics Objective Function and Gradient Computations
 *
 * Formulations:
 * 1. Position Error:
 *    e_p(q) = p(q) - p_target
 *    f_p(q) = 0.5 * ||e_p(q)||^2
 *
 * 2. Orientation Error (Lie algebra so(3) log-map representation):
 *    e_o(q) = log(R_target * R(q)^T) in radians
 *    f_o(q) = 0.5 * ||e_o(q)||^2
 *
 * 3. Total Objective:
 *    f(q) = w_p * f_p(q) + w_o * f_o(q)
 *
 * 4. Gradient:
 *    - Analytical: grad f(q) = w_p * J_v^T * e_p + w_o * J_w^T * e_o
 *    - Central Finite Differences: grad_j f(q) = (f(q + h * e_j) - f(q - h * e_j)) / (2 * h)
 */

import type { RobotDefinition } from '../../../data/schema/robotSchema';
import { Matrix4 } from '../../math/Matrix4';
import { Vector3 } from '../../math/Vector3';
import { forwardKinematics } from '../../kinematics/forwardKinematics';
import { computeGeometricJacobian } from '../../kinematics/jacobian';
import type { IKObjectiveBreakdown } from './types';

export class IKObjectiveEvaluator {
  readonly robot: RobotDefinition;
  readonly target: Matrix4;
  readonly targetPos: Vector3;
  readonly targetRot: Matrix4;
  readonly positionWeight: number;
  readonly orientationWeight: number;
  readonly isPositionOnly: boolean;
  readonly dof: number;
  readonly lowerBounds: number[];
  readonly upperBounds: number[];
  readonly limitPenaltyWeight: number;

  constructor(
    robot: RobotDefinition,
    target: Matrix4,
    options: {
      positionWeight?: number;
      orientationWeight?: number;
      positionOnly?: boolean;
      jointLimitPenaltyWeight?: number;
    } = {}
  ) {
    this.robot = robot;
    this.target = target.clone();
    this.targetPos = target.getPosition();
    this.targetRot = target.clone();
    this.positionWeight = options.positionWeight ?? 1.0;
    this.isPositionOnly = options.positionOnly ?? (robot.dof < 6);
    this.orientationWeight = this.isPositionOnly ? 0 : (options.orientationWeight ?? 0.2);
    this.limitPenaltyWeight = options.jointLimitPenaltyWeight ?? 0;
    this.dof = robot.joints.length;

    this.lowerBounds = robot.joints.map((j) => j.min);
    this.upperBounds = robot.joints.map((j) => j.max);
  }

  /**
   * Detailed breakdown of objective components at configuration q
   */
  evaluateBreakdown(q: number[]): IKObjectiveBreakdown {
    const fk = forwardKinematics(this.robot, q);
    const currPos = fk.endEffectorTransform.getPosition();
    const currRot = fk.endEffectorTransform.getRotation();

    // Position error vector: e_p = p(q) - p_target
    const dp = currPos.sub(this.targetPos);
    const posNorm = dp.norm();
    const f_p = 0.5 * posNorm * posNorm;

    // Orientation error vector in so(3): e_o = rotationVectorError(R_target)
    let oriNorm = 0;
    let do_rot = new Vector3(0, 0, 0);
    let f_o = 0;

    if (!this.isPositionOnly) {
      // Rotation error from current to target: omega = R_curr.rotationVectorError(R_target)
      // Note: currRot.rotationError returns the instantaneous rotation vector from currRot to targetRot
      do_rot = currRot.rotationError(this.targetRot.getRotation());
      oriNorm = do_rot.norm();
      f_o = 0.5 * oriNorm * oriNorm;
    }

    const total = this.positionWeight * f_p + this.orientationWeight * f_o;

    return {
      positionErrorVec: [dp.x, dp.y, dp.z],
      positionErrorNorm: posNorm,
      orientationErrorVec: [do_rot.x, do_rot.y, do_rot.z],
      orientationErrorNorm: oriNorm,
      positionObjective: f_p,
      orientationObjective: f_o,
      totalObjective: total,
    };
  }

  /**
   * Evaluates scalar objective function f(q)
   */
  evaluate(q: number[]): number {
    const breakdown = this.evaluateBreakdown(q);
    let total = breakdown.totalObjective;

    // Optional quadratic penalty for approaching limits within 2% margin
    if (this.limitPenaltyWeight > 0) {
      let penalty = 0;
      for (let i = 0; i < this.dof; i++) {
        const lb = this.lowerBounds[i];
        const ub = this.upperBounds[i];
        const margin = 0.02 * (ub - lb);
        if (q[i] < lb + margin) {
          const diff = (lb + margin) - q[i];
          penalty += diff * diff;
        } else if (q[i] > ub - margin) {
          const diff = q[i] - (ub - margin);
          penalty += diff * diff;
        }
      }
      total += this.limitPenaltyWeight * penalty;
    }

    return total;
  }

  /**
   * Computes gradient via central finite differences:
   * grad_j f(q) = (f(q + h * e_j) - f(q - h * e_j)) / (2 * h)
   */
  computeFiniteDifferenceGradient(q: number[], h: number = 1e-6): number[] {
    const grad = new Array(this.dof);
    const qPlus = [...q];
    const qMinus = [...q];

    for (let j = 0; j < this.dof; j++) {
      qPlus[j] = q[j] + h;
      qMinus[j] = q[j] - h;

      const fPlus = this.evaluate(qPlus);
      const fMinus = this.evaluate(qMinus);

      grad[j] = (fPlus - fMinus) / (2 * h);

      // Restore
      qPlus[j] = q[j];
      qMinus[j] = q[j];
    }
    return grad;
  }

  /**
   * Computes analytical gradient via geometric Jacobian transpose:
   * grad f(q) = w_p * J_v^T * e_p + w_o * J_w^T * e_o
   */
  computeAnalyticalGradient(q: number[]): number[] {
    const fk = forwardKinematics(this.robot, q);
    const currPos = fk.endEffectorTransform.getPosition();
    const currRot = fk.endEffectorTransform.getRotation();

    // Error vectors
    const dp = currPos.sub(this.targetPos);
    const do_rot = this.isPositionOnly ? new Vector3(0, 0, 0) : currRot.rotationError(this.targetRot.getRotation());

    // Geometric Jacobian J is 6 x n
    const jac = computeGeometricJacobian(this.robot, q, fk);
    const J = jac.J;

    const grad = new Array(this.dof).fill(0);

    for (let j = 0; j < this.dof; j++) {
      // J_v^T * e_p = J[0][j]*dp.x + J[1][j]*dp.y + J[2][j]*dp.z
      const jvDotEp = J[0][j] * dp.x + J[1][j] * dp.y + J[2][j] * dp.z;

      // J_w^T * e_o = J[3][j]*do.x + J[4][j]*do.y + J[5][j]*do.z
      const jwDotEo = this.isPositionOnly
        ? 0
        : J[3][j] * do_rot.x + J[4][j] * do_rot.y + J[5][j] * do_rot.z;

      grad[j] = this.positionWeight * jvDotEp - this.orientationWeight * jwDotEo;
    }

    if (this.limitPenaltyWeight > 0) {
      for (let j = 0; j < this.dof; j++) {
        const lb = this.lowerBounds[j];
        const ub = this.upperBounds[j];
        const margin = 0.02 * (ub - lb);
        if (q[j] < lb + margin) {
          // d/dq_j ( (lb + margin - q[j])^2 ) = -2 * (lb + margin - q[j])
          grad[j] -= 2 * this.limitPenaltyWeight * ((lb + margin) - q[j]);
        } else if (q[j] > ub - margin) {
          // d/dq_j ( (q[j] - (ub - margin))^2 ) = 2 * (q[j] - (ub - margin))
          grad[j] += 2 * this.limitPenaltyWeight * (q[j] - (ub - margin));
        }
      }
    }

    return grad;
  }

  /**
   * Evaluates both objective and gradient
   */
  evaluateAndGradient(
    q: number[],
    method: 'analytical' | 'finite-differences' = 'analytical'
  ): { objective: number; gradient: number[] } {
    const obj = this.evaluate(q);
    const grad =
      method === 'analytical'
        ? this.computeAnalyticalGradient(q)
        : this.computeFiniteDifferenceGradient(q);
    return { objective: obj, gradient: grad };
  }
}
