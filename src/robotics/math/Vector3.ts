import { EPSILON } from './constants';

export class Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = Number.isFinite(x) ? x : 0;
    this.y = Number.isFinite(y) ? y : 0;
    this.z = Number.isFinite(z) ? z : 0;
  }

  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  static unitX(): Vector3 {
    return new Vector3(1, 0, 0);
  }

  static unitY(): Vector3 {
    return new Vector3(0, 1, 0);
  }

  static unitZ(): Vector3 {
    return new Vector3(0, 0, 1);
  }

  static fromArray(arr: ArrayLike<number>, offset = 0): Vector3 {
    return new Vector3(arr[offset] ?? 0, arr[offset + 1] ?? 0, arr[offset + 2] ?? 0);
  }

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  subtract(v: Vector3): Vector3 {
    return this.sub(v);
  }

  scale(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  normSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  norm(): number {
    return Math.sqrt(this.normSq());
  }

  normalize(): Vector3 {
    const len = this.norm();
    if (len < EPSILON) {
      return Vector3.zero();
    }
    return this.scale(1 / len);
  }

  distanceTo(v: Vector3): number {
    return this.sub(v).norm();
  }

  angleTo(v: Vector3): number {
    const denom = this.norm() * v.norm();
    if (denom < EPSILON) return 0;
    const clamped = Math.max(-1, Math.min(1, this.dot(v) / denom));
    return Math.acos(clamped);
  }

  lerp(v: Vector3, t: number): Vector3 {
    return new Vector3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }

  equals(v: Vector3, tolerance = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) <= tolerance &&
      Math.abs(this.y - v.y) <= tolerance &&
      Math.abs(this.z - v.z) <= tolerance
    );
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }
}
