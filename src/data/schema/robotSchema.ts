import { Vector3, Matrix3, Matrix4, Quaternion, Euler } from '../../robotics/math';

export type JointType = 'revolute' | 'prismatic';
export type DHConvention = 'standard' | 'modified';

export interface JointDefinition {
  id: string;
  name: string;
  index: number;
  type: JointType;
  // Standard DH parameters in SI units: meters and radians
  theta: number; // radians
  d: number;     // meters
  a: number;     // meters
  alpha: number; // radians
  offset: number; // radians (revolute) or meters (prismatic)
  min: number;   // radians or meters
  max: number;   // radians or meters
  home: number;  // radians or meters
}

export interface MeshCalibration {
  translation: [number, number, number]; // [x, y, z] in meters
  rotation: [number, number, number];    // [rx, ry, rz] in radians
  scale: [number, number, number];       // [sx, sy, sz]
}

export interface LinkMassProperty {
  mass: number;
  ixx: number;
  iyy: number;
  izz: number;
  ixy: number;
  ixz: number;
  iyz: number;
}

export interface LinkDefinition {
  id: string;
  name: string;
  index: number;
  meshFile?: string;
  color?: string;
  calibration?: MeshCalibration;
  massProperty?: LinkMassProperty;
  centerOfMass?: [number, number, number];
}

export interface RobotDefinition {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  dof: number;
  dhConvention: DHConvention;
  joints: JointDefinition[];
  links: LinkDefinition[];
  payload?: number;
  totalWeight?: number;
  baseTransform?: Matrix4;
  endEffectorOffset?: Matrix4;
}

export interface Pose {
  position: Vector3;
  rotation: Matrix3;
  quaternion: Quaternion;
  euler: Euler;
}

export interface FrameInfo {
  index: number;
  name: string;
  origin: Vector3;
  xAxis: Vector3;
  yAxis: Vector3;
  zAxis: Vector3;
  matrix: Matrix4;
}

export interface FKResult {
  robotId: string;
  q: number[];
  A: Matrix4[]; // Relative transforms: A_1, ..., A_n
  T: Matrix4[]; // Cumulative transforms: T_01, ..., T_0n
  frames: FrameInfo[]; // Frames 0 to n
  origins: Vector3[];
  axes: Vector3[]; // Joint rotation/translation axes in world coordinates
  jointOrigins?: Vector3[]; // Points on joint rotation/translation axes in world coordinates
  endEffectorPose: Pose;
  endEffectorTransform: Matrix4;
}

export interface IKSolution {
  index: number;
  q: number[];
  isValid: boolean;
  positionError: number; // meters
  orientationError: number; // radians
  branchName?: string;
  jointLimitsPassed: boolean;
}

export interface JacobianResult {
  J: number[][]; // 6 x n matrix
  rank: number;
  conditionNumber: number;
  manipulability: number;
  isSingular: boolean;
  singularValues: number[];
}
