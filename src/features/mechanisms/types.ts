export type EngineType =
  | 'turbofan'
  | 'turbojet'
  | 'turboprop'
  | 'turboshaft'
  | 'v8'
  | 'v12'
  | 'flat6'
  | 'inline4'
  | 'ea888-b8'
  | 'b58'
  | 'rotary'
  | 'bldc-motor'
  | 'axial-flux-motor'
  | 'induction-motor'
  | 'stepper-motor'
  | 'airplane-jet';

export type CyclePhase = 'intake' | 'compression' | 'power' | 'exhaust' | 'n/a';

export interface EngineMeta {
  name: string;
  subtitle: string;
  code: string;
  family: 'Aircraft turbines' | 'Piston engines' | 'Rotary engines' | 'Electric drives' | 'Aerospace systems';
  category: 'AEROSPACE' | 'RECIPROCATING' | 'ROTARY' | 'ELECTROMECHANICAL';
  flow: boolean;
  description: string;
  /** Short architecture badges shown in the catalogue and inspector. */
  tags: string[];
  specs: {
    label: string;
    value: string;
  }[];
}

export interface EnginePart {
  id: string;
  name: string;
  short: string;
  color: string;
  number: string;
  role: string;
  description: string;
  material: string;
  relation: string;
  x: number;
  /** Human-readable subsystem used by the assembly tree. */
  group?: string;
}

export type SectionPlanePreset = 'top' | 'side' | 'front' | 'axis' | 'oblique';

export interface SectionPlaneState {
  yaw: number;
  pitch: number;
  flipped: boolean;
  showGizmo: boolean;
  /** True when cutting all internal hardware in free-angle mode */
  free: boolean;
}

export interface PieceInfo {
  id: string;
  part: string;
  name: string;
}

export interface ExplosionOptions {
  layout: 'radial' | 'inventory';
  spacing: number;
  aspect: number;
  hidden: string[];
  isolated: string | null;
  isolatedPiece: string | null;
}

export interface WalkthroughStation {
  id: string;
  title: string;
  body: string;
  parts: string[];
  hidden?: string[];
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  /** Absolute crank or eccentric-shaft angle in radians */
  mechanismAngle?: number;
}

export interface SimulationTelemetry {
  rpm: number;
  thrustKN: number;
  torqueNm: number;
  powerKW: number;
  fuelFlowKgPerS: number;
  compressionRatio: number;
  turbineInletTempC: number;
  exhaustGasTempC: number;
  thermalEfficiencyPct: number;
  airspeedMach: number;
  altitudeMeters: number;
  throttlePct: number;
  afterburnerActive: boolean;
  vectoringAngleDeg: number;
  /** Absolute intake-manifold pressure, kPa. */
  manifoldPressureKpa: number;
  /** Gauge boost pressure, bar. */
  boostBar: number;
  /** Commanded air-fuel ratio. */
  afr: number;
  /** Excess-air ratio (lambda). */
  lambda: number;
  /** Ignition advance before top dead centre, crank degrees. */
  sparkAdvanceDeg: number;
  /** Brake mean effective pressure, kPa. */
  bmepKpa: number;
  /** Volumetric efficiency, percent. */
  volumetricEfficiencyPct: number;
  /** Turbocharger shaft speed, rpm. */
  turboRpm: number;
  coolantTempC: number;
  oilTempC: number;
  intakeAirTempC: number;
  /** 0 = no knock, 1 = heavy audible knock. */
  knockIntensity: number;
  /** Brake specific fuel consumption, g/kWh. */
  bsfcGPerKwh: number;
  /** DC bus current, A. */
  currentA: number;
  /** DC bus voltage, V. */
  voltageV: number;
  /** Electrical input power, kW. */
  electricalPowerKW: number;
  /** Induction-motor rotor slip, percent. */
  slipPct: number;
  /** Current four-stroke phase of cylinder 1. */
  cyclePhase: CyclePhase;
  /** Crank angle within the 720-degree cycle, degrees. */
  crankAngleDeg: number;
  /** True while the rev limiter is cutting fuel. */
  revLimiterActive: boolean;
}

export interface WalkthroughReturnState {
  mode: ViewerState['mode'];
  explode: number;
  section: number;
  sectionPlane: SectionPlaneState;
  flow: boolean;
  hidden: string[];
  selected: string | null;
  selectedParts: string[];
  isolated: string | null;
  isolatedPiece: string | null;
  playing: boolean;
}

export interface WalkthroughState {
  station: number;
  playing: boolean;
  previousFlow: boolean;
  /** Snapshot captured when the tour starts so exiting restores the prior view. */
  previous?: WalkthroughReturnState;
}

export interface ViewerState {
  engine: EngineType;
  mode: 'assembled' | 'cutaway' | 'exploded' | 'flight-sim';
  explode: number;
  explodeLayout: 'radial' | 'inventory';
  spacing: number;
  cycling: boolean;
  selectedPiece: string | null;
  isolatedPiece: string | null;
  section: number;
  sectionPlane: SectionPlaneState;
  playing: boolean;
  speed: number;
  flow: boolean;
  labels: boolean;
  grid: boolean;
  spin: boolean;
  hidden: string[];
  selected: string | null;
  selectedParts: string[];
  isolated: string | null;
  quality: 'ultra' | 'balanced';
  camera: 'perspective' | 'ortho' | 'side' | 'front' | 'top';
  reset: number;
  zoom: number;
  walkthrough: WalkthroughState | null;
  // Flight & Propulsion simulation inputs
  throttle: number;
  afterburner: boolean;
  altitude: number;
  vectoringPitch: number;
  audioEnabled: boolean;
}
