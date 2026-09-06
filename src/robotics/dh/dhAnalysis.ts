import { Matrix3, Matrix4, Vector3, Euler, Quaternion, RAD_TO_DEG } from '../math';
import type { RobotDefinition, JointDefinition, JointType, FKResult, LinkDefinition, DHConvention } from '../../data/schema/robotSchema';
import { forwardKinematics } from '../kinematics/forwardKinematics';
import { computeGeometricJacobian } from '../kinematics/jacobian';
import { evaluateJointDH, type EvaluatedDHParams } from './dhTransform';
import { solveIK } from '../ik/ikPipeline';
import type { IKPipelineResult } from '../ik/types';

export interface DHPerJointBreakdown {
  index: number; // 1-indexed
  name: string;
  type: 'revolute' | 'prismatic';
  activeQ: number;
  evaluated: EvaluatedDHParams;
  A: Matrix4;
  T: Matrix4;
  origin: Vector3;
  xAxis: Vector3;
  yAxis: Vector3;
  zAxis: Vector3;
}

export interface DHEndEffectorAnalysis {
  position: {
    x: number; // meters
    y: number; // meters
    z: number; // meters
    norm: number; // meters
    xMm: number; // mm
    yMm: number; // mm
    zMm: number; // mm
    normMm: number; // mm
  };
  rotationMatrix: Matrix3;
  rotationDeterminant: number;
  isOrthogonal: boolean;
  columns: {
    n: Vector3; // Normal vector (col 0)
    s: Vector3; // Sliding vector (col 1)
    a: Vector3; // Approach vector (col 2)
  };
  eulerXYZ: {
    rad: [number, number, number];
    deg: [number, number, number];
  };
  eulerZYX: {
    rad: [number, number, number];
    deg: [number, number, number];
  };
  eulerZYZ: {
    rad: [number, number, number];
    deg: [number, number, number];
  };
  quaternion: {
    w: number;
    x: number;
    y: number;
    z: number;
    norm: number;
  };
}

export interface DHJacobianAnalysis {
  matrix: number[][]; // 6 x n
  linearPart: number[][]; // 3 x n
  angularPart: number[][]; // 3 x n
  rank: number;
  conditionNumber: number;
  manipulability: number;
  singularValues: number[];
  isSingular: boolean;
  taskRows: number;
}

export interface DHReachAnalysis {
  maxTheoreticalReachM: number;
  maxTheoreticalReachMm: number;
  currentDistanceM: number;
  currentDistanceMm: number;
  extensionRatio: number;
}

export interface DHAnalysisResult {
  robot: RobotDefinition;
  q: number[];
  fk: FKResult;
  perJointBreakdown: DHPerJointBreakdown[];
  endEffector: DHEndEffectorAnalysis;
  jacobian: DHJacobianAnalysis;
  reach: DHReachAnalysis;
}

export interface DHPreset {
  id: string;
  name: string;
  description: string;
  dof: number;
  convention: DHConvention;
  joints: Omit<JointDefinition, 'id'>[];
}

/**
 * Standard Library of calibrated classic DH Robot Architectures
 */
export const DH_PRESETS: DHPreset[] = [
  {
    id: 'planar_2r',
    name: '2R Planar Arm',
    description: 'Classic 2-DOF planar revolute manipulator operating in the XY horizontal plane.',
    dof: 2,
    convention: 'standard',
    joints: [
      {
        name: 'Joint 1 (Base)',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.45,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 2 (Elbow)',
        index: 1,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.35,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
  {
    id: 'spatial_3r',
    name: '3R Spatial Articulated Arm',
    description: '3-DOF spatial anthropomorphic arm with vertical waist rotation and vertical planar reach.',
    dof: 3,
    convention: 'standard',
    joints: [
      {
        name: 'Joint 1 (Waist)',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0.35,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 2 (Shoulder)',
        index: 1,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.4,
        alpha: 0,
        offset: 0,
        min: -Math.PI / 2,
        max: Math.PI / 2,
        home: 0,
      },
      {
        name: 'Joint 3 (Elbow)',
        index: 2,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.3,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
  {
    id: 'scara_rrpr',
    name: '4-DOF SCARA (RRPR)',
    description: 'Selective Compliance Assembly Robot Arm with 2 parallel revolute axes, prismatic vertical Z slide, and wrist yaw.',
    dof: 4,
    convention: 'standard',
    joints: [
      {
        name: 'Joint 1 (Waist)',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0.35,
        a: 0.325,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 2 (Elbow)',
        index: 1,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.275,
        alpha: Math.PI,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 3 (Z-Quill)',
        index: 2,
        type: 'prismatic',
        theta: 0,
        d: 0.05,
        a: 0,
        alpha: 0,
        offset: 0,
        min: 0,
        max: 0.3,
        home: 0.05,
      },
      {
        name: 'Joint 4 (Wrist Yaw)',
        index: 3,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
  {
    id: 'cylindrical_rpp',
    name: '3-DOF Cylindrical (RPP)',
    description: 'Cylindrical coordinates manipulator: revolute base, vertical prismatic slide, and horizontal prismatic radial extension.',
    dof: 3,
    convention: 'standard',
    joints: [
      {
        name: 'Joint 1 (Theta)',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0.3,
        a: 0,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 2 (Z Height)',
        index: 1,
        type: 'prismatic',
        theta: 0,
        d: 0.1,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: 0,
        max: 0.4,
        home: 0.15,
      },
      {
        name: 'Joint 3 (Radius R)',
        index: 2,
        type: 'prismatic',
        theta: 0,
        d: 0.2,
        a: 0,
        alpha: 0,
        offset: 0,
        min: 0.05,
        max: 0.5,
        home: 0.2,
      },
    ],
  },
  {
    id: 'educational_5r',
    name: '5-DOF Articulated Arm (5R)',
    description: '5 revolute joints: Base, Shoulder, Elbow, Wrist Pitch, and Wrist Roll, popular in lab robotic kits.',
    dof: 5,
    convention: 'standard',
    joints: [
      {
        name: 'Joint 1 (Waist)',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0.25,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 2 (Shoulder)',
        index: 1,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.3,
        alpha: 0,
        offset: 0,
        min: -Math.PI / 2,
        max: Math.PI / 2,
        home: 0,
      },
      {
        name: 'Joint 3 (Elbow)',
        index: 2,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.25,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 4 (Wrist Pitch)',
        index: 3,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI / 2,
        max: Math.PI / 2,
        home: 0,
      },
      {
        name: 'Joint 5 (Wrist Roll)',
        index: 4,
        type: 'revolute',
        theta: 0,
        d: 0.15,
        a: 0,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
  {
    id: 'puma_560',
    name: 'PUMA 560 (6-DOF Spherical Wrist)',
    description: 'Gold standard 6R articulated robot benchmark with orthogonal intersecting wrist axes satisfying Pieper criterion.',
    dof: 6,
    convention: 'standard',
    joints: [
      {
        name: 'Joint 1 (Waist)',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0.6718,
        a: 0,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 2 (Shoulder)',
        index: 1,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.4318,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 3 (Elbow)',
        index: 2,
        type: 'revolute',
        theta: 0,
        d: 0.15005,
        a: 0.0203,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 4 (Wrist Roll)',
        index: 3,
        type: 'revolute',
        theta: 0,
        d: 0.4318,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 5 (Wrist Bend)',
        index: 4,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 6 (Tool Flange)',
        index: 5,
        type: 'revolute',
        theta: 0,
        d: 0.0565,
        a: 0,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
  {
    id: 'stanford_arm',
    name: 'Stanford Manipulator (RRP-RRR)',
    description: 'Pioneering 6-DOF manipulator with 2 revolute base joints, 1 prismatic extension arm, and 3-DOF spherical wrist.',
    dof: 6,
    convention: 'standard',
    joints: [
      {
        name: 'Joint 1 (Base Yaw)',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0.412,
        a: 0,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 2 (Shoulder Pitch)',
        index: 1,
        type: 'revolute',
        theta: 0,
        d: 0.154,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI / 2,
        max: Math.PI / 2,
        home: 0,
      },
      {
        name: 'Joint 3 (Prismatic Boom)',
        index: 2,
        type: 'prismatic',
        theta: 0,
        d: 0.3,
        a: 0,
        alpha: 0,
        offset: 0,
        min: 0.1,
        max: 0.7,
        home: 0.3,
      },
      {
        name: 'Joint 4 (Wrist Roll)',
        index: 3,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 5 (Wrist Pitch)',
        index: 4,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI / 2,
        max: Math.PI / 2,
        home: 0,
      },
      {
        name: 'Joint 6 (Wrist Yaw)',
        index: 5,
        type: 'revolute',
        theta: 0,
        d: 0.263,
        a: 0,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
  {
    id: 'industrial_6r',
    name: 'Industrial 6R (Modern Anthropomorphic)',
    description: 'Standard modern 6-axis industrial articulated robot geometry (ABB IRB / Fanuc / Kuka architecture).',
    dof: 6,
    convention: 'standard',
    joints: [
      {
        name: 'Axis 1 (Base)',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0.4,
        a: 0.15,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Axis 2 (Shoulder)',
        index: 1,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.45,
        alpha: 0,
        offset: 0,
        min: -Math.PI * 0.6,
        max: Math.PI * 0.6,
        home: 0,
      },
      {
        name: 'Axis 3 (Elbow)',
        index: 2,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0.1,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI * 0.8,
        max: Math.PI * 0.8,
        home: 0,
      },
      {
        name: 'Axis 4 (Wrist Roll)',
        index: 3,
        type: 'revolute',
        theta: 0,
        d: 0.4,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Axis 5 (Wrist Bend)',
        index: 4,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI * 0.7,
        max: Math.PI * 0.7,
        home: 0,
      },
      {
        name: 'Axis 6 (Flange)',
        index: 5,
        type: 'revolute',
        theta: 0,
        d: 0.1,
        a: 0,
        alpha: 0,
        offset: 0,
        min: -Math.PI * 2,
        max: Math.PI * 2,
        home: 0,
      },
    ],
  },
  {
    id: 'redundant_7r',
    name: '7-DOF Redundant Manipulator',
    description: 'Human-like 7-axis kinematic arm with nullspace self-motion allowing elbow swivel while holding end-effector pose fixed.',
    dof: 7,
    convention: 'standard',
    joints: [
      {
        name: 'Joint 1 (Shoulder Roll)',
        index: 0,
        type: 'revolute',
        theta: 0,
        d: 0.36,
        a: 0,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 2 (Shoulder Pitch)',
        index: 1,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI * 0.7,
        max: Math.PI * 0.7,
        home: 0,
      },
      {
        name: 'Joint 3 (Shoulder Yaw)',
        index: 2,
        type: 'revolute',
        theta: 0,
        d: 0.42,
        a: 0,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 4 (Elbow)',
        index: 3,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI * 0.7,
        max: Math.PI * 0.7,
        home: 0,
      },
      {
        name: 'Joint 5 (Wrist Yaw)',
        index: 4,
        type: 'revolute',
        theta: 0,
        d: 0.4,
        a: 0,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        name: 'Joint 6 (Wrist Pitch)',
        index: 5,
        type: 'revolute',
        theta: 0,
        d: 0,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI * 0.7,
        max: Math.PI * 0.7,
        home: 0,
      },
      {
        name: 'Joint 7 (Tool Roll)',
        index: 6,
        type: 'revolute',
        theta: 0,
        d: 0.126,
        a: 0,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
];

/**
 * Creates a complete RobotDefinition from a DHPreset
 */
export function createRobotFromPreset(preset: DHPreset): RobotDefinition {
  const joints: JointDefinition[] = preset.joints.map((j, idx) => ({
    ...j,
    id: `${preset.id}_j${idx + 1}`,
    index: idx,
  }));

  const links: LinkDefinition[] = [
    { id: `${preset.id}_base`, name: 'Base', index: 0 },
    ...joints.map((_j, idx) => ({
      id: `${preset.id}_link${idx + 1}`,
      name: `Link ${idx + 1}`,
      index: idx + 1,
    })),
  ];

  return {
    id: preset.id,
    name: preset.name,
    dof: joints.length,
    dhConvention: preset.convention,
    joints,
    links,
  };
}

/**
 * The Master DH Kinematics Analysis Engine
 * Calculates all forward kinematic outputs, step matrices, cumulative transforms,
 * 6-DOF end-effector pose, multiple Euler angle representations, unit quaternion,
 * geometric Jacobian, condition number, manipulability, and reach metrics.
 */
export function computeDHAnalysis(
  robot: RobotDefinition,
  q: number[],
  existingJacobian?: import('../../data/schema/robotSchema').JacobianResult
): DHAnalysisResult {
  const n = robot.joints.length;
  // Guard joint coordinates
  const safeQ = robot.joints.map((j, idx) => (idx < q.length && Number.isFinite(q[idx]) ? q[idx] : j.home ?? 0));

  // 1. Authoritative Forward Kinematics
  const fk = forwardKinematics(robot, safeQ);

  // 2. Per-joint breakdown
  const perJointBreakdown: DHPerJointBreakdown[] = [];
  for (let i = 0; i < n; i++) {
    const joint = robot.joints[i];
    const jointQ = safeQ[i];
    const evaluated = evaluateJointDH(joint, jointQ);
    const A = fk.A[i] ?? Matrix4.identity();
    const T = fk.T[i] ?? Matrix4.identity();
    const origin = fk.origins[i + 1] ?? T.getPosition();
    const rot = T.getRotation();

    perJointBreakdown.push({
      index: i + 1,
      name: joint.name,
      type: joint.type,
      activeQ: jointQ,
      evaluated,
      A,
      T,
      origin,
      xAxis: rot.getCol(0),
      yAxis: rot.getCol(1),
      zAxis: rot.getCol(2),
    });
  }

  // 3. End-Effector 6-DOF Analysis
  const eePos = fk.endEffectorTransform.getPosition();
  const posNorm = eePos.norm();
  const eeRot = fk.endEffectorTransform.getRotation();
  const rotDet = eeRot.determinant();

  // Orthogonality check: R * R^T - I ~ 0
  const Rt = eeRot.transpose();
  const identityCheck = eeRot.multiply(Rt);
  const isOrthogonal = Math.abs(identityCheck.get(0, 0) - 1) < 1e-4 &&
    Math.abs(identityCheck.get(1, 1) - 1) < 1e-4 &&
    Math.abs(identityCheck.get(2, 2) - 1) < 1e-4 &&
    Math.abs(rotDet - 1) < 1e-4;

  const nCol = eeRot.getCol(0);
  const sCol = eeRot.getCol(1);
  const aCol = eeRot.getCol(2);

  // Euler conversions: XYZ, ZYX, ZYZ
  const eulerXYZ = fk.endEffectorTransform.getEuler('XYZ');
  const eulerZYX = fk.endEffectorTransform.getEuler('ZYX');
  const eulerZYZ = fk.endEffectorTransform.getEuler('ZYZ');

  // Quaternion
  const quat = Quaternion.fromRotationMatrix(eeRot);
  const quatNorm = Math.sqrt(quat.w * quat.w + quat.x * quat.x + quat.y * quat.y + quat.z * quat.z);

  const endEffector: DHEndEffectorAnalysis = {
    position: {
      x: eePos.x,
      y: eePos.y,
      z: eePos.z,
      norm: posNorm,
      xMm: eePos.x * 1000,
      yMm: eePos.y * 1000,
      zMm: eePos.z * 1000,
      normMm: posNorm * 1000,
    },
    rotationMatrix: eeRot,
    rotationDeterminant: rotDet,
    isOrthogonal,
    columns: {
      n: nCol,
      s: sCol,
      a: aCol,
    },
    eulerXYZ: {
      rad: [eulerXYZ.a, eulerXYZ.b, eulerXYZ.c],
      deg: [eulerXYZ.a * RAD_TO_DEG, eulerXYZ.b * RAD_TO_DEG, eulerXYZ.c * RAD_TO_DEG],
    },
    eulerZYX: {
      rad: [eulerZYX.a, eulerZYX.b, eulerZYX.c],
      deg: [eulerZYX.a * RAD_TO_DEG, eulerZYX.b * RAD_TO_DEG, eulerZYX.c * RAD_TO_DEG],
    },
    eulerZYZ: {
      rad: [eulerZYZ.a, eulerZYZ.b, eulerZYZ.c],
      deg: [eulerZYZ.a * RAD_TO_DEG, eulerZYZ.b * RAD_TO_DEG, eulerZYZ.c * RAD_TO_DEG],
    },
    quaternion: {
      w: quat.w,
      x: quat.x,
      y: quat.y,
      z: quat.z,
      norm: quatNorm,
    },
  };

  // 4. Geometric Jacobian & Singularity Analysis
  const jacobianRes = existingJacobian ?? computeGeometricJacobian(robot, safeQ, fk);
  const isPositionOnlyArm = n <= 3;
  const taskRows = isPositionOnlyArm ? Math.min(3, n) : Math.min(6, n);
  const activeSingularValues = jacobianRes.singularValues.slice(0, taskRows);

  const jacobian: DHJacobianAnalysis = {
    matrix: jacobianRes.J,
    linearPart: jacobianRes.J.slice(0, 3),
    angularPart: jacobianRes.J.slice(3, 6),
    rank: jacobianRes.rank,
    conditionNumber: jacobianRes.conditionNumber,
    manipulability: jacobianRes.manipulability,
    singularValues: activeSingularValues,
    isSingular: jacobianRes.isSingular,
    taskRows,
  };

  // 5. Reach Analysis
  let maxTheoreticalReachM = 0;
  for (const j of robot.joints) {
    if (j.type === 'revolute') {
      maxTheoreticalReachM += Math.abs(j.a) + Math.abs(j.d);
    } else {
      maxTheoreticalReachM += Math.abs(j.a) + Math.abs(j.max);
    }
  }
  if (maxTheoreticalReachM < 1e-4) maxTheoreticalReachM = 0.001;

  const currentDistanceM = posNorm;
  const extensionRatio = Math.min(1.0, currentDistanceM / maxTheoreticalReachM);

  const reach: DHReachAnalysis = {
    maxTheoreticalReachM,
    maxTheoreticalReachMm: maxTheoreticalReachM * 1000,
    currentDistanceM,
    currentDistanceMm: currentDistanceM * 1000,
    extensionRatio,
  };

  return {
    robot,
    q: safeQ,
    fk,
    perJointBreakdown,
    endEffector,
    jacobian,
    reach,
  };
}

/**
 * Direct Inverse Kinematics target solving on this DH chain
 */
export function solveDHInverseKinematics(
  robot: RobotDefinition,
  targetPos: { x: number; y: number; z: number },
  targetEuler?: { roll: number; pitch: number; yaw: number; order?: 'XYZ' | 'ZYX' | 'ZYZ' },
  currentQ?: number[]
): IKPipelineResult {
  const eulerOrder = targetEuler?.order ?? 'XYZ';
  const rx = targetEuler?.roll ?? 0;
  const ry = targetEuler?.pitch ?? 0;
  const rz = targetEuler?.yaw ?? 0;

  const euler = new Euler(rx, ry, rz, eulerOrder);
  const rot3 = euler.toRotationMatrix();
  const targetMat = Matrix4.fromRotationTranslation(
    rot3,
    new Vector3(targetPos.x, targetPos.y, targetPos.z)
  );

  const res = solveIK(robot, targetMat, {
    currentJoints: currentQ,
    returnAllBranches: true,
  });

  return {
    ...res,
    bestSolution: res.bestSolution ?? res.solutions[0] ?? null,
  };
}

/**
 * Formats DH table into a CSV string
 */
export function exportDHToCSV(robot: RobotDefinition, q: number[], useSI: boolean): string {
  const headers = ['Joint', 'Type', 'theta', 'd', 'a', 'alpha', 'offset', 'min_limit', 'max_limit', 'q_active'];
  const rows = robot.joints.map((j, idx) => {
    const isRev = j.type === 'revolute';
    const curQ = q[idx] ?? 0;
    const active = evaluateJointDH(j, curQ);
    const th = useSI ? active.theta : active.theta * RAD_TO_DEG;
    const d = useSI ? active.d : active.d * 1000;
    const a = useSI ? active.a : active.a * 1000;
    const al = useSI ? active.alpha : active.alpha * RAD_TO_DEG;
    const off = isRev ? (useSI ? j.offset : j.offset * RAD_TO_DEG) : (useSI ? j.offset : j.offset * 1000);
    const min = useSI ? j.min : isRev ? j.min * RAD_TO_DEG : j.min * 1000;
    const max = useSI ? j.max : isRev ? j.max * RAD_TO_DEG : j.max * 1000;
    const actQ = isRev ? (useSI ? curQ : curQ * RAD_TO_DEG) : (useSI ? curQ : curQ * 1000);

    return [
      `"${j.name}"`,
      j.type,
      th.toFixed(4),
      d.toFixed(4),
      a.toFixed(4),
      al.toFixed(4),
      off.toFixed(4),
      min.toFixed(2),
      max.toFixed(2),
      actQ.toFixed(4),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Formats DH table into a publication-ready LaTeX tabular environment
 */
export function exportDHToLaTeX(robot: RobotDefinition, q: number[], useSI: boolean): string {
  const isRevUnit = useSI ? '\\text{rad}' : '^\\circ';
  const isLenUnit = useSI ? '\\text{m}' : '\\text{mm}';

  const rows = robot.joints.map((j, idx) => {
    const isRev = j.type === 'revolute';
    const curQ = q[idx] ?? 0;
    const active = evaluateJointDH(j, curQ);
    const th = useSI ? active.theta : active.theta * RAD_TO_DEG;
    const d = useSI ? active.d : active.d * 1000;
    const a = useSI ? active.a : active.a * 1000;
    const al = useSI ? active.alpha : active.alpha * RAD_TO_DEG;
    const typeStr = isRev ? 'R' : 'P';
    const thStr = isRev ? `${th.toFixed(2)}^\\ast` : `${th.toFixed(2)}`;
    const dStr = !isRev ? `${d.toFixed(2)}^\\ast` : `${d.toFixed(2)}`;
    return `${idx + 1} & ${typeStr} & ${thStr}${isRevUnit} & ${dStr}${isLenUnit} & ${a.toFixed(2)}${isLenUnit} & ${al.toFixed(2)}${isRevUnit} \\\\`;
  });

  const conventionStr = robot.dhConvention === 'modified' ? 'Modified DH (Craig)' : 'Standard DH';
  return [
    `% DH Parameters for ${robot.name} (${conventionStr})`,
    '\\begin{table}[htbp]',
    '\\centering',
    '\\begin{tabular}{c c r r r r}',
    '\\hline',
    `Joint & Type & $\\theta_i$ & $d_i$ & $a_i$ & $\\alpha_i$ \\\\`,
    '\\hline',
    ...rows,
    '\\hline',
    '\\end{tabular}',
    `\\caption{Kinematic parameters for ${robot.name} (${conventionStr} convention; $\\ast$ indicates joint variable)}`,
    `\\label{tab:dh_${robot.id}}`,
    '\\end{table}',
  ].join('\n');
}

/**
 * Formats DH table and kinematic simulation result into Markdown table
 */
export function exportDHToMarkdown(robot: RobotDefinition, q: number[], useSI: boolean): string {
  const angUnit = useSI ? 'rad' : 'deg';
  const lenUnit = useSI ? 'm' : 'mm';

  const header = `| Joint | Type | q (${angUnit}/${lenUnit}) | θ (${angUnit}) | d (${lenUnit}) | a (${lenUnit}) | α (${angUnit}) | Offset | Min | Max |`;
  const divider = '| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |';

  const rows = robot.joints.map((j, idx) => {
    const isRev = j.type === 'revolute';
    const curQ = q[idx] ?? 0;
    const active = evaluateJointDH(j, curQ);
    const th = useSI ? active.theta : active.theta * RAD_TO_DEG;
    const d = useSI ? active.d : active.d * 1000;
    const a = useSI ? active.a : active.a * 1000;
    const al = useSI ? active.alpha : active.alpha * RAD_TO_DEG;
    const actQ = isRev ? (useSI ? curQ : curQ * RAD_TO_DEG) : (useSI ? curQ : curQ * 1000);
    const off = isRev ? (useSI ? j.offset : j.offset * RAD_TO_DEG) : (useSI ? j.offset : j.offset * 1000);
    const min = useSI ? j.min : isRev ? j.min * RAD_TO_DEG : j.min * 1000;
    const max = useSI ? j.max : isRev ? j.max * RAD_TO_DEG : j.max * 1000;

    return `| ${j.name} | ${j.type.toUpperCase()} | **${actQ.toFixed(2)}** | ${th.toFixed(2)} | ${d.toFixed(2)} | ${a.toFixed(2)} | ${al.toFixed(2)} | ${off.toFixed(2)} | ${min.toFixed(1)} | ${max.toFixed(1)} |`;
  });

  return [
    `### DH Parameters: ${robot.name} (${robot.dhConvention.toUpperCase()} Convention)`,
    '',
    header,
    divider,
    ...rows,
  ].join('\n');
}

/**
 * Formats full kinematic analysis into comprehensive JSON
 */
export function exportDHToJSON(robot: RobotDefinition, q: number[]): string {
  const safeQ = robot.joints.map((j, idx) => (idx < q.length && Number.isFinite(q[idx]) ? q[idx] : j.home ?? 0));
  const analysis = computeDHAnalysis(robot, safeQ);
  const data = {
    robot: {
      id: robot.id,
      name: robot.name,
      dof: robot.dof,
      convention: robot.dhConvention,
    },
    joints: robot.joints.map((j, idx) => ({
      index: idx + 1,
      name: j.name,
      type: j.type,
      theta: j.theta,
      d: j.d,
      a: j.a,
      alpha: j.alpha,
      activeQ: safeQ[idx] ?? 0,
      evaluatedDH: analysis.perJointBreakdown[idx]?.evaluated,
      offset: j.offset,
      min: j.min,
      max: j.max,
      home: j.home,
    })),
    endEffector: {
      positionMeters: analysis.endEffector.position,
      rotationMatrix: analysis.endEffector.rotationMatrix.elements,
      eulerDeg: {
        XYZ: analysis.endEffector.eulerXYZ.deg,
        ZYX: analysis.endEffector.eulerZYX.deg,
        ZYZ: analysis.endEffector.eulerZYZ.deg,
      },
      quaternion: analysis.endEffector.quaternion,
    },
    jacobian: {
      rank: analysis.jacobian.rank,
      conditionNumber: analysis.jacobian.conditionNumber,
      manipulability: analysis.jacobian.manipulability,
      singularValues: analysis.jacobian.singularValues,
      isSingular: analysis.jacobian.isSingular,
    },
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Parses a JSON export or DH parameter specification back into a RobotDefinition
 */
export function parseDHFromJSON(jsonStr: string): Partial<RobotDefinition> | null {
  try {
    if (!jsonStr || typeof jsonStr !== 'string') return null;
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') return null;

    let rawJoints: any[] = [];
    if (Array.isArray(data.joints)) {
      rawJoints = data.joints;
    } else if (Array.isArray(data.robot?.joints)) {
      rawJoints = data.robot.joints;
    }

    if (rawJoints.length === 0) return null;

    const sanitizeNum = (val: any, fallback: number): number => {
      if (val === null || val === undefined) return fallback;
      const n = typeof val === 'number' ? val : parseFloat(val);
      return Number.isFinite(n) ? n : fallback;
    };

    const joints: JointDefinition[] = rawJoints.map((j: any, idx: number) => {
      const type: JointType = j.type === 'prismatic' ? 'prismatic' : 'revolute';
      const isPris = type === 'prismatic';

      const theta = sanitizeNum(
        j.theta,
        sanitizeNum(
          isPris
            ? j.evaluatedDH?.theta
            : (j.evaluatedDH?.theta !== undefined
                ? j.evaluatedDH.theta - (sanitizeNum(j.activeQ, 0) + sanitizeNum(j.offset, 0))
                : undefined),
          0
        )
      );

      const d = sanitizeNum(
        j.d,
        sanitizeNum(
          !isPris
            ? j.evaluatedDH?.d
            : (j.evaluatedDH?.d !== undefined
                ? j.evaluatedDH.d - (sanitizeNum(j.activeQ, 0) + sanitizeNum(j.offset, 0))
                : undefined),
          0
        )
      );

      const a = sanitizeNum(j.a, sanitizeNum(j.evaluatedDH?.a, 0));
      const alpha = sanitizeNum(j.alpha, sanitizeNum(j.evaluatedDH?.alpha, 0));
      const offset = sanitizeNum(j.offset, 0);

      let min = sanitizeNum(j.min, isPris ? 0 : -Math.PI);
      let max = sanitizeNum(j.max, isPris ? 0.5 : Math.PI);
      if (min > max) {
        const tmp = min;
        min = max;
        max = tmp;
      }
      const home = Math.max(min, Math.min(max, sanitizeNum(j.home, isPris ? 0.1 : 0)));

      return {
        id: (j.id && typeof j.id === 'string' ? j.id : `custom_j${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_'),
        name: j.name && typeof j.name === 'string' ? j.name : `Joint ${idx + 1}`,
        index: idx,
        type,
        theta,
        d,
        a,
        alpha,
        offset,
        min,
        max,
        home,
      };
    });

    if (joints.length === 0) return null;

    const convention: DHConvention =
      data.robot?.convention === 'modified' ||
      data.robot?.dhConvention === 'modified' ||
      data.dhConvention === 'modified'
        ? 'modified'
        : 'standard';

    const name = String(data.robot?.name || data.name || 'Imported DH Chain').trim();
    const id = String(data.robot?.id || data.id || 'imported_arm').replace(/[^a-zA-Z0-9_-]/g, '_');

    const links: LinkDefinition[] = [
      { id: `${id}_base`, name: 'Base', index: 0 },
      ...joints.map((_j, idx) => ({
        id: `${id}_link${idx + 1}`,
        name: `Link ${idx + 1}`,
        index: idx + 1,
      })),
    ];

    return {
      id,
      name,
      dof: joints.length,
      dhConvention: convention,
      joints,
      links,
    };
  } catch {
    return null;
  }
}
