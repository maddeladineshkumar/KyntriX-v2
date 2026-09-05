import { describe, it, expect } from 'vitest';
import { Vector3, Matrix3, Matrix4 } from '../../src/robotics/math';

describe('Vector3', () => {
  it('computes dot and cross product correctly', () => {
    const a = new Vector3(1, 0, 0);
    const b = new Vector3(0, 1, 0);
    expect(a.dot(b)).toBe(0);
    const c = a.cross(b);
    expect(c.equals(new Vector3(0, 0, 1))).toBe(true);
  });

  it('normalizes vector correctly', () => {
    const v = new Vector3(3, 4, 0);
    expect(v.norm()).toBeCloseTo(5);
    const u = v.normalize();
    expect(u.norm()).toBeCloseTo(1);
    expect(u.x).toBeCloseTo(0.6);
    expect(u.y).toBeCloseTo(0.8);
  });
});

describe('Matrix3', () => {
  it('computes determinant and inverse correctly', () => {
    const rotZ = Matrix3.rotZ(Math.PI / 4);
    expect(rotZ.determinant()).toBeCloseTo(1);
    const inv = rotZ.inverse();
    const identity = rotZ.multiply(inv);
    expect(identity.equals(Matrix3.identity(), 1e-6)).toBe(true);
  });

  it('computes transpose equal to inverse for orthogonal matrices', () => {
    const R = Matrix3.rotX(0.5).multiply(Matrix3.rotY(0.7));
    const inv = R.inverse();
    const tr = R.transpose();
    expect(inv.equals(tr, 1e-6)).toBe(true);
  });
});

describe('Matrix4', () => {
  it('computes rigid inverse correctly', () => {
    const R = Matrix3.rotZ(Math.PI / 3);
    const p = new Vector3(10, 20, 30);
    const T = Matrix4.fromRotationTranslation(R, p);

    const inv = T.rigidInverse();
    const id1 = T.multiply(inv);
    const id2 = inv.multiply(T);

    expect(id1.equals(Matrix4.identity(), 1e-6)).toBe(true);
    expect(id2.equals(Matrix4.identity(), 1e-6)).toBe(true);
  });

  it('transforms points and vectors correctly', () => {
    const T = Matrix4.trans(5, 0, 0).multiply(Matrix4.rotZ(Math.PI / 2));
    // Point at local (1, 0, 0): first rotated 90 deg -> (0, 1, 0), then translated -> (5, 1, 0)
    const pt = T.transformPoint(new Vector3(1, 0, 0));
    expect(pt.x).toBeCloseTo(5);
    expect(pt.y).toBeCloseTo(1);
    expect(pt.z).toBeCloseTo(0);

    // Vector (1, 0, 0) should only be rotated, not translated -> (0, 1, 0)
    const vec = T.transformVector(new Vector3(1, 0, 0));
    expect(vec.x).toBeCloseTo(0);
    expect(vec.y).toBeCloseTo(1);
    expect(vec.z).toBeCloseTo(0);
  });
});
