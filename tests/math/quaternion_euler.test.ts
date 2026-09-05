import { describe, it, expect } from 'vitest';
import { Quaternion, Matrix3, Euler } from '../../src/robotics/math';

describe('Quaternion & Euler', () => {
  it('converts rotation matrix to quaternion and back', () => {
    const R_orig = Matrix3.rotZ(0.6).multiply(Matrix3.rotY(0.4)).multiply(Matrix3.rotX(0.2));
    const q = Quaternion.fromRotationMatrix(R_orig);
    expect(q.norm()).toBeCloseTo(1.0);

    const R_back = q.toRotationMatrix();
    expect(R_orig.equals(R_back, 1e-6)).toBe(true);
  });

  it('performs SLERP accurately between quaternions', () => {
    const q0 = Quaternion.identity();
    const q1 = Quaternion.fromAxisAngle({ x: 0, y: 0, z: 1, normalize: () => ({ x: 0, y: 0, z: 1 }) } as any, Math.PI / 2);

    const qHalf = q0.slerp(q1, 0.5);
    const qExpected = Quaternion.fromAxisAngle({ x: 0, y: 0, z: 1, normalize: () => ({ x: 0, y: 0, z: 1 }) } as any, Math.PI / 4);

    expect(qHalf.equals(qExpected, 1e-5)).toBe(true);
  });

  it('converts to/from Euler angles across sequences', () => {
    const a = 0.3, b = 0.5, c = -0.4;
    const eulerXYZ = new Euler(a, b, c, 'XYZ');
    const R_xyz = eulerXYZ.toRotationMatrix();
    const eulerBack = Euler.fromRotationMatrix(R_xyz, 'XYZ');

    expect(eulerBack.a).toBeCloseTo(a);
    expect(eulerBack.b).toBeCloseTo(b);
    expect(eulerBack.c).toBeCloseTo(c);
  });
});
