import type { RobotDefinition } from '../../data/schema/robotSchema';
import { Matrix4 } from '../math/Matrix4';
import { computeFK } from '../kinematics/forwardKinematics';
import { POSITION_TOLERANCE, ORIENTATION_TOLERANCE } from '../math/constants';
import type { IKSingleSolution } from './types';
import { finalizeIKSolution } from './ikValidation';

/**
 * Checks if a 6-DOF robot possesses a spherical wrist.
 * A wrist is spherical if joint axes 4, 5, 6 intersect at a common point (wrist center).
 */
export function hasSphericalWrist(robot: RobotDefinition): boolean {
  if (robot.dof !== 6) return false;
  if (!robot.joints.every((j) => j.type === 'revolute')) return false;

  const j4 = robot.joints[3];
  const j5 = robot.joints[4];

  const a4NearZero = Math.abs(j4.a) < 0.05;
  const a5NearZero = Math.abs(j5.a) < 0.05;
  const d5NearZero = Math.abs(j5.d) < 0.05;

  const alpha4Perp = Math.abs(Math.abs(j4.alpha) - Math.PI / 2) < 0.2;
  const alpha5Perp = Math.abs(Math.abs(j5.alpha) - Math.PI / 2) < 0.2;

  return a4NearZero && a5NearZero && d5NearZero && alpha4Perp && alpha5Perp;
}

/**
 * Solves 3x3 linear system A * x = b via Gaussian elimination with partial pivoting.
 */
function solve3x3(A: number[][], b: number[]): [number, number, number] | null {
  const M: number[][] = [
    [A[0][0], A[0][1], A[0][2], b[0]],
    [A[1][0], A[1][1], A[1][2], b[1]],
    [A[2][0], A[2][1], A[2][2], b[2]],
  ];

  for (let col = 0; col < 3; col++) {
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-11) {
      M[col][col] += 1e-5; // subtle Levenberg damping
    } else if (maxRow !== col) {
      const tmp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = tmp;
    }

    let pivot = M[col][col];
    if (Math.abs(pivot) < 1e-11) {
      pivot = pivot >= 0 ? 1e-5 : -1e-5;
      M[col][col] = pivot;
    }

    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const factor = M[row][col] / pivot;
      for (let k = col; k <= 3; k++) {
        M[row][k] -= factor * M[col][k];
      }
    }
  }

  const x0 = Math.abs(M[0][0]) > 1e-12 ? M[0][3] / M[0][0] : 0;
  const x1 = Math.abs(M[1][1]) > 1e-12 ? M[1][3] / M[1][1] : 0;
  const x2 = Math.abs(M[2][2]) > 1e-12 ? M[2][3] / M[2][2] : 0;

  if (!Number.isFinite(x0) || !Number.isFinite(x1) || !Number.isFinite(x2)) {
    return null;
  }
  return [x0, x1, x2];
}

/**
 * Solves inverse kinematics for a 6R robot with a spherical wrist using
 * Pieper's kinematic decoupling method.
 *
 * 1. Position decoupling: Wrist Center p_w = p_target - d6 * R_target * [0,0,1]^T
 *    Solves 3-DOF arm (theta1, theta2, theta3) from 4 branch seeds (Shoulder L/R x Elbow U/D).
 * 2. Orientation decoupling: Wrist (theta4, theta5, theta6) matches R_target from 2 branches (Normal x Flipped).
 * Total 8 branches, each strictly validated with Forward Kinematics.
 */
export function solve6RSpherical(
  robot: RobotDefinition,
  target: Matrix4,
  currentJoints?: number[]
): IKSingleSolution[] {
  if (!hasSphericalWrist(robot)) return [];

  // Decouple tool/end-effector offset and base transform if present: T_chain = T_base^-1 * T_target * (T_offset)^-1
  let chainTarget = target;
  if (robot.endEffectorOffset) {
    chainTarget = chainTarget.multiply(robot.endEffectorOffset.rigidInverse());
  }
  if (robot.baseTransform) {
    chainTarget = robot.baseTransform.rigidInverse().multiply(chainTarget);
  }

  // Canonical chain robot stripped of external coordinate frame offsets for internal solves
  const chainRobot: RobotDefinition = (robot.baseTransform || robot.endEffectorOffset)
    ? { ...robot, baseTransform: undefined, endEffectorOffset: undefined }
    : robot;

  const chainTargetPos = chainTarget.getPosition();
  const chainTargetRot = chainTarget.getRotation();

  // 1. Decouple Wrist Center: p_w = p_chain - d6 * cos(alpha6) * z_chain
  const d6 = robot.joints[5].d;
  const alpha6 = robot.joints[5].alpha;
  const d6_proj = d6 * Math.cos(alpha6);
  const z_chain = chainTargetRot.getCol(2);
  const pw = chainTargetPos.subtract(z_chain.scale(d6_proj));

  // Compute 4 geometric branch seeds for (theta1, theta2, theta3)
  const baseGuess =
    currentJoints && currentJoints.length >= 3
      ? currentJoints.slice(0, 3)
      : robot.joints.slice(0, 3).map((j) => (j.home !== undefined ? j.home : (j.min + j.max) / 2));

  const t1_base = Math.atan2(pw.y, pw.x);
  const armSeeds: [number, number, number][] = [];
  if (currentJoints && currentJoints.length >= 3) {
    armSeeds.push([baseGuess[0], baseGuess[1], baseGuess[2]]);
  }
  armSeeds.push(
    // Branch 1: Shoulder Front, Elbow Up
    [t1_base, baseGuess[1], baseGuess[2]],
    // Branch 2: Shoulder Front, Elbow Down
    [t1_base, baseGuess[1], -baseGuess[2]],
    // Branch 3: Shoulder Back, Elbow Up
    [Math.atan2(-pw.y, -pw.x), -baseGuess[1], baseGuess[2]],
    // Branch 4: Shoulder Back, Elbow Down
    [Math.atan2(-pw.y, -pw.x), -baseGuess[1], -baseGuess[2]]
  );

  const solvedArmBranches: [number, number, number][] = [];

  // Solve each arm branch for p_w
  for (const seed of armSeeds) {
    let qArm = [...seed];
    let converged = false;

    for (let iter = 0; iter < 35; iter++) {
      const fk = computeFK(chainRobot, [qArm[0], qArm[1], qArm[2], 0, 0, 0]);
      // Frame 4 origin is the wrist center
      const currentPw = fk.origins[4];
      const dp = pw.subtract(currentPw);

      if (dp.norm() < 1e-5) {
        converged = true;
        break;
      }

      // Compute 3x3 position Jacobian for joints 1, 2, 3
      const delta = 1e-6;
      const Jp: number[][] = [[], [], []];
      for (let j = 0; j < 3; j++) {
        const qP = [...qArm];
        qP[j] += delta;
        const fkP = computeFK(chainRobot, [qP[0], qP[1], qP[2], 0, 0, 0]);
        const pP = fkP.origins[4];
        const deriv = pP.subtract(currentPw).scale(1 / delta);
        Jp[0].push(deriv.x);
        Jp[1].push(deriv.y);
        Jp[2].push(deriv.z);
      }

      const dq = solve3x3(Jp, [dp.x, dp.y, dp.z]);
      if (!dq) break;

      const maxArmStep = 0.5;
      const stepNorm = Math.max(Math.abs(dq[0]), Math.abs(dq[1]), Math.abs(dq[2]));
      if (stepNorm > maxArmStep) {
        dq[0] = (dq[0] / stepNorm) * maxArmStep;
        dq[1] = (dq[1] / stepNorm) * maxArmStep;
        dq[2] = (dq[2] / stepNorm) * maxArmStep;
      }

      qArm[0] += dq[0];
      qArm[1] += dq[1];
      qArm[2] += dq[2];
    }

    if (converged) {
      // Avoid duplicate arm branches
      const isDup = solvedArmBranches.some(
        (b) =>
          Math.abs(Math.atan2(Math.sin(b[0] - qArm[0]), Math.cos(b[0] - qArm[0]))) < 0.05 &&
          Math.abs(Math.atan2(Math.sin(b[1] - qArm[1]), Math.cos(b[1] - qArm[1]))) < 0.05 &&
          Math.abs(Math.atan2(Math.sin(b[2] - qArm[2]), Math.cos(b[2] - qArm[2]))) < 0.05
      );
      if (!isDup) {
        solvedArmBranches.push([qArm[0], qArm[1], qArm[2]]);
      }
    }
  }

  const solutions: IKSingleSolution[] = [];

  // For each arm position, solve wrist orientation (theta4, theta5, theta6)
  for (const [t1, t2, t3] of solvedArmBranches) {
    const fk3 = computeFK(chainRobot, [t1, t2, t3, 0, 0, 0]);
    const R03 = fk3.T[2].getRotation();
    const R36 = R03.transpose().multiply(chainTargetRot);

    // Initial analytical ZYZ wrist estimate
    const r13 = R36.get(0, 2);
    const r23 = R36.get(1, 2);
    const r33 = R36.get(2, 2);
    const s5 = Math.sqrt(Math.max(0, r13 * r13 + r23 * r23));

    const wristSeeds: [number, number, number][] = [];
    if (s5 < 1e-5) {
      // Wrist singularity: theta4 and theta6 are collinear
      const t4 = currentJoints && currentJoints.length >= 4 ? currentJoints[3] : 0;
      const t6 = Math.atan2(R36.get(1, 0), R36.get(0, 0)) - t4;
      wristSeeds.push([t4, 0, t6]);
    } else {
      // Branch A: Normal Wrist
      wristSeeds.push([
        Math.atan2(r23, r13),
        Math.atan2(s5, r33),
        Math.atan2(R36.get(2, 1), -R36.get(2, 0)),
      ]);
      // Branch B: Flipped Wrist
      wristSeeds.push([
        Math.atan2(-r23, -r13),
        Math.atan2(-s5, r33),
        Math.atan2(-R36.get(2, 1), R36.get(2, 0)),
      ]);
    }

    for (const [w4, w5, w6] of wristSeeds) {
      let q = [t1, t2, t3, w4, w5, w6];

      // Refine wrist orientation
      for (let iter = 0; iter < 30; iter++) {
        const fkCur = computeFK(chainRobot, q);
        const rotErr = fkCur.endEffectorTransform.getRotation().rotationError(chainTargetRot);
        if (rotErr.norm() < 1e-5) break;

        const delta = 1e-6;
        const Jw: number[][] = [[], [], []];
        for (let j = 3; j < 6; j++) {
          const qP = [...q];
          qP[j] += delta;
          const fkP = computeFK(chainRobot, qP);
          const eP = fkCur.endEffectorTransform
            .getRotation()
            .rotationError(fkP.endEffectorTransform.getRotation());
          Jw[0].push(eP.x / delta);
          Jw[1].push(eP.y / delta);
          Jw[2].push(eP.z / delta);
        }

        const dq = solve3x3(Jw, [rotErr.x, rotErr.y, rotErr.z]);
        if (!dq) break;

        const maxWristStep = 0.5;
        const wristStepNorm = Math.max(Math.abs(dq[0]), Math.abs(dq[1]), Math.abs(dq[2]));
        if (wristStepNorm > maxWristStep) {
          dq[0] = (dq[0] / wristStepNorm) * maxWristStep;
          dq[1] = (dq[1] / wristStepNorm) * maxWristStep;
          dq[2] = (dq[2] / wristStepNorm) * maxWristStep;
        }

        q[3] += dq[0];
        q[4] += dq[1];
        q[5] += dq[2];
      }

      // Check joint limits and select optimal 2k*pi representation closest to current joints
      const normalizedQ: number[] = [];

      for (let i = 0; i < 6; i++) {
        const rawAngle = q[i];
        const joint = robot.joints[i];
        const tol = 1e-5;
        const refAngle = currentJoints && Number.isFinite(currentJoints[i]) ? currentJoints[i] : (joint.home ?? 0);

        // Find equivalent representation q + 2*k*pi that stays within limits and is closest to reference
        const candidates: number[] = [];
        for (let k = -2; k <= 2; k++) {
          candidates.push(rawAngle + 2 * Math.PI * k);
        }

        const validCandidates = candidates.filter(
          (c) => c >= joint.min - tol && c <= joint.max + tol
        );

        let chosenAngle: number;
        if (validCandidates.length > 0) {
          validCandidates.sort((a, b) => Math.abs(a - refAngle) - Math.abs(b - refAngle));
          chosenAngle = Math.max(joint.min, Math.min(joint.max, validCandidates[0]));
        } else {
          // If outside limits, select representation closest to joint limits window
          candidates.sort((a, b) => {
            const distA = a < joint.min ? joint.min - a : a > joint.max ? a - joint.max : 0;
            const distB = b < joint.min ? joint.min - b : b > joint.max ? b - joint.max : 0;
            return distA - distB;
          });
          chosenAngle = candidates[0];
        }
        normalizedQ.push(chosenAngle);
      }

      // Universal Authoritative Validation & Dexterity Computation
      const solution = finalizeIKSolution(
        robot,
        normalizedQ,
        target,
        'analytical-6r',
        1,
        {
          positionTolerance: POSITION_TOLERANCE,
          orientationTolerance: ORIENTATION_TOLERANCE,
          currentJoints,
          requireJointLimits: true,
        }
      );

      solutions.push(solution);
    }
  }

  const validSolutions = solutions.filter((s) => s.converged && s.withinLimits);
  return validSolutions.length > 0 ? validSolutions : solutions;
}
