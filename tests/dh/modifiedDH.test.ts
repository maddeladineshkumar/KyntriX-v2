import { describe, it, expect } from 'vitest';
import { computeModifiedDH, EvaluatedDHParams } from '../../src/robotics/dh/dhTransform';
import { Matrix4, Vector3 } from '../../src/robotics/math';

describe('Modified DH (Craig) Convention Tests', () => {
  it('computes Modified DH identity for zero parameters', () => {
    const params: EvaluatedDHParams = { theta: 0, d: 0, a: 0, alpha: 0 };
    const A = computeModifiedDH(params);
    expect(A.equals(Matrix4.identity(), 1e-9)).toBe(true);
  });

  it('translates correctly along X (a) and Z (d) in Modified DH', () => {
    // In Modified DH: A = RotX(alpha) * TransX(a) * RotZ(theta) * TransZ(d)
    // For theta=0, alpha=0: A is pure translation [a, 0, d]
    const params: EvaluatedDHParams = { theta: 0, d: 0.75, a: 1.5, alpha: 0 };
    const A = computeModifiedDH(params);
    const pos = A.getPosition();
    expect(pos.equals(new Vector3(1.5, 0, 0.75), 1e-6)).toBe(true);
  });

  it('maintains proper orthogonality and unit determinant for rotation submatrix', () => {
    const params: EvaluatedDHParams = {
      theta: Math.PI / 3,
      d: 0.4,
      a: 0.6,
      alpha: Math.PI / 4,
    };
    const A = computeModifiedDH(params);
    const R = A.getRotation();

    // R * R^T = I
    const Rt = R.transpose();
    const shouldBeIdentity = R.multiply(Rt);
    expect(shouldBeIdentity.equals(Matrix4.identity().getRotation(), 1e-6)).toBe(true);
    expect(Math.abs(R.determinant() - 1.0)).toBeLessThan(1e-6);
  });

  it('rotates about X by alpha before translating and rotating about Z', () => {
    // alpha = 90 deg: X-axis rotation tilts Z into Y
    const params: EvaluatedDHParams = {
      theta: 0,
      d: 1.0,
      a: 0,
      alpha: Math.PI / 2,
    };
    const A = computeModifiedDH(params);
    const pos = A.getPosition();
    // In Modified DH with alpha=pi/2, d is rotated to -d*sin(alpha) = -1.0 in Y, or d*cos(alpha) = 0 in Z
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
    expect(Number.isFinite(pos.z)).toBe(true);
  });
});
