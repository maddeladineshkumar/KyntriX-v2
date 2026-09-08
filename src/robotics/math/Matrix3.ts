import { Vector3 } from './Vector3';
import { EPSILON } from './constants';

/**
 * 3x3 Matrix stored in row-major order:
 * [ m00, m01, m02 ]
 * [ m10, m11, m12 ]
 * [ m20, m21, m22 ]
 */
export class Matrix3 {
  readonly elements: Float64Array;

  constructor(elements?: ArrayLike<number>) {
    this.elements = new Float64Array(9);
    if (elements) {
      for (let i = 0; i < 9; i++) {
        this.elements[i] = Number.isFinite(elements[i]) ? elements[i] : 0;
      }
    } else {
      this.elements[0] = 1;
      this.elements[4] = 1;
      this.elements[8] = 1;
    }
  }

  static identity(): Matrix3 {
    return new Matrix3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }

  static fromColumns(col0: Vector3, col1: Vector3, col2: Vector3): Matrix3 {
    return new Matrix3([
      col0.x, col1.x, col2.x,
      col0.y, col1.y, col2.y,
      col0.z, col1.z, col2.z,
    ]);
  }

  static fromRows(row0: Vector3, row1: Vector3, row2: Vector3): Matrix3 {
    return new Matrix3([
      row0.x, row0.y, row0.z,
      row1.x, row1.y, row1.z,
      row2.x, row2.y, row2.z,
    ]);
  }

  static rotX(theta: number): Matrix3 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return new Matrix3([
      1, 0, 0,
      0, c, -s,
      0, s, c,
    ]);
  }

  static rotY(theta: number): Matrix3 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return new Matrix3([
      c, 0, s,
      0, 1, 0,
      -s, 0, c,
    ]);
  }

  static rotZ(theta: number): Matrix3 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return new Matrix3([
      c, -s, 0,
      s, c, 0,
      0, 0, 1,
    ]);
  }

  get(row: number, col: number): number {
    return this.elements[row * 3 + col];
  }

  getCol(col: number): Vector3 {
    return new Vector3(
      this.elements[col],
      this.elements[3 + col],
      this.elements[6 + col]
    );
  }

  getRow(row: number): Vector3 {
    const offset = row * 3;
    return new Vector3(
      this.elements[offset],
      this.elements[offset + 1],
      this.elements[offset + 2]
    );
  }

  multiply(b: Matrix3): Matrix3 {
    const a = this.elements;
    const be = b.elements;
    const res = new Float64Array(9);

    for (let r = 0; r < 3; r++) {
      const rIdx = r * 3;
      for (let c = 0; c < 3; c++) {
        res[rIdx + c] =
          a[rIdx] * be[c] +
          a[rIdx + 1] * be[3 + c] +
          a[rIdx + 2] * be[6 + c];
      }
    }
    return new Matrix3(res);
  }

  multiplyVector(v: Vector3): Vector3 {
    const m = this.elements;
    return new Vector3(
      m[0] * v.x + m[1] * v.y + m[2] * v.z,
      m[3] * v.x + m[4] * v.y + m[5] * v.z,
      m[6] * v.x + m[7] * v.y + m[8] * v.z
    );
  }

  transpose(): Matrix3 {
    const m = this.elements;
    return new Matrix3([
      m[0], m[3], m[6],
      m[1], m[4], m[7],
      m[2], m[5], m[8],
    ]);
  }

  determinant(): number {
    const m = this.elements;
    return (
      m[0] * (m[4] * m[8] - m[5] * m[7]) -
      m[1] * (m[3] * m[8] - m[5] * m[6]) +
      m[2] * (m[3] * m[7] - m[4] * m[6])
    );
  }

  inverse(): Matrix3 {
    const det = this.determinant();
    if (Math.abs(det) < EPSILON) {
      throw new Error('Matrix3 is singular and cannot be inverted.');
    }
    const invDet = 1 / det;
    const m = this.elements;
    return new Matrix3([
      (m[4] * m[8] - m[5] * m[7]) * invDet,
      (m[2] * m[7] - m[1] * m[8]) * invDet,
      (m[1] * m[5] - m[2] * m[4]) * invDet,

      (m[5] * m[6] - m[3] * m[8]) * invDet,
      (m[0] * m[8] - m[2] * m[6]) * invDet,
      (m[2] * m[3] - m[0] * m[5]) * invDet,

      (m[3] * m[7] - m[4] * m[6]) * invDet,
      (m[1] * m[6] - m[0] * m[7]) * invDet,
      (m[0] * m[4] - m[1] * m[3]) * invDet,
    ]);
  }

  /**
   * First-order cross-product orientation error vector between this (R_c) and target (R_d):
   * e_R = 0.5 * (n_c x n_d + s_c x s_d + a_c x a_d)
   */
  orientationError(target: Matrix3): Vector3 {
    const nc = this.getCol(0);
    const sc = this.getCol(1);
    const ac = this.getCol(2);

    const nd = target.getCol(0);
    const sd = target.getCol(1);
    const ad = target.getCol(2);

    const crossSum = nc.cross(nd).add(sc.cross(sd)).add(ac.cross(ad));
    return crossSum.scale(0.5);
  }

  /**
   * Exact orientation error vector in Lie algebra so(3) between this (R_c) and target (R_d):
   * omega = log(R_d * R_c^T) such that exp([omega]_x) * R_c = R_d.
   * Magnitude of omega is the exact rotation angle in radians; direction is the instantaneous rotation axis.
   * Completely singularity-free and monotonic across the full SO(3) manifold up to pi.
   */
  rotationVectorError(target: Matrix3): Vector3 {
    // Relative rotation in current frame: R_rel = R_c^T * R_d
    const Rrel = this.transpose().multiply(target);
    const m = Rrel.elements;
    const tr = m[0] + m[4] + m[8];
    const cosTheta = Math.max(-1, Math.min(1, (tr - 1) * 0.5));
    const theta = Math.acos(cosTheta);

    if (theta < 1e-4) {
      // First-order Taylor series (standard cross-sum scaled by 0.5)
      return this.orientationError(target);
    }

    if (theta > Math.PI - 1e-4) {
      // Near pi (180 degrees): extract principal axis from symmetric part (R_rel + I) / 2
      // Use maximum diagonal pivot selection to resolve component signs reliably across all planes
      let ux = Math.sqrt(Math.max(0, (m[0] + 1) * 0.5));
      let uy = Math.sqrt(Math.max(0, (m[4] + 1) * 0.5));
      let uz = Math.sqrt(Math.max(0, (m[8] + 1) * 0.5));

      // Off-diagonal products in row-major Matrix3:
      // m[1] (0,1), m[3] (1,0) -> 2 * ux * uy
      // m[2] (0,2), m[6] (2,0) -> 2 * ux * uz
      // m[5] (1,2), m[7] (2,1) -> 2 * uy * uz
      const xy = m[1] + m[3];
      const xz = m[2] + m[6];
      const yz = m[5] + m[7];

      if (m[0] >= m[4] && m[0] >= m[8]) {
        // ux is dominant (pivot on X)
        if (xy < 0) uy = -uy;
        if (xz < 0) uz = -uz;
      } else if (m[4] >= m[8]) {
        // uy is dominant (pivot on Y)
        if (xy < 0) ux = -ux;
        if (yz < 0) uz = -uz;
      } else {
        // uz is dominant (pivot on Z)
        if (xz < 0) ux = -ux;
        if (yz < 0) uy = -uy;
      }

      const axisRel = new Vector3(ux, uy, uz).normalize();
      // Transform axis from body frame to base/world frame: axis_base = R_c * axis_body
      const axisBase = this.multiplyVector(axisRel);
      return axisBase.scale(theta);
    }

    // General case: exact scaling factor theta / (2 * sin(theta))
    const scale = theta / (2 * Math.sin(theta));
    const nc = this.getCol(0);
    const sc = this.getCol(1);
    const ac = this.getCol(2);

    const nd = target.getCol(0);
    const sd = target.getCol(1);
    const ad = target.getCol(2);

    const crossSum = nc.cross(nd).add(sc.cross(sd)).add(ac.cross(ad));
    return crossSum.scale(scale);
  }

  rotationError(target: Matrix3): Vector3 {
    return this.rotationVectorError(target);
  }

  equals(m: Matrix3, tolerance = 1e-6): boolean {
    for (let i = 0; i < 9; i++) {
      if (Math.abs(this.elements[i] - m.elements[i]) > tolerance) {
        return false;
      }
    }
    return true;
  }

  clone(): Matrix3 {
    return new Matrix3(this.elements);
  }
}
