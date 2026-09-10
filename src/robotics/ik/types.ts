import { Matrix4 } from '../math/Matrix4';

export interface IKOptions {
  initialGuess?: number[];
  positionTolerance?: number; // meters, default 1e-4
  orientationTolerance?: number; // radians, default 1e-3
  maxIterations?: number; // default 100
  damping?: number; // initial lambda, default 0.05
  enableNullSpace?: boolean; // secondary joint centering
  returnAllBranches?: boolean; // whether to explore multi-seed branches
  currentJoints?: number[]; // for proximity ranking
  positionOnly?: boolean; // solve position reachability regardless of orientation
}

export interface IKSingleSolution {
  q: number[];
  converged: boolean;
  iterations: number;
  positionError: number; // meters
  orientationError: number; // radians
  withinLimits: boolean;
  manipulability: number;
  conditionNumber: number;
  rank?: number;
  isSingular?: boolean;
  cost: number; // weighted sum of error, motion distance, limit proximity
  solverType: 'analytical-3r' | 'analytical-6r' | 'analytical-scara' | 'numerical-dls';
}

export type ReachabilityStatus =
  | 'reachable-dexterous'
  | 'reachable-singular'
  | 'position-only-reachable'
  | 'outside-workspace'
  | 'unreachable-joint-limits'
  | 'convergence-failed';

export interface IKPipelineResult {
  target: Matrix4;
  solutions: IKSingleSolution[];
  bestSolution: IKSingleSolution | null;
  converged: boolean;
  computationTimeMs: number;
  allTestedBranches: number;
  failureReason?: string;
  isPositionReachable?: boolean;
  isOrientationReachable?: boolean;
  reachabilityStatus?: ReachabilityStatus;
  isSingular?: boolean;
}
