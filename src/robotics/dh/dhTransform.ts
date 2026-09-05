import { Matrix4 } from '../math/Matrix4';
import type { DHConvention, JointDefinition } from '../../data/schema/robotSchema';

export interface EvaluatedDHParams {
  theta: number; // rad
  d: number;     // meters
  a: number;     // meters
  alpha: number; // rad
}

/**
 * Computes the active DH parameters for a joint given its current generalized coordinate q.
 */
export function evaluateJointDH(joint: JointDefinition, q: number): EvaluatedDHParams {
  if (joint.type === 'revolute') {
    return {
      theta: joint.theta + q + joint.offset,
      d: joint.d,
      a: joint.a,
      alpha: joint.alpha,
    };
  } else {
    return {
      theta: joint.theta,
      d: joint.d + q + joint.offset,
      a: joint.a,
      alpha: joint.alpha,
    };
  }
}

/**
 * Computes Standard DH homogeneous transformation matrix:
 * A_i = RotZ(theta_i) * TransZ(d_i) * TransX(a_i) * RotX(alpha_i)
 */
export function computeStandardDH(params: EvaluatedDHParams): Matrix4 {
  const { theta, d, a, alpha } = params;
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  return new Matrix4([
    ct, -st * ca,  st * sa, a * ct,
    st,  ct * ca, -ct * sa, a * st,
    0,   sa,       ca,      d,
    0,   0,        0,       1,
  ]);
}

/**
 * Computes Modified DH (Craig) homogeneous transformation matrix:
 * A_i = RotX(alpha_{i-1}) * TransX(a_{i-1}) * RotZ(theta_i) * TransZ(d_i)
 */
export function computeModifiedDH(params: EvaluatedDHParams): Matrix4 {
  const { theta, d, a, alpha } = params;
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  return new Matrix4([
    ct,      -st,       0,   a,
    st * ca,  ct * ca, -sa, -d * sa,
    st * sa,  ct * sa,  ca,  d * ca,
    0,        0,        0,   1,
  ]);
}

/**
 * Compute the homogeneous transform A_i for joint i based on the robot's configured convention.
 */
export function computeDHTransform(
  joint: JointDefinition,
  q: number,
  convention: DHConvention = 'standard'
): Matrix4 {
  const params = evaluateJointDH(joint, q);
  if (convention === 'modified') {
    return computeModifiedDH(params);
  }
  return computeStandardDH(params);
}
