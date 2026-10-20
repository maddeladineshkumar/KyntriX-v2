import * as T from 'three';
import { updateSectionPlane } from './sectionPlane';
import type { SectionPlaneState } from './types';

/** Shared clipping planes and interior shading uniform for cut surfaces */
export class SectionRendering {
  readonly hardwarePlane = new T.Plane(new T.Vector3(0, -1, 0), 1e6);
  readonly interior = { value: 0 };
  readonly housingPlanes: T.Plane[];
  readonly hardwarePlanes = [this.hardwarePlane];

  readonly plane: T.Plane;

  constructor(plane: T.Plane) {
    this.plane = plane;
    this.housingPlanes = [plane];
  }

  configureMaterial(material: T.MeshStandardMaterial, legacy: boolean) {
    material.userData.sectionLegacy = legacy;
    material.clippingPlanes = legacy ? this.housingPlanes : this.hardwarePlanes;
    material.side = T.DoubleSide;
    material.clipShadows = true;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.sectionInterior = this.interior;
      shader.fragmentShader = 'uniform float sectionInterior;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
        // Warm matte interior tone for sectioned components
        if (sectionInterior > 0.5 && !gl_FrontFacing) {
          outgoingLight = diffuseColor.rgb * 0.35 + totalEmissiveRadiance;
        }
        #include <opaque_fragment>
      `
      );
    };
    material.customProgramCacheKey = () => 'kyntrix-section-interior-v1';
  }

  update(bounds: T.Box3, depth: number, state: SectionPlaneState, active: boolean) {
    updateSectionPlane(this.plane, bounds, depth, state);
    this.hardwarePlane.copy(this.plane);
    if (!active) {
      this.plane.constant = 1e6;
    }
    if (!active || !state.free) {
      this.hardwarePlane.constant = 1e6;
    }
    this.interior.value = active && state.free ? 1 : 0;
  }
}

/** 3D Section Plane Guide & Arrow */
export class SectionGizmo {
  readonly root = new T.Group();
  private readonly quad: T.Mesh;
  private readonly outline: T.LineLoop;
  private readonly arrow: T.ArrowHelper;
  private readonly center = new T.Vector3();
  private readonly size = new T.Vector3();
  private readonly forward = new T.Vector3(0, 0, 1);

  constructor() {
    this.root.name = 'kyntrix-section-gizmo';
    this.root.visible = false;
    this.quad = new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({
        color: 0xd97706, // Amber/warm accent
        transparent: true,
        opacity: 0.12,
        side: T.DoubleSide,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.outline = new T.LineLoop(
      new T.BufferGeometry().setFromPoints([
        new T.Vector3(-0.5, -0.5, 0),
        new T.Vector3(0.5, -0.5, 0),
        new T.Vector3(0.5, 0.5, 0),
        new T.Vector3(-0.5, 0.5, 0),
      ]),
      new T.LineBasicMaterial({
        color: 0xb45309,
        transparent: true,
        opacity: 0.7,
        depthTest: false,
      })
    );
    this.arrow = new T.ArrowHelper(
      new T.Vector3(0, 1, 0),
      new T.Vector3(),
      1.5,
      0xd97706,
      0.35,
      0.2
    );
    this.root.add(this.quad, this.outline, this.arrow);
  }

  update(plane: T.Plane, bounds: T.Box3, visible: boolean) {
    this.root.visible = visible && plane.constant < 1e5;
    if (!this.root.visible) return;

    bounds.getCenter(this.center);
    bounds.getSize(this.size);
    const span = Math.max(this.size.x, this.size.y, this.size.z) * 1.6;

    this.quad.scale.set(span, span, 1);
    this.outline.scale.set(span, span, 1);

    // Compute plane intersection point nearest to bounding box center
    const pointOnPlane = this.center
      .clone()
      .sub(plane.normal.clone().multiplyScalar(plane.distanceToPoint(this.center)));

    this.quad.position.copy(pointOnPlane);
    this.outline.position.copy(pointOnPlane);
    this.arrow.position.copy(pointOnPlane);

    this.quad.quaternion.setFromUnitVectors(this.forward, plane.normal);
    this.outline.quaternion.copy(this.quad.quaternion);
    this.arrow.setDirection(plane.normal);
  }

  dispose() {
    this.quad.geometry.dispose();
    (this.quad.material as T.Material).dispose();
    this.outline.geometry.dispose();
    (this.outline.material as T.Material).dispose();
    this.arrow.dispose();
  }
}
