import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  class MockWebGLRenderer {
    domElement = document.createElement('canvas');
    setSize = vi.fn();
    setPixelRatio = vi.fn();
    render = vi.fn();
    dispose = vi.fn();
    shadowMap = { enabled: false, type: 0 };
  }
  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    enableDamping = true;
    dampingFactor = 0.05;
    target = { set: vi.fn() };
    update = vi.fn();
    dispose = vi.fn();
  },
}));

vi.mock('three/addons/controls/TransformControls.js', () => ({
  TransformControls: class {
    size = 0.75;
    space = 'world';
    addEventListener = vi.fn();
    attach = vi.fn();
    getHelper = vi.fn().mockImplementation(() => new THREE.Group());
    setMode = vi.fn();
    dispose = vi.fn();
  },
}));

import * as THREE from 'three';
import { useRobotStore } from '../../src/state/robotStore';
import { RobotScene } from '../../src/simulation/RobotScene';
import pumaJson from '../../src/data/robots/Puma560.json';
import kukaJson from '../../src/data/robots/KukaKR5.json';
import skeleton3RJson from '../../src/data/robots/skeleton_3R.json';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import * as robotsModule from '../../src/data/robots';
import { meshLoader } from '../../src/simulation/MeshLoader';

const pumaRobot = pumaJson as unknown as RobotDefinition;
const kukaRobot = kukaJson as unknown as RobotDefinition;
const robot3R = skeleton3RJson as unknown as RobotDefinition;

describe('Asynchronous Robot Loading & Race Condition Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useRobotStore.getState().setRobot(pumaRobot);
    useRobotStore.setState({ loadError: null, robotLoading: false });
  });

  it('ensures rapid model switching keeps the latest requested robot in robotStore', async () => {
    let resolvePuma: (r: RobotDefinition) => void;
    const pumaPromise = new Promise<RobotDefinition>((resolve) => {
      resolvePuma = resolve;
    });

    let resolveKuka: (r: RobotDefinition) => void;
    const kukaPromise = new Promise<RobotDefinition>((resolve) => {
      resolveKuka = resolve;
    });

    vi.spyOn(robotsModule, 'loadRobotById').mockImplementation((id: string) => {
      if (id === 'puma560') return pumaPromise;
      if (id === 'kuka-kr5') return kukaPromise;
      return Promise.resolve(robot3R);
    });

    const store = useRobotStore.getState();

    // Call 1: Start loading Puma (slow)
    const p1 = store.selectRobot('puma560');

    // Call 2: Rapidly switch to KUKA (fast)
    const p2 = store.selectRobot('kuka-kr5');

    // Kuka finishes FIRST
    resolveKuka!(kukaRobot);
    await p2;

    expect(useRobotStore.getState().robot.id).toBe(kukaRobot.id);

    // Now the earlier slow Puma load finishes LATER
    resolvePuma!(pumaRobot);
    await p1;

    // The store MUST NOT have reverted to Puma560!
    expect(useRobotStore.getState().robot.id).toBe(kukaRobot.id);
  });

  it('RobotScene ignores stale in-flight mesh loads and prevents orphaned meshes', async () => {
    const scene = new RobotScene();

    vi.spyOn(meshLoader, 'loadSTL').mockImplementation(async (meshFile: string) => {
      if (meshFile.toLowerCase().includes('puma')) {
        await new Promise((r) => setTimeout(r, 20));
      }
      return new THREE.BufferGeometry();
    });

    // Start load 1: Puma560 (slow async)
    const load1 = scene.loadRobot(pumaRobot);

    // Immediately start load 2: KUKA (fast async)
    const load2 = scene.loadRobot(kukaRobot);

    await load2;
    await load1;

    // Verify scene is not corrupted and can update pose cleanly
    const fk = useRobotStore.getState().fkResult;
    expect(() => scene.updatePose(fk)).not.toThrow();

    scene.dispose();
  });

  it('gracefully handles robot loading errors by recording loadError without crashing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(robotsModule, 'loadRobotById').mockRejectedValue(new Error('Network offline: mesh unavailable'));

    const store = useRobotStore.getState();
    await store.selectRobot('non-existent-robot');

    const state = useRobotStore.getState();
    expect(state.loadError).toContain('Network offline: mesh unavailable');
    expect(state.robotLoading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to switch robot:', expect.any(Error));
  });
});
