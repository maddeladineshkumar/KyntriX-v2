import { Matrix4, Vector3, Euler, Quaternion } from '../math';
import type { RobotDefinition, FKResult, FrameInfo, Pose } from '../../data/schema/robotSchema';
import { computeDHTransform, evaluateJointDH } from '../dh/dhTransform';

/**
 * The ONE authoritative Forward Kinematics function for the entire application.
 * All UI displays, 3D viewport transforms, IK validators, and trajectories consume this result.
 */
export function forwardKinematics(robot: RobotDefinition, q: number[]): FKResult {
  const n = robot.joints.length;
  const A: Matrix4[] = [];
  const T: Matrix4[] = [];
  const frames: FrameInfo[] = [];
  const origins: Vector3[] = [];
  const axes: Vector3[] = [];
  const jointOrigins: Vector3[] = [];

  // Base frame T_0 (defaults to Identity unless robot specifies baseTransform)
  const baseT = robot.baseTransform ?? Matrix4.identity();
  frames.push({
    index: 0,
    name: 'Frame 0 (Base)',
    origin: baseT.getPosition(),
    xAxis: baseT.getRotation().getCol(0),
    yAxis: baseT.getRotation().getCol(1),
    zAxis: baseT.getRotation().getCol(2),
    matrix: baseT.clone(),
  });
  origins.push(baseT.getPosition());

  let currentT = baseT.clone();

  for (let i = 0; i < n; i++) {
    const joint = robot.joints[i];
    const jointQ = q[i] ?? 0;

    // Relative transform A_{i}
    const Ai = computeDHTransform(joint, jointQ, robot.dhConvention);
    A.push(Ai);

    if (robot.dhConvention === 'modified') {
      // In Modified DH (Craig): A_i = RotX(alpha_{i-1}) * TransX(a_{i-1}) * RotZ(theta_i) * TransZ(d_i)
      // The joint variable acts around/along the transformed Z axis after RotX(alpha_{i-1}) and TransX(a_{i-1}):
      // T_pre = currentT * RotX(alpha_{i-1}) * TransX(a_{i-1})
      const params = evaluateJointDH(joint, jointQ);
      const ca = Math.cos(params.alpha);
      const sa = Math.sin(params.alpha);
      const Tx = new Matrix4([
        1, 0,   0,   params.a,
        0, ca, -sa,  0,
        0, sa,  ca,  0,
        0, 0,   0,   1,
      ]);
      const Tpre = currentT.multiply(Tx);
      axes.push(Tpre.getRotation().getCol(2));
      jointOrigins.push(Tpre.getPosition());
    } else {
      // Standard DH: joint axis is z_{i-1} passing through frame i-1 origin
      axes.push(currentT.getRotation().getCol(2));
      jointOrigins.push(currentT.getPosition());
    }

    // Cumulative transform T_{0i} = T_{0, i-1} * A_i
    currentT = currentT.multiply(Ai);
    T.push(currentT.clone());

    const origin = currentT.getPosition();
    origins.push(origin);

    frames.push({
      index: i + 1,
      name: 'Frame ' + (i + 1),
      origin: origin,
      xAxis: currentT.getRotation().getCol(0),
      yAxis: currentT.getRotation().getCol(1),
      zAxis: currentT.getRotation().getCol(2),
      matrix: currentT.clone(),
    });
  }

  // Final end-effector transform (apply endEffectorOffset if configured)
  let endEffectorT = currentT;
  if (robot.endEffectorOffset) {
    endEffectorT = currentT.multiply(robot.endEffectorOffset);
  }

  const rot = endEffectorT.getRotation();
  const endEffectorPose: Pose = {
    position: endEffectorT.getPosition(),
    rotation: rot,
    quaternion: Quaternion.fromRotationMatrix(rot),
    euler: Euler.fromRotationMatrix(rot, 'XYZ'),
  };

  return {
    robotId: robot.id,
    q: [...q],
    A,
    T,
    frames,
    origins,
    axes,
    jointOrigins,
    endEffectorPose,
    endEffectorTransform: endEffectorT.clone(),
  };
}

export const computeFK = forwardKinematics;
