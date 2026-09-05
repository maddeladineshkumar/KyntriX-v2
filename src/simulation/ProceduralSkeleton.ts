import * as THREE from 'three';
import type { FKResult } from '../data/schema/robotSchema';

export class ProceduralSkeleton extends THREE.Group {
  private linkCylinders: THREE.Mesh[] = [];
  private jointSpheres: THREE.Mesh[] = [];

  // Reusable shared geometries and materials (PRD §50 - allocation-free render loop)
  private readonly sphereGeometry: THREE.SphereGeometry;
  private readonly cylinderGeometry: THREE.CylinderGeometry;
  private readonly linkMaterial: THREE.MeshStandardMaterial;
  private readonly jointMaterial: THREE.MeshStandardMaterial;

  // Scratch vectors to prevent GC allocations per frame
  private readonly v1 = new THREE.Vector3();
  private readonly v2 = new THREE.Vector3();
  private readonly mid = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly scratchUp = new THREE.Vector3(0, 1, 0);
  private readonly quat = new THREE.Quaternion();

  constructor() {
    super();

    this.sphereGeometry = new THREE.SphereGeometry(0.025, 24, 24);
    this.cylinderGeometry = new THREE.CylinderGeometry(0.015, 0.015, 1.0, 16);

    this.linkMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.6,
      roughness: 0.3,
    });

    this.jointMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2,
    });
  }

  /**
   * Adjusts mesh pools only when the number of joints/origins changes.
   */
  private ensurePool(jointCount: number): void {
    // 1. Adjust spheres pool
    while (this.jointSpheres.length < jointCount) {
      const sphere = new THREE.Mesh(this.sphereGeometry, this.jointMaterial);
      this.jointSpheres.push(sphere);
      this.add(sphere);
    }
    while (this.jointSpheres.length > jointCount) {
      const sphere = this.jointSpheres.pop();
      if (sphere) this.remove(sphere);
    }

    // 2. Adjust cylinders pool (jointCount - 1 segments)
    const neededCylinders = Math.max(0, jointCount - 1);
    while (this.linkCylinders.length < neededCylinders) {
      const cyl = new THREE.Mesh(this.cylinderGeometry, this.linkMaterial);
      this.linkCylinders.push(cyl);
      this.add(cyl);
    }
    while (this.linkCylinders.length > neededCylinders) {
      const cyl = this.linkCylinders.pop();
      if (cyl) this.remove(cyl);
    }
  }

  /**
   * Repositions and rescales existing meshes without GC pressure.
   */
  updateSkeleton(fk: FKResult): void {
    const origins = fk.origins;
    const n = origins.length;

    // Ensure pool matches required count
    if (this.jointSpheres.length !== n) {
      this.ensurePool(n);
    }

    // 1. Reposition joint spheres
    for (let i = 0; i < n; i++) {
      const p = origins[i];
      const sphere = this.jointSpheres[i];
      sphere.position.set(p.x, p.y, p.z);
      sphere.visible = true;
    }

    // 2. Reposition and rescale link cylinders connecting consecutive origins
    for (let i = 0; i < n - 1; i++) {
      const p1 = origins[i];
      const p2 = origins[i + 1];
      const cyl = this.linkCylinders[i];

      this.v1.set(p1.x, p1.y, p1.z);
      this.v2.set(p2.x, p2.y, p2.z);
      const dist = this.v1.distanceTo(this.v2);

      if (dist < 1e-4) {
        cyl.visible = false;
        continue;
      }

      cyl.visible = true;

      // Rescale height along Y axis (unit height 1.0 scaled by dist)
      cyl.scale.set(1, dist, 1);

      // Reposition midpoint
      this.mid.addVectors(this.v1, this.v2).multiplyScalar(0.5);
      cyl.position.copy(this.mid);

      // Reorient along segment v1 -> v2
      this.dir.subVectors(this.v2, this.v1).normalize();
      this.quat.setFromUnitVectors(this.scratchUp, this.dir);
      cyl.quaternion.copy(this.quat);
    }
  }

  dispose(): void {
    for (const m of this.linkCylinders) {
      this.remove(m);
    }
    for (const s of this.jointSpheres) {
      this.remove(s);
    }
    this.linkCylinders = [];
    this.jointSpheres = [];

    this.sphereGeometry.dispose();
    this.cylinderGeometry.dispose();
    this.linkMaterial.dispose();
    this.jointMaterial.dispose();

    this.clear();
  }
}
