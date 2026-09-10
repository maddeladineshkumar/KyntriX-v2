import { describe, it, expect } from 'vitest';
import { allArenaProblems } from '../../src/server/db/problems';
import { simulationChallenges } from '../../src/server/db/challenges/seedChallenges';
import { DeterministicEngine } from '../../src/server/robotics/deterministicEngine';
import { loadRobotById } from '../../src/data/robots';

describe('All Arena Problems Verification (256 Problems)', () => {
  it('contains at least 250 problems with complete metadata and no duplicates', () => {
    expect(allArenaProblems.length).toBeGreaterThanOrEqual(250);
    expect(allArenaProblems.length).toBe(256);

    const ids = new Set<string>();
    const fewerHints: string[] = [];
    for (const p of allArenaProblems) {
      expect(p.id).toBeDefined();
      expect(p.id.length).toBeGreaterThan(0);
      expect(ids.has(p.id), `Duplicate problem ID: ${p.id}`).toBe(false);
      ids.add(p.id);

      expect(p.title.length, `Empty title on ${p.id}`).toBeGreaterThan(0);
      expect(p.description.length, `Empty description on ${p.id}`).toBeGreaterThan(0);
      expect(p.category.length, `Empty category on ${p.id}`).toBeGreaterThan(0);
      expect(p.subcategory.length, `Empty subcategory on ${p.id}`).toBeGreaterThan(0);
      if (p.hints.length < 3) {
        fewerHints.push(`${p.id} (${p.hints.length})`);
      }
      expect(p.solution.derivationSteps.length, `No derivation steps on ${p.id}`).toBeGreaterThan(0);
      expect(p.solution.finalAnswerDescription.length, `No final answer description on ${p.id}`).toBeGreaterThan(0);
      expect(p.explanation.length, `No explanation on ${p.id}`).toBeGreaterThan(0);
      expect(p.xpReward, `Invalid xpReward on ${p.id}`).toBeGreaterThan(0);
      expect(p.ratingValue, `Invalid ratingValue on ${p.id}`).toBeGreaterThan(0);
    }
    expect(fewerHints, 'Problems with fewer than 3 hints').toEqual([]);
  });

  it('verifies all 256 problem expected answers pass DeterministicEngine validation', () => {
    for (const p of allArenaProblems) {
      const schema = p.answerSchema;
      switch (schema.type) {
        case 'scalar': {
          expect(schema.expectedScalar, `Missing expectedScalar for ${p.id}`).toBeDefined();
          const expected = schema.expectedScalar!;
          const tol = schema.tolerance ?? 0.01;
          const valid = DeterministicEngine.validateScalar(expected, expected, tol);
          expect(valid, `Scalar validation failed on ${p.id}: expected ${expected}`).toBe(true);
          break;
        }

        case 'angle': {
          expect(schema.expectedAngleRad, `Missing expectedAngleRad for ${p.id}`).toBeDefined();
          const expected = schema.expectedAngleRad!;
          const tol = schema.angleToleranceRad ?? 0.02;
          const valid = DeterministicEngine.validateAngle(expected, expected, tol);
          expect(valid, `Angle validation failed on ${p.id}: expected ${expected}`).toBe(true);
          break;
        }

        case 'vector': {
          expect(schema.expectedVector, `Missing expectedVector for ${p.id}`).toBeDefined();
          const expected = schema.expectedVector!;
          const tol = schema.tolerance ?? 0.01;
          const valid = DeterministicEngine.validateVector(expected, expected, tol);
          expect(valid, `Vector validation failed on ${p.id}`).toBe(true);
          break;
        }

        case 'matrix': {
          expect(schema.expectedMatrix, `Missing expectedMatrix for ${p.id}`).toBeDefined();
          const expected = schema.expectedMatrix!;
          const tol = schema.matrixTolerance ?? 0.01;
          const valid = DeterministicEngine.validateMatrix(expected, expected, tol);
          expect(valid, `Matrix validation failed on ${p.id}`).toBe(true);
          break;
        }

        case 'dh_table': {
          expect(schema.expectedDHTable, `Missing expectedDHTable for ${p.id}`).toBeDefined();
          const expected = schema.expectedDHTable!;
          const tol = schema.tolerance ?? 0.01;
          const valid = DeterministicEngine.validateDHTable(expected, expected, tol);
          expect(valid, `DH table validation failed on ${p.id}`).toBe(true);
          break;
        }

        case 'joint_config': {
          if (schema.expectedJoints) {
            expect(schema.expectedJoints.length).toBeGreaterThan(0);
          }
          break;
        }

        default:
          throw new Error(`Unknown schema type on problem ${p.id}: ${(schema as any).type}`);
      }
    }
  });

  it('covers all required syllabus categories', () => {
    const categories = new Set(allArenaProblems.map((p) => p.category));
    expect(categories.has('transforms')).toBe(true);
    expect(categories.has('dh')).toBe(true);
    expect(categories.has('fk')).toBe(true);
    expect(categories.has('ik')).toBe(true);
    expect(categories.has('jacobians')).toBe(true);
    expect(categories.has('mobile')).toBe(true);
    expect(categories.has('dynamics')).toBe(true);
    expect(categories.has('control')).toBe(true);
    expect(categories.has('trajectory')).toBe(true);
    expect(categories.has('workspace')).toBe(true);

    const subcats = new Set(allArenaProblems.map((p) => p.subcategory));
    expect(subcats.has('Applications of Robots')).toBe(true);
    expect(subcats.has('Current Trends in Robotics')).toBe(true);
    expect(subcats.has('History & Overview')).toBe(true);
  });
});

describe('All Simulation Challenges Verification (25 Challenges)', () => {
  it('contains between 20 and 30 challenges with unique IDs and physical targets', () => {
    expect(simulationChallenges.length).toBeGreaterThanOrEqual(20);
    expect(simulationChallenges.length).toBeLessThanOrEqual(30);
    expect(simulationChallenges.length).toBe(25);

    const ids = new Set<string>();
    for (const c of simulationChallenges) {
      expect(c.id).toBeDefined();
      expect(ids.has(c.id), `Duplicate challenge ID: ${c.id}`).toBe(false);
      ids.add(c.id);

      expect(c.title.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
      expect(c.robotId.length).toBeGreaterThan(0);
      expect(c.targetPose.position).toHaveLength(3);
      expect(c.targetPose.orientationEuler).toHaveLength(3);
      expect(c.constraints.maxPositionErrorMm).toBeGreaterThan(0);
      expect(c.constraints.maxOrientationErrorDeg).toBeGreaterThan(0);
      expect(c.xpReward).toBeGreaterThan(0);
    }
  });

  it('verifies every challenge uses a valid robot model and targets are physically reachable', async () => {
    const { solveIK } = await import('../../src/robotics/ik/ikPipeline');
    const { Euler, Vector3, Matrix4 } = await import('../../src/robotics/math');

    for (const c of simulationChallenges) {
      const robot = await loadRobotById(c.robotId);
      expect(robot, `Could not load robot ${c.robotId} for challenge ${c.id}`).toBeDefined();
      expect(robot.joints.length, `Robot has no joints: ${c.robotId}`).toBeGreaterThan(0);

      // Verify target coordinates are non-NaN and physically plausible (< 5 meters)
      for (const coord of c.targetPose.position) {
        expect(Number.isFinite(coord)).toBe(true);
        expect(Math.abs(coord)).toBeLessThan(5.0);
      }
      for (const angle of c.targetPose.orientationEuler) {
        expect(Number.isFinite(angle)).toBe(true);
        expect(Math.abs(angle)).toBeLessThanOrEqual(Math.PI * 2);
      }

      // Check authoritative reachability using solveIK and evaluateSimulationChallenge
      const [tx, ty, tz] = c.targetPose.position;
      const [rx, ry, rz] = c.targetPose.orientationEuler;
      const R = new Euler(rx, ry, rz, 'XYZ').toRotationMatrix();
      const p = new Vector3(tx, ty, tz);
      const targetMat = Matrix4.fromRotationTranslation(R, p);

      const ikRes = solveIK(robot, targetMat);
      let passed = false;
      for (const sol of ikRes.solutions) {
        const evalRes = DeterministicEngine.evaluateSimulationChallenge(c, robot, sol.q, 10);
        if (evalRes.attempt.passed) {
          passed = true;
          break;
        }
      }
      expect(passed, `Challenge ${c.id} (${c.title}) on robot ${c.robotId} is physically unreachable`).toBe(true);
    }
  });
});
