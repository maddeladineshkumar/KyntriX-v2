import { describe, it, expect } from 'vitest';
import { computeStandardDH, computeModifiedDH, EvaluatedDHParams } from '../../src/robotics/dh/dhTransform';
import { Matrix4, Vector3 } from '../../src/robotics/math';

describe('DH Transforms', () => {
  it('computes Standard DH identity for zero parameters', () => {
    const params: EvaluatedDHParams = { theta: 0, d: 0, a: 0, alpha: 0 };
    const A = computeStandardDH(params);
    expect(A.equals(Matrix4.identity())).toBe(true);
  });

  it('computes Standard DH position correctly for a and d', () => {
    const params: EvaluatedDHParams = { theta: 0, d: 0.5, a: 1.2, alpha: 0 };
    const A = computeStandardDH(params);
    const pos = A.getPosition();
    expect(pos.equals(new Vector3(1.2, 0, 0.5), 1e-6)).toBe(true);
  });

  it('rotates about Z by theta in Standard DH', () => {
    const params: EvaluatedDHParams = { theta: Math.PI / 2, d: 0, a: 1.0, alpha: 0 };
    const A = computeStandardDH(params);
    const pos = A.getPosition();
    // At theta = 90 deg, a * cos(theta) = 0, a * sin(theta) = 1.0
    expect(pos.equals(new Vector3(0, 1.0, 0), 1e-6)).toBe(true);
  });

  it('Modified DH applies twist alpha before rotation theta', () => {
    const params: EvaluatedDHParams = { theta: Math.PI / 2, d: 0.5, a: 1.0, alpha: Math.PI / 2 };
    const A_mod = computeModifiedDH(params);
    const A_std = computeStandardDH(params);

    // Modified DH and Standard DH have distinct algebraic forms
    expect(A_mod.equals(A_std, 1e-4)).toBe(false);
  });
});
