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

  const emptyDataset = (reason: string): TrajectoryDataset => ({
    duration: Math.max(0, Number.isFinite(duration) ? duration : 0),
    timeSteps: [],
    positions: [],
    velocities: [],
    accelerations: [],
    endEffectorPositions: [],
    endEffectorOrientations: [],
    manipulabilities: [],
    conditionNumbers: [],
    states: [],
    isValid: false,
    hasIKFailure: false,
    failedSampleIndices: [],
    failureReason: reason,
  });

  if (!Number.isFinite(duration) || duration <= 0) {
    return emptyDataset('Cartesian trajectory duration must be a positive finite number.');
  }
  if (!Number.isFinite(samples) || samples < 2) {
    return emptyDataset('Cartesian trajectory sample count must be an integer >= 2.');
  }
  const intSamples = Math.floor(samples);
  if (!Array.isArray(startQ) || startQ.length !== dof || !startQ.every(Number.isFinite)) {
    return emptyDataset(`Start joint vector must contain ${dof} finite coordinates.`);
  }
  if (!startPose || !goalPose) {
    return emptyDataset('Start and goal poses must be provided.');
  }
  for (let i = 0; i < 16; i++) {
    if (!Number.isFinite(startPose.elements[i]) || !Number.isFinite(goalPose.elements[i])) {
      return emptyDataset('Start or goal pose contains non-finite matrix values.');
    }
  }

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
  const fkTransforms: Matrix4[] = [];

  const ikSuccesses: boolean[] = [];
  const posErrors: number[] = [];
  const oriErrors: number[] = [];
  const failedSampleIndices: number[] = [];

  const dt = duration / (intSamples - 1);
  let currentQ = [...startQ];

  // 1. Solve joint positions at each time step
  for (let k = 0; k < intSamples; k++) {
    const t = k === intSamples - 1 ? duration : k * dt;
    const { s } = evaluateScalarProfile(t, duration, profile);

    // Interpolate Cartesian position
    const p_t = p0.lerp(pf, s);

    // Interpolate Cartesian orientation via SLERP
    const q_rot = q0.slerp(qf, s);
    const R_t = q_rot.toRotationMatrix();

    // Homogeneous transformation at time t
    const T_t = Matrix4.fromRotationTranslation(R_t, p_t);

    // Solve IK seeded with previous configuration (single-branch tracking along continuous path)
    const ikResult = solveIK(robot, T_t, {
      initialGuess: currentQ,
      currentJoints: currentQ,
      maxIterations: 30,
      returnAllBranches: false,
    });

    let sampleSuccess = false;
    let samplePosErr = Infinity;
    let sampleOriErr = Infinity;

    if (ikResult.bestSolution && ikResult.bestSolution.converged && ikResult.bestSolution.withinLimits) {
      sampleSuccess = true;
      currentQ = [...ikResult.bestSolution.q];
      samplePosErr = ikResult.bestSolution.positionError;
      sampleOriErr = ikResult.bestSolution.orientationError;
    } else {
      sampleSuccess = false;
      failedSampleIndices.push(k);
      if (ikResult.bestSolution && Array.isArray(ikResult.bestSolution.q) && ikResult.bestSolution.q.every(Number.isFinite)) {
        currentQ = [...ikResult.bestSolution.q];
        samplePosErr = ikResult.bestSolution.positionError;
        sampleOriErr = ikResult.bestSolution.orientationError;
      }
    }

    ikSuccesses.push(sampleSuccess);
    posErrors.push(samplePosErr);
    oriErrors.push(sampleOriErr);

    // Authoritative FK and Jacobian at current joint vector
    const fk = computeFK(robot, currentQ);
    const jac = computeJacobian(robot, currentQ, fk);

    timeSteps.push(t);
    positions.push([...currentQ]);
    fkTransforms.push(fk.endEffectorTransform.clone());
    endEffectorPositions.push(fk.endEffectorTransform.getPosition());
    endEffectorOrientations.push(fk.endEffectorPose.euler);
    manipulabilities.push(jac.manipulability);
    conditionNumbers.push(jac.conditionNumber);
  }

  // 2. Numerical differentiation for joint velocities and accelerations
  for (let k = 0; k < intSamples; k++) {
    const v = new Array(dof).fill(0);
    const a = new Array(dof).fill(0);

    const isCurValid = !failedSampleIndices.includes(k);
    if (isCurValid && intSamples >= 2) {
      if (k === 0 && !failedSampleIndices.includes(1)) {
        for (let j = 0; j < dof; j++) {
          v[j] = (positions[1][j] - positions[0][j]) / dt;
          if (intSamples >= 3 && !failedSampleIndices.includes(2)) {
            a[j] = (positions[2][j] - 2 * positions[1][j] + positions[0][j]) / (dt * dt);
          }
        }
      } else if (k === intSamples - 1 && !failedSampleIndices.includes(intSamples - 2)) {
        for (let j = 0; j < dof; j++) {
          v[j] = (positions[intSamples - 1][j] - positions[intSamples - 2][j]) / dt;
          if (intSamples >= 3 && !failedSampleIndices.includes(intSamples - 3)) {
            a[j] =
              (positions[intSamples - 1][j] - 2 * positions[intSamples - 2][j] + positions[intSamples - 3][j]) /
              (dt * dt);
          }
        }
      } else if (!failedSampleIndices.includes(k - 1) && !failedSampleIndices.includes(k + 1)) {
        for (let j = 0; j < dof; j++) {
          v[j] = (positions[k + 1][j] - positions[k - 1][j]) / (2 * dt);
          a[j] = (positions[k + 1][j] - 2 * positions[k][j] + positions[k - 1][j]) / (dt * dt);
        }
      }
    }

    velocities.push(v);
    accelerations.push(a);

    states.push({
      time: timeSteps[k],
      q: positions[k],
      qDot: v,
      qDdot: a,
      endEffectorTransform: fkTransforms[k],
      position: endEffectorPositions[k],
      euler: endEffectorOrientations[k],
      manipulability: manipulabilities[k],
      conditionNumber: conditionNumbers[k],
      ikSuccess: ikSuccesses[k],
      positionError: posErrors[k],
      orientationError: oriErrors[k],
    });
  }

  const hasIKFailure = failedSampleIndices.length > 0;
  const failureReason = hasIKFailure
    ? `Cartesian path unreachable: IK failed at ${failedSampleIndices.length} waypoint(s) (first failed sample #${failedSampleIndices[0]} at t=${timeSteps[failedSampleIndices[0]].toFixed(3)}s). The requested motion exceeds the robot's physical reach or joint limits.`
    : undefined;

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
    isValid: !hasIKFailure,
    hasIKFailure,
    failedSampleIndices,
    failureReason,
  };
}
