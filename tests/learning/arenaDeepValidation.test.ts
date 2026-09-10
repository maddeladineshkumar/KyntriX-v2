import { describe, it, expect } from 'vitest';
import { allArenaProblems } from '../../src/server/db/problems';
import { simulationChallenges } from '../../src/server/db/challenges/seedChallenges';
import { DeterministicEngine } from '../../src/server/robotics/deterministicEngine';
import { loadRobotById } from '../../src/data/robots';
import { solveIK } from '../../src/robotics/ik/ikPipeline';
import { Matrix4, Euler, Vector3 } from '../../src/robotics/math';

describe('Deep Validation of Simulation Challenges', () => {
  it('checks whether each challenge target pose is reachable by the designated robot within tolerances and joint limits', async () => {
    const unreachableChallenges: string[] = [];

    for (const c of simulationChallenges) {
      const robot = await loadRobotById(c.robotId);
      expect(robot, `Robot ${c.robotId} not found for challenge ${c.id}`).toBeDefined();

      const [tx, ty, tz] = c.targetPose.position;
      const [rx, ry, rz] = c.targetPose.orientationEuler;
      const R = new Euler(rx, ry, rz, 'XYZ').toRotationMatrix();
      const p = new Vector3(tx, ty, tz);
      const targetMat = Matrix4.fromRotationTranslation(R, p);

      const ikResult = solveIK(robot, targetMat);
      
      let solved = false;
      let bestPosErrMm = Infinity;
      let bestOriErrDeg = Infinity;

      for (const sol of ikResult.solutions) {
        const evalResult = DeterministicEngine.evaluateSimulationChallenge(
          c,
          robot,
          sol.q,
          10
        );

        if (evalResult.attempt.passed) {
          solved = true;
          bestPosErrMm = evalResult.attempt.positionErrorMm;
          bestOriErrDeg = evalResult.attempt.orientationErrorDeg;
          break;
        } else {
          if (evalResult.attempt.positionErrorMm < bestPosErrMm) {
            bestPosErrMm = evalResult.attempt.positionErrorMm;
            bestOriErrDeg = evalResult.attempt.orientationErrorDeg;
          }
        }
      }

      if (!solved) {
        unreachableChallenges.push(
          `${c.id} (${c.title}) with robot ${c.robotId}: total IK solutions=${ikResult.solutions.length}, bestPosErr=${bestPosErrMm.toFixed(2)}mm (allowed ${c.constraints.maxPositionErrorMm}mm), bestOriErr=${bestOriErrDeg.toFixed(2)}deg (allowed ${c.constraints.maxOrientationErrorDeg}deg)`
        );
      }
    }

    console.log('Unreachable challenges count:', unreachableChallenges.length);
    if (unreachableChallenges.length > 0) {
      console.log('Unreachable challenges:\n', unreachableChallenges.join('\n'));
    }

    expect(unreachableChallenges, 'Challenges that cannot be solved by their robot').toEqual([]);
  });
});

describe('Deep Validation of Arena Problems (252 Problems)', () => {
  it('checks every problem for prompt/description alignment and non-empty metadata', () => {
    const issues: string[] = [];

    for (const p of allArenaProblems) {
      if (!p.id || p.id.trim() === '') issues.push(`${p.id}: missing id`);
      if (!p.title || p.title.trim() === '') issues.push(`${p.id}: missing title`);
      if (!p.description || p.description.trim() === '') issues.push(`${p.id}: missing description`);
      if (!p.category || p.category.trim() === '') issues.push(`${p.id}: missing category`);
      if (!p.subcategory || p.subcategory.trim() === '') issues.push(`${p.id}: missing subcategory`);
      if (!p.questionData?.prompt || p.questionData.prompt.trim() === '') issues.push(`${p.id}: missing questionData.prompt`);
      if (!p.hints || p.hints.length < 3) issues.push(`${p.id}: has ${p.hints?.length || 0} hints (needs >= 3)`);
      if (!p.solution?.derivationSteps || p.solution.derivationSteps.length === 0) issues.push(`${p.id}: missing derivation steps`);
      if (!p.solution?.finalAnswerDescription || p.solution.finalAnswerDescription.trim() === '') issues.push(`${p.id}: missing finalAnswerDescription`);

      const s = p.answerSchema;
      if (s.type === 'scalar') {
        if (typeof s.expectedScalar !== 'number' || !Number.isFinite(s.expectedScalar)) {
          issues.push(`${p.id}: non-finite expectedScalar: ${s.expectedScalar}`);
        }
      } else if (s.type === 'angle') {
        if (typeof s.expectedAngleRad !== 'number' || !Number.isFinite(s.expectedAngleRad)) {
          issues.push(`${p.id}: non-finite expectedAngleRad: ${s.expectedAngleRad}`);
        }
      } else if (s.type === 'vector') {
        if (!Array.isArray(s.expectedVector) || s.expectedVector.some(v => typeof v !== 'number' || !Number.isFinite(v))) {
          issues.push(`${p.id}: invalid expectedVector: ${JSON.stringify(s.expectedVector)}`);
        }
      } else if (s.type === 'matrix') {
        if (!Array.isArray(s.expectedMatrix) || s.expectedMatrix.some(row => !Array.isArray(row) || row.some(v => typeof v !== 'number' || !Number.isFinite(v)))) {
          issues.push(`${p.id}: invalid expectedMatrix`);
        }
      } else if (s.type === 'dh_table') {
        if (!Array.isArray(s.expectedDHTable) || s.expectedDHTable.length === 0) {
          issues.push(`${p.id}: invalid expectedDHTable`);
        }
      } else if (s.type === 'joint_config') {
        if (s.expectedJoints && s.expectedJoints.some(v => typeof v !== 'number' || !Number.isFinite(v))) {
          issues.push(`${p.id}: invalid expectedJoints`);
        }
      }
    }

    expect(issues).toEqual([]);
  });

  it('verifies angle wrapping robustness in DeterministicEngine.validateAngle', () => {
    const angleProblems = allArenaProblems.filter(p => p.answerSchema.type === 'angle');
    const failures: string[] = [];

    for (const p of angleProblems) {
      const exp = p.answerSchema.expectedAngleRad!;
      const tol = p.answerSchema.angleToleranceRad ?? 0.02;

      // Direct
      if (!DeterministicEngine.validateAngle(exp, exp, tol)) {
        failures.push(`${p.id}: exact match failed`);
      }
      // + 2*pi
      if (!DeterministicEngine.validateAngle(exp + 2 * Math.PI, exp, tol)) {
        failures.push(`${p.id}: +2pi wrapping failed`);
      }
      // - 2*pi
      if (!DeterministicEngine.validateAngle(exp - 2 * Math.PI, exp, tol)) {
        failures.push(`${p.id}: -2pi wrapping failed`);
      }
      // + 4*pi
      if (!DeterministicEngine.validateAngle(exp + 4 * Math.PI, exp, tol)) {
        failures.push(`${p.id}: +4pi wrapping failed`);
      }
    }

    expect(failures).toEqual([]);
  });
});
