import * as THREE from 'three';
import { Matrix4 } from '../robotics/math/Matrix4';

export class TargetGizmo extends THREE.Group {
  private targetMesh: THREE.Mesh;
  private arrowX: THREE.ArrowHelper;
  private arrowY: THREE.ArrowHelper;
  private arrowZ: THREE.ArrowHelper;

  constructor(size = 0.15) {
    super();

    // Target sphere
    const sphereGeom = new THREE.SphereGeometry(0.02, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.8,
    });
    this.targetMesh = new THREE.Mesh(sphereGeom, sphereMat);
    this.add(this.targetMesh);

    // Coordinate axes
    const origin = new THREE.Vector3(0, 0, 0);
    this.arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), origin, size, 0xef4444, size * 0.25, size * 0.15);
    this.arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), origin, size, 0x22c55e, size * 0.25, size * 0.15);
    this.arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, size, 0x3b82f6, size * 0.25, size * 0.15);

    this.add(this.arrowX);
    this.add(this.arrowY);
    this.add(this.arrowZ);
  }

  setPose(matrix: Matrix4): void {
    const colMajor = matrix.toColumnMajor();
    const threeMat = new THREE.Matrix4().fromArray(colMajor);
    threeMat.decompose(this.position, this.quaternion, this.scale);
  }

  getPose(): Matrix4 {
    const threeMat = new THREE.Matrix4();
    threeMat.compose(this.position, this.quaternion, this.scale);
    return Matrix4.fromColumnMajor(threeMat.elements);
  }

  dispose(): void {
    this.targetMesh.geometry.dispose();
    (this.targetMesh.material as THREE.Material).dispose();
  }
}
