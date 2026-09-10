import { describe, it, expect } from 'vitest';
import { Euler } from '../../src/robotics/math';

describe('SO(3) Geodesic Orientation Error', () => {
  function computeGeodesicErrorDeg(e1: [number, number, number], e2: [number, number, number]): number {
    const R1 = new Euler(e1[0], e1[1], e1[2], 'XYZ').toRotationMatrix();
    const R2 = new Euler(e2[0], e2[1], e2[2], 'XYZ').toRotationMatrix();
    const R_diff = R1.transpose().multiply(R2);
    const trace = R_diff.elements[0] + R_diff.elements[4] + R_diff.elements[8];
    const cosTheta = Math.max(-1, Math.min(1, (trace - 1) / 2));
    return Math.acos(cosTheta) * (180 / Math.PI);
  }

  it('computes 0 deg for identical orientations', () => {
    expect(computeGeodesicErrorDeg([0, 0, 0], [0, 0, 0])).toBeCloseTo(0, 5);
    expect(computeGeodesicErrorDeg([0.5, -0.3, 1.2], [0.5, -0.3, 1.2])).toBeCloseTo(0, 5);
  });

  it('computes 0 deg for equivalent wrapped Euler angles (+pi vs -pi)', () => {
    expect(computeGeodesicErrorDeg([0, 0, Math.PI], [0, 0, -Math.PI])).toBeCloseTo(0, 5);
    expect(computeGeodesicErrorDeg([0, 0, 0], [0, 0, 2 * Math.PI])).toBeCloseTo(0, 5);
  });

  it('computes exact angle for orthogonal rotation', () => {
    expect(computeGeodesicErrorDeg([0, 0, 0], [0, 0, Math.PI / 2])).toBeCloseTo(90, 4);
    expect(computeGeodesicErrorDeg([0, 0, 0], [Math.PI / 2, 0, 0])).toBeCloseTo(90, 4);
  });
});
