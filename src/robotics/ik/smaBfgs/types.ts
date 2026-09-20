/**
 * Type Definitions for KyntriX SMA-BFGS Hybrid IK Solver
 */

import type { RobotDefinition } from '../../../data/schema/robotSchema';
import type { Matrix4 } from '../../math/Matrix4';
import type { SMAResult } from '../sma/types';
import type { BFGSResult, BFGSBoundStrategy } from '../bfgs/types';

export type IKSolverStatus =
  | 'CONVERGED'
  | 'MAXIMUM_ITERATIONS_REACHED'
  | 'TOLERANCE_NOT_REACHED'
  | 'NUMERICAL_FAILURE'
  | 'INFEASIBLE_OR_UNREACHABLE_TARGET'
  | 'CONSTRAINT_VIOLATION'
  | 'REFINEMENT_FAILED';

export interface SMABFGSSolverOptions {
  /** Population size for SMA global exploration (default: 30) */
  populationSize?: number;
  /** Maximum iterations for SMA phase (default: 50) */
  smaIterations?: number;
  /** Maximum iterations for BFGS local refinement (default: 60) */
  bfgsIterations?: number;
  /** Weight for position error objective (default: 1.0) */
  positionWeight?: number;
  /** Weight for orientation error objective (default: 0.2) */
  orientationWeight?: number;
  /** Mode: true for position-only, false for full 6-DOF pose */
  positionOnly?: boolean;
  /** Desired position tolerance in meters (default: 1e-4 m) */
  positionTolerance?: number;
  /** Desired orientation tolerance in radians (default: 1e-3 rad) */
  orientationTolerance?: number;
  /** PRNG seed for deterministic execution (default: 42) */
  randomSeed?: number;
  /** Gradient calculation method: 'analytical' (Jacobian) or 'finite-differences' */
  gradientMethod?: 'analytical' | 'finite-differences';
  /** Bound handling strategy for BFGS refinement */
  boundStrategy?: BFGSBoundStrategy;
  /** Initial joint configuration guess (optional) */
  initialGuess?: number[];
  /** Optional penalty coefficient for joint limit proximity */
  jointLimitPenaltyWeight?: number;
}

export interface IKObjectiveBreakdown {
  positionErrorVec: [number, number, number];
  positionErrorNorm: number; // meters
  orientationErrorVec: [number, number, number];
  orientationErrorNorm: number; // radians
  positionObjective: number; // 0.5 * ||e_p||^2
  orientationObjective: number; // 0.5 * ||e_o||^2
  totalObjective: number;
}

export interface StepTraceRecord {
  stepIndex: number;
  stepName: string;
  description: string;
  data: Record<string, unknown>;
}

export interface ValidationReport {
  status: IKSolverStatus;
  statusMessage: string;
  converged: boolean;
  finalJoints: number[];
  positionErrorMeters: number;
  positionErrorMm: number;
  orientationErrorRadians: number;
  orientationErrorDegrees: number;
  withinJointLimits: boolean;
  jointLimitViolations: { jointIndex: number; jointName: string; value: number; min: number; max: number }[];
  allFinite: boolean;
  manipulability: number;
  conditionNumber: number;
  isSingular: boolean;
  executionTimeMs: number;
}

export interface SMABFGSSolution {
  robot: RobotDefinition;
  targetPose: Matrix4;
  options: Required<SMABFGSSolverOptions>;
  initialJoints: number[];
  bestSMAJoints: number[];
  finalJoints: number[];
  smaResult: SMAResult;
  bfgsResult: BFGSResult;
  validation: ValidationReport;
  objectiveHistory: {
    smaPhase: { iteration: number; bestObjective: number; avgObjective: number }[];
    bfgsPhase: { iteration: number; objective: number; gradientNorm: number; stepSize: number }[];
    positionErrorHistory: { iteration: number; error: number }[];
    orientationErrorHistory: { iteration: number; error: number }[];
  };
  stepTraces: StepTraceRecord[];
}
