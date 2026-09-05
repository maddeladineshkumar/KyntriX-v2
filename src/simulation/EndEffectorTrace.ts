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
    if (this.pointCount >= this.maxPoints) {
      // Shift left by 1
      this.positions.copyWithin(0, 3);
      this.pointCount = this.maxPoints - 1;
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
