import type { RobotDefinition } from '../../data/schema/robotSchema';
import { computeFK } from '../kinematics/forwardKinematics';
import { computeJacobian } from '../kinematics/jacobian';
import { evaluateScalarProfile } from './scalarProfiles';
import type { JointTrajectoryParams, TrajectoryDataset, TrajectoryState } from './types';

/**
 * Generate a complete sampled joint-space trajectory.
 */
export function generateJointTrajectory(
  robot: RobotDefinition,
  params: JointTrajectoryParams
): TrajectoryDataset {
  const { startQ, goalQ, duration, profile = 'quintic', samples = 100 } = params;
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
    failureReason: reason,
  });

  if (!Number.isFinite(duration) || duration <= 0) {
    return emptyDataset('Trajectory duration must be a positive finite number.');
  }
  if (!Number.isFinite(samples) || samples < 2) {
    return emptyDataset('Trajectory sample count must be an integer >= 2.');
  }
  const intSamples = Math.floor(samples);
  if (!Array.isArray(startQ) || !Array.isArray(goalQ) || startQ.length !== dof || goalQ.length !== dof) {
    return emptyDataset(`Start and goal joint vectors must match robot DOF (${dof}).`);
  }
  if (!startQ.every(Number.isFinite) || !goalQ.every(Number.isFinite)) {
    return emptyDataset('Start and goal joint coordinates must contain finite numbers.');
  }

  // Compute displacement deltas, avoiding discontinuities across +/-pi for revolute joints
  const tol = 1e-4;
  const deltas = new Array(dof);
  for (let j = 0; j < dof; j++) {
    const joint = robot.joints[j];
    let delta = goalQ[j] - startQ[j];
    if (joint && joint.type === 'revolute') {
      const shortestDiff = Math.atan2(Math.sin(delta), Math.cos(delta));
      const candidateTarget = startQ[j] + shortestDiff;
      const minVal = Math.min(startQ[j], candidateTarget);
      const maxVal = Math.max(startQ[j], candidateTarget);
      if (minVal >= joint.min - tol && maxVal <= joint.max + tol) {
        delta = shortestDiff;
      }
    }
    deltas[j] = delta;
  }

  const timeSteps: number[] = [];
  const positions: number[][] = [];
  const velocities: number[][] = [];
  const accelerations: number[][] = [];
  const endEffectorPositions = [];
  const endEffectorOrientations = [];
  const manipulabilities: number[] = [];
  const conditionNumbers: number[] = [];
  const states: TrajectoryState[] = [];

  const dt = duration / (intSamples - 1);

  for (let k = 0; k < intSamples; k++) {
    const t = k === intSamples - 1 ? duration : k * dt;
    const { s, sDot, sDdot } = evaluateScalarProfile(t, duration, profile);

    const q = new Array(dof);
    const qDot = new Array(dof);
    const qDdot = new Array(dof);

    for (let j = 0; j < dof; j++) {
      q[j] = startQ[j] + s * deltas[j];
      qDot[j] = sDot * deltas[j];
      qDdot[j] = sDdot * deltas[j];
    }

    // Authoritative forward kinematics and Jacobian
    const fk = computeFK(robot, q);
    const jac = computeJacobian(robot, q, fk);

    const pos = fk.endEffectorTransform.getPosition();
    const euler = fk.endEffectorPose.euler;

    timeSteps.push(t);
    positions.push(q);
    velocities.push(qDot);
    accelerations.push(qDdot);
    endEffectorPositions.push(pos);
    endEffectorOrientations.push(euler);
    manipulabilities.push(jac.manipulability);
    conditionNumbers.push(jac.conditionNumber);

    states.push({
      time: t,
      q,
      qDot,
      qDdot,
      endEffectorTransform: fk.endEffectorTransform,
      position: pos,
      euler,
      manipulability: jac.manipulability,
      conditionNumber: jac.conditionNumber,
      ikSuccess: true,
      positionError: 0,
      orientationError: 0,
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
    isValid: true,
    hasIKFailure: false,
  };
}
