import * as T from 'three';
import type { SectionPlaneState, SectionPlanePreset } from './types';

export const DEFAULT_SECTION_DEPTH = 52;

export const DEFAULT_SECTION_PLANE: SectionPlaneState = {
  yaw: 0,
  pitch: 0,
  flipped: false,
  showGizmo: false,
  free: false,
};

export const SECTION_PRESETS: { id: SectionPlanePreset; label: string; yaw: number; pitch: number }[] = [
  { id: 'top', label: 'Top View', yaw: 0, pitch: 0 },
  { id: 'side', label: 'Side Profile', yaw: 0, pitch: -90 },
  { id: 'front', label: 'Front Cross-Section', yaw: 90, pitch: 0 },
  { id: 'axis', label: 'Along Longitudinal Axis', yaw: 0, pitch: -45 },
  { id: 'oblique', label: 'Oblique 45°', yaw: 45, pitch: -30 },
];

/** Spherical angles with downward normal as the base orientation */
export function sectionNormal(yaw: number, pitch: number, normal = new T.Vector3()): T.Vector3 {
  const azimuth = T.MathUtils.degToRad(yaw);
  const elevation = T.MathUtils.degToRad(pitch);
  normal.set(
    -Math.sin(azimuth) * Math.cos(elevation),
    -Math.cos(azimuth) * Math.cos(elevation),
    Math.sin(elevation)
  );

  // Clean numerical zeros for cardinal directions
  for (const axis of ['x', 'y', 'z'] as const) {
    if (Math.abs(normal[axis]) < 1e-12) {
      normal[axis] = 0;
    }
  }
  return normal.normalize();
}

/** Sweeps the projected bounding box with safety margins */
export function updateSectionPlane(
  plane: T.Plane,
  bounds: T.Box3,
  depth: number,
  state: SectionPlaneState
): T.Plane {
  const n = sectionNormal(state.yaw, state.pitch, plane.normal);
  const fraction = T.MathUtils.clamp(depth, 0, 100) / 100;

  if (state.yaw === 0 && state.pitch === 0) {
    plane.constant = T.MathUtils.lerp(bounds.min.y - 0.2, bounds.max.y + 0.2, fraction);
  } else {
    const middle =
      (n.x * (bounds.min.x + bounds.max.x) +
        n.y * (bounds.min.y + bounds.max.y) +
        n.z * (bounds.min.z + bounds.max.z)) /
      2;
    const radius =
      (Math.abs(n.x) * (bounds.max.x - bounds.min.x) +
        Math.abs(n.y) * (bounds.max.y - bounds.min.y) +
        Math.abs(n.z) * (bounds.max.z - bounds.min.z)) /
      2;
    plane.constant = -middle + T.MathUtils.lerp(-radius - 0.2, radius + 0.2, fraction);
  }

  if (state.flipped) {
    plane.negate();
  }
  return plane;
}
