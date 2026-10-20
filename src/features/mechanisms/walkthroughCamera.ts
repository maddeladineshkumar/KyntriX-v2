import * as T from 'three';
import type { WalkthroughStation } from './types';

/** Retain a station's viewing direction and target while framing all bounding box corners */
export function fitWalkthroughCamera(
  bounds: T.Box3,
  view: WalkthroughStation['camera'],
  aspect: number,
  fov = 34
) {
  const target = new T.Vector3(...view.target);
  const offset = new T.Vector3(...view.position).sub(target);
  const distanceInitial = offset.length();
  const direction = distanceInitial > 1e-6 ? offset.clone().normalize() : new T.Vector3(0, 0, 1);
  const worldUp = Math.abs(direction.y) > 0.99 ? new T.Vector3(0, 0, 1) : new T.Vector3(0, 1, 0);
  const right = new T.Vector3().crossVectors(worldUp, direction).normalize();
  const up = new T.Vector3().crossVectors(direction, right).normalize();
  const safeFov = Number.isFinite(fov) && fov > 0 && fov < 180 ? fov : 34;
  const tangent = Math.tan(T.MathUtils.degToRad(safeFov / 2));
  let distance = distanceInitial;

  for (let i = 0; i < 8; i++) {
    const corner = new T.Vector3(
      i & 1 ? bounds.max.x : bounds.min.x,
      i & 2 ? bounds.max.y : bounds.min.y,
      i & 4 ? bounds.max.z : bounds.min.z
    ).sub(target);
    const depth = corner.dot(direction);
    distance = Math.max(
      distance,
      depth + Math.abs(corner.dot(right)) / (tangent * Math.max(0.1, aspect) * 0.8),
      depth + Math.abs(corner.dot(up)) / (tangent * 0.8)
    );
  }

  return {
    position: target.clone().addScaledVector(direction, distance),
    target,
  };
}
