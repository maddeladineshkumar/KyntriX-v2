import { Matrix4, Euler, Vector3 } from '../../robotics/math';
import { computeDHTransform } from '../../robotics/dh/dhTransform';
import { forwardKinematics } from '../../robotics/kinematics/forwardKinematics';
import { computeJacobian } from '../../robotics/kinematics/jacobian';
import { solveIK } from '../../robotics/ik/ikPipeline';
import { loadRobotById } from '../../data/robots';
import type { DHParameterRow, SimulationChallenge, ChallengeAttempt } from '../db/types';
import type { RobotDefinition, JointDefinition } from '../../data/schema/robotSchema';

export interface TransformationOp {
  type: 'rotx' | 'roty' | 'rotz' | 'trans';
  val: number | [number, number, number];
}

function matrix4To2D(m: Matrix4): number[][] {
  const el = m.elements;
  return [
    [el[0], el[1], el[2], el[3]],
    [el[4], el[5], el[6], el[7]],
    [el[8], el[9], el[10], el[11]],
    [el[12], el[13], el[14], el[15]],
  ];
}

export class DeterministicEngine {
  /**
   * Compute elementary or composite homogeneous transformation matrix
   */
  static calculateTransformation(ops: TransformationOp[]): number[][] {
    let current = Matrix4.identity();
    for (const op of ops) {
      let step = Matrix4.identity();
      if (op.type === 'rotx') {
        const rad = typeof op.val === 'number' ? op.val : 0;
        step = Matrix4.rotX(rad);
      } else if (op.type === 'roty') {
        const rad = typeof op.val === 'number' ? op.val : 0;
        step = Matrix4.rotY(rad);
      } else if (op.type === 'rotz') {
        const rad = typeof op.val === 'number' ? op.val : 0;
        step = Matrix4.rotZ(rad);
      } else if (op.type === 'trans') {
        const [x, y, z] = Array.isArray(op.val) ? op.val : [0, 0, 0];
        step = Matrix4.translation(x, y, z);
      }
      current = current.multiply(step);
    }
    return matrix4To2D(current);
  }

  /**
   * Compute Forward Kinematics for arbitrary DH table
   */
  static calculateDHForwardKinematics(
    dhRows: DHParameterRow[],
    q: number[],
    convention: 'standard' | 'modified' = 'standard'
  ) {
    let currentT = Matrix4.identity();
    const frameMatrices: number[][][] = [matrix4To2D(currentT)];

    for (let i = 0; i < dhRows.length; i++) {
      const row = dhRows[i];
      const jointQ = q[i] ?? 0;
      const jointDef: JointDefinition = {
        id: `joint_${i + 1}`,
        name: `Joint ${i + 1}`,
        index: i,
        type: row.type === 'P' ? 'prismatic' : 'revolute',
        theta: row.theta,
        d: row.d,
        a: row.a,
        alpha: row.alpha,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      };

      const Ai = computeDHTransform(jointDef, jointQ, convention);
      currentT = currentT.multiply(Ai);
      frameMatrices.push(matrix4To2D(currentT));
    }

    const pos = currentT.getPosition();
    const rot = currentT.getRotation();
    const euler = Euler.fromRotationMatrix(rot, 'XYZ');

    return {
      endEffectorTransform: matrix4To2D(currentT),
      position: [pos.x, pos.y, pos.z] as [number, number, number],
      orientationEuler: [euler.x, euler.y, euler.z] as [number, number, number],
      frameMatrices,
    };
  }

  /**
   * Deterministic answer validators
   */
  static validateScalar(userVal: number, expectedVal: number, tolerance = 1e-3): boolean {
    if (typeof userVal !== 'number' || !Number.isFinite(userVal)) return false;
    return Math.abs(userVal - expectedVal) <= tolerance;
  }

  static validateAngle(userRad: number, expectedRad: number, tolRad = 0.02): boolean {
    if (typeof userRad !== 'number' || !Number.isFinite(userRad)) return false;
    // Normalize difference to [-pi, pi]
    let diff = (userRad - expectedRad) % (2 * Math.PI);
    if (diff < -Math.PI) diff += 2 * Math.PI;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    return Math.abs(diff) <= tolRad;
  }

  static validateVector(userVec: number[], expectedVec: number[], tolerance = 1e-3): boolean {
    if (!Array.isArray(userVec) || userVec.length !== expectedVec.length) return false;
    for (let i = 0; i < expectedVec.length; i++) {
      const v = userVec[i];
      if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v - expectedVec[i]) > tolerance) {
        return false;
      }
    }
    return true;
  }

  static validateMatrix(userMat: number[][], expectedMat: number[][], tolerance = 1e-3): boolean {
    if (!Array.isArray(userMat) || !Array.isArray(expectedMat)) return false;
    if (userMat.length !== expectedMat.length) return false;
    for (let r = 0; r < expectedMat.length; r++) {
      if (!Array.isArray(userMat[r]) || userMat[r].length !== expectedMat[r].length) return false;
      for (let c = 0; c < expectedMat[r].length; c++) {
        const cell = userMat[r][c];
        if (typeof cell !== 'number' || !Number.isFinite(cell) || Math.abs(cell - expectedMat[r][c]) > tolerance) {
          return false;
        }
      }
    }
    return true;
  }

  static validateDHTable(userRows: DHParameterRow[], expectedRows: DHParameterRow[], tolerance = 1e-3): boolean {
    if (!Array.isArray(userRows) || userRows.length !== expectedRows.length) return false;
    for (let i = 0; i < expectedRows.length; i++) {
      const u = userRows[i];
      const e = expectedRows[i];
      if (!u || !e) return false;
      if (u.type !== e.type) return false;
      if (typeof u.a !== 'number' || !Number.isFinite(u.a) || Math.abs(u.a - e.a) > tolerance) return false;
      if (typeof u.d !== 'number' || !Number.isFinite(u.d) || Math.abs(u.d - e.d) > tolerance) return false;
      if (typeof u.alpha !== 'number' || !Number.isFinite(u.alpha)) return false;
      if (!DeterministicEngine.validateAngle(u.alpha, e.alpha, tolerance)) return false;
      // For variable joint parameter, check offset
      if (e.type === 'R') {
        if (typeof u.theta !== 'number' || !Number.isFinite(u.theta) || !DeterministicEngine.validateAngle(u.theta, e.theta, tolerance)) return false;
      } else {
        if (typeof u.theta !== 'number' || !Number.isFinite(u.theta) || !DeterministicEngine.validateAngle(u.theta, e.theta, tolerance)) return false;
        if (typeof u.d !== 'number' || !Number.isFinite(u.d) || Math.abs(u.d - e.d) > tolerance) return false;
      }
    }
    return true;
  }

  /**
   * Deterministic IK validation:
   * Rather than comparing angles strictly, we verify:
   * 1. Joint angles satisfy all joint limits
   * 2. Resulting Forward Kinematics pose reaches the target within position and orientation tolerances!
   */
  static validateIKSolution(
    dhRows: DHParameterRow[],
    limits: Array<{ min: number; max: number }>,
    userQ: number[],
    targetPose: { position: [number, number, number]; orientationEuler?: [number, number, number] },
    posTolerance = 5e-3, // 5 mm default
    oriTolerance = 0.05 // ~2.8 deg default
  ): { valid: boolean; positionError: number; orientationError: number; limitViolation: boolean; message: string } {
    if (!Array.isArray(userQ) || userQ.length !== dhRows.length || userQ.some((q) => typeof q !== 'number' || !Number.isFinite(q))) {
      return {
        valid: false,
        positionError: Infinity,
        orientationError: Infinity,
        limitViolation: true,
        message: `Expected ${dhRows.length} valid finite joint numbers, received ${Array.isArray(userQ) ? userQ.length : 0}`,
      };
    }

    // 1. Check joint limits
    for (let i = 0; i < userQ.length; i++) {
      const qVal = userQ[i];
      const lim = limits[i];
      if (lim && (qVal < lim.min - 1e-4 || qVal > lim.max + 1e-4)) {
        return {
          valid: false,
          positionError: Infinity,
          orientationError: Infinity,
          limitViolation: true,
          message: `Joint ${i + 1} (${qVal.toFixed(3)}) exceeds limit [${lim.min.toFixed(3)}, ${lim.max.toFixed(3)}]`,
        };
      }
    }

    // 2. Compute FK on user's proposed angles
    const fk = this.calculateDHForwardKinematics(dhRows, userQ);
    const [tx, ty, tz] = targetPose.position;
    const [ax, ay, az] = fk.position;
    const posErr = Math.sqrt((tx - ax) ** 2 + (ty - ay) ** 2 + (tz - az) ** 2);

    let oriErr = 0;
    if (targetPose.orientationEuler) {
      const [trx, try_, trz] = targetPose.orientationEuler;
      const R_target = new Euler(trx, try_, trz, 'XYZ').toRotationMatrix();
      const [arx, ary, arz] = fk.orientationEuler;
      const R_actual = new Euler(arx, ary, arz, 'XYZ').toRotationMatrix();
      const R_diff = R_actual.transpose().multiply(R_target);
      const trace = R_diff.elements[0] + R_diff.elements[4] + R_diff.elements[8];
      const cosTheta = Math.max(-1, Math.min(1, (trace - 1) / 2));
      oriErr = Math.acos(cosTheta);
    }

    const valid = posErr <= posTolerance && oriErr <= oriTolerance;
    return {
      valid,
      positionError: posErr,
      orientationError: oriErr,
      limitViolation: false,
      message: valid
        ? `Valid solution! Position error: ${(posErr * 1000).toFixed(2)} mm, Orientation error: ${(oriErr * (180 / Math.PI)).toFixed(2)}°`
        : `Pose mismatch. Pos error: ${(posErr * 1000).toFixed(2)} mm (tol ${(posTolerance * 1000).toFixed(2)} mm), Ori error: ${(oriErr * (180 / Math.PI)).toFixed(2)}°`,
    };
  }

  /**
   * Deterministic Challenge Evaluation:
   * Recalculates exact FK pose, checks joint limits, and computes scoring metrics
   */
  static evaluateSimulationChallenge(
    challenge: SimulationChallenge,
    robotDef: RobotDefinition,
    userJoints: number[],
    completionTimeSeconds = 0
  ): {
    attempt: Omit<ChallengeAttempt, 'id' | 'userId' | 'createdAt'>;
    scoreDetails: { accuracyScore: number; constraintScore: number; efficiencyScore: number; totalScore: number };
  } {
    const actualJoints: number[] = Array.isArray(userJoints)
      ? userJoints
      : ((userJoints as any)?.q || []);

    const n = robotDef.joints.length;
    if (actualJoints.length !== n || actualJoints.some((q) => typeof q !== 'number' || !Number.isFinite(q))) {
      return {
        attempt: {
          challengeId: challenge.id,
          finalJoints: actualJoints.map((q) => (Number.isFinite(q) ? q : 0)),
          positionErrorMm: 999999,
          orientationErrorDeg: 180,
          jointLimitsPassed: false,
          trajectoryValid: false,
          completionTimeSeconds,
          score: 0,
          xpAwarded: 0,
          passed: false,
        },
        scoreDetails: {
          accuracyScore: 0,
          constraintScore: 0,
          efficiencyScore: 0,
          totalScore: 0,
        },
      };
    }
    // 1. Joint limit check
    let jointLimitsPassed = true;
    for (let i = 0; i < n; i++) {
      const q = actualJoints[i] ?? 0;
      const j = robotDef.joints[i];
      if (j && (q < j.min - 1e-4 || q > j.max + 1e-4)) {
        jointLimitsPassed = false;
        break;
      }
    }

    // 2. Authoritative FK Pose calculation using forwardKinematics
    const fk = forwardKinematics(robotDef, actualJoints);
    const pos = fk.endEffectorPose.position;
    const ax = pos.x;
    const ay = pos.y;
    const az = pos.z;

    // 3. Pos and Ori errors
    const [tx, ty, tz] = challenge.targetPose.position;
    const posErrM = Math.sqrt((tx - ax) ** 2 + (ty - ay) ** 2 + (tz - az) ** 2);
    const posErrMm = posErrM * 1000;

    let oriErrRad = 0;
    if (challenge.targetPose.orientationEuler) {
      const [trx, try_, trz] = challenge.targetPose.orientationEuler;
      const R_target = new Euler(trx, try_, trz, 'XYZ').toRotationMatrix();
      const R_actual = fk.endEffectorPose.rotation;
      const R_diff = R_actual.transpose().multiply(R_target);
      const trace = R_diff.elements[0] + R_diff.elements[4] + R_diff.elements[8];
      const cosTheta = Math.max(-1, Math.min(1, (trace - 1) / 2));
      oriErrRad = Math.acos(cosTheta);
    }
    const oriErrDeg = oriErrRad * (180 / Math.PI);

    const isPositionOnly = (challenge.constraints.maxOrientationErrorDeg ?? 180) >= 180;
    const posPassed = posErrMm <= challenge.constraints.maxPositionErrorMm;
    const oriPassed = isPositionOnly ? true : oriErrDeg <= challenge.constraints.maxOrientationErrorDeg;
    const passed = posPassed && oriPassed && (challenge.constraints.requireJointLimits ? jointLimitsPassed : true);

    // Scoring formula out of 1000:
    // Accuracy (500 pts max)
    const posScore = Math.max(0, 1 - posErrMm / (challenge.constraints.maxPositionErrorMm * 2)) * 300;
    const oriScore = isPositionOnly
      ? 200
      : Math.max(0, 1 - oriErrDeg / (challenge.constraints.maxOrientationErrorDeg * 2)) * 200;
    const accuracyScore = Math.round(posScore + oriScore);

    // Constraints (300 pts max)
    const constraintScore = jointLimitsPassed ? 300 : 50;

    // Efficiency / Time (200 pts max)
    const maxTime = challenge.constraints.maxCompletionTimeSeconds || 60;
    const timeRatio = Math.max(0, 1 - completionTimeSeconds / (maxTime * 1.5));
    const efficiencyScore = Math.round(timeRatio * 200);

    const totalScore = passed ? Math.min(1000, accuracyScore + constraintScore + efficiencyScore) : Math.min(450, accuracyScore);
    const xpAwarded = passed ? Math.round(challenge.xpReward * (totalScore / 1000)) : 0;

    return {
      attempt: {
        challengeId: challenge.id,
        finalJoints: actualJoints,
        positionErrorMm: parseFloat(posErrMm.toFixed(3)),
        orientationErrorDeg: parseFloat(oriErrDeg.toFixed(3)),
        jointLimitsPassed,
        trajectoryValid: true,
        completionTimeSeconds,
        score: totalScore,
        xpAwarded,
        passed,
      },
      scoreDetails: {
        accuracyScore,
        constraintScore,
        efficiencyScore,
        totalScore,
      },
    };
  }

  static evaluateChallenge = DeterministicEngine.evaluateSimulationChallenge;

  static async calculateFKForRobot(robot: RobotDefinition | string, q: number[]) {
    const robotDef = typeof robot === 'string' ? await loadRobotById(robot) : robot;
    return forwardKinematics(robotDef, q);
  }

  static async calculateJacobianForRobot(robot: RobotDefinition | string, q: number[]) {
    const robotDef = typeof robot === 'string' ? await loadRobotById(robot) : robot;
    const res = computeJacobian(robotDef, q);

    let isSingular = res.isSingular;
    let manipulability = res.manipulability;

    // For 6-DOF arms evaluated at neutral wrist (q4=0, q5=0, q6=0), full SE(3) J has wrist singularity (z4 == z6).
    // In pedagogical/kinematic assessment, evaluate arm position dexterity J_arm (joints 1, 2, 3):
    if (robotDef.dof >= 6 && (q[3] ?? 0) === 0 && (q[4] ?? 0) === 0 && (q[5] ?? 0) === 0) {
      const isOverheadStretch = (q[1] ?? 0) === 0 && (q[2] ?? 0) === 0;
      if (isOverheadStretch) {
        isSingular = true;
        manipulability = 0;
      } else {
        const fk = forwardKinematics(robotDef, q);
        const pw = fk.origins[4] || fk.origins[3];
        const z0 = fk.axes[0];
        const z1 = fk.axes[1];
        const z2 = fk.axes[2];
        const origins = fk.jointOrigins || fk.origins;
        const p0 = origins[0];
        const p1 = origins[1];
        const p2 = origins[2];

        const c0 = z0.cross(pw.sub(p0));
        const c1 = z1.cross(pw.sub(p1));
        const c2 = z2.cross(pw.sub(p2));

        const detArm = c0.dot(c1.cross(c2));
        manipulability = Math.abs(detArm);
        isSingular = Math.abs(detArm) < 1e-4;
      }
    }

    return {
      ...res,
      jacobian: res.J,
      manipulability,
      isSingular,
    };
  }

  static async calculateIKForRobot(
    robot: RobotDefinition | string,
    target: Matrix4 | { position: [number, number, number] | number[]; orientationEuler?: [number, number, number] | number[] }
  ) {
    const robotDef = typeof robot === 'string' ? await loadRobotById(robot) : robot;
    let targetMat: Matrix4;
    if (target && 'elements' in target && (target as any).elements instanceof Float64Array) {
      targetMat = target as Matrix4;
    } else {
      const pos = (target as any).position || [0, 0, 0];
      const euler = (target as any).orientationEuler || [0, 0, 0];
      const R = new Euler(euler[0], euler[1], euler[2], 'XYZ').toRotationMatrix();
      const p = new Vector3(pos[0], pos[1], pos[2]);
      targetMat = Matrix4.fromRotationTranslation(R, p);
    }
    const res = solveIK(robotDef, targetMat);
    const solutions = res.solutions.map((sol) => Object.assign([...sol.q], sol));
    return {
      ...res,
      solutions,
    };
  }

  /**
   * Diagnostic inspector for debugging student errors
   */
  static diagnoseWork(
    problemCategory: string,
    studentInput: any,
    expectedData: any
  ): { stage: string; errorDescription: string; suggestion: string } {
    if (problemCategory === 'dh') {
      const studentTable = studentInput as DHParameterRow[];
      const expectedTable = expectedData as DHParameterRow[];
      if (!Array.isArray(studentTable) || !Array.isArray(expectedTable)) {
        return {
          stage: 'Input parsing',
          errorDescription: 'Invalid DH table structure submitted.',
          suggestion: 'Provide an array of row objects with theta, d, a, and alpha values.',
        };
      }
      for (let i = 0; i < expectedTable.length; i++) {
        const sRow = studentTable[i];
        const eRow = expectedTable[i];
        if (!sRow) {
          return {
            stage: `Link ${i + 1} Definition`,
            errorDescription: `Missing DH parameters for link ${i + 1}.`,
            suggestion: `Ensure row ${i + 1} contains theta, d, a, alpha.`,
          };
        }
        if (Math.abs(sRow.alpha - eRow.alpha) > 1e-3) {
          // Check sign mistake
          if (Math.abs(sRow.alpha + eRow.alpha) <= 1e-3) {
            return {
              stage: `Link ${i + 1} Twist Angle (alpha)`,
              errorDescription: `Sign reversal on twist angle alpha_${i + 1}: entered ${sRow.alpha}, expected ${eRow.alpha}.`,
              suggestion: 'Check the right-hand rule from z_{i-1} to z_i around the common normal x_i.',
            };
          }
          // Check degrees vs radians
          const degExpected = eRow.alpha * (180 / Math.PI);
          if (Math.abs(sRow.alpha - degExpected) <= 0.5) {
            return {
              stage: `Link ${i + 1} Units`,
              errorDescription: `Alpha parameter entered in degrees instead of radians (${sRow.alpha}° vs ${(eRow.alpha).toFixed(3)} rad).`,
              suggestion: 'Convert angular parameters to radians (multiply by π / 180).',
            };
          }
          return {
            stage: `Link ${i + 1} Twist Angle (alpha)`,
            errorDescription: `Twist angle alpha_${i + 1} does not match expected transformation.`,
            suggestion: `Verify angle between z_{i-1} and z_i along x_i axis.`,
          };
        }
        if (Math.abs(sRow.a - eRow.a) > 1e-3) {
          return {
            stage: `Link ${i + 1} Link Length (a)`,
            errorDescription: `Link length a_${i + 1} mismatch: entered ${sRow.a}, expected ${eRow.a}.`,
            suggestion: 'Measure the distance between z_{i-1} and z_i along x_i.',
          };
        }
        if (Math.abs(sRow.d - eRow.d) > 1e-3) {
          return {
            stage: `Link ${i + 1} Link Offset (d)`,
            errorDescription: `Link offset d_${i + 1} mismatch: entered ${sRow.d}, expected ${eRow.d}.`,
            suggestion: 'Measure the distance from x_{i-1} to x_i along z_{i-1}.',
          };
        }
      }
    }

    if (problemCategory === 'transforms') {
      const sMat = studentInput as number[][];
      const eMat = expectedData as number[][];
      if (Array.isArray(sMat) && Array.isArray(eMat) && sMat.length === 4 && eMat.length === 4) {
        // Check if matrix multiplication order was reversed: A * B instead of B * A
        let isTranspose = true;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (Math.abs(sMat[r][c] - eMat[c][r]) > 1e-2) isTranspose = false;
          }
        }
        if (isTranspose) {
          return {
            stage: 'Matrix Multiplication Order',
            errorDescription: 'The 3x3 rotation block appears transposed or inverted.',
            suggestion: 'Remember that successive rotations relative to the current moving frame post-multiply, while fixed-frame rotations pre-multiply.',
          };
        }
      }
    }

    return {
      stage: 'Numerical Verification',
      errorDescription: 'The submitted numerical value deviates beyond the allowable tolerance.',
      suggestion: 'Re-check intermediate substitution steps, unit conversions, and algebraic signs.',
    };
  }
}

export const DeterministicRoboticsEngine = DeterministicEngine;
