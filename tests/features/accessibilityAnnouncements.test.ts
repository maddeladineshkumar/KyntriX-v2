import { describe, it, expect, beforeEach } from 'vitest';
import { useRobotStore } from '../../src/state/robotStore';
import { Matrix4 } from '../../src/robotics/math';

describe('Accessibility Announcements & Simulation Hardening Suite', () => {
  beforeEach(async () => {
    await useRobotStore.getState().selectRobot('Puma560');
    useRobotStore.getState().resetToHome();
  });

  it('announces model selection when switching robots', async () => {
    await useRobotStore.getState().selectRobot('skeleton_3R');
    const state = useRobotStore.getState();
    expect(state.statusAnnouncement).toContain('Skeleton 3R (3 DOF) loaded successfully');
  });

  it('announces resetToHome', () => {
    useRobotStore.getState().resetToHome();
    const state = useRobotStore.getState();
    expect(state.statusAnnouncement).toBe('Robot reset to home configuration.');
  });

  it('announces emergencyStop, resetEStop, and resumeFromEStop', () => {
    const store = useRobotStore.getState();
    store.emergencyStop();
    expect(useRobotStore.getState().isEStopped).toBe(true);
    expect(useRobotStore.getState().statusAnnouncement).toContain('EMERGENCY STOP engaged');

    useRobotStore.getState().resetEStop();
    expect(useRobotStore.getState().isEStopped).toBe(false);
    expect(useRobotStore.getState().statusAnnouncement).toContain('Emergency stop cleared');

    useRobotStore.getState().emergencyStop();
    useRobotStore.getState().resumeFromEStop();
    expect(useRobotStore.getState().isEStopped).toBe(false);
    expect(useRobotStore.getState().statusAnnouncement).toContain('Resumed trajectory playback from emergency stop');
  });

  it('announces trajectory rewind and stop transport actions', () => {
    const store = useRobotStore.getState();
    const home = store.robot.joints.map((j) => j.home ?? 0);
    store.generateJointTraj(home, 1.0);

    store.rewindTrajectory();
    expect(useRobotStore.getState().statusAnnouncement).toContain('Trajectory rewound');

    store.stopTrajectory();
    expect(useRobotStore.getState().statusAnnouncement).toContain('Trajectory playback stopped');
  });

  it('never auto-plays an unreachable Cartesian trajectory that failed IK and announces failure', () => {
    const unreachableTarget = Matrix4.trans(100.0, 100.0, 100.0);

    useRobotStore.getState().generateCartesianTraj(unreachableTarget, 2.0);
    const state = useRobotStore.getState();

    expect(state.activeTrajectory).not.toBeNull();
    expect(state.activeTrajectory?.hasIKFailure).toBe(true);
    // Crucial: playback must NOT auto-play failed trajectory
    expect(state.playback.isPlaying).toBe(false);
    expect(state.statusAnnouncement).toContain('Cartesian trajectory failed');
  });
});
