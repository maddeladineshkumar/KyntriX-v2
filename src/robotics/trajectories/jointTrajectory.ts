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

  for (let k = 0; k < samples; k++) {
    const t = k * dt;
    const { s, sDot, sDdot } = evaluateScalarProfile(t, duration, profile);

    const q = new Array(dof);
    const qDot = new Array(dof);
    const qDdot = new Array(dof);

    for (let j = 0; j < dof; j++) {
      const delta = goalQ[j] - startQ[j];
      q[j] = startQ[j] + s * delta;
      qDot[j] = sDot * delta;
      qDdot[j] = sDdot * delta;
    }

    // Kinematic analysis at q(t)
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
