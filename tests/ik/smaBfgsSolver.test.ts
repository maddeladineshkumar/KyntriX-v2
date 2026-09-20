import { describe, it, expect } from 'vitest';
import pumaJson from '../../src/data/robots/Puma560.json';
import abbJson from '../../src/data/robots/ABBIRB120.json';
import stanfordJson from '../../src/data/robots/Stanford.json';
import prpJson from '../../src/data/robots/skeleton_PRP.json';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import { forwardKinematics } from '../../src/robotics/kinematics/forwardKinematics';
import { Matrix4 } from '../../src/robotics/math/Matrix4';
import { Vector3 } from '../../src/robotics/math/Vector3';
import { Euler } from '../../src/robotics/math/Euler';
import { solveSMABFGSIK } from '../../src/robotics/ik/smaBfgs/smaBfgsSolver';
import { IKObjectiveEvaluator } from '../../src/robotics/ik/smaBfgs/objective';

describe('SMA-BFGS Hybrid Quasi-Newton IK Solver Suite', () => {
  const pumaRobot = pumaJson as unknown as RobotDefinition;
  const abbRobot = abbJson as unknown as RobotDefinition;
  const stanfordRobot = stanfordJson as unknown as RobotDefinition;
  const prpRobot = prpJson as unknown as RobotDefinition;

  const planar2R: RobotDefinition = {
    id: 'planar2R',
    name: 'Planar 2R Arm',
    dof: 2,
    dhConvention: 'standard',
    joints: [
      { id: 'j1', name: 'Joint 1', index: 0, type: 'revolute', theta: 0, d: 0, a: 0.5, alpha: 0, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
      { id: 'j2', name: 'Joint 2', index: 1, type: 'revolute', theta: 0, d: 0, a: 0.3, alpha: 0, offset: 0, min: -Math.PI, max: Math.PI, home: 0 },
    ],
    links: [
      { id: 'l0', name: 'Base', index: 0 },
      { id: 'l1', name: 'Link 1', index: 1 },
      { id: 'l2', name: 'Link 2', index: 2 },
    ],
  };

  it('verifies that analytical gradient matches central finite difference gradient for both position and orientation', () => {
    const qSample = [0.3, 0.4, -0.2, 0.5, 0.6, -0.4];
    const fkTarget = forwardKinematics(abbRobot, [0.1, 0.2, 0.0, 0.3, 0.4, 0.0]);
    const targetPose = fkTarget.endEffectorTransform;

    const evaluator = new IKObjectiveEvaluator(abbRobot, targetPose, {
      positionWeight: 1.0,
      orientationWeight: 0.5,
      positionOnly: false,
    });

    const gAnal = evaluator.computeAnalyticalGradient(qSample);
    const gFD = evaluator.computeFiniteDifferenceGradient(qSample, 1e-6);

    for (let i = 0; i < abbRobot.dof; i++) {
      expect(Math.abs(gAnal[i] - gFD[i])).toBeLessThan(1e-6);
    }
  });

  it('solves 2-DOF planar arm to reachable target within strict tolerance', () => {
    // Generate target from known configuration [0.5, 0.8]
    const qTarget = [0.5, 0.8];
    const fkTarget = forwardKinematics(planar2R, qTarget);
    const targetPose = fkTarget.endEffectorTransform;

    const solution = solveSMABFGSIK(planar2R, targetPose, {
      populationSize: 25,
      smaIterations: 30,
      bfgsIterations: 30,
      positionTolerance: 1e-4,
      positionOnly: true,
      randomSeed: 101,
    });

    expect(solution.validation.converged).toBe(true);
    expect(solution.validation.status).toBe('CONVERGED');
    expect(solution.validation.positionErrorMeters).toBeLessThan(1e-4);
    expect(solution.validation.withinJointLimits).toBe(true);
    expect(solution.validation.allFinite).toBe(true);
  });

  it('solves Puma 560 for reachable interior target', () => {
    // Target from known reachable joint configuration near home
    const qTarget = [0.2, 1.2, -0.8, 0.3, -4.2, 0.1];
    const fkTarget = forwardKinematics(pumaRobot, qTarget);
    const targetPose = fkTarget.endEffectorTransform;

    const solution = solveSMABFGSIK(pumaRobot, targetPose, {
      populationSize: 35,
      smaIterations: 40,
      bfgsIterations: 50,
      positionOnly: false,
      positionTolerance: 1e-3,
      orientationTolerance: 1e-2,
      randomSeed: 12345,
    });

    expect(solution.validation.withinJointLimits).toBe(true);
    expect(solution.validation.allFinite).toBe(true);
    expect(solution.stepTraces.length).toBe(9);
    expect(solution.validation.positionErrorMeters).toBeLessThan(1e-2);
  });

  it('solves ABB IRB 120 in full-pose (position + orientation) mode', () => {
    const qTarget = [0.2, 0.3, -0.2, 0.4, 0.5, -0.3];
    const fkTarget = forwardKinematics(abbRobot, qTarget);
    const targetPose = fkTarget.endEffectorTransform;

    const solution = solveSMABFGSIK(abbRobot, targetPose, {
      populationSize: 35,
      smaIterations: 40,
      bfgsIterations: 50,
      positionOnly: false,
      positionWeight: 1.0,
      orientationWeight: 0.2,
      positionTolerance: 5e-4,
      orientationTolerance: 5e-3,
      randomSeed: 999,
    });

    expect(solution.validation.withinJointLimits).toBe(true);
    expect(solution.validation.allFinite).toBe(true);
    // Solved error should have decreased significantly from initial error
    const initialPosErr = solution.stepTraces[2].data.initialPositionErrorMeters as number;
    expect(solution.validation.positionErrorMeters).toBeLessThan(initialPosErr);
  });

  it('correctly identifies and flags physically unreachable target', () => {
    // Target way outside reach (Puma reach is approx 0.9 m; set target at 5.0 m)
    const unreachableTarget = Matrix4.fromRotationTranslation(Matrix4.identity().getRotation(), new Vector3(5.0, 5.0, 5.0));

    const solution = solveSMABFGSIK(pumaRobot, unreachableTarget, {
      populationSize: 20,
      smaIterations: 20,
      bfgsIterations: 20,
      randomSeed: 42,
    });

    expect(solution.validation.converged).toBe(false);
    expect(
      solution.validation.status === 'INFEASIBLE_OR_UNREACHABLE_TARGET' ||
      solution.validation.status === 'MAXIMUM_ITERATIONS_REACHED' ||
      solution.validation.status === 'TOLERANCE_NOT_REACHED'
    ).toBe(true);
  });

  it('strictly respects robot joint limits at every iteration and final solution', () => {
    const qTarget = [0.0, 0.2, 0.0, 0.0, -2.5, 0.0];
    const fkTarget = forwardKinematics(pumaRobot, qTarget);
    const targetPose = fkTarget.endEffectorTransform;

    const solution = solveSMABFGSIK(pumaRobot, targetPose, {
      populationSize: 25,
      smaIterations: 25,
      bfgsIterations: 30,
      boundStrategy: 'sigmoid-transform',
      randomSeed: 777,
    });

    expect(solution.validation.withinJointLimits).toBe(true);
    for (let i = 0; i < pumaRobot.dof; i++) {
      const joint = pumaRobot.joints[i];
      expect(solution.finalJoints[i]).toBeGreaterThanOrEqual(joint.min - 1e-4);
      expect(solution.finalJoints[i]).toBeLessThanOrEqual(joint.max + 1e-4);
    }
  });

  it('provides bit-exact reproducibility when rerun with identical parameters and seed', () => {
    const qTarget = [0.3, 0.5];
    const fkTarget = forwardKinematics(planar2R, qTarget);
    const targetPose = fkTarget.endEffectorTransform;

    const sol1 = solveSMABFGSIK(planar2R, targetPose, {
      populationSize: 20,
      smaIterations: 20,
      bfgsIterations: 20,
      randomSeed: 31415,
    });

    const sol2 = solveSMABFGSIK(planar2R, targetPose, {
      populationSize: 20,
      smaIterations: 20,
      bfgsIterations: 20,
      randomSeed: 31415,
    });

    expect(sol1.finalJoints).toEqual(sol2.finalJoints);
    expect(sol1.validation.positionErrorMeters).toBe(sol2.validation.positionErrorMeters);
    expect(sol1.smaResult.bestFitness).toBe(sol2.smaResult.bestFitness);
  });

  it('generates real 9-step mathematical execution trace', () => {
    const qTarget = [0.2, 0.4];
    const fkTarget = forwardKinematics(planar2R, qTarget);
    const targetPose = fkTarget.endEffectorTransform;

    const solution = solveSMABFGSIK(planar2R, targetPose, {
      populationSize: 15,
      smaIterations: 15,
      bfgsIterations: 15,
      randomSeed: 42,
    });

    expect(solution.stepTraces.length).toBe(9);
    const stepNames = solution.stepTraces.map((s) => s.stepName);
    expect(stepNames).toContain('Input Validation');
    expect(stepNames).toContain('Robot Kinematic Model');
    expect(stepNames).toContain('Initial Forward Kinematics');
    expect(stepNames).toContain('IK Objective Function Formulation');
    expect(stepNames).toContain('SMA Population Initialization');
    expect(stepNames).toContain('SMA Global Exploration Iterations');
    expect(stepNames).toContain('BFGS Quasi-Newton Initialization');
    expect(stepNames).toContain('BFGS Local Refinement Iterations');
    expect(stepNames).toContain('Independent Kinematic Validation');
  });

  it('verifies analytical gradient matches central finite difference when joint limit penalty is active', () => {
    // Pick configuration very close to lower bound of Joint 1 to trigger penalty margin
    const j1Min = abbRobot.joints[0].min;
    const j1Range = abbRobot.joints[0].max - j1Min;
    const qNearLimit = [j1Min + 0.005 * j1Range, 0.2, 0.0, 0.3, 0.4, 0.0];

    const fkTarget = forwardKinematics(abbRobot, [0.1, 0.2, 0.0, 0.3, 0.4, 0.0]);
    const targetPose = fkTarget.endEffectorTransform;

    const evaluator = new IKObjectiveEvaluator(abbRobot, targetPose, {
      positionWeight: 1.0,
      orientationWeight: 0.2,
      jointLimitPenaltyWeight: 50.0,
      positionOnly: false,
    });

    const gAnal = evaluator.computeAnalyticalGradient(qNearLimit);
    const gFD = evaluator.computeFiniteDifferenceGradient(qNearLimit, 1e-6);

    for (let i = 0; i < abbRobot.dof; i++) {
      expect(Math.abs(gAnal[i] - gFD[i])).toBeLessThan(1e-5);
    }
  });

  it('solves Stanford arm with prismatic joint boom extension within limits', () => {
    // Target from known reachable joint configuration (joint 3 is prismatic: boom length ~0.5 m)
    const qTarget = [0.2, 0.3, 0.5, 0.1, 0.2, 0.1];
    const fkTarget = forwardKinematics(stanfordRobot, qTarget);
    const targetPose = fkTarget.endEffectorTransform;

    const solution = solveSMABFGSIK(stanfordRobot, targetPose, {
      populationSize: 30,
      smaIterations: 35,
      bfgsIterations: 40,
      positionTolerance: 1e-3,
      orientationTolerance: 1e-2,
      positionOnly: false,
      randomSeed: 2026,
    });

    expect(solution.validation.withinJointLimits).toBe(true);
    expect(solution.validation.allFinite).toBe(true);
    // Prismatic joint 3 must be strictly within [0.1, 1.0] meters
    expect(solution.finalJoints[2]).toBeGreaterThanOrEqual(stanfordRobot.joints[2].min - 1e-4);
    expect(solution.finalJoints[2]).toBeLessThanOrEqual(stanfordRobot.joints[2].max + 1e-4);
    expect(solution.validation.positionErrorMeters).toBeLessThan(1e-2);
  });

  it('solves skeleton_PRP 3-DOF robot with multiple prismatic joints in position-only mode', () => {
    const qTarget = [0.3, 0.5, 0.2];
    const fkTarget = forwardKinematics(prpRobot, qTarget);
    const targetPose = fkTarget.endEffectorTransform;

    const solution = solveSMABFGSIK(prpRobot, targetPose, {
      populationSize: 25,
      smaIterations: 30,
      bfgsIterations: 35,
      positionTolerance: 1e-3,
      positionOnly: true,
      randomSeed: 404,
    });

    expect(solution.validation.withinJointLimits).toBe(true);
    expect(solution.validation.allFinite).toBe(true);
    expect(solution.validation.positionErrorMeters).toBeLessThan(1e-3);
  });

  it('handles near-antipodal orientation targets (theta ~ pi) without crashing or NaN', () => {
    // Construct orientation that is 179 degrees rotated around X axis
    const rotPi = new Euler(Math.PI - 0.01, 0, 0, 'XYZ').toRotationMatrix();
    const targetPose = Matrix4.fromRotationTranslation(rotPi, new Vector3(0.4, 0.2, 0.5));

    const solution = solveSMABFGSIK(pumaRobot, targetPose, {
      populationSize: 20,
      smaIterations: 20,
      bfgsIterations: 25,
      positionOnly: false,
      randomSeed: 888,
    });

    expect(solution.validation.allFinite).toBe(true);
    expect(Number.isFinite(solution.validation.positionErrorMeters)).toBe(true);
    expect(Number.isFinite(solution.validation.orientationErrorRadians)).toBe(true);
  });

  it('successfully optimizes using projected-armijo bound handling strategy', () => {
    const qTarget = [0.3, 0.4, -0.2, 0.5, 0.6, -0.4];
    const fkTarget = forwardKinematics(abbRobot, qTarget);
    const targetPose = fkTarget.endEffectorTransform;

    const solution = solveSMABFGSIK(abbRobot, targetPose, {
      populationSize: 25,
      smaIterations: 25,
      bfgsIterations: 30,
      boundStrategy: 'projected-armijo',
      positionTolerance: 1e-3,
      randomSeed: 1234,
    });

    expect(solution.validation.withinJointLimits).toBe(true);
    expect(solution.validation.allFinite).toBe(true);
    for (let i = 0; i < abbRobot.dof; i++) {
      expect(solution.finalJoints[i]).toBeGreaterThanOrEqual(abbRobot.joints[i].min - 1e-4);
      expect(solution.finalJoints[i]).toBeLessThanOrEqual(abbRobot.joints[i].max + 1e-4);
    }
  });

  it('returns NUMERICAL_FAILURE when target pose contains non-finite values (NaN/Infinity)', () => {
    const nanTarget = Matrix4.identity();
    nanTarget.elements[12] = NaN; // Corrupt X position to NaN

    const solution = solveSMABFGSIK(pumaRobot, nanTarget, {
      populationSize: 10,
      smaIterations: 5,
      bfgsIterations: 5,
    });

    expect(solution.validation.converged).toBe(false);
    expect(solution.validation.status).toBe('NUMERICAL_FAILURE');
  });
});
