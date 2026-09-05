import { describe, it, expect } from 'vitest';
import { RobotDefinition } from '../../src/data/schema/robotSchema';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';

describe('3-DOF Forward Kinematics Verification vs Analytical Closed Form', () => {
  const a1 = 0.5;
  const a2 = 0.4;
  const a3 = 0.2;

  // Canonical 3R Planar Robot
  const planar3R: RobotDefinition = {
    id: 'planar_3r_test',
    name: 'Planar 3R Arm',
    dof: 3,
    dhConvention: 'standard',
    joints: [
      {
        id: 'j1',
        name: 'Joint 1',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: a1,
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
        a: a2,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j3',
        name: 'Joint 3',
        index: 2,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: a3,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
    links: [],
  };

  const testAngles = [
    [0, 0, 0],
    [Math.PI / 4, 0, 0],
    [0, Math.PI / 2, 0],
    [Math.PI / 6, -Math.PI / 3, Math.PI / 4],
    [-Math.PI / 4, Math.PI / 2, -Math.PI / 6],
  ];

  for (const [t1, t2, t3] of testAngles) {
    it(`matches exact analytical formula for q=[${t1.toFixed(2)}, ${t2.toFixed(2)}, ${t3.toFixed(2)}]`, () => {
      // Exact analytical forward kinematics for 3R planar:
      const expectedX =
        a1 * Math.cos(t1) +
        a2 * Math.cos(t1 + t2) +
        a3 * Math.cos(t1 + t2 + t3);

      const expectedY =
        a1 * Math.sin(t1) +
        a2 * Math.sin(t1 + t2) +
        a3 * Math.sin(t1 + t2 + t3);

      const fk = computeFK(planar3R, [t1, t2, t3]);
      const pos = fk.endEffectorTransform.getPosition();

      expect(Math.abs(pos.x - expectedX)).toBeLessThan(1e-6);
      expect(Math.abs(pos.y - expectedY)).toBeLessThan(1e-6);
      expect(Math.abs(pos.z - 0)).toBeLessThan(1e-6);
    });
  }
});
