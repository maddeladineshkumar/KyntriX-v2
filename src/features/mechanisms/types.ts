export type EngineType =
  | 'turbofan'
  | 'turbojet'
  | 'turboprop'
  | 'turboshaft'
  | 'v8'
  | 'inline4'
  | 'rotary'
  | 'bldc-motor'
  | 'airplane-jet';

export interface EngineMeta {
  name: string;
  subtitle: string;
  code: string;
  family: 'Aircraft turbines' | 'Piston engines' | 'Rotary engines' | 'Electric drives' | 'Aerospace systems';
  category: 'AEROSPACE' | 'RECIPROCATING' | 'ROTARY' | 'ELECTROMECHANICAL';
  flow: boolean;
  description: string;
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
