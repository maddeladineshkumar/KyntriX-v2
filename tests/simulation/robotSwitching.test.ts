import { describe, it, expect, beforeEach } from 'vitest';
import { useRobotStore } from '../../src/state/robotStore';

describe('Robot Switching & State Lifecycle Tests', () => {
  beforeEach(async () => {
    await useRobotStore.getState().selectRobot('Puma560');
  });

  it('initializes default robot with valid state', () => {
    const state = useRobotStore.getState();
    expect(state.robot).toBeDefined();
    expect(state.robot.id).toBe('Puma560');
    expect(state.robot.dof).toBe(6);
    expect(state.q.length).toBe(6);
    expect(state.fkResult).toBeDefined();
    expect(state.jacobian).toBeDefined();
    expect(state.loadError).toBeNull();
  });

  it('switches between different robot architectures smoothly', async () => {
    const store = useRobotStore.getState();

    // Switch to ABB IRB 120
    await store.selectRobot('ABBIRB120');
    let state = useRobotStore.getState();
    expect(state.robot.id).toBe('ABBIRB120');
    expect(state.robot.dof).toBe(6);
    expect(state.q.length).toBe(6);
    expect(state.loadError).toBeNull();

    // Verify all joint values are finite
    for (const val of state.q) {
      expect(Number.isFinite(val)).toBe(true);
    }

    // Switch to Kuka KR5
    await store.selectRobot('KukaKR5');
    state = useRobotStore.getState();
    expect(state.robot.id).toBe('KukaKR5');
    expect(state.robot.dof).toBe(6);
    expect(state.loadError).toBeNull();

    // Switch back to Puma560
    await store.selectRobot('Puma560');
    state = useRobotStore.getState();
    expect(state.robot.id).toBe('Puma560');
    expect(state.loadError).toBeNull();
  });

  it('updates FK and targetPose after robot change', async () => {
    const store = useRobotStore.getState();
    await store.selectRobot('ABBIRB120');
    const state = useRobotStore.getState();

    const eePos = state.fkResult.endEffectorTransform.getPosition();
    expect(Number.isFinite(eePos.x)).toBe(true);
    expect(Number.isFinite(eePos.y)).toBe(true);
    expect(Number.isFinite(eePos.z)).toBe(true);

    const targetPos = state.targetPose.getPosition();
    expect(targetPos.equals(eePos, 1e-4)).toBe(true);
  });
});
