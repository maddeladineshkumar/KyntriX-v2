import { useEffect, useRef, useState } from 'react';
import { EngineSimulator } from './engineDynamics';
import type { EngineType, SimulationTelemetry, ViewerState } from './types';

const FIXED_STEP = 1 / 240;
const MAX_FRAME_DT = 0.1;
const MAX_STEPS_PER_FRAME = 32;
const PUBLISH_INTERVAL_MS = 80;

export interface PowertrainFrame {
  telemetry: SimulationTelemetry;
  crankAngleRad: number;
  /** Normalized load used by combustion glow and audio. */
  load: number;
}

function initialFrame(engine: EngineType, throttlePct: number): PowertrainFrame {
  const simulator = new EngineSimulator(engine);
  const telemetry = simulator.snapshot();
  return {
    telemetry,
    crankAngleRad: simulator.getCrankAngle(),
    load: Math.max(0, Math.min(1, throttlePct / 100)),
  };
}

/**
 * Drives the stateful powertrain simulator on a fixed 240 Hz clock and publishes
 * a snapshot at ~12 Hz. Keeping the physics off the render cadence makes the
 * model deterministic across display refresh rates while the React tree only
 * re-renders when new telemetry is available.
 */
export function usePowertrainSimulation(state: ViewerState): PowertrainFrame {
  const stateRef = useRef(state);

  const [frame, setFrame] = useState<PowertrainFrame>(() =>
    initialFrame(state.engine, state.throttle)
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const simulator = new EngineSimulator(state.engine);
    setFrame(initialFrame(state.engine, stateRef.current.throttle));

    let raf = 0;
    let last = performance.now();
    let accumulator = 0;
    let lastPublish = 0;

    const loop = (now: number) => {
      const dt = Math.min(MAX_FRAME_DT, Math.max(0, (now - last) / 1000));
      last = now;
      accumulator += dt;

      const live = stateRef.current;
      const active = live.playing || live.mode === 'flight-sim';
      let steps = 0;
      while (accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
        simulator.step(FIXED_STEP, {
          throttlePct: live.throttle,
          altitudeMeters: live.altitude,
          afterburner: live.afterburner,
          active,
        });
        accumulator -= FIXED_STEP;
        steps += 1;
      }
      // Drop stale time if the tab was suspended for a long period.
      if (accumulator > FIXED_STEP * MAX_STEPS_PER_FRAME) accumulator = 0;

      if (now - lastPublish >= PUBLISH_INTERVAL_MS) {
        lastPublish = now;
        const telemetry = simulator.snapshot();
        const load = active
          ? Math.max(0, Math.min(1, live.throttle / 100))
          : Math.max(0, Math.min(1, telemetry.rpm / Math.max(1, telemetry.rpm + 4000)));
        setFrame({
          telemetry,
          crankAngleRad: simulator.getCrankAngle(),
          load,
        });
      }

      raf = window.requestAnimationFrame(loop);
    };

    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [state.engine]);

  return frame;
}
