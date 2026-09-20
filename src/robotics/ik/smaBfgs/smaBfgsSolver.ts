/**
 * KyntriX SMA-BFGS Hybrid Inverse Kinematics Solver
 *
 * Defined Architecture:
 * - Phase A: Canonical SMA Global Exploration
 * - Phase B: Standard BFGS Local Quasi-Newton Refinement with Sigmoid Box-Transform
 * - Phase C: Independent Kinematic Validation & Verification
 *
 * Full Step-by-Step Mathematical Trace across 9 distinct stages.
 */

import type { RobotDefinition } from '../../../data/schema/robotSchema';
import { Matrix4 } from '../../math/Matrix4';
import { forwardKinematics } from '../../kinematics/forwardKinematics';
import { runCanonicalSMA } from '../sma/smaOptimizer';
import { runStandardBFGS } from '../bfgs/bfgsOptimizer';
import { IKObjectiveEvaluator } from './objective';
import { validateIKSolution } from './validation';
import { RAD_TO_DEG } from '../../math/constants';
import type {
  SMABFGSSolverOptions,
  SMABFGSSolution,
  StepTraceRecord,
} from './types';

export function solveSMABFGSIK(
  robot: RobotDefinition,
  target: Matrix4,
  options: SMABFGSSolverOptions = {}
): SMABFGSSolution {
  const startTime = performance.now();

  const fullOptions: Required<SMABFGSSolverOptions> = {
    populationSize: options.populationSize ?? 30,
    smaIterations: options.smaIterations ?? 40,
    bfgsIterations: options.bfgsIterations ?? 50,
    positionWeight: options.positionWeight ?? 1.0,
    orientationWeight: options.orientationWeight ?? 0.2,
    positionOnly: options.positionOnly ?? (robot.dof < 6),
    positionTolerance: options.positionTolerance ?? 1e-4,
    orientationTolerance: options.orientationTolerance ?? 1e-3,
    randomSeed: options.randomSeed ?? 42,
    gradientMethod: options.gradientMethod ?? 'analytical',
    boundStrategy: options.boundStrategy ?? 'sigmoid-transform',
    initialGuess: options.initialGuess ?? robot.joints.map((j) => j.home ?? (j.min + j.max) / 2),
    jointLimitPenaltyWeight: options.jointLimitPenaltyWeight ?? 0.0,
  };

  const dof = robot.joints.length;
  const lowerBounds = robot.joints.map((j) => j.min);
  const upperBounds = robot.joints.map((j) => j.max);

  const stepTraces: StepTraceRecord[] = [];

  // =========================================================================
  // STEP 1 — INPUT VALIDATION
  // =========================================================================
  const targetPos = target.getPosition();
  const targetRot = target.getRotation();
  const inputValidationPassed =
    dof > 0 &&
    lowerBounds.every((lb, idx) => lb < upperBounds[idx]) &&
    Number.isFinite(targetPos.x) &&
    Number.isFinite(targetPos.y) &&
    Number.isFinite(targetPos.z);

  stepTraces.push({
    stepIndex: 1,
    stepName: 'Input Validation',
    description: 'Validated robot geometry, target coordinates, and solver bounds.',
    data: {
      status: inputValidationPassed ? 'VALID' : 'INVALID_INPUTS',
      dof,
      targetPosition: [targetPos.x, targetPos.y, targetPos.z],
      targetOrientationEuler: target.getEuler('XYZ').toArray(),
      positionOnly: fullOptions.positionOnly,
      populationSize: fullOptions.populationSize,
      smaIterations: fullOptions.smaIterations,
      bfgsIterations: fullOptions.bfgsIterations,
      randomSeed: fullOptions.randomSeed,
      boundStrategy: fullOptions.boundStrategy,
    },
  });

  // =========================================================================
  // STEP 2 — ROBOT MODEL
  // =========================================================================
  stepTraces.push({
    stepIndex: 2,
    stepName: 'Robot Kinematic Model',
    description: 'Extracted robot DH parameters, joint types, limits, and frame offsets.',
    data: {
      robotId: robot.id,
      robotName: robot.name,
      dhConvention: robot.dhConvention,
      joints: robot.joints.map((j) => ({
        name: j.name,
        type: j.type,
        theta: j.theta,
        d: j.d,
        a: j.a,
        alpha: j.alpha,
        min: j.min,
        max: j.max,
        home: j.home,
      })),
      baseTransform: (robot.baseTransform ?? Matrix4.identity()).elements,
      endEffectorOffset: (robot.endEffectorOffset ?? Matrix4.identity()).elements,
    },
  });

  // =========================================================================
  // STEP 3 — INITIAL FORWARD KINEMATICS
  // =========================================================================
  const initialQ = fullOptions.initialGuess.slice(0, dof);
  const initialFK = forwardKinematics(robot, initialQ);
  const initialPos = initialFK.endEffectorTransform.getPosition();
  const initialRot = initialFK.endEffectorTransform.getRotation();
  const initialPosErr = initialPos.distanceTo(targetPos);
  const initialOriErr = fullOptions.positionOnly ? 0 : initialRot.rotationError(targetRot).norm();

  stepTraces.push({
    stepIndex: 3,
    stepName: 'Initial Forward Kinematics',
    description: 'Computed end-effector pose and initial tracking errors at starting configuration q_0.',
    data: {
      initialJoints: initialQ,
      initialPosition: [initialPos.x, initialPos.y, initialPos.z],
      initialOrientationEuler: initialFK.endEffectorTransform.getEuler('XYZ').toArray(),
      initialPositionErrorMeters: initialPosErr,
      initialOrientationErrorRadians: initialOriErr,
      initialOrientationErrorDegrees: initialOriErr * RAD_TO_DEG,
    },
  });

  // =========================================================================
  // STEP 4 — OBJECTIVE FUNCTION FORMULATION
  // =========================================================================
  const evaluator = new IKObjectiveEvaluator(robot, target, {
    positionWeight: fullOptions.positionWeight,
    orientationWeight: fullOptions.orientationWeight,
    positionOnly: fullOptions.positionOnly,
    jointLimitPenaltyWeight: fullOptions.jointLimitPenaltyWeight,
  });

  const initialBreakdown = evaluator.evaluateBreakdown(initialQ);

  stepTraces.push({
    stepIndex: 4,
    stepName: 'IK Objective Function Formulation',
    description: 'Constructed scalar cost f(q) = w_p * (1/2 ||e_p||^2) + w_o * (1/2 ||e_o||^2).',
    data: {
      positionWeight: fullOptions.positionWeight,
      orientationWeight: fullOptions.orientationWeight,
      initialPositionErrorNorm: initialBreakdown.positionErrorNorm,
      initialOrientationErrorNorm: initialBreakdown.orientationErrorNorm,
      initialPositionObjective: initialBreakdown.positionObjective,
      initialOrientationObjective: initialBreakdown.orientationObjective,
      initialTotalObjective: initialBreakdown.totalObjective,
    },
  });

  // =========================================================================
  // PHASE A: STEP 5 & 6 — CANONICAL SMA GLOBAL EXPLORATION
  // =========================================================================
  const smaResult = runCanonicalSMA(
    {
      dimension: dof,
      lowerBounds,
      upperBounds,
      objective: (x) => evaluator.evaluate(x),
      initialGuess: initialQ,
    },
    {
      populationSize: fullOptions.populationSize,
      maxIterations: fullOptions.smaIterations,
      seed: fullOptions.randomSeed,
      tolerance: fullOptions.positionTolerance * 0.1,
    }
  );

  stepTraces.push({
    stepIndex: 5,
    stepName: 'SMA Population Initialization',
    description: `Generated initial population of N=${fullOptions.populationSize} candidates using Seed=${fullOptions.randomSeed}.`,
    data: {
      populationSize: fullOptions.populationSize,
      randomSeed: fullOptions.randomSeed,
      initialBestFitness: smaResult.initialBestFitness,
      topCandidateSamples: smaResult.initialPopulation.slice(0, 5),
    },
  });

  stepTraces.push({
    stepIndex: 6,
    stepName: 'SMA Global Exploration Iterations',
    description: `Executed ${smaResult.iterationsCompleted} canonical SMA iterations with adaptive weight W and parameter a.`,
    data: {
      iterationsCompleted: smaResult.iterationsCompleted,
      functionEvaluations: smaResult.functionEvaluations,
      initialBestObjective: smaResult.initialBestFitness,
      finalBestObjective: smaResult.bestFitness,
      bestSMAPosition: smaResult.bestPosition,
      historySummary: smaResult.history.slice(0, 10).concat(smaResult.history.slice(-3)),
    },
  });

  const bestSMAQ = [...smaResult.bestPosition];

  // =========================================================================
  // PHASE B: STEP 7 & 8 — STANDARD BFGS LOCAL REFINEMENT
  // =========================================================================
  const initialBFGSEval = evaluator.evaluateAndGradient(bestSMAQ, fullOptions.gradientMethod);

  stepTraces.push({
    stepIndex: 7,
    stepName: 'BFGS Quasi-Newton Initialization',
    description: 'Initialized BFGS from best SMA candidate with identity inverse-Hessian H_0 = I.',
    data: {
      startingJoints: bestSMAQ,
      startingObjective: initialBFGSEval.objective,
      startingGradient: initialBFGSEval.gradient,
      gradientNorm: norm(initialBFGSEval.gradient),
      boundHandlingStrategy: fullOptions.boundStrategy,
      initialHessianTrace: dof,
    },
  });

  const bfgsResult = runStandardBFGS(
    {
      dimension: dof,
      initialPoint: bestSMAQ,
      lowerBounds,
      upperBounds,
      objectiveGrad: (x) => evaluator.evaluateAndGradient(x, fullOptions.gradientMethod),
    },
    {
      maxIterations: fullOptions.bfgsIterations,
      gradientTolerance: 1e-7,
      functionTolerance: 1e-12,
      stepTolerance: 1e-12,
      objectiveTolerance: 0.5 * fullOptions.positionTolerance * fullOptions.positionTolerance,
      boundStrategy: fullOptions.boundStrategy,
    }
  );

  stepTraces.push({
    stepIndex: 8,
    stepName: 'BFGS Local Refinement Iterations',
    description: `Executed ${bfgsResult.iterationsCompleted} BFGS iterations with line search and secant inverse-Hessian updates.`,
    data: {
      iterationsCompleted: bfgsResult.iterationsCompleted,
      functionEvaluations: bfgsResult.functionEvaluations,
      gradientEvaluations: bfgsResult.gradientEvaluations,
      finalObjective: bfgsResult.objective,
      finalGradientNorm: bfgsResult.gradientNorm,
      terminationReason: bfgsResult.terminationReason,
      converged: bfgsResult.converged,
      historySummary: bfgsResult.history.slice(0, 10).concat(bfgsResult.history.slice(-3)),
    },
  });

  const finalQ = [...bfgsResult.solution];

  // =========================================================================
  // PHASE C: STEP 9 — INDEPENDENT VALIDATION
  // =========================================================================
  const endTime = performance.now();
  const executionTimeMs = endTime - startTime;

  const refinementImproved = bfgsResult.objective <= smaResult.bestFitness + 1e-10;
  const maxIterationsReached =
    bfgsResult.iterationsCompleted >= fullOptions.bfgsIterations && !bfgsResult.converged;

  const validation = validateIKSolution({
    robot,
    q: finalQ,
    target,
    positionTolerance: fullOptions.positionTolerance,
    orientationTolerance: fullOptions.orientationTolerance,
    positionOnly: fullOptions.positionOnly,
    maxIterationsReached,
    refinementImproved,
    executionTimeMs,
  });

  stepTraces.push({
    stepIndex: 9,
    stepName: 'Independent Kinematic Validation',
    description: 'Recomputed independent FK, checked residuals, joint bounds, condition number, and convergence status.',
    data: {
      status: validation.status,
      statusMessage: validation.statusMessage,
      converged: validation.converged,
      positionErrorMeters: validation.positionErrorMeters,
      positionErrorMm: validation.positionErrorMm,
      orientationErrorDegrees: validation.orientationErrorDegrees,
      withinJointLimits: validation.withinJointLimits,
      manipulability: validation.manipulability,
      conditionNumber: validation.conditionNumber,
      executionTimeMs,
    },
  });

  // Compile full history curves for plotting
  const smaPhaseHistory = smaResult.history.map((h) => ({
    iteration: h.iteration,
    bestObjective: h.bestFitness,
    avgObjective: h.averageFitness,
  }));

  const bfgsPhaseHistory = bfgsResult.history.map((h) => ({
    iteration: h.iteration,
    objective: h.objective,
    gradientNorm: h.gradientNorm,
    stepSize: h.stepSize,
  }));

  // Position & orientation error history during BFGS refinement
  const positionErrorHistory = bfgsResult.history.map((h) => {
    const fkIter = forwardKinematics(robot, h.q);
    const pos = fkIter.endEffectorTransform.getPosition();
    return {
      iteration: h.iteration,
      error: pos.distanceTo(targetPos),
    };
  });

  const orientationErrorHistory = bfgsResult.history.map((h) => {
    const fkIter = forwardKinematics(robot, h.q);
    const rot = fkIter.endEffectorTransform.getRotation();
    return {
      iteration: h.iteration,
      error: fullOptions.positionOnly ? 0 : rot.rotationError(targetRot).norm(),
    };
  });

  return {
    robot,
    targetPose: target.clone(),
    options: fullOptions,
    initialJoints: initialQ,
    bestSMAJoints: bestSMAQ,
    finalJoints: finalQ,
    smaResult,
    bfgsResult,
    validation,
    objectiveHistory: {
      smaPhase: smaPhaseHistory,
      bfgsPhase: bfgsPhaseHistory,
      positionErrorHistory,
      orientationErrorHistory,
    },
    stepTraces,
  };
}

function norm(vec: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}
