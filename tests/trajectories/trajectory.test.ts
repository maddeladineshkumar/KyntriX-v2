import { describe, it, expect } from 'vitest';
import { evaluateScalarProfile } from '../../src/robotics/trajectories/scalarProfiles';
import { generateJointTrajectory } from '../../src/robotics/trajectories/jointTrajectory';
import { generateCartesianTrajectory } from '../../src/robotics/trajectories/cartesianTrajectory';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import { RobotDefinition } from '../../src/data/schema/robotSchema';
import pumaJson from '../../src/data/robots/Puma560.json';
import skeleton3RJson from '../../src/data/robots/skeleton_3R.json';

const puma560 = pumaJson as unknown as RobotDefinition;
const robot3R = skeleton3RJson as unknown as RobotDefinition;

describe('Trajectory Engine', () => {
  describe('Scalar Profiles', () => {
    it('evaluates quintic polynomial with zero velocity and acceleration at boundaries', () => {
      const T = 2.0;
      const start = evaluateScalarProfile(0, T, 'quintic');
      expect(start.s).toBeCloseTo(0, 6);
      expect(start.sDot).toBeCloseTo(0, 6);
      expect(start.sDdot).toBeCloseTo(0, 6);

      const mid = evaluateScalarProfile(T / 2, T, 'quintic');
      expect(mid.s).toBeCloseTo(0.5, 6);
      expect(mid.sDot).toBeGreaterThan(0);

      const end = evaluateScalarProfile(T, T, 'quintic');
      expect(end.s).toBeCloseTo(1.0, 6);
      expect(end.sDot).toBeCloseTo(0, 6);
      expect(end.sDdot).toBeCloseTo(0, 6);
    });

    it('evaluates cubic polynomial with zero velocity at boundaries', () => {
      const T = 1.5;
      const start = evaluateScalarProfile(0, T, 'cubic');
      expect(start.s).toBeCloseTo(0, 6);
      expect(start.sDot).toBeCloseTo(0, 6);

      const end = evaluateScalarProfile(T, T, 'cubic');
      expect(end.s).toBeCloseTo(1.0, 6);
      expect(end.sDot).toBeCloseTo(0, 6);
    });

    it('evaluates trapezoidal (LSPB) profile correctly', () => {
      const T = 3.0;
      const start = evaluateScalarProfile(0, T, 'trapezoidal');
      expect(start.s).toBeCloseTo(0, 6);

      const mid = evaluateScalarProfile(T / 2, T, 'trapezoidal');
      expect(mid.s).toBeCloseTo(0.5, 6);

      const end = evaluateScalarProfile(T, T, 'trapezoidal');
      expect(end.s).toBeCloseTo(1.0, 6);
    });
  });

  describe('Joint Trajectory Generator', () => {
    it('generates a smooth quintic joint trajectory from q0 to qf', () => {
      const startQ = [0, 0, 0, 0, -2.5, 0];
      const goalQ = [0.3, 0.4, -0.2, 0.2, -2.2, 0.5];
      const duration = 2.0;
      const samples = 50;

      const dataset = generateJointTrajectory(puma560, {
        startQ,
        goalQ,
        duration,
        samples,
        profile: 'quintic',
      });

      expect(dataset.positions.length).toBe(samples);
      expect(dataset.timeSteps.length).toBe(samples);

      // Start condition
      for (let j = 0; j < 6; j++) {
        expect(dataset.positions[0][j]).toBeCloseTo(startQ[j], 5);
        expect(dataset.velocities[0][j]).toBeCloseTo(0, 5);
      }

      // End condition
      for (let j = 0; j < 6; j++) {
        expect(dataset.positions[samples - 1][j]).toBeCloseTo(goalQ[j], 5);
        expect(dataset.velocities[samples - 1][j]).toBeCloseTo(0, 5);
      }

      // Verify FK consistency for all intermediate states
      for (let k = 0; k < samples; k += 10) {
        const q_k = dataset.positions[k];
        const fk = computeFK(puma560, q_k);
        const diff = fk.endEffectorTransform.getPosition().distanceTo(dataset.endEffectorPositions[k]);
        expect(diff).toBeLessThan(1e-5);
      }
    });
  });

  describe('Cartesian Trajectory Generator', () => {
    it('interpolates linearly in Cartesian space and tracks with IK', () => {
      const startQ = [0.1, 0.2, 0.1];
      const fk0 = computeFK(robot3R, startQ);
      const startPose = fk0.endEffectorTransform;

      const goalQ = [0.3, 0.4, -0.1];
      const fkf = computeFK(robot3R, goalQ);
      const goalPose = fkf.endEffectorTransform;

      const dataset = generateCartesianTrajectory(robot3R, {
        startPose,
        goalPose,
        startQ,
        duration: 1.0,
        samples: 20,
      });

      expect(dataset.positions.length).toBe(20);
      // Start position matches startPose
      const p0 = dataset.endEffectorPositions[0];
      expect(p0.distanceTo(startPose.getPosition())).toBeLessThan(1e-3);

      // Final position matches goalPose
      const pf = dataset.endEffectorPositions[19];
      expect(pf.distanceTo(goalPose.getPosition())).toBeLessThan(1e-3);
    });
  });
});
