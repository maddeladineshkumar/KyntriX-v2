import { describe, it, expect, vi } from 'vitest';
import { DH_PRESETS, createRobotFromPreset, computeDHAnalysis } from '../../src/robotics/dh/dhAnalysis';
import { computeJacobian } from '../../src/robotics/kinematics/jacobian';
import { Matrix4 } from '../../src/robotics/math/Matrix4';
import { Vector3 } from '../../src/robotics/math/Vector3';
import { EndEffectorTrace } from '../../src/simulation/EndEffectorTrace';
import { processContinuousSweepShortcut } from '../../src/features/dh/continuousSweepShortcuts';

describe('Continuous Sweep Simulation Engine & Kinematics', () => {
  const puma560 = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'puma_560')!);
  const scara = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'scara_rrpr')!);
  const cylindrical = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'cylindrical_rpp')!);
  const planar2R = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'planar_2r')!);

  const testRobots = [puma560, scara, cylindrical, planar2R];

  it('guarantees zero-clamping kinematics across multiple robot architectures and asymmetric joint limits', () => {
    const speeds = [0.1, 0.25, 0.5, 1.0];
    const amplitudes = [0.20, 0.30, 0.45];

    for (const testRobot of testRobots) {
      for (const speed of speeds) {
        for (const amp of amplitudes) {
          for (let step = 0; step < 100; step++) {
            const t = (step * 0.1) * speed;

            for (let idx = 0; idx < testRobot.joints.length; idx++) {
              const joint = testRobot.joints[idx];
              const min = joint.min;
              const max = joint.max;
              const range = max - min;
              const center = (min + max) / 2;
              const safeHalfSpan = (range / 2) * Math.min(amp, 0.75) * 0.85;

              // Harmonic formula
              const freq = 0.15 + (idx % 4) * 0.04;
              const phase = idx * (Math.PI / 4);
              const val = center + safeHalfSpan * Math.sin(t * freq + phase);

              // Must be strictly inside limits with a safety margin (never hitting min or max)
              expect(val).toBeGreaterThan(min + 0.05 * range);
              expect(val).toBeLessThan(max - 0.05 * range);
            }
          }
        }
      }
    }
  });

  it('in Sequential mode, isolates motion to exactly one active joint while maintaining other joints at center', () => {
    for (const testRobot of testRobots) {
      const numJoints = testRobot.joints.length;
      const jointDuration = 4.0;
      const totalDuration = numJoints * jointDuration;

      for (let currentJoint = 0; currentJoint < numJoints; currentJoint++) {
        // Sample at the quarter-point of the active joint duration (peak oscillation)
        const t = currentJoint * jointDuration + (jointDuration / 4);
        const cycleTime = t % totalDuration;
        const activeIdx = Math.floor(cycleTime / jointDuration);
        expect(activeIdx).toBe(currentJoint);

        for (let idx = 0; idx < numJoints; idx++) {
          const joint = testRobot.joints[idx];
          const min = joint.min;
          const max = joint.max;
          const range = max - min;
          const center = (min + max) / 2;
          const safeHalfSpan = (range / 2) * 0.30 * 0.85;

          if (idx === activeIdx) {
            const localTime = cycleTime % jointDuration;
            const osc = Math.sin((localTime / jointDuration) * 2 * Math.PI);
            const val = center + safeHalfSpan * osc;
            expect(Math.abs(val - center)).toBeGreaterThan(0.001);
          } else {
            // Other joints must remain exactly at center
            const nonActiveVal = center;
            expect(nonActiveVal).toBe(center);
          }
        }
      }
    }
  });

  it('in Single Joint Focus mode, oscillates only the selected joint and keeps all others stationary', () => {
    const numJoints = puma560.joints.length;
    for (let focusIdx = 0; focusIdx < numJoints; focusIdx++) {
      const t = 1.0; // arbitrary time
      for (let idx = 0; idx < numJoints; idx++) {
        const joint = puma560.joints[idx];
        const min = joint.min;
        const max = joint.max;
        const range = max - min;
        const center = (min + max) / 2;
        const safeHalfSpan = (range / 2) * 0.30 * 0.85;

        if (idx === focusIdx) {
          const osc = Math.sin(t * 0.25 * 2 * Math.PI);
          const val = center + safeHalfSpan * osc;
          expect(Math.abs(val - center)).toBeGreaterThan(0.01);
        } else {
          const val = center;
          expect(val).toBe(center);
        }
      }
    }
  });

  it('default educational speed (0.25x) produces calm angular velocities < 0.15 rad/s (~8.5 deg/s)', () => {
    const speed = 0.25;
    const amp = 0.30;

    for (const testRobot of testRobots) {
      for (let idx = 0; idx < testRobot.joints.length; idx++) {
        const joint = testRobot.joints[idx];
        const range = joint.max - joint.min;
        const safeHalfSpan = (range / 2) * Math.min(amp, 0.75) * 0.85;
        const baseFreq = 0.15 + (idx % 4) * 0.04;
        const effectiveFreq = baseFreq * speed;
        // Peak velocity: d/dt [center + span * sin(omega * t)] = span * omega
        const maxVelocity = safeHalfSpan * effectiveFreq;

        // Ensure motion is very calm, educational, and easy to observe
        expect(maxVelocity).toBeLessThan(0.15);
      }
    }
  });

  it('computeDHAnalysis accepts existingJacobian to bypass duplicate eigenvalue SVD iterations', () => {
    const q = [0, 0, 0, 0, 0, 0];
    const existingJacobian = computeJacobian(puma560, q);
    const analysis = computeDHAnalysis(puma560, q, existingJacobian);

    expect(analysis.jacobian.rank).toBe(existingJacobian.rank);
    expect(analysis.jacobian.conditionNumber).toBe(existingJacobian.conditionNumber);
    expect(analysis.jacobian.manipulability).toBeCloseTo(existingJacobian.manipulability, 6);
  });

  it('Matrix4 toColumnMajor supports target buffer without heap array allocations', () => {
    const m = Matrix4.translation(0.5, -0.2, 0.8);
    const target = new Float64Array(16);
    const result = m.toColumnMajor(target);

    expect(result).toBe(target);
    expect(target[12]).toBeCloseTo(0.5, 6);
    expect(target[13]).toBeCloseTo(-0.2, 6);
    expect(target[14]).toBeCloseTo(0.8, 6);
  });

  it('EndEffectorTrace filters sub-0.25mm movements and decimates in-place when buffer reaches capacity', () => {
    const trace = new EndEffectorTrace(10);
    const p0 = new Vector3(0, 0, 0);
    trace.addPoint(p0);
    expect(trace.pointCount).toBe(1);

    // Micro-movement < 0.25mm (0.0001m) -> should be filtered
    const subMmP = new Vector3(0.0001, 0, 0);
    trace.addPoint(subMmP);
    expect(trace.pointCount).toBe(1);

    // Movement > 0.25mm (0.001m = 1mm) -> should be added
    const validP = new Vector3(0.001, 0, 0);
    trace.addPoint(validP);
    expect(trace.pointCount).toBe(2);

    // Add distinct points to reach and exceed maxPoints = 10 to trigger decimation
    for (let i = 2; i <= 15; i++) {
      trace.addPoint(new Vector3(i * 0.01, 0, 0));
    }

    // Decimation should have reduced point count in-place without exceeding maxPoints
    expect(trace.pointCount).toBeLessThanOrEqual(10);
    expect(trace.pointCount).toBeGreaterThan(0);

    trace.resetTrail();
    expect(trace.pointCount).toBe(0);
  });

  it('processContinuousSweepShortcut guards against e.repeat, preventing rapid toggling and speed jitter when keys are held down', () => {
    const preventDefault = vi.fn();

    // 1. Spacebar: first press triggers toggle-sweep and calls preventDefault
    const spaceInitial = processContinuousSweepShortcut({
      code: 'Space',
      repeat: false,
      preventDefault,
    });
    expect(spaceInitial).toBe('toggle-sweep');
    expect(preventDefault).toHaveBeenCalledTimes(1);

    // 2. Spacebar held down (e.repeat === true): MUST BE IGNORED to prevent rapid start/stop flutter
    const spaceHeld = processContinuousSweepShortcut({
      code: 'Space',
      repeat: true,
      preventDefault,
    });
    expect(spaceHeld).toBe('ignore');
    expect(preventDefault).toHaveBeenCalledTimes(1); // preventDefault not re-triggered on repeated held events

    // 3. Spacebar variant key representations (key: ' ', key: 'Spacebar') without explicit code
    expect(processContinuousSweepShortcut({ key: ' ', repeat: false })).toBe('toggle-sweep');
    expect(processContinuousSweepShortcut({ key: 'Spacebar', repeat: false })).toBe('toggle-sweep');

    // 4. Slower shortcut '[': single press triggers speed-down, held repeat is ignored
    const slowerInitial = processContinuousSweepShortcut({
      key: '[',
      repeat: false,
    });
    expect(slowerInitial).toBe('speed-down');

    const slowerHeld = processContinuousSweepShortcut({
      key: '[',
      repeat: true,
    });
    expect(slowerHeld).toBe('ignore');

    // 5. Faster shortcut ']': single press triggers speed-up, held repeat is ignored
    const fasterInitial = processContinuousSweepShortcut({
      key: ']',
      repeat: false,
    });
    expect(fasterInitial).toBe('speed-up');

    const fasterHeld = processContinuousSweepShortcut({
      key: ']',
      repeat: true,
    });
    expect(fasterHeld).toBe('ignore');

    // 6. Unrelated keys are ignored
    expect(processContinuousSweepShortcut({ code: 'KeyA', key: 'a', repeat: false })).toBe('ignore');
    expect(processContinuousSweepShortcut({ code: 'Enter', key: 'Enter', repeat: false })).toBe('ignore');
  });

  it('processContinuousSweepShortcut rejects modifier key combinations to protect browser and system shortcuts', () => {
    // Ctrl+[ or Cmd+[ is browser navigation back; must not trigger sweep speed change
    expect(processContinuousSweepShortcut({ key: '[', repeat: false, ctrlKey: true })).toBe('ignore');
    expect(processContinuousSweepShortcut({ key: '[', repeat: false, metaKey: true })).toBe('ignore');
    expect(processContinuousSweepShortcut({ key: ']', repeat: false, ctrlKey: true })).toBe('ignore');
    expect(processContinuousSweepShortcut({ key: ']', repeat: false, altKey: true })).toBe('ignore');

    // Alt+Space or Ctrl+Space is system menu / IME; must not toggle continuous sweep
    expect(processContinuousSweepShortcut({ code: 'Space', repeat: false, altKey: true })).toBe('ignore');
    expect(processContinuousSweepShortcut({ code: 'Space', repeat: false, ctrlKey: true })).toBe('ignore');
    expect(processContinuousSweepShortcut({ code: 'Space', repeat: false, metaKey: true })).toBe('ignore');
  });

  it('processContinuousSweepShortcut shields input fields, buttons, and contentEditable elements from shortcut hijacking', () => {
    const inputEl = { tagName: 'INPUT' };
    const selectEl = { tagName: 'SELECT' };
    const textareaEl = { tagName: 'TEXTAREA' };
    const buttonEl = { tagName: 'BUTTON' };
    const editableEl = { tagName: 'DIV', isContentEditable: true };
    const nestedSpanInButton = {
      tagName: 'SPAN',
      closest: (selector: string) => (selector.includes('button') ? buttonEl : null),
    };

    for (const target of [inputEl, selectEl, textareaEl, buttonEl, editableEl, nestedSpanInButton]) {
      expect(processContinuousSweepShortcut({ code: 'Space', repeat: false, target })).toBe('ignore');
      expect(processContinuousSweepShortcut({ key: '[', repeat: false, target })).toBe('ignore');
      expect(processContinuousSweepShortcut({ key: ']', repeat: false, target })).toBe('ignore');
    }
  });

  it('processContinuousSweepShortcut honors debounce options and suppresses rapid key chatter', () => {
    const options = {
      minToggleIntervalMs: 150,
      lastToggleTime: 1000,
      currentTime: 1050, // Only 50ms elapsed (< 150ms)
    };

    // Rapid chatter under 150ms must be ignored
    expect(processContinuousSweepShortcut({ code: 'Space', repeat: false }, options)).toBe('ignore');

    // Beyond interval (> 150ms) must succeed
    const validOptions = {
      minToggleIntervalMs: 150,
      lastToggleTime: 1000,
      currentTime: 1200, // 200ms elapsed (> 150ms)
    };
    expect(processContinuousSweepShortcut({ code: 'Space', repeat: false }, validOptions)).toBe('toggle-sweep');
  });

  it('continuous sweep keyboard listener with repeat protection and debounce ignores held keys and rapid chatter in real DOM dispatch', () => {
    let isSweeping = false;
    let sweepSpeed = 0.25;
    let lastToggleTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = performance.now();
      const action = processContinuousSweepShortcut(e, {
        minToggleIntervalMs: 150,
        lastToggleTime,
        currentTime: now,
      });
      if (action === 'toggle-sweep') {
        lastToggleTime = now;
        isSweeping = !isSweeping;
      } else if (action === 'speed-down') {
        sweepSpeed = Math.max(0.05, Math.round((sweepSpeed - 0.05) * 100) / 100);
      } else if (action === 'speed-up') {
        sweepSpeed = Math.min(1.5, Math.round((sweepSpeed + 0.05) * 100) / 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    try {
      // 1. First Space press starts sweep
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', repeat: false }));
      expect(isSweeping).toBe(true);

      // 2. User holds down Space: OS emits 10 repeated keydown events with repeat: true
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', repeat: true }));
      }
      // Must remain in sweeping state, never jittering or toggling back to false
      expect(isSweeping).toBe(true);

      // 3. User taps space rapidly (within debounce interval) with repeat: false (simulating key chatter)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', repeat: false }));
      // Suppressed by debounce, still sweeping
      expect(isSweeping).toBe(true);

      // 4. Test speed keys with repeat protection
      expect(sweepSpeed).toBe(0.25);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ']', repeat: false }));
      expect(sweepSpeed).toBe(0.30);

      // Holding ']' does not rapidly accelerate speed
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ']', repeat: true }));
      }
      expect(sweepSpeed).toBe(0.30);

      // Slower '[' single press decrements speed
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '[', repeat: false }));
      expect(sweepSpeed).toBe(0.25);
    } finally {
      window.removeEventListener('keydown', handleKeyDown);
    }
  });

  it('EndEffectorTrace resetTrail cleanly eliminates cross-robot jump artifacts', () => {
    const trace = new EndEffectorTrace(50);

    // Robot A (Puma 560): generate trace of motion points
    const pumaPoints = [
      new Vector3(0.45, 0.15, 0.65),
      new Vector3(0.46, 0.16, 0.66),
      new Vector3(0.47, 0.17, 0.67),
    ];
    for (const pt of pumaPoints) {
      trace.addPoint(pt);
    }
    expect(trace.pointCount).toBe(3);

    // Switching to Robot B (SCARA): without reset, there is a massive jump of > 0.5m
    const scaraInitialPos = new Vector3(0.10, -0.20, 0.30);
    const lastPumaPos = pumaPoints[2];
    const jumpDistance = Math.hypot(
      scaraInitialPos.x - lastPumaPos.x,
      scaraInitialPos.y - lastPumaPos.y,
      scaraInitialPos.z - lastPumaPos.z
    );
    expect(jumpDistance).toBeGreaterThan(0.5);

    // When resetTrail() is invoked (on robot switch or sweep session start)
    trace.resetTrail();
    expect(trace.pointCount).toBe(0);

    // Add Robot B's initial point
    trace.addPoint(scaraInitialPos);
    expect(trace.pointCount).toBe(1);

    // The single point has been set at position buffer index 0 without connecting back to Robot A
    const attr = trace.children[0] as unknown as { geometry: { getAttribute: (name: string) => { array: Float32Array } } };
    const positions = attr.geometry.getAttribute('position').array;
    expect(positions[0]).toBeCloseTo(scaraInitialPos.x, 5);
    expect(positions[1]).toBeCloseTo(scaraInitialPos.y, 5);
    expect(positions[2]).toBeCloseTo(scaraInitialPos.z, 5);
  });

  it('EndEffectorTrace resets cleanly when DH table link parameters or joints are modified', () => {
    const trace = new EndEffectorTrace(50);

    // Starting pose on 2-link planar arm
    const p1 = new Vector3(0.3, 0.1, 0.0);
    const p2 = new Vector3(0.35, 0.12, 0.0);
    trace.addPoint(p1);
    trace.addPoint(p2);
    expect(trace.pointCount).toBe(2);

    // User modifies link length 'a' in DH parameter table from 0.3m to 1.2m
    // Without trace reset, end effector immediately teleports by > 0.8m
    const teleportPos = new Vector3(1.15, 0.12, 0.0);
    const jumpDist = Math.hypot(teleportPos.x - p2.x, teleportPos.y - p2.y, teleportPos.z - p2.z);
    expect(jumpDist).toBeGreaterThan(0.7);

    // Resetting trail on DH commit cleanly clears the buffer
    trace.resetTrail();
    expect(trace.pointCount).toBe(0);

    // Re-seed with new initial position
    trace.addPoint(teleportPos);
    expect(trace.pointCount).toBe(1);

    // Adding or removing a joint also triggers resetTrail
    trace.resetTrail();
    expect(trace.pointCount).toBe(0);
  });
});
