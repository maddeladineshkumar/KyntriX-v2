import type { RobotDefinition } from '../../data/schema/robotSchema';
import { Matrix4 } from '../math/Matrix4';
import { Quaternion } from '../math/Quaternion';
import { computeFK } from '../kinematics/forwardKinematics';
import { computeJacobian } from '../kinematics/jacobian';
import { solveIK } from '../ik/ikPipeline';
import { evaluateScalarProfile } from './scalarProfiles';
import type { CartesianTrajectoryParams, TrajectoryDataset, TrajectoryState } from './types';

/**
 * Generate a Cartesian trajectory using linear position interpolation and quaternion SLERP,
 * tracked in joint space via continuous Inverse Kinematics.
 */
export function generateCartesianTrajectory(
  robot: RobotDefinition,
  params: CartesianTrajectoryParams
): TrajectoryDataset {
  const { startPose, goalPose, startQ, duration, profile = 'quintic', samples = 100 } = params;
  const dof = robot.dof;

  const p0 = startPose.getPosition();
  const pf = goalPose.getPosition();
  const q0 = Quaternion.fromRotationMatrix(startPose.getRotation());
  const qf = Quaternion.fromRotationMatrix(goalPose.getRotation());

  const timeSteps: number[] = [];
  const positions: number[][] = [];
  const velocities: number[][] = [];
  const accelerations: number[][] = [];
  const endEffectorPositions = [];
  const endEffectorOrientations = [];
  const manipulabilities: number[] = [];
  const conditionNumbers: number[] = [];
  const states: TrajectoryState[] = [];

  const dt = duration / (samples - 1);
  let currentQ = [...startQ];

  // 1. Solve joint positions at each time step
  for (let k = 0; k < samples; k++) {
    const t = k * dt;
    const { s } = evaluateScalarProfile(t, duration, profile);

    // Interpolate Cartesian position
    const p_t = p0.lerp(pf, s);

    // Interpolate Cartesian orientation via SLERP
    const q_rot = q0.slerp(qf, s);
    const R_t = q_rot.toRotationMatrix();

    // Homogeneous transformation at time t
    const T_t = Matrix4.fromRotationTranslation(R_t, p_t);

    // Solve IK seeded with previous configuration
    const ikResult = solveIK(robot, T_t, {
      initialGuess: currentQ,
      currentJoints: currentQ,
      maxIterations: 60,
    });

    if (ikResult.bestSolution) {
      currentQ = [...ikResult.bestSolution.q];
    }

    // Authoritative FK and Jacobian
    const fk = computeFK(robot, currentQ);
    const jac = computeJacobian(robot, currentQ, fk);

    timeSteps.push(t);
    positions.push(currentQ);
    endEffectorPositions.push(fk.endEffectorTransform.getPosition());
    endEffectorOrientations.push(fk.endEffectorPose.euler);
    manipulabilities.push(jac.manipulability);
    conditionNumbers.push(jac.conditionNumber);
  }

  // 2. Numerical differentiation for joint velocities and accelerations
  for (let k = 0; k < samples; k++) {
    const v = new Array(dof).fill(0);
    const a = new Array(dof).fill(0);

    if (k === 0) {
      for (let j = 0; j < dof; j++) {
        v[j] = (positions[1][j] - positions[0][j]) / dt;
        if (samples >= 3) {
          a[j] = (positions[2][j] - 2 * positions[1][j] + positions[0][j]) / (dt * dt);
        }
      }
    } else if (k === samples - 1) {
      for (let j = 0; j < dof; j++) {
        v[j] = (positions[samples - 1][j] - positions[samples - 2][j]) / dt;
        if (samples >= 3) {
          a[j] =
            (positions[samples - 1][j] - 2 * positions[samples - 2][j] + positions[samples - 3][j]) /
            (dt * dt);
        }
      }
    } else {
      for (let j = 0; j < dof; j++) {
        v[j] = (positions[k + 1][j] - positions[k - 1][j]) / (2 * dt);
        a[j] = (positions[k + 1][j] - 2 * positions[k][j] + positions[k - 1][j]) / (dt * dt);
      }
    }

    velocities.push(v);
    accelerations.push(a);

    states.push({
      time: timeSteps[k],
      q: positions[k],
      qDot: v,
      qDdot: a,
      endEffectorTransform: Matrix4.fromRotationTranslation(
        Quaternion.fromRotationMatrix(endEffectorOrientations[k].toRotationMatrix()).toRotationMatrix(),
        endEffectorPositions[k]
      ),
      position: endEffectorPositions[k],
      euler: endEffectorOrientations[k],
      manipulability: manipulabilities[k],
      conditionNumber: conditionNumbers[k],
    });
  }

  return {
    duration,
    timeSteps,
    positions,
    velocities,
    accelerations,
    endEffectorPositions,
    endEffectorOrientations,
    manipulabilities,
    conditionNumbers,
    states,
  };
}
