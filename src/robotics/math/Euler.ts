import { Matrix3 } from './Matrix3';
import { EPSILON } from './constants';

export type EulerOrder = 'XYZ' | 'ZYX' | 'ZYZ';

export class Euler {
  readonly a: number; // 1st angle in radians
  readonly b: number; // 2nd angle in radians
  readonly c: number; // 3rd angle in radians
  readonly order: EulerOrder;

  constructor(a = 0, b = 0, c = 0, order: EulerOrder = 'XYZ') {
    this.a = Number.isFinite(a) ? a : 0;
    this.b = Number.isFinite(b) ? b : 0;
    this.c = Number.isFinite(c) ? c : 0;
    this.order = order;
  }

  get x(): number {
    return this.a;
  }

  get y(): number {
    return this.b;
  }

  get z(): number {
    return this.c;
  }

  /**
   * Convert rotation matrix to Euler angles under specified sequence.
   */
  static fromRotationMatrix(R: Matrix3, order: EulerOrder = 'XYZ'): Euler {
    const m = R.elements;
    const r00 = m[0], r01 = m[1], r02 = m[2];
    const r10 = m[3], r11 = m[4], r12 = m[5];
    const r20 = m[6], r21 = m[7], r22 = m[8];

    if (order === 'XYZ') {
      // R = RotX(a) * RotY(b) * RotZ(c)
      // r02 = sin(b), r12 = -sin(a)*cos(b), r22 = cos(a)*cos(b)
      // r01 = -cos(b)*sin(c), r00 = cos(b)*cos(c)
      const sy = Math.sqrt(r00 * r00 + r01 * r01);
      const singular = sy < EPSILON;
      let a: number, b: number, c: number;
      if (!singular) {
        a = Math.atan2(-r12, r22);
        b = Math.atan2(r02, sy);
        c = Math.atan2(-r01, r00);
      } else {
        a = Math.atan2(r21, r11);
        b = Math.atan2(r02, sy);
        c = 0;
      }
      return new Euler(a, b, c, 'XYZ');
    } else if (order === 'ZYX') {
      // R = RotZ(a) * RotY(b) * RotX(c) (standard aerospace yaw-pitch-roll)
      let a: number, b: number, c: number;
      const cy = Math.sqrt(r00 * r00 + r10 * r10);
      if (cy > EPSILON) {
        a = Math.atan2(r10, r00);
        b = Math.atan2(-r20, cy);
        c = Math.atan2(r21, r22);
      } else {
        a = Math.atan2(-r01, r11);
        b = Math.atan2(-r20, cy);
        c = 0;
      }
      return new Euler(a, b, c, 'ZYX');
    } else if (order === 'ZYZ') {
      // R = RotZ(a) * RotY(b) * RotZ(c) (spherical wrist kinematic convention)
      let a: number, b: number, c: number;
      const sy = Math.sqrt(r20 * r20 + r21 * r21);
      if (sy > EPSILON) {
        a = Math.atan2(r12, r02);
        b = Math.atan2(sy, r22);
        c = Math.atan2(r21, -r20);
      } else {
        // Gimbal lock: b = 0 or b = pi
        a = 0;
        if (r22 > 0) {
          b = 0;
          c = Math.atan2(r10, r00);
        } else {
          b = Math.PI;
          c = Math.atan2(r10, -r00);
        }
      }
      return new Euler(a, b, c, 'ZYZ');
    }

    return new Euler(0, 0, 0, order);
  }

  toRotationMatrix(): Matrix3 {
    if (this.order === 'XYZ') {
      return Matrix3.rotX(this.a)
        .multiply(Matrix3.rotY(this.b))
        .multiply(Matrix3.rotZ(this.c));
    } else if (this.order === 'ZYX') {
      return Matrix3.rotZ(this.a)
        .multiply(Matrix3.rotY(this.b))
        .multiply(Matrix3.rotX(this.c));
    } else if (this.order === 'ZYZ') {
      return Matrix3.rotZ(this.a)
        .multiply(Matrix3.rotY(this.b))
        .multiply(Matrix3.rotZ(this.c));
    }
    return Matrix3.identity();
  }

  toArray(): [number, number, number] {
    return [this.a, this.b, this.c];
  }
}
