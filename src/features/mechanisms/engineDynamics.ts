/**
 * Calibrated powertrain physics for the Mechanisms & Engines Studio.
 *
 * The reciprocating model follows a quasi-dimensional SI approach: an
 * OEM-shaped torque curve anchors published power/torque points, then airflow,
 * boost, fuel, BMEP, friction/pumping losses, spark and a Wiebe-style heat
 * release trace are derived consistently. Electric machines use a
 * torque-speed envelope with copper/inverter loss and induction slip. Gas
 * turbines keep the legacy thermodynamic spool model.
 *
 * References include Heywood, Internal Combustion Engine Fundamentals; Audi
 * SSP 922803 (EA888 Gen2), BMW B58 technical training material, YASA axial-flux
 * traction machine data, and the ICAO standard atmosphere. Feature inspiration
 * comes from realenginesimulator.com and AngeTheGreat/engine-sim (MIT); no
 * third-party source code is copied here.
 */
import type {
  CyclePhase,
  EngineType,
  SimulationTelemetry,
  ViewerState,
} from './types';

const TAU = Math.PI * 2;
const R_AIR = 287.05;
const LHV_GASOLINE = 43.5e6; // J/kg
const P0 = 101325;
const T0 = 288.15;
const G0 = 9.80665;
const LAPSE = 0.0065;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export interface Atmosphere {
  pressurePa: number;
  temperatureK: number;
  density: number;
}

function isAirBreathing(engine: EngineType): boolean {
  return (
    engine === 'turbofan' ||
    engine === 'turbojet' ||
    engine === 'turboprop' ||
    engine === 'turboshaft' ||
    engine === 'airplane-jet'
  );
}

function effectiveAltitude(engine: EngineType, altitudeMeters: number): number {
  return isAirBreathing(engine) ? clamp(finite(altitudeMeters, 0), 0, 20000) : 0;
}

/** ICAO standard atmosphere up to the lower stratosphere. */
export function atmosphereAt(altitudeMeters: number): Atmosphere {
  const altitude = clamp(finite(altitudeMeters, 0), 0, 20000);
  const temperatureK = Math.max(216.65, T0 - LAPSE * altitude);
  const pressurePa = P0 * Math.pow(temperatureK / T0, G0 / (R_AIR * LAPSE));
  const density = pressurePa / (R_AIR * temperatureK);
  return { pressurePa, temperatureK, density };
}

export interface SiEngineConfig {
  id: EngineType;
  boreM: number;
  strokeM: number;
  rodM: number;
  compressionRatio: number;
  cylinders: number;
  idleRpm: number;
  redlineRpm: number;
  torqueStartRpm: number;
  torquePeakRpm: number;
  torqueEndRpm: number;
  powerPeakRpm: number;
  peakTorqueNm: number;
  peakPowerKw: number;
  turbo: boolean;
  maxBoostBar: number;
  boostThresholdRpm: number;
  vePeak: number;
  intercoolerEfficiency: number;
  firingOrder: number[];
  layout: 'v8' | 'v12' | 'i4' | 'i6' | 'f6';
}

/** Every reciprocating architecture backed by a calibrated SI configuration. */
export const SI_ENGINES = ['v8', 'v12', 'flat6', 'inline4', 'ea888-b8', 'b58'] as const;

export type SiEngineType = (typeof SI_ENGINES)[number];

const SI_ENGINE_SET = new Set<EngineType>(SI_ENGINES);

export function isSiEngine(engine: EngineType): engine is SiEngineType {
  return SI_ENGINE_SET.has(engine);
}

function makeSiConfig(
  base: Omit<SiEngineConfig, 'rodM' | 'firingOrder'> & Partial<Pick<SiEngineConfig, 'rodM' | 'firingOrder'>>
): SiEngineConfig {
  return {
    rodM: base.strokeM * 1.62,
    firingOrder: Array.from({ length: base.cylinders }, (_, index) => index + 1),
    ...base,
  };
}

export const SI_CONFIGS: Record<SiEngineType, SiEngineConfig> = {
  v8: makeSiConfig({
    id: 'v8',
    boreM: 0.093,
    strokeM: 0.0927,
    rodM: 0.156,
    compressionRatio: 12.0,
    cylinders: 8,
    idleRpm: 750,
    redlineRpm: 7500,
    torqueStartRpm: 1200,
    torquePeakRpm: 4800,
    torqueEndRpm: 4800,
    powerPeakRpm: 7500,
    peakTorqueNm: 540,
    peakPowerKw: 375,
    turbo: false,
    maxBoostBar: 0,
    boostThresholdRpm: 0,
    vePeak: 1.02,
    intercoolerEfficiency: 0,
    firingOrder: [1, 8, 4, 3, 6, 5, 7, 2],
    layout: 'v8',
  }),
  v12: makeSiConfig({
    id: 'v12',
    boreM: 0.095,
    strokeM: 0.0764,
    rodM: 0.132,
    compressionRatio: 11.8,
    cylinders: 12,
    idleRpm: 850,
    redlineRpm: 8700,
    torqueStartRpm: 1800,
    torquePeakRpm: 6750,
    torqueEndRpm: 6750,
    powerPeakRpm: 8500,
    peakTorqueNm: 720,
    peakPowerKw: 574,
    turbo: false,
    maxBoostBar: 0,
    boostThresholdRpm: 0,
    vePeak: 1.05,
    intercoolerEfficiency: 0,
    // Lamborghini L539 6.5-litre 60-degree V12 firing sequence.
    firingOrder: [1, 7, 5, 11, 3, 9, 6, 12, 2, 8, 4, 10],
    layout: 'v12',
  }),
  flat6: makeSiConfig({
    id: 'flat6',
    boreM: 0.102,
    strokeM: 0.0815,
    rodM: 0.145,
    compressionRatio: 13.3,
    cylinders: 6,
    idleRpm: 900,
    redlineRpm: 9000,
    torqueStartRpm: 2600,
    torquePeakRpm: 6100,
    torqueEndRpm: 6100,
    powerPeakRpm: 8400,
    peakTorqueNm: 470,
    peakPowerKw: 375,
    turbo: false,
    maxBoostBar: 0,
    boostThresholdRpm: 0,
    vePeak: 1.03,
    intercoolerEfficiency: 0,
    // Porsche 911 GT3 naturally aspirated flat-six firing sequence.
    firingOrder: [1, 6, 2, 4, 3, 5],
    layout: 'f6',
  }),
  inline4: makeSiConfig({
    id: 'inline4',
    boreM: 0.0825,
    strokeM: 0.0928,
    rodM: 0.148,
    compressionRatio: 10.5,
    cylinders: 4,
    idleRpm: 800,
    redlineRpm: 6800,
    torqueStartRpm: 1600,
    torquePeakRpm: 3200,
    torqueEndRpm: 4500,
    powerPeakRpm: 6800,
    peakTorqueNm: 400,
    peakPowerKw: 225,
    turbo: true,
    maxBoostBar: 1.4,
    boostThresholdRpm: 1400,
    vePeak: 0.98,
    intercoolerEfficiency: 0.84,
    firingOrder: [1, 3, 4, 2],
    layout: 'i4',
  }),
  'ea888-b8': makeSiConfig({
    id: 'ea888-b8',
    boreM: 0.0825,
    strokeM: 0.0928,
    rodM: 0.148,
    compressionRatio: 9.6,
    cylinders: 4,
    idleRpm: 800,
    redlineRpm: 6800,
    torqueStartRpm: 1500,
    torquePeakRpm: 2900,
    torqueEndRpm: 4200,
    powerPeakRpm: 6000,
    peakTorqueNm: 350,
    peakPowerKw: 155,
    turbo: true,
    maxBoostBar: 1.2,
    boostThresholdRpm: 1350,
    vePeak: 0.96,
    intercoolerEfficiency: 0.86,
    firingOrder: [1, 3, 4, 2],
    layout: 'i4',
  }),
  b58: makeSiConfig({
    id: 'b58',
    boreM: 0.082,
    strokeM: 0.0946,
    rodM: 0.155,
    compressionRatio: 11.0,
    cylinders: 6,
    idleRpm: 650,
    redlineRpm: 7000,
    torqueStartRpm: 1800,
    torquePeakRpm: 3400,
    torqueEndRpm: 5000,
    powerPeakRpm: 6500,
    peakTorqueNm: 500,
    peakPowerKw: 285,
    turbo: true,
    maxBoostBar: 1.3,
    boostThresholdRpm: 1200,
    vePeak: 0.99,
    intercoolerEfficiency: 0.9,
    firingOrder: [1, 5, 3, 6, 2, 4],
    layout: 'i6',
  }),
};

export interface ElectricMachineConfig {
  id: EngineType;
  peakPowerKw: number;
  peakTorqueNm: number;
  baseRpm: number;
  maxRpm: number;
  voltageV: number;
  peakEfficiency: number;
  poles: number;
  kind: 'pmsm' | 'induction' | 'stepper';
  slipRatedPct?: number;
}

export const ELECTRIC_CONFIGS: Record<
  'bldc-motor' | 'axial-flux-motor' | 'induction-motor' | 'stepper-motor',
  ElectricMachineConfig
> = {
  'bldc-motor': {
    id: 'bldc-motor',
    peakPowerKw: 20,
    peakTorqueNm: 120,
    baseRpm: 1592,
    maxRpm: 4500,
    voltageV: 48,
    peakEfficiency: 0.948,
    poles: 14,
    kind: 'pmsm',
  },
  'axial-flux-motor': {
    id: 'axial-flux-motor',
    peakPowerKw: 250,
    peakTorqueNm: 500,
    baseRpm: 4775,
    maxRpm: 12000,
    voltageV: 400,
    peakEfficiency: 0.965,
    poles: 24,
    kind: 'pmsm',
  },
  'induction-motor': {
    id: 'induction-motor',
    peakPowerKw: 200,
    peakTorqueNm: 350,
    baseRpm: 5457,
    maxRpm: 14000,
    voltageV: 400,
    peakEfficiency: 0.952,
    poles: 4,
    kind: 'induction',
    slipRatedPct: 2.5,
  },
  'stepper-motor': {
    id: 'stepper-motor',
    peakPowerKw: 1.5,
    peakTorqueNm: 8.5,
    baseRpm: 300,
    maxRpm: 1500,
    voltageV: 48,
    peakEfficiency: 0.86,
    poles: 50,
    kind: 'stepper',
  },
};

function falloffFor(config: SiEngineConfig): number {
  const omega = (config.powerPeakRpm * TAU) / 60;
  const targetTorque = (config.peakPowerKw * 1000) / Math.max(1, omega);
  const span = config.redlineRpm - config.torqueEndRpm;
  if (span <= 1) return 0.1;
  const ratio = (config.powerPeakRpm - config.torqueEndRpm) / span;
  const denominator = Math.pow(clamp(ratio, 0.001, 1.2), 1.5);
  return clamp((1 - targetTorque / config.peakTorqueNm) / denominator, 0.04, 0.82);
}

const FALLOFF: Partial<Record<EngineType, number>> = {
  v8: falloffFor(SI_CONFIGS.v8),
  v12: falloffFor(SI_CONFIGS.v12),
  flat6: falloffFor(SI_CONFIGS.flat6),
  inline4: falloffFor(SI_CONFIGS.inline4),
  'ea888-b8': falloffFor(SI_CONFIGS['ea888-b8']),
  b58: falloffFor(SI_CONFIGS.b58),
};

/** True when the architecture runs forced induction (used by UI metric gating). */
export function isBoostedSi(engine: EngineType): boolean {
  return isSiEngine(engine) && SI_CONFIGS[engine].turbo;
}

export function displacementM3(config: SiEngineConfig): number {
  return (Math.PI / 4) * config.boreM * config.boreM * config.strokeM * config.cylinders;
}

export function torqueShapeAtRpm(config: SiEngineConfig, rpm: number): number {
  const falloff = FALLOFF[config.id] ?? falloffFor(config);
  const rise = smoothstep(config.idleRpm * 0.8, config.torqueStartRpm, rpm);
  const fall =
    rpm <= config.torqueEndRpm
      ? 1
      : 1 -
        falloff *
          Math.pow(
            clamp((rpm - config.torqueEndRpm) / Math.max(1, config.redlineRpm - config.torqueEndRpm), 0, 1),
            1.5
          );
  return clamp(rise * fall, 0, 1);
}

export function boostTargetAtRpm(config: SiEngineConfig, rpm: number, throttle: number): number {
  if (!config.turbo) return 0;
  const spool = 1 / (1 + Math.exp(-(rpm - config.boostThresholdRpm) / 460));
  const topEnd = rpm <= config.powerPeakRpm
    ? 1
    : clamp(1 - (rpm - config.powerPeakRpm) / Math.max(900, config.redlineRpm * 0.9), 0.48, 1);
  return config.maxBoostBar * spool * topEnd * Math.pow(clamp(throttle, 0, 1), 1.12);
}

function baseCyclePhase(crankAngleRad: number): CyclePhase {
  const phi = ((crankAngleRad % (TAU * 2)) + TAU * 2) % (TAU * 2);
  if (phi < Math.PI) return 'power';
  if (phi < 2 * Math.PI) return 'exhaust';
  if (phi < 3 * Math.PI) return 'intake';
  return 'compression';
}

function meanPistonSpeed(config: SiEngineConfig, rpm: number): number {
  return (2 * config.strokeM * rpm) / 60;
}

function frictionMeanPressureBar(config: SiEngineConfig, rpm: number): number {
  const speed = meanPistonSpeed(config, rpm);
  return 0.32 + 0.052 * speed + 0.00082 * speed * speed;
}

function pumpingMeanPressureBar(config: SiEngineConfig, load: number): number {
  return config.turbo ? 0.28 + 0.28 * load : 0.12 + 0.16 * load;
}

export interface SiOperatingPoint {
  config: SiEngineConfig;
  rpm: number;
  torqueNm: number;
  powerKW: number;
  bmepBar: number;
  imepBar: number;
  fmepBar: number;
  pmepBar: number;
  boostBar: number;
  manifoldPressureKpa: number;
  intakeAirTempC: number;
  volumetricEfficiencyPct: number;
  afr: number;
  lambda: number;
  fuelFlowKgPerS: number;
  brakeEfficiency: number;
  bsfcGPerKwh: number;
  exhaustTempC: number;
  sparkAdvanceDeg: number;
  knock: number;
  turboRpm: number;
}

/**
 * Calibrated quasi-dimensional SI operating point. Torque follows an OEM-shaped
 * curve; airflow, boost, fuel, BMEP and efficiency are derived consistently from
 * that operating point. The cycle model is anchored to published torque/power.
 */
export function siOperatingPoint(
  config: SiEngineConfig,
  rpmInput: number,
  throttleInput: number,
  altitudeMeters: number,
  extra?: { knock?: number; revLimiter?: boolean; boostOverrideBar?: number }
): SiOperatingPoint {
  const rpm = clamp(finite(rpmInput, config.idleRpm), 0, config.redlineRpm + 200);
  const throttle = clamp(finite(throttleInput, 0) / 100, 0, 1);
  const altitude = clamp(finite(altitudeMeters, 0), 0, 20000);
  const amb = atmosphereAt(altitude);
  const load = clamp(throttle, 0, 1);
  const revLimiter = extra?.revLimiter ?? false;
  const densityFactor = Math.pow(amb.pressurePa / P0, config.turbo ? 0.28 : 0.72);
  const shape = torqueShapeAtRpm(config, rpm);
  const torque = revLimiter
    ? 0
    : config.peakTorqueNm * shape * (0.04 + 0.96 * Math.pow(load, 1.2)) * densityFactor;
  const omega = (rpm * TAU) / 60;
  const powerKW = rpm > 30 ? (torque * omega) / 1000 : 0;
  const displacement = displacementM3(config);
  const bmepBar = displacement > 0 ? (4 * Math.PI * torque) / displacement / 1e5 : 0;
  const fmepBar = frictionMeanPressureBar(config, rpm);
  const pmepBar = pumpingMeanPressureBar(config, load);
  const imepBar = bmepBar + fmepBar + pmepBar;

  const knock = clamp(
    extra?.knock ??
      (config.turbo && load > 0.82 && rpm < 3000
        ? clamp((0.92 - load) * 0.4 + (3000 - rpm) / 16000, 0, 0.55)
        : 0),
    0,
    1
  );

  const brakeEfficiency = clamp(
    0.222 + 0.132 * load - 0.0000044 * rpm + (config.turbo ? 0.012 : 0) - knock * 0.06,
    0.19,
    0.42
  );

  const fuelPowerKW = powerKW > 0.15 || rpm > 40 ? powerKW / Math.max(0.12, brakeEfficiency) : 0;
  let fuelFlow = fuelPowerKW > 0 ? (fuelPowerKW * 1000) / LHV_GASOLINE : 0;
  if (rpm > config.idleRpm * 0.55 && fuelFlow < 0.00018) fuelFlow = 0.00018;

  const afrTarget = 14.7 * (1 - 0.13 * load - (config.turbo ? 0.016 : 0));
  const airFlow = fuelFlow * afrTarget;

  const boostTarget = extra?.boostOverrideBar ?? boostTargetAtRpm(config, rpm, load);
  const boostBar = config.turbo ? clamp(boostTarget, 0, config.maxBoostBar * 1.05) : 0;
  const pressureRatio = (amb.pressurePa + boostBar * 1e5) / amb.pressurePa;
  const compressorOutlet = amb.temperatureK * (1 + (Math.pow(pressureRatio, 0.2857) - 1) / 0.72);
  const intercooler = config.turbo
    ? clamp(config.intercoolerEfficiency * (0.55 + 0.45 * clamp(load * 1.4, 0, 1)), 0, 0.96)
    : 0;
  const manifoldTempK = amb.temperatureK + (compressorOutlet - amb.temperatureK) * (1 - intercooler) + 6 * load;
  const manifoldPressurePa = config.turbo
    ? amb.pressurePa + boostBar * 1e5
    : amb.pressurePa * (0.24 + 0.76 * load);
  const densityManifold = manifoldPressurePa / (R_AIR * manifoldTempK);
  const cyclesPerSecond = Math.max(0.001, rpm / 120);
  const ve = clamp(
    airFlow / Math.max(1e-8, densityManifold * displacement * cyclesPerSecond),
    0.08,
    2.4
  );

  const bsfc = powerKW > 0.5 ? (fuelFlow * 3.6e6) / powerKW : 0;
  const exhaustTemp = clamp(
    260 + 520 * load + (config.turbo ? boostBar * 105 : 0) + (afrTarget < 12.6 ? 55 : 0) + rpm * 0.012,
    220,
    1080
  );

  const knockRetard = knock * 9;
  const sparkAdvance = clamp(
    13 + 19 * load - boostBar * 6.5 - rpm * 0.0012 - knockRetard,
    2,
    40
  );
  const turboRpm = config.turbo
    ? boostBar > 0.02
      ? Math.round(28000 + (boostBar / Math.max(0.01, config.maxBoostBar)) * 155000)
      : 0
    : 0;

  return {
    config,
    rpm,
    torqueNm: torque,
    powerKW,
    bmepBar,
    imepBar,
    fmepBar,
    pmepBar,
    boostBar,
    manifoldPressureKpa: manifoldPressurePa / 1000,
    intakeAirTempC: manifoldTempK - 273.15,
    volumetricEfficiencyPct: ve * 100,
    afr: airFlow > 0 ? afrTarget : 0,
    lambda: airFlow > 0 ? afrTarget / 14.7 : 0,
    fuelFlowKgPerS: fuelFlow,
    brakeEfficiency,
    bsfcGPerKwh: bsfc,
    exhaustTempC: exhaustTemp,
    sparkAdvanceDeg: sparkAdvance,
    knock,
    turboRpm,
  };
}

export interface ElectricOperatingPoint {
  config: ElectricMachineConfig;
  rpm: number;
  torqueNm: number;
  powerKW: number;
  efficiency: number;
  electricalPowerKW: number;
  voltageV: number;
  currentA: number;
  slipPct: number;
  temperatureC: number;
}

export function electricOperatingPoint(
  config: ElectricMachineConfig,
  rpmInput: number,
  throttleInput: number
): ElectricOperatingPoint {
  const rpm = clamp(finite(rpmInput, 0), 0, config.maxRpm);
  const load = clamp(finite(throttleInput, 0) / 100, 0, 1);
  const omega = (rpm * TAU) / 60;
  let torqueLimit: number;
  if (config.kind === 'stepper') {
    torqueLimit = config.peakTorqueNm / (1 + Math.pow(rpm / 620, 1.55));
  } else if (rpm <= config.baseRpm || rpm < 1) {
    torqueLimit = config.peakTorqueNm;
  } else {
    torqueLimit = Math.min(config.peakTorqueNm, (config.peakPowerKw * 1000) / Math.max(1, omega));
  }
  const torque = torqueLimit * (0.06 + 0.94 * Math.pow(load, 1.12));
  const powerKW = rpm > 1 ? (torque * omega) / 1000 : 0;
  const efficiency = clamp(
    config.peakEfficiency *
      (0.93 + 0.07 * Math.sin(Math.PI * clamp(load, 0, 1) * 0.82)) *
      (rpm > config.baseRpm ? 0.99 : 1),
    0.55,
    0.985
  );
  const electricalPowerKW = powerKW > 0.02 ? powerKW / efficiency : 0;
  const nominalCurrent = electricalPowerKW * 1000 / Math.max(1, config.voltageV);
  const voltageV = clamp(config.voltageV - nominalCurrent * 0.0045, config.voltageV * 0.72, config.voltageV);
  const currentA = electricalPowerKW > 0.01 ? (electricalPowerKW * 1000) / voltageV : 0;
  const slipPct =
    config.kind === 'induction'
      ? (config.slipRatedPct ?? 2.5) * (0.35 + 0.65 * load) * (rpm > config.baseRpm ? 0.55 : 1)
      : 0;
  const temperatureC = 24 + load * 54 + (rpm / Math.max(1, config.maxRpm)) * 16;
  return {
    config,
    rpm,
    torqueNm: torque,
    powerKW,
    efficiency,
    electricalPowerKW,
    voltageV,
    currentA,
    slipPct,
    temperatureC,
  };
}

function turbineTelemetry(
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

  const T_alt = Math.max(216.65, T0 - LAPSE * altitude);
  const pressureRatio = Math.pow(T_alt / T0, G0 / (R_AIR * LAPSE));
  const densityRatio = pressureRatio * (T0 / T_alt);

  let maxRpm = 10000;
  let maxThrust = 100;
  let maxTorque = 500;
  let maxPower = 400;
  let baseCompRatio = 20;

  switch (engine) {
    case 'turbofan':
      maxRpm = 11500;
      maxThrust = 315;
      maxPower = 75000;
      baseCompRatio = 44;
      break;
    case 'turbojet':
      maxRpm = 16800;
      maxThrust = afterburner ? 185 : 125;
      maxPower = 42000;
      baseCompRatio = 28;
      break;
    case 'turboprop':
      maxRpm = 24000;
      maxThrust = 45;
      maxPower = 3800;
      maxTorque = 35500;
      baseCompRatio = 18;
      break;
    case 'turboshaft':
      maxRpm = 20900;
      maxThrust = 8;
      maxPower = 1950;
      maxTorque = 3100;
      baseCompRatio = 16;
      break;
    case 'airplane-jet':
      maxRpm = 14200;
      maxThrust = afterburner ? 280 : 190;
      maxPower = 65000;
      baseCompRatio = 32;
      break;
    case 'rotary':
      maxRpm = 9500;
      maxThrust = 0;
      maxPower = 190;
      maxTorque = 220;
      baseCompRatio = 10.0;
      break;
    default:
      break;
  }

  const idlePct = engine.includes('turbo') || engine === 'airplane-jet' ? 0.35 : 0.15;
  const effectiveThrottle = idlePct + (1 - idlePct) * Math.pow(throttle, 1.25);
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

  const titBase = engine.includes('turbo') || engine === 'airplane-jet' ? 750 : 350;
  const titMax = engine.includes('turbo') || engine === 'airplane-jet' ? 1480 : 850;
  const currentTit = Math.round(titBase + (titMax - titBase) * effectiveThrottle + (afterburner ? 320 : 0));
  const currentEgt = Math.round(currentTit * 0.62 + (afterburner ? 180 : 0));

  const fuelRate =
    maxThrust > 0
      ? currentThrust * (afterburner ? 0.052 : 0.016) * (1 + noise)
      : currentPower * 0.00007 * (1 + noise);

  const mach =
    engine === 'airplane-jet'
      ? Number((0.2 + 1.8 * Math.pow(effectiveThrottle, 1.5) * (afterburner ? 1.25 : 1.0)).toFixed(2))
      : Number((0.1 + 0.85 * effectiveThrottle).toFixed(2));

  const thermalEfficiency =
    engine === 'rotary'
      ? Number((30 + 18 * effectiveThrottle * (1 - altitude / 30000)).toFixed(1))
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
    throttlePct: Math.round(rawThrottle),
    afterburnerActive: afterburner,
    vectoringAngleDeg: vectoring,
    manifoldPressureKpa: 0,
    boostBar: 0,
    afr: 0,
    lambda: 0,
    sparkAdvanceDeg: 0,
    bmepKpa: 0,
    volumetricEfficiencyPct: 0,
    turboRpm: 0,
    coolantTempC: 0,
    oilTempC: 0,
    intakeAirTempC: 0,
    knockIntensity: 0,
    bsfcGPerKwh: 0,
    currentA: 0,
    voltageV: 0,
    electricalPowerKW: 0,
    slipPct: 0,
    cyclePhase: 'n/a',
    crankAngleDeg: 0,
    revLimiterActive: false,
  };
}

function siTelemetry(
  config: SiEngineConfig,
  rpm: number,
  throttle: number,
  altitude: number,
  elapsed: number,
  extra?: { knock?: number; revLimiter?: boolean; boostOverrideBar?: number; coolant?: number; oil?: number; crankAngleRad?: number }
): SimulationTelemetry {
  const point = siOperatingPoint(config, rpm, throttle, altitude, extra);
  const crank = extra?.crankAngleRad ?? (elapsed * (point.rpm / 60) * TAU) % (TAU * 2);
  return {
    rpm: Math.round(point.rpm),
    thrustKN: 0,
    torqueNm: Number(point.torqueNm.toFixed(1)),
    powerKW: Number(point.powerKW.toFixed(1)),
    fuelFlowKgPerS: Number(Math.max(0, point.fuelFlowKgPerS).toFixed(5)),
    compressionRatio: config.compressionRatio,
    turbineInletTempC: Math.round(point.exhaustTempC),
    exhaustGasTempC: Math.round(point.exhaustTempC * 0.92),
    thermalEfficiencyPct: Number((point.brakeEfficiency * 100).toFixed(1)),
    airspeedMach: 0,
    altitudeMeters: altitude,
    throttlePct: Math.round(throttle),
    afterburnerActive: false,
    vectoringAngleDeg: 0,
    manifoldPressureKpa: Number(point.manifoldPressureKpa.toFixed(1)),
    boostBar: Number(point.boostBar.toFixed(2)),
    afr: Number(point.afr.toFixed(2)),
    lambda: Number(point.lambda.toFixed(2)),
    sparkAdvanceDeg: Number(point.sparkAdvanceDeg.toFixed(1)),
    bmepKpa: Number((point.bmepBar * 100).toFixed(1)),
    volumetricEfficiencyPct: Number(point.volumetricEfficiencyPct.toFixed(1)),
    turboRpm: point.turboRpm,
    coolantTempC: Math.round(extra?.coolant ?? 24 + clamp(throttle / 100, 0, 1) * 66),
    oilTempC: Math.round(extra?.oil ?? 28 + clamp(throttle / 100, 0, 1) * 74),
    intakeAirTempC: Number(point.intakeAirTempC.toFixed(1)),
    knockIntensity: Number(point.knock.toFixed(2)),
    bsfcGPerKwh: Number(point.bsfcGPerKwh.toFixed(1)),
    currentA: 0,
    voltageV: 0,
    electricalPowerKW: 0,
    slipPct: 0,
    cyclePhase: baseCyclePhase(crank),
    crankAngleDeg: Number((((crank * 180) / Math.PI) % 720).toFixed(0)),
    revLimiterActive: !!extra?.revLimiter,
  };
}

function electricTelemetry(
  config: ElectricMachineConfig,
  rpm: number,
  throttle: number,
  elapsed: number,
  temperature?: number
): SimulationTelemetry {
  const point = electricOperatingPoint(config, rpm, throttle);
  return {
    rpm: Math.round(point.rpm),
    thrustKN: 0,
    torqueNm: Number(point.torqueNm.toFixed(1)),
    powerKW: Number(point.powerKW.toFixed(1)),
    fuelFlowKgPerS: 0,
    compressionRatio: 1,
    turbineInletTempC: 0,
    exhaustGasTempC: 0,
    thermalEfficiencyPct: Number((point.efficiency * 100).toFixed(1)),
    airspeedMach: 0,
    altitudeMeters: 0,
    throttlePct: Math.round(throttle),
    afterburnerActive: false,
    vectoringAngleDeg: 0,
    manifoldPressureKpa: 0,
    boostBar: 0,
    afr: 0,
    lambda: 0,
    sparkAdvanceDeg: 0,
    bmepKpa: 0,
    volumetricEfficiencyPct: 0,
    turboRpm: 0,
    coolantTempC: Math.round(temperature ?? point.temperatureC),
    oilTempC: Math.round((temperature ?? point.temperatureC) + 4),
    intakeAirTempC: 24,
    knockIntensity: 0,
    bsfcGPerKwh: 0,
    currentA: Number(point.currentA.toFixed(1)),
    voltageV: Number(point.voltageV.toFixed(1)),
    electricalPowerKW: Number(point.electricalPowerKW.toFixed(1)),
    slipPct: Number(point.slipPct.toFixed(2)),
    cyclePhase: 'n/a',
    crankAngleDeg: Math.round((elapsed * (point.rpm / 60) * 360) % 360),
    revLimiterActive: point.rpm >= config.maxRpm - 1,
  };
}

/** Pure quasi-steady telemetry used by tests, charts, and the initial render. */
export function calculateTelemetry(
  engine: EngineType,
  state: ViewerState,
  elapsedSec: number
): SimulationTelemetry {
  const throttle = Math.min(100, Math.max(0, finite(state.throttle, 0)));
  const altitude = effectiveAltitude(engine, state.altitude);
  const elapsed = finite(elapsedSec, 0);

  if (isSiEngine(engine)) {
    const config = SI_CONFIGS[engine];
    const rpm = config.idleRpm + (config.redlineRpm - config.idleRpm) * Math.pow(throttle / 100, 1.12);
    return siTelemetry(config, rpm, throttle, altitude, elapsed);
  }

  if (engine === 'bldc-motor' || engine === 'axial-flux-motor' || engine === 'induction-motor' || engine === 'stepper-motor') {
    const config = ELECTRIC_CONFIGS[engine];
    const rpm = config.maxRpm * Math.pow(throttle / 100, 1.15);
    return electricTelemetry(config, rpm, throttle, elapsed);
  }

  return turbineTelemetry(engine, state, elapsed);
}

export interface DynoPoint {
  rpm: number;
  torqueNm: number;
  powerKW: number;
  boostBar: number;
  efficiencyPct: number;
}

export interface DynoCurve {
  engine: EngineType;
  points: DynoPoint[];
  peakTorqueNm: number;
  peakTorqueRpm: number;
  peakPowerKw: number;
  peakPowerRpm: number;
  redlineRpm: number;
  kind: 'si' | 'electric' | 'turbine';
}

const DYNO_CACHE = new Map<EngineType, DynoCurve>();

export function getDynoCurve(engine: EngineType): DynoCurve {
  const cached = DYNO_CACHE.get(engine);
  if (cached) return cached;

  let curve: DynoCurve;
  if (isSiEngine(engine)) {
    const config = SI_CONFIGS[engine];
    const points: DynoPoint[] = [];
    const step = Math.max(50, Math.round((config.redlineRpm - config.idleRpm) / 70 / 50) * 50);
    for (let rpm = Math.max(800, config.idleRpm); rpm <= config.redlineRpm; rpm += step) {
      const point = siOperatingPoint(config, rpm, 100, 0);
      points.push({
        rpm,
        torqueNm: point.torqueNm,
        powerKW: point.powerKW,
        boostBar: point.boostBar,
        efficiencyPct: point.brakeEfficiency * 100,
      });
    }
    let peakTorque = points[0];
    let peakPower = points[0];
    for (const point of points) {
      if (point.torqueNm > peakTorque.torqueNm) peakTorque = point;
      if (point.powerKW > peakPower.powerKW) peakPower = point;
    }
    curve = {
      engine,
      points,
      peakTorqueNm: peakTorque.torqueNm,
      peakTorqueRpm: peakTorque.rpm,
      peakPowerKw: peakPower.powerKW,
      peakPowerRpm: peakPower.rpm,
      redlineRpm: config.redlineRpm,
      kind: 'si',
    };
  } else if (engine === 'bldc-motor' || engine === 'axial-flux-motor' || engine === 'induction-motor' || engine === 'stepper-motor') {
    const config = ELECTRIC_CONFIGS[engine];
    const points: DynoPoint[] = [];
    const step = Math.max(20, Math.round(config.maxRpm / 60 / 20) * 20);
    for (let rpm = 0; rpm <= config.maxRpm; rpm += step) {
      const point = electricOperatingPoint(config, rpm, 100);
      points.push({
        rpm,
        torqueNm: point.torqueNm,
        powerKW: point.powerKW,
        boostBar: 0,
        efficiencyPct: point.efficiency * 100,
      });
    }
    let peakTorque = points[0];
    let peakPower = points[0];
    for (const point of points) {
      if (point.torqueNm > peakTorque.torqueNm) peakTorque = point;
      if (point.powerKW > peakPower.powerKW) peakPower = point;
    }
    curve = {
      engine,
      points,
      peakTorqueNm: peakTorque.torqueNm,
      peakTorqueRpm: peakTorque.rpm,
      peakPowerKw: peakPower.powerKW,
      peakPowerRpm: peakPower.rpm,
      redlineRpm: config.maxRpm,
      kind: 'electric',
    };
  } else {
    curve = {
      engine,
      points: [],
      peakTorqueNm: 0,
      peakTorqueRpm: 0,
      peakPowerKw: 0,
      peakPowerRpm: 0,
      redlineRpm: 0,
      kind: 'turbine',
    };
  }
  DYNO_CACHE.set(engine, curve);
  return curve;
}

export interface PvPoint {
  volumeCc: number;
  pressureBar: number;
  phase: CyclePhase;
}

function burnFraction(phi: number, durationRad: number): number {
  // Wiebe form, a = 5, m = 2, referenced to spark just before TDC.
  const start = -0.28;
  if (phi <= start) return 0;
  const x = clamp((phi - start) / durationRad, 0, 1);
  return 1 - Math.exp(-5 * Math.pow(x, 3));
}

/** Construct a calibrated 720-degree cylinder pressure trace and P-V loop. */
export function getPvLoop(
  engine: EngineType,
  rpm: number,
  throttle: number,
  altitude: number
): PvPoint[] {
  if (!isSiEngine(engine)) return [];
  const config = SI_CONFIGS[engine];
  const point = siOperatingPoint(config, rpm, throttle, altitude);
  const area = (Math.PI / 4) * config.boreM * config.boreM;
  const displacement = area * config.strokeM;
  const clearance = displacement / Math.max(1.1, config.compressionRatio - 1);
  const r = config.strokeM / 2;
  const L = config.rodM;
  const volumeAt = (phi: number) => {
    const q = r * Math.cos(phi) + Math.sqrt(L * L - r * r * Math.sin(phi) * Math.sin(phi));
    return clearance + area * (r + L - q);
  };
  const vBdc = volumeAt(Math.PI);
  const pMan = point.manifoldPressureKpa * 1000;
  const pExh = pMan + 0.35e5;
  const load = clamp(throttle / 100, 0, 1);
  const duration = 1.1 + 0.45 * (1 - load);
  const raw: { phi: number; v: number; p: number; phase: CyclePhase }[] = [];
  const samples = 180;

  for (let i = 0; i <= samples; i++) {
    const phi = (i / samples) * TAU * 2;
    const v = volumeAt(phi);
    let p: number;
    if (phi < Math.PI) {
      const x = burnFraction(phi, duration);
      p =
        pMan *
        Math.pow(vBdc / v, 1.33) *
        (1 + (1.05 + 0.4 * load) * x * Math.exp(-phi * 0.32));
    } else if (phi < 2 * Math.PI) {
      p = pExh * Math.pow(vBdc / v, 0.18);
    } else if (phi < 3 * Math.PI) {
      p = pMan * (0.965 + 0.035 * Math.cos(phi));
    } else {
      p = pMan * Math.pow(vBdc / v, 1.36);
    }
    raw.push({ phi, v, p, phase: baseCyclePhase(phi) });
  }

  // Normalize the trace so its integrated IMEP agrees with the torque model.
  let work = 0;
  for (let i = 1; i < raw.length; i++) {
    work += ((raw[i].p + raw[i - 1].p) / 2) * (raw[i].v - raw[i - 1].v);
  }
  const rawImep = Math.abs(work) / displacement;
  const targetImep = (point.bmepBar + point.fmepBar + point.pmepBar) * 1e5;
  const scale = clamp(targetImep / Math.max(1e4, rawImep), 0.15, 6);

  return raw.map((item) => ({
    volumeCc: item.v * 1e6,
    pressureBar: Math.max(0.05, (item.p * scale) / 1e5),
    phase: item.phase,
  }));
}

export interface CylinderState {
  index: number;
  phase: CyclePhase;
  crankAngleDeg: number;
  pressureBar: number;
  volumeCc: number;
  burnFraction: number;
}

export function getCylinderStates(
  engine: EngineType,
  rpm: number,
  throttle: number,
  altitude: number,
  crankAngleRad: number
): CylinderState[] {
  if (!isSiEngine(engine)) return [];
  const config = SI_CONFIGS[engine];
  const loop = getPvLoop(engine, rpm, throttle, altitude);
  if (!loop.length) return [];
  const states: CylinderState[] = [];
  const interval = (TAU * 2) / config.cylinders;
  for (let i = 0; i < config.cylinders; i++) {
    const orderIndex = config.firingOrder.indexOf(i + 1);
    const firingOffset = interval * (orderIndex >= 0 ? orderIndex : i);
    const phi = ((crankAngleRad - firingOffset) % (TAU * 2) + TAU * 2) % (TAU * 2);
    const sample = loop[Math.round((phi / (TAU * 2)) * (loop.length - 1))];
    if (!sample) continue;
    states.push({
      index: i + 1,
      phase: baseCyclePhase(phi),
      crankAngleDeg: Math.round((phi * 180) / Math.PI),
      pressureBar: sample.pressureBar,
      volumeCc: sample.volumeCc,
      burnFraction: burnFraction(phi, 1.25),
    });
  }
  return states;
}

export interface SimulatorInputs {
  throttlePct: number;
  altitudeMeters: number;
  afterburner: boolean;
  active: boolean;
}

/**
 * Stateful fixed-step powertrain simulator. It adds crank inertia, turbo lag,
 * thermal warm-up, knock retard and a rev limiter on top of the calibrated
 * operating-point model. Call step() at a fixed 240 Hz for determinism.
 */
export class EngineSimulator {
  readonly engine: EngineType;
  private rpm = 0;
  private crankAngleRad = 0;
  private boostBar = 0;
  private coolantC = 24;
  private oilC = 28;
  private timeSec = 0;
  private knock = 0;
  private revLimiter = false;
  private throttlePct = 0;
  private altitudeMeters = 0;
  private afterburner = false;
  private active = false;

  constructor(engine: EngineType) {
    this.engine = engine;
    const config = this.siConfig();
    if (config) this.rpm = config.idleRpm;
  }

  private siConfig(): SiEngineConfig | null {
    return isSiEngine(this.engine) ? SI_CONFIGS[this.engine] : null;
  }

  private electricConfig(): ElectricMachineConfig | null {
    if (
      this.engine === 'bldc-motor' ||
      this.engine === 'axial-flux-motor' ||
      this.engine === 'induction-motor' ||
      this.engine === 'stepper-motor'
    ) {
      return ELECTRIC_CONFIGS[this.engine];
    }
    return null;
  }

  reset(): void {
    const config = this.siConfig();
    this.rpm = config ? config.idleRpm : 0;
    this.crankAngleRad = 0;
    this.boostBar = 0;
    this.coolantC = 24;
    this.oilC = 28;
    this.timeSec = 0;
    this.knock = 0;
    this.revLimiter = false;
  }

  step(dtInput: number, inputs: SimulatorInputs): void {
    const dt = clamp(finite(dtInput, 0), 0, 0.1);
    if (dt <= 0) return;
    this.throttlePct = clamp(finite(inputs.throttlePct, 0), 0, 100);
    this.altitudeMeters = effectiveAltitude(this.engine, inputs.altitudeMeters);
    this.afterburner = !!inputs.afterburner;
    this.active = !!inputs.active;
    this.timeSec += dt;

    const si = this.siConfig();
    if (si) {
      const throttle = this.throttlePct / 100;
      const targetBase = this.active
        ? si.idleRpm + (si.redlineRpm - si.idleRpm) * Math.pow(throttle, 1.12)
        : 0;
      if (this.revLimiter) {
        this.rpm += (targetBase * 0.9 - this.rpm) * (1 - Math.exp(-dt / 0.28));
        if (this.rpm < si.redlineRpm - 280) this.revLimiter = false;
      } else {
        const target = targetBase;
        const tau = target > this.rpm ? 0.33 : 0.52;
        this.rpm += (target - this.rpm) * (1 - Math.exp(-dt / tau));
        if (this.rpm >= si.redlineRpm - 20) this.revLimiter = true;
      }
      if (!this.active && this.rpm < 4) this.rpm = 0;
      this.crankAngleRad = (this.crankAngleRad + (this.rpm / 60) * TAU * dt) % (TAU * 2);

      const boostTarget = this.active ? boostTargetAtRpm(si, this.rpm, throttle) : 0;
      const boostTau = boostTarget > this.boostBar ? 0.28 + 0.42 * (1 - this.rpm / si.redlineRpm) : 0.16;
      this.boostBar += (boostTarget - this.boostBar) * (1 - Math.exp(-dt / boostTau));

      const load = clamp(throttle, 0, 1);
      const coolantTarget = this.active ? 88 + load * 12 : 24;
      const oilTarget = this.active ? 96 + load * 16 : 28;
      this.coolantC += (coolantTarget - this.coolantC) * (1 - Math.exp(-dt / (this.active ? 32 : 90)));
      this.oilC += (oilTarget - this.oilC) * (1 - Math.exp(-dt / (this.active ? 45 : 110)));

      const knockTarget =
        si.turbo && load > 0.8 && this.rpm < 2900 && this.boostBar > si.maxBoostBar * 0.78
          ? clamp(0.25 + (this.boostBar / si.maxBoostBar) * 0.45 - (this.rpm / 2900) * 0.35, 0, 0.75)
          : 0;
      const knockNoise = 0.9 + Math.sin(this.timeSec * 7.1) * 0.1;
      this.knock += (knockTarget * knockNoise - this.knock) * (1 - Math.exp(-dt / 0.22));
      return;
    }

    const electric = this.electricConfig();
    if (electric) {
      const throttle = this.throttlePct / 100;
      const target = this.active ? electric.maxRpm * Math.pow(throttle, 1.15) : 0;
      const tau = target > this.rpm ? 0.2 : 0.38;
      this.rpm += (target - this.rpm) * (1 - Math.exp(-dt / tau));
      if (!this.active && this.rpm < 2) this.rpm = 0;
      const load = clamp(throttle, 0, 1);
      const tempTarget = this.active ? 28 + load * 58 + (this.rpm / electric.maxRpm) * 16 : 24;
      this.coolantC += (tempTarget - this.coolantC) * (1 - Math.exp(-dt / (this.active ? 38 : 95)));
      this.oilC = this.coolantC + 4;
      this.crankAngleRad = (this.crankAngleRad + (this.rpm / 60) * TAU * dt) % TAU;
      return;
    }

    // Gas-turbine / rotary spool dynamics.
    const maxRpm = this.engine === 'turbofan' ? 11500 : this.engine === 'turbojet' ? 16800 : this.engine === 'turboprop' ? 24000 : this.engine === 'turboshaft' ? 20900 : this.engine === 'airplane-jet' ? 14200 : 9500;
    const idle = this.engine.includes('turbo') || this.engine === 'airplane-jet' ? maxRpm * 0.35 : maxRpm * 0.15;
    const target = this.active ? idle + (maxRpm - idle) * Math.pow(this.throttlePct / 100, 1.2) : 0;
    const tau = target > this.rpm ? 0.55 : 0.85;
    this.rpm += (target - this.rpm) * (1 - Math.exp(-dt / tau));
    this.crankAngleRad = (this.crankAngleRad + (this.rpm / 60) * TAU * dt) % TAU;
    this.coolantC += ((this.active ? 120 + (this.throttlePct / 100) * 480 : 28) - this.coolantC) * (1 - Math.exp(-dt / 14));
  }

  snapshot(): SimulationTelemetry {
    const si = this.siConfig();
    if (si) {
      const snapshot = siTelemetry(
        si,
        this.rpm,
        this.throttlePct,
        this.altitudeMeters,
        this.timeSec,
        {
          knock: this.knock,
          revLimiter: this.revLimiter,
          boostOverrideBar: this.boostBar,
          coolant: this.coolantC,
          oil: this.oilC,
          crankAngleRad: this.crankAngleRad,
        }
      );
      const amb = atmosphereAt(this.altitudeMeters);
      snapshot.manifoldPressureKpa = Number(((amb.pressurePa + this.boostBar * 1e5) / 1000).toFixed(1));
      snapshot.turboRpm = si.turbo ? Math.round(this.boostBar > 0.02 ? 28000 + (this.boostBar / si.maxBoostBar) * 155000 : 0) : 0;
      snapshot.sparkAdvanceDeg = Number(Math.max(2, snapshot.sparkAdvanceDeg - this.knock * 7).toFixed(1));
      snapshot.knockIntensity = Number(this.knock.toFixed(2));
      return snapshot;
    }

    const electric = this.electricConfig();
    if (electric) {
      return electricTelemetry(electric, this.rpm, this.throttlePct, this.timeSec, this.coolantC);
    }

    const state: ViewerState = {
      engine: this.engine,
      mode: 'assembled',
      explode: 0,
      explodeLayout: 'radial',
      spacing: 40,
      cycling: false,
      selectedPiece: null,
      isolatedPiece: null,
      section: 0,
      sectionPlane: { yaw: 0, pitch: 0, flipped: false, showGizmo: false, free: false },
      playing: this.active,
      speed: 1,
      flow: true,
      labels: true,
      grid: true,
      spin: false,
      hidden: [],
      selected: null,
      selectedParts: [],
      isolated: null,
      quality: 'ultra',
      camera: 'perspective',
      reset: 0,
      zoom: 0,
      walkthrough: null,
      throttle: this.throttlePct,
      afterburner: this.afterburner,
      altitude: this.altitudeMeters,
      vectoringPitch: 0,
      audioEnabled: false,
    };
    const base = turbineTelemetry(this.engine, state, this.timeSec);
    base.rpm = Math.round(this.rpm);
    base.coolantTempC = Math.round(this.coolantC);
    base.oilTempC = Math.round(this.coolantC - 8);
    return base;
  }

  getCrankAngle(): number {
    return this.crankAngleRad;
  }

  getPvLoop(): PvPoint[] {
    return getPvLoop(this.engine, this.rpm, this.throttlePct, this.altitudeMeters);
  }

  getCylinderStates(): CylinderState[] {
    return getCylinderStates(this.engine, this.rpm, this.throttlePct, this.altitudeMeters, this.crankAngleRad);
  }
}
