import * as THREE from 'three';
import { Vector3 } from '../robotics/math/Vector3';

export class EndEffectorTrace extends THREE.Group {
  private maxPoints: number;
  private lineGeometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private pointCount: number = 0;
  private lineMesh: THREE.Line;

  constructor(maxPoints = 3000) {
    super();
    this.maxPoints = maxPoints;
    this.positions = new Float32Array(maxPoints * 3);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });

    this.lineMesh = new THREE.Line(this.lineGeometry, lineMaterial);
    this.add(this.lineMesh);
  }

  addPoint(p: Vector3): void {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return;
    if (this.pointCount > 0) {
      const lastIdx = (this.pointCount - 1) * 3;
      const dx = p.x - this.positions[lastIdx];
      const dy = p.y - this.positions[lastIdx + 1];
      const dz = p.z - this.positions[lastIdx + 2];
      const distSq = dx * dx + dy * dy + dz * dz;
      // Skip redundant GPU updates if end-effector has moved less than 0.25mm
      if (distSq < 6.25e-8) return;
    }

    if (this.pointCount >= this.maxPoints) {
      // Decimate buffer in-place: keep every 2nd point to free half the buffer without expensive copyWithin per frame
      let newCount = 0;
      for (let i = 0; i < this.maxPoints; i += 2) {
        this.positions[newCount * 3] = this.positions[i * 3];
        this.positions[newCount * 3 + 1] = this.positions[i * 3 + 1];
        this.positions[newCount * 3 + 2] = this.positions[i * 3 + 2];
        newCount++;
      }
      this.pointCount = newCount;
    }

    const idx = this.pointCount * 3;
    this.positions[idx] = p.x;
    this.positions[idx + 1] = p.y;
    this.positions[idx + 2] = p.z;
    this.pointCount++;

    this.lineGeometry.setDrawRange(0, this.pointCount);
    const attr = this.lineGeometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  resetTrail(): void {
    this.pointCount = 0;
    this.lineGeometry.setDrawRange(0, 0);
    const attr = this.lineGeometry.getAttribute('position') as THREE.BufferAttribute;
    if (attr) attr.needsUpdate = true;
  }

  override clear(): this {
    super.clear();
    this.resetTrail();
    return this;
  }

  dispose(): void {
    this.lineGeometry.dispose();
    (this.lineMesh.material as THREE.Material).dispose();
    this.resetTrail();
  }
}
