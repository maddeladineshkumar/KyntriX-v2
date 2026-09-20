/**
 * Standard BFGS Quasi-Newton Type Definitions
 * Mathematical Reference:
 * Jorge Nocedal & Stephen J. Wright, "Numerical Optimization", 2nd ed.,
 * Springer, 2006. Chapter 6 (Quasi-Newton Methods) & Chapter 3 (Line Search).
 */

export type BFGSBoundStrategy = 'sigmoid-transform' | 'projected-armijo' | 'unconstrained';

export interface BFGSParameters {
  /** Maximum number of Quasi-Newton iterations */
  maxIterations: number;
  /** Gradient norm convergence tolerance ||g|| < tol */
  gradientTolerance?: number;
  /** Target absolute objective value tolerance f(x) <= tol */
  objectiveTolerance?: number;
  /** Relative change tolerance in objective |f_{k+1} - f_k| < tol */
  functionTolerance?: number;
  /** Step length tolerance ||s_k|| < tol */
  stepTolerance?: number;
  /** Armijo sufficient decrease parameter c1 (default: 1e-4) */
  c1?: number;
  /** Strong Wolfe curvature parameter c2 (default: 0.9) */
  c2?: number;
  /** Initial step size trial (default: 1.0) */
  initialStepSize?: number;
  /** Bound handling strategy for box-constrained optimization */
  boundStrategy?: BFGSBoundStrategy;
}

export interface BFGSIterationRecord {
  iteration: number;
  q: number[];
  objective: number;
  gradient: number[];
  gradientNorm: number;
  searchDirection: number[];
  stepSize: number;
  sVector: number[];
  yVector: number[];
  curvature: number; // s^T * y
  curvatureSatisfied: boolean;
  updateStatus: 'Updated' | 'Skipped (Curvature <= 0)' | 'Reset to Steepest Descent' | 'Initial';
  inverseHessianTrace: number;
  inverseHessianDiag: number[];
}

export interface BFGSResult {
  solution: number[];
  objective: number;
  gradient: number[];
  gradientNorm: number;
  iterationsCompleted: number;
  functionEvaluations: number;
  gradientEvaluations: number;
  history: BFGSIterationRecord[];
  converged: boolean;
  terminationReason:
    | 'CONVERGED_GRADIENT_NORM'
    | 'CONVERGED_OBJECTIVE_TOLERANCE'
    | 'CONVERGED_STEP_TOLERANCE'
    | 'MAXIMUM_ITERATIONS_REACHED'
    | 'LINE_SEARCH_FAILED'
    | 'NUMERICAL_OVERFLOW';
}
