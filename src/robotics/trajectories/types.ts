import { Matrix4 } from '../math/Matrix4';
import { Vector3 } from '../math/Vector3';
import { Euler } from '../math/Euler';

export type TrajectoryProfile = 'trapezoidal' | 'cubic' | 'quintic';

export interface TrajectoryState {
  time: number;
  q: number[];
  qDot: number[];
  qDdot: number[];
  endEffectorTransform: Matrix4;
  position: Vector3;
  euler: Euler;
  manipulability: number;
  conditionNumber: number;
  ikSuccess?: boolean;
  positionError?: number;
  orientationError?: number;
}

export interface TrajectoryDataset {
  duration: number;
  timeSteps: number[];
  positions: number[][]; // [stepIndex][jointIndex]
  velocities: number[][];
  accelerations: number[][];
  endEffectorPositions: Vector3[];
  endEffectorOrientations: Euler[];
  manipulabilities: number[];
  conditionNumbers: number[];
  states: TrajectoryState[];
  isValid?: boolean;
  hasIKFailure?: boolean;
  failedSampleIndices?: number[];
  failureReason?: string;
}

export interface JointTrajectoryParams {
  startQ: number[];
  goalQ: number[];
  duration: number; // seconds
  profile?: TrajectoryProfile;
  samples?: number; // default 100
}

export interface CartesianTrajectoryParams {
  startPose: Matrix4;
  goalPose: Matrix4;
  startQ: number[];
  duration: number;
  profile?: TrajectoryProfile;
  samples?: number;
}
