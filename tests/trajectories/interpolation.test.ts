import { describe, it, expect } from 'vitest';
import pumaJson from '../../src/data/robots/Puma560.json';
import { RobotDefinition } from '../../src/data/schema/robotSchema';
import { generateJointTrajectory } from '../../src/robotics/trajectories/jointTrajectory';
import { useRobotStore } from '../../src/state/robotStore';

describe('Trajectory Interpolation & Seeking Tests', () => {
  const pumaRobot = pumaJson as unknown as RobotDefinition;

  it('generates trajectory with correct boundary conditions', () => {
    const startQ = [0, 0, 0, 0, 0, 0];
    const goalQ = [0.5, 0.5, -0.5, 0.2, -0.2, 0.1];
    const duration = 2.0;

    const traj = generateJointTrajectory(pumaRobot, {
      startQ,
      goalQ,
      duration,
      profile: 'cubic',
      samples: 50,
    });

    expect(traj.duration).toBe(duration);
    expect(traj.positions.length).toBe(50);

    // Initial boundary: q(0) == startQ
    for (let j = 0; j < 6; j++) {
      expect(Math.abs(traj.positions[0][j] - startQ[j])).toBeLessThan(1e-4);
    }

    // Final boundary: q(T) == goalQ
    const lastIdx = traj.positions.length - 1;
    for (let j = 0; j < 6; j++) {
      expect(Math.abs(traj.positions[lastIdx][j] - goalQ[j])).toBeLessThan(1e-4);
    }
  });

  it('interpolates intermediate states linearly without NaN or jumps in seekTrajectory', () => {
    const store = useRobotStore.getState();
    store.setRobot(pumaRobot);

    const startQ = [0, 0, 0, 0, 0, 0];
    const goalQ = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    const duration = 2.0;

    const traj = generateJointTrajectory(pumaRobot, {
      startQ,
      goalQ,
      duration,
      profile: 'trapezoidal',
      samples: 20,
    });

    useRobotStore.setState({ activeTrajectory: traj });

    // Seek to midpoint (t = 1.0s)
    store.seekTrajectory(1.0);
    const midState = useRobotStore.getState();
    expect(midState.playback.currentTime).toBe(1.0);
    for (const val of midState.q) {
      expect(Number.isFinite(val)).toBe(true);
      expect(val).toBeGreaterThan(0.1);
      expect(val).toBeLessThan(0.9);
    }

    // Seek beyond boundary (clamps safely)
    store.seekTrajectory(5.0);
    const clampedEnd = useRobotStore.getState();
    expect(clampedEnd.playback.currentTime).toBe(2.0);

    // Seek before start (clamps safely to 0)
    store.seekTrajectory(-1.0);
    const clampedStart = useRobotStore.getState();
    expect(clampedStart.playback.currentTime).toBe(0.0);
  });
});
