import { Matrix3 } from './Matrix3';
import { Vector3 } from './Vector3';
import { Quaternion } from './Quaternion';
import { Euler, type EulerOrder } from './Euler';
import { EPSILON } from './constants';

/**
 * 4x4 Homogeneous Transformation Matrix stored in row-major order:
 * [ m00, m01, m02, m03 ]
 * [ m10, m11, m12, m13 ]
 * [ m20, m21, m22, m23 ]
 * [ m30, m31, m32, m33 ]
 */
export class Matrix4 {
  readonly elements: Float64Array;

  constructor(elements?: ArrayLike<number>) {
    this.elements = new Float64Array(16);
    if (elements) {
      for (let i = 0; i < 16; i++) {
        this.elements[i] = Number.isFinite(elements[i]) ? elements[i] : 0;
      }
    } else {
      this.elements[0] = 1;
      this.elements[5] = 1;
      this.elements[10] = 1;
      this.elements[15] = 1;
    }
  }

  static identity(): Matrix4 {
    return new Matrix4([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
  }

  static fromRotationTranslation(R: Matrix3, p: Vector3): Matrix4 {
    const rm = R.elements;
    return new Matrix4([
      rm[0], rm[1], rm[2], p.x,
      rm[3], rm[4], rm[5], p.y,
      rm[6], rm[7], rm[8], p.z,
      0,     0,     0,     1,
    ]);
  }

  static trans(x: number, y: number, z: number): Matrix4 {
    return new Matrix4([
      1, 0, 0, x,
      0, 1, 0, y,
      0, 0, 1, z,
      0, 0, 0, 1,
    ]);
  }

  static translation(x: number, y: number, z: number): Matrix4 {
    return Matrix4.trans(x, y, z);
  }

  static transX(x: number): Matrix4 {
    return Matrix4.trans(x, 0, 0);
  }

  static transY(y: number): Matrix4 {
    return Matrix4.trans(0, y, 0);
  }

  static transZ(z: number): Matrix4 {
    return Matrix4.trans(0, 0, z);
  }

  static rotX(theta: number): Matrix4 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return new Matrix4([
      1, 0,  0, 0,
      0, c, -s, 0,
      0, s,  c, 0,
      0, 0,  0, 1,
    ]);
  }

  static rotY(theta: number): Matrix4 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return new Matrix4([
       c, 0, s, 0,
       0, 1, 0, 0,
      -s, 0, c, 0,
       0, 0, 0, 1,
    ]);
  }

  static rotZ(theta: number): Matrix4 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return new Matrix4([
      c, -s, 0, 0,
      s,  c, 0, 0,
      0,  0, 1, 0,
      0,  0, 0, 1,
    ]);
  }

  get(row: number, col: number): number {
    return this.elements[row * 4 + col];
  }

  getPosition(): Vector3 {
    return new Vector3(this.elements[3], this.elements[7], this.elements[11]);
  }

  getRotation(): Matrix3 {
    const m = this.elements;
    return new Matrix3([
      m[0], m[1], m[2],
      m[4], m[5], m[6],
      m[8], m[9], m[10],
    ]);
  }

  getQuaternion(): Quaternion {
    return Quaternion.fromRotationMatrix(this.getRotation());
  }

  getEuler(order: EulerOrder = 'XYZ'): Euler {
    return Euler.fromRotationMatrix(this.getRotation(), order);
  }

  multiply(b: Matrix4): Matrix4 {
    const a = this.elements;
    const be = b.elements;
    const res = new Float64Array(16);

    for (let r = 0; r < 4; r++) {
      const rIdx = r * 4;
      for (let c = 0; c < 4; c++) {
        res[rIdx + c] =
          a[rIdx] * be[c] +
          a[rIdx + 1] * be[4 + c] +
          a[rIdx + 2] * be[8 + c] +
          a[rIdx + 3] * be[12 + c];
      }
    }
    return new Matrix4(res);
  }

  transformPoint(p: Vector3): Vector3 {
    const m = this.elements;
    return new Vector3(
      m[0] * p.x + m[1] * p.y + m[2] * p.z + m[3],
      m[4] * p.x + m[5] * p.y + m[6] * p.z + m[7],
      m[8] * p.x + m[9] * p.y + m[10] * p.z + m[11]
    );
  }

  transformVector(v: Vector3): Vector3 {
    const m = this.elements;
    return new Vector3(
      m[0] * v.x + m[1] * v.y + m[2] * v.z,
      m[4] * v.x + m[5] * v.y + m[6] * v.z,
      m[8] * v.x + m[9] * v.y + m[10] * v.z
    );
  }

  transpose(): Matrix4 {
    const m = this.elements;
    return new Matrix4([
      m[0], m[4], m[8],  m[12],
      m[1], m[5], m[9],  m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15],
    ]);
  }

  /**
   * Fast, exact rigid-body inverse for SE(3) transforms:
   * T = [ R  p ]
   *     [ 0  1 ]
   * T^-1 = [ R^T  -R^T * p ]
   *        [  0       1    ]
   */
  rigidInverse(): Matrix4 {
    const m = this.elements;
    const r00 = m[0], r01 = m[1], r02 = m[2];
    const r10 = m[4], r11 = m[5], r12 = m[6];
    const r20 = m[8], r21 = m[9], r22 = m[10];
    const px = m[3], py = m[7], pz = m[11];

    // R^T * p
    const invPx = -(r00 * px + r10 * py + r20 * pz);
    const invPy = -(r01 * px + r11 * py + r21 * pz);
    const invPz = -(r02 * px + r12 * py + r22 * pz);

    return new Matrix4([
      r00, r10, r20, invPx,
      r01, r11, r21, invPy,
      r02, r12, r22, invPz,
      0,   0,   0,   1,
    ]);
  }

  /**
   * General 4x4 matrix inverse via Gauss-Jordan elimination with partial pivoting.
   */
  inverse(): Matrix4 {
    // If it is a proper rigid transform (last row is [0, 0, 0, 1]), use rigidInverse
    const m = this.elements;
    if (
      Math.abs(m[12]) < EPSILON &&
      Math.abs(m[13]) < EPSILON &&
      Math.abs(m[14]) < EPSILON &&
      Math.abs(m[15] - 1.0) < EPSILON
    ) {
      return this.rigidInverse();
    }

    // Otherwise standard Gauss-Jordan
    const a = Array.from(m);
    const inv = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];

    for (let i = 0; i < 4; i++) {
      let pivot = i;
      let maxVal = Math.abs(a[i * 4 + i]);
      for (let k = i + 1; k < 4; k++) {
        const val = Math.abs(a[k * 4 + i]);
        if (val > maxVal) {
          maxVal = val;
          pivot = k;
        }
      }

      if (maxVal < EPSILON) {
        throw new Error('Matrix4 is singular and cannot be inverted.');
      }

      // Swap rows
      if (pivot !== i) {
        for (let j = 0; j < 4; j++) {
          const tmpA = a[i * 4 + j];
          a[i * 4 + j] = a[pivot * 4 + j];
          a[pivot * 4 + j] = tmpA;

          const tmpInv = inv[i * 4 + j];
          inv[i * 4 + j] = inv[pivot * 4 + j];
          inv[pivot * 4 + j] = tmpInv;
        }
      }

      const div = a[i * 4 + i];
      for (let j = 0; j < 4; j++) {
        a[i * 4 + j] /= div;
        inv[i * 4 + j] /= div;
      }

      for (let k = 0; k < 4; k++) {
        if (k !== i) {
          const factor = a[k * 4 + i];
          for (let j = 0; j < 4; j++) {
            a[k * 4 + j] -= factor * a[i * 4 + j];
            inv[k * 4 + j] -= factor * inv[i * 4 + j];
          }
        }
      }
    }

    return new Matrix4(inv);
  }

  /**
   * Return Column-Major array for Three.js (Matrix4.fromArray)
   */
  toColumnMajor(): Float64Array {
    const m = this.elements;
    return new Float64Array([
      m[0], m[4], m[8],  m[12],
      m[1], m[5], m[9],  m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15],
    ]);
  }

  static fromColumnMajor(colMajor: ArrayLike<number>): Matrix4 {
    return new Matrix4([
      colMajor[0], colMajor[4], colMajor[8],  colMajor[12],
      colMajor[1], colMajor[5], colMajor[9],  colMajor[13],
      colMajor[2], colMajor[6], colMajor[10], colMajor[14],
      colMajor[3], colMajor[7], colMajor[11], colMajor[15],
    ]);
  }

  toColumnMajorArray(): number[] {
    const m = this.elements;
    return [
      m[0], m[4], m[8],  m[12],
      m[1], m[5], m[9],  m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15],
    ];
  }

  toRowMajorArray(): number[] {
    return Array.from(this.elements);
  }

  formatForDisplay(precision = 4): string[][] {
    const res: string[][] = [];
    for (let r = 0; r < 4; r++) {
      const row: string[] = [];
      for (let c = 0; c < 4; c++) {
        const val = this.elements[r * 4 + c];
        // Clean zero display (-0.0000 -> 0.0000)
        const cleanVal = Math.abs(val) < 1e-12 ? 0 : val;
        row.push(cleanVal.toFixed(precision));
      }
      res.push(row);
    }
    return res;
  }

  equals(m: Matrix4, tolerance = 1e-6): boolean {
    for (let i = 0; i < 16; i++) {
      if (Math.abs(this.elements[i] - m.elements[i]) > tolerance) {
        return false;
      }
    }
    return true;
  }

  clone(): Matrix4 {
    return new Matrix4(this.elements);
  }
}
