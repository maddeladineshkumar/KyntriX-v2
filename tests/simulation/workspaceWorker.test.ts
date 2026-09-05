import { describe, it, expect } from 'vitest';
import { sampleWorkspace } from '../../src/workers/workspaceWorker';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';

describe('Workspace Sampling Tests', () => {
  // Simple 2R planar robot with 2 revolute joints
  const planar2R: RobotDefinition = {
    id: 'planar_2R_test',
    name: 'Planar 2R Test',
    dof: 2,
    dhConvention: 'standard',
    joints: [
      {
        id: 'j1',
        name: 'Joint 1',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.5,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j2',
        name: 'Joint 2',
        index: 1,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.3,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
    links: [
      { id: 'l0', name: 'Base', index: 0 },
      { id: 'l1', name: 'Link 1', index: 1 },
      { id: 'l2', name: 'Link 2', index: 2 },
    ],
  };

  it('sampling a simple 2R planar robot at resolution 5 produces exactly 5x5 = 25 FK evaluations', () => {
    const result = sampleWorkspace(planar2R, 5);

    expect(result.totalPoints).toBe(25);
    expect(result.points.length).toBe(25);
    expect(result.effectiveResolution).toBe(5);
  });

  it('all returned points are finite Vector3 values', () => {
    const result = sampleWorkspace(planar2R, 5);

    expect(result.points.length).toBe(25);

    for (const pt of result.points) {
      expect(Number.isFinite(pt.x)).toBe(true);
      expect(Number.isFinite(pt.y)).toBe(true);
      expect(Number.isFinite(pt.z)).toBe(true);
    }

    // Check bounding box finite
    for (const val of result.bbox.min) {
      expect(Number.isFinite(val)).toBe(true);
    }
    for (const val of result.bbox.max) {
      expect(Number.isFinite(val)).toBe(true);
    }
    for (const val of result.bbox.dimensions) {
      expect(Number.isFinite(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  it('auto-reduces resolution when theoretical points exceed point limit', () => {
    // planar2R at resolution 10 would produce 10^2 = 100 points.
    // Setting maxPoints = 50 forces reduction to floor(sqrt(50)) = 7 steps (7^2 = 49 points)
    const result = sampleWorkspace(planar2R, 10, undefined, 50);
    expect(result.effectiveResolution).toBe(7);
    expect(result.totalPoints).toBe(49);
    expect(result.totalPoints).toBeLessThanOrEqual(50);
  });
});
