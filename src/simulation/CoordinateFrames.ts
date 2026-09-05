import * as THREE from 'three';
import type { FrameInfo } from '../data/schema/robotSchema';

/**
 * Creates a text sprite label for coordinate frame axes.
 */
function createTextSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.roundRect(4, 4, 120, 56, 8);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.08, 0.04, 1);
  return sprite;
}

export class FrameTriad extends THREE.Group {
  readonly frameIndex: number;
  private arrowX: THREE.ArrowHelper;
  private arrowY: THREE.ArrowHelper;
  private arrowZ: THREE.ArrowHelper;
  private originDot: THREE.Mesh;
  private label: THREE.Sprite;

  constructor(frameIndex: number, axisLength = 0.12) {
    super();
    this.frameIndex = frameIndex;
    this.matrixAutoUpdate = false;

    // Origin sphere
    const sphereGeom = new THREE.SphereGeometry(0.008, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.originDot = new THREE.Mesh(sphereGeom, sphereMat);
    this.add(this.originDot);

    // X: Red, Y: Green, Z: Blue
    const dirX = new THREE.Vector3(1, 0, 0);
    const dirY = new THREE.Vector3(0, 1, 0);
    const dirZ = new THREE.Vector3(0, 0, 1);
    const origin = new THREE.Vector3(0, 0, 0);

    const headLength = axisLength * 0.25;
    const headWidth = axisLength * 0.15;

    this.arrowX = new THREE.ArrowHelper(dirX, origin, axisLength, 0xef4444, headLength, headWidth);
    this.arrowY = new THREE.ArrowHelper(dirY, origin, axisLength, 0x22c55e, headLength, headWidth);
    this.arrowZ = new THREE.ArrowHelper(dirZ, origin, axisLength, 0x3b82f6, headLength, headWidth);

    this.add(this.arrowX);
    this.add(this.arrowY);
    this.add(this.arrowZ);

    const name = frameIndex === 0 ? 'F0 (Base)' : `F${frameIndex}`;
    this.label = createTextSprite(name, frameIndex === 0 ? '#ea580c' : '#a8a29e');
    this.label.position.set(0, 0, axisLength + 0.02);
    this.add(this.label);
  }

  updateTransform(matrixElements: Float64Array): void {
    // Convert column-major Float64Array to THREE.Matrix4
    this.matrix.fromArray(matrixElements);
  }

  dispose(): void {
    this.originDot.geometry.dispose();
    (this.originDot.material as THREE.Material).dispose();
    this.label.material.map?.dispose();
    this.label.material.dispose();
  }
}

export class CoordinateFramesManager extends THREE.Group {
  private triads: FrameTriad[] = [];

  constructor() {
    super();
  }

  updateFrames(frames: FrameInfo[], scale = 0.12): void {
    // Synchronize number of triads
    while (this.triads.length < frames.length) {
      const idx = this.triads.length;
      const triad = new FrameTriad(idx, scale);
      this.triads.push(triad);
      this.add(triad);
    }
    while (this.triads.length > frames.length) {
      const triad = this.triads.pop();
      if (triad) {
        this.remove(triad);
        triad.dispose();
      }
    }

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const triad = this.triads[i];
      // Pass column-major elements for Three.js
      triad.updateTransform(frame.matrix.toColumnMajor());
      triad.visible = true;
    }
  }

  setFrameVisibility(visible: boolean): void {
    this.visible = visible;
  }

  showFramesUpTo(maxIndex: number): void {
    for (let i = 0; i < this.triads.length; i++) {
      this.triads[i].visible = maxIndex < 0 || i <= maxIndex;
    }
  }

  dispose(): void {
    for (const triad of this.triads) {
      triad.dispose();
    }
    this.triads = [];
    this.clear();
  }
}
