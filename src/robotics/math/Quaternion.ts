import { Matrix3 } from './Matrix3';
import { Vector3 } from './Vector3';
import { EPSILON } from './constants';

export class Quaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = Number.isFinite(x) ? x : 0;
    this.y = Number.isFinite(y) ? y : 0;
    this.z = Number.isFinite(z) ? z : 0;
    this.w = Number.isFinite(w) ? w : 1;
  }

  static identity(): Quaternion {
    return new Quaternion(0, 0, 0, 1);
  }

  static fromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const half = angle * 0.5;
    const s = Math.sin(half);
    const u = axis.normalize();
    return new Quaternion(u.x * s, u.y * s, u.z * s, Math.cos(half)).normalize();
  }

  /**
   * Numerically stable conversion from 3x3 rotation matrix using Shepperd's algorithm.
   */
  static fromRotationMatrix(R: Matrix3): Quaternion {
    const m = R.elements;
    const r00 = m[0], r01 = m[1], r02 = m[2];
    const r10 = m[3], r11 = m[4], r12 = m[5];
    const r20 = m[6], r21 = m[7], r22 = m[8];

    const trace = r00 + r11 + r22;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(Math.max(1e-12, trace + 1.0));
      return new Quaternion(
        (r21 - r12) * s,
        (r02 - r20) * s,
        (r10 - r01) * s,
        0.25 / s
      ).normalize();
    } else if (r00 > r11 && r00 > r22) {
      const s = Math.max(1e-12, 2.0 * Math.sqrt(Math.max(0, 1.0 + r00 - r11 - r22)));
      return new Quaternion(
        0.25 * s,
        (r01 + r10) / s,
        (r02 + r20) / s,
        (r21 - r12) / s
      ).normalize();
    } else if (r11 > r22) {
      const s = Math.max(1e-12, 2.0 * Math.sqrt(Math.max(0, 1.0 + r11 - r00 - r22)));
      return new Quaternion(
        (r01 + r10) / s,
        0.25 * s,
        (r12 + r21) / s,
        (r02 - r20) / s
      ).normalize();
    } else {
      const s = Math.max(1e-12, 2.0 * Math.sqrt(Math.max(0, 1.0 + r22 - r00 - r11)));
      return new Quaternion(
        (r02 + r20) / s,
        (r12 + r21) / s,
        0.25 * s,
        (r10 - r01) / s
      ).normalize();
    }
  }

  normSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }

  norm(): number {
    return Math.sqrt(this.normSq());
  }

  normalize(): Quaternion {
    const l = this.norm();
    if (l < EPSILON) {
      return Quaternion.identity();
    }
    const inv = 1 / l;
    return new Quaternion(this.x * inv, this.y * inv, this.z * inv, this.w * inv);
  }

  conjugate(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w);
  }

  invert(): Quaternion {
    const nSq = this.normSq();
    if (nSq < EPSILON) {
      return Quaternion.identity();
    }
    const inv = 1 / nSq;
    return new Quaternion(-this.x * inv, -this.y * inv, -this.z * inv, this.w * inv);
  }

  multiply(b: Quaternion): Quaternion {
    return new Quaternion(
      this.w * b.x + this.x * b.w + this.y * b.z - this.z * b.y,
      this.w * b.y - this.x * b.z + this.y * b.w + this.z * b.x,
      this.w * b.z + this.x * b.y - this.y * b.x + this.z * b.w,
      this.w * b.w - this.x * b.x - this.y * b.y - this.z * b.z
    ).normalize();
  }

  dot(b: Quaternion): number {
    return this.x * b.x + this.y * b.y + this.z * b.z + this.w * b.w;
  }

  /**
   * Spherical linear interpolation between this and target quaternion with shortest-path check.
   */
  slerp(target: Quaternion, t: number): Quaternion {
    let cosHalfTheta = this.dot(target);
    let targetX = target.x;
    let targetY = target.y;
    let targetZ = target.z;
    let targetW = target.w;

    // If negative dot product, negate one quaternion to take shortest arc on S3
    if (cosHalfTheta < 0) {
      cosHalfTheta = -cosHalfTheta;
      targetX = -targetX;
      targetY = -targetY;
      targetZ = -targetZ;
      targetW = -targetW;
    }

    if (cosHalfTheta >= 1.0 - EPSILON) {
      // Linear interpolation for near-identical orientations
      return new Quaternion(
        this.x + t * (targetX - this.x),
        this.y + t * (targetY - this.y),
        this.z + t * (targetZ - this.z),
        this.w + t * (targetW - this.w)
      ).normalize();
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < EPSILON) {
      return new Quaternion(
        (this.x + targetX) * 0.5,
        (this.y + targetY) * 0.5,
        (this.z + targetZ) * 0.5,
        (this.w + targetW) * 0.5
      ).normalize();
    }

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return new Quaternion(
      this.x * ratioA + targetX * ratioB,
      this.y * ratioA + targetY * ratioB,
      this.z * ratioA + targetZ * ratioB,
      this.w * ratioA + targetW * ratioB
    ).normalize();
  }

  toRotationMatrix(): Matrix3 {
    const x = this.x, y = this.y, z = this.z, w = this.w;
    const xx = x * x, yy = y * y, zz = z * z;
    const xy = x * y, xz = x * z, yz = y * z;
    const wx = w * x, wy = w * y, wz = w * z;

    return new Matrix3([
      1 - 2 * (yy + zz), 2 * (xy - wz),     2 * (xz + wy),
      2 * (xy + wz),     1 - 2 * (xx + zz), 2 * (yz - wx),
      2 * (xz - wy),     2 * (yz + wx),     1 - 2 * (xx + yy),
    ]);
  }

  equals(q: Quaternion, tolerance = 1e-6): boolean {
    // Check both q and -q since q and -q represent identical SO(3) rotations
    const same =
      Math.abs(this.x - q.x) <= tolerance &&
      Math.abs(this.y - q.y) <= tolerance &&
      Math.abs(this.z - q.z) <= tolerance &&
      Math.abs(this.w - q.w) <= tolerance;

    const opposite =
      Math.abs(this.x + q.x) <= tolerance &&
      Math.abs(this.y + q.y) <= tolerance &&
      Math.abs(this.z + q.z) <= tolerance &&
      Math.abs(this.w + q.w) <= tolerance;

    return same || opposite;
  }

  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }
}
