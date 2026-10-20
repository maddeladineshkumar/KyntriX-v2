import type { EngineType, SimulationTelemetry, ViewerState } from './types';

/** Calculates real-time physics telemetry metrics based on throttle, altitude, speed, and architecture */
export function calculateTelemetry(
  engine: EngineType,
  state: ViewerState,
  elapsedSec: number
): SimulationTelemetry {
  const rawThrottle = Number.isFinite(state.throttle) ? state.throttle : 0;
  const throttle = Math.max(0, Math.min(100, rawThrottle)) / 100;
  const altitude = Math.max(0, Math.min(80000, Number.isFinite(state.altitude) ? state.altitude : 0));
  const elapsed = Number.isFinite(elapsedSec) ? elapsedSec : 0;
  const afterburner = !!state.afterburner;
  const vectoring = Number.isFinite(state.vectoringPitch) ? state.vectoringPitch : 0;

  // Atmospheric density lapse model (standard atmosphere)
  const T0 = 288.15; // K
  const L = 0.0065; // K/m
  const R = 287.05;
  const g = 9.80665;
  const T_alt = Math.max(216.65, T0 - L * altitude);
  const pressureRatio = Math.pow(T_alt / T0, (g / (R * L)));
  const densityRatio = pressureRatio * (T0 / T_alt);

  let maxRpm = 10000;
  let maxThrust = 100; // kN
  let maxTorque = 500; // Nm
  let maxPower = 400; // kW
  let baseCompRatio = 20;

  switch (engine) {
    case 'turbofan':
      maxRpm = 11500;
      maxThrust = 315;
      maxPower = 75000; // equivalent jet power
      baseCompRatio = 44;
      break;
    case 'turbojet':
      maxRpm = 16800;
      maxThrust = afterburner ? 185 : 125;
      maxPower = 42000;
      baseCompRatio = 28;
      break;
    case 'turboprop':
      maxRpm = 24000; // gas generator
      maxThrust = 45;
      maxPower = 3800;
      maxTorque = 35500; // at propeller shaft
      baseCompRatio = 18;
      break;
    case 'turboshaft':
      maxRpm = 20900;
      maxThrust = 8;
      maxPower = 1950;
      maxTorque = 3100;
      baseCompRatio = 16;
      break;
    case 'v8':
      maxRpm = 7500;
      maxThrust = 0;
      maxPower = 375;
      maxTorque = 540;
      baseCompRatio = 12.0;
      break;
    case 'inline4':
      maxRpm = 6800;
      maxThrust = 0;
      maxPower = 225;
      maxTorque = 400;
      baseCompRatio = 10.5;
      break;
    case 'rotary':
      maxRpm = 9500;
      maxThrust = 0;
      maxPower = 190;
      maxTorque = 220;
      baseCompRatio = 10.0;
      break;
    case 'bldc-motor':
      maxRpm = 4500;
      maxThrust = 0;
      maxPower = 18;
      maxTorque = 120;
      baseCompRatio = 1.0;
      break;
    case 'airplane-jet':
      maxRpm = 14200;
      maxThrust = afterburner ? 280 : 190;
      maxPower = 65000;
      baseCompRatio = 32;
      break;
  }

  // Idle floor + throttle curve
  const idlePct = engine.includes('turbo') || engine === 'airplane-jet' ? 0.35 : 0.15;
  const effectiveThrottle = idlePct + (1 - idlePct) * Math.pow(throttle, 1.25);

  // Small natural dynamic fluctuation
  const noise = Math.sin(elapsed * 8.3) * 0.005 + Math.cos(elapsed * 14.1) * 0.003;

  const currentRpm = Math.round(maxRpm * effectiveThrottle * (1 + noise));
  const currentThrust = Number(
    (maxThrust * Math.pow(effectiveThrottle, 1.4) * densityRatio * (1 + noise)).toFixed(1)
  );
  const currentTorque = Number(
    (maxTorque * (0.4 + 0.6 * effectiveThrottle) * (1 + noise)).toFixed(1)
  );
  const currentPower = Number(
    (maxPower * Math.pow(effectiveThrottle, 1.3) * (1 + noise)).toFixed(1)
  );

  // Combustion temperatures
  const titBase = engine.includes('turbo') || engine === 'airplane-jet' ? 750 : 350;
  const titMax = engine.includes('turbo') || engine === 'airplane-jet' ? 1480 : 850;
  const currentTit = Math.round(titBase + (titMax - titBase) * effectiveThrottle + (afterburner ? 320 : 0));
  const currentEgt = Math.round(currentTit * 0.62 + (afterburner ? 180 : 0));

  // Fuel consumption: TSFC * Thrust or BSFC * Power
  const fuelRate =
    maxThrust > 0
      ? (currentThrust * (afterburner ? 0.052 : 0.016) * (1 + noise))
      : (currentPower * 0.00007 * (1 + noise));

  // Aerodynamic Mach estimate based on aircraft/engine output
  const mach =
    engine === 'airplane-jet'
      ? Number((0.2 + 1.8 * Math.pow(effectiveThrottle, 1.5) * (afterburner ? 1.25 : 1.0)).toFixed(2))
      : Number((0.1 + 0.85 * effectiveThrottle).toFixed(2));

  // Efficiency
  const thermalEfficiency =
    engine === 'bldc-motor'
      ? Number((91 + 4 * Math.sin(effectiveThrottle * Math.PI)).toFixed(1))
      : Number((32 + 22 * effectiveThrottle * (1 - altitude / 30000)).toFixed(1));

  return {
    rpm: currentRpm,
    thrustKN: currentThrust,
    torqueNm: currentTorque,
    powerKW: currentPower,
    fuelFlowKgPerS: Number(Math.max(0.01, fuelRate).toFixed(3)),
    compressionRatio: Number((baseCompRatio * (0.3 + 0.7 * effectiveThrottle)).toFixed(1)),
    turbineInletTempC: currentTit,
    exhaustGasTempC: currentEgt,
    thermalEfficiencyPct: Math.min(96, Math.max(20, thermalEfficiency)),
    airspeedMach: mach,
    altitudeMeters: altitude,
    throttlePct: Math.round(state.throttle),
    afterburnerActive: afterburner,
    vectoringAngleDeg: vectoring,
  };
}
