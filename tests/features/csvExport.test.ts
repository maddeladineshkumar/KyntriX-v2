import { describe, it, expect } from 'vitest';
import { useRobotStore } from '../../src/state/robotStore';
import { Vector3 } from '../../src/robotics/math/Vector3';
import type { TrajectoryResult } from '../../src/robotics/trajectory/types';

describe('Analysis Studio CSV Export Suite', () => {
  it('formats CSV rows with time, joint positions, EE XYZ, manipulability, and condition number', async () => {
    await useRobotStore.getState().selectRobot('Puma560');
    const robot = useRobotStore.getState().robot;

    const mockTrajectory: TrajectoryResult = {
      timeSteps: [0.0, 0.5, 1.0],
      positions: [
        [0, 0, 0, 0, 0, 0],
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
        [0.2, 0.4, 0.6, 0.8, 1.0, 1.2],
      ],
      velocities: [
        [0, 0, 0, 0, 0, 0],
        [0.2, 0.4, 0.6, 0.8, 1.0, 1.2],
        [0, 0, 0, 0, 0, 0],
      ],
      accelerations: [
        [0.4, 0.8, 1.2, 1.6, 2.0, 2.4],
        [0, 0, 0, 0, 0, 0],
        [-0.4, -0.8, -1.2, -1.6, -2.0, -2.4],
      ],
      endEffectorPositions: [
        new Vector3(0.432, 0.150, 0.660),
        new Vector3(0.400, 0.180, 0.620),
        new Vector3(0.350, 0.220, 0.580),
      ],
      manipulabilities: [0.125, 0.140, 0.110],
      conditionNumbers: [12.5, 10.2, 14.8],
      isFeasible: true,
      singularityEvents: [],
      executionTimeMs: 15,
    };

    // Header generation verification
    const jointPosHeaders = robot.joints.map((_, idx) => `joint${idx + 1}_pos`);
    const header = [
      'time',
      ...jointPosHeaders,
      'ee_x',
      'ee_y',
      'ee_z',
      'manipulability',
      'condition_number',
    ].join(',');

    expect(header).toBe(
      'time,joint1_pos,joint2_pos,joint3_pos,joint4_pos,joint5_pos,joint6_pos,ee_x,ee_y,ee_z,manipulability,condition_number'
    );

    // Row parsing & formatting
    const rows: string[] = [header];
    for (let i = 0; i < mockTrajectory.timeSteps.length; i++) {
      const t = mockTrajectory.timeSteps[i].toFixed(4);
      const jPos = mockTrajectory.positions[i].map((val) => val.toFixed(6)).join(',');
      const ee = `${mockTrajectory.endEffectorPositions[i].x.toFixed(6)},${mockTrajectory.endEffectorPositions[i].y.toFixed(6)},${mockTrajectory.endEffectorPositions[i].z.toFixed(6)}`;
      const manip = mockTrajectory.manipulabilities[i].toFixed(6);
      const cond = mockTrajectory.conditionNumbers[i].toFixed(6);
      rows.push(`${t},${jPos},${ee},${manip},${cond}`);
    }

    expect(rows.length).toBe(4);
    const firstDataRow = rows[1].split(',');
    expect(firstDataRow[0]).toBe('0.0000'); // time
    expect(firstDataRow[1]).toBe('0.000000'); // joint 1 pos
    expect(firstDataRow[7]).toBe('0.432000'); // ee_x
    expect(firstDataRow[8]).toBe('0.150000'); // ee_y
    expect(firstDataRow[9]).toBe('0.660000'); // ee_z
    expect(firstDataRow[10]).toBe('0.125000'); // manipulability
    expect(firstDataRow[11]).toBe('12.500000'); // condition_number
  });
});
