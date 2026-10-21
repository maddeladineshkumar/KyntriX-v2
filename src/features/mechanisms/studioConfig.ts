import { ENGINES } from './engineData';
import { DEFAULT_SECTION_DEPTH, DEFAULT_SECTION_PLANE } from './sectionPlane';
import type { EnginePart, EngineType, ViewerState } from './types';

export type CameraMode = ViewerState['camera'];
export type QualityMode = ViewerState['quality'];
export type InspectorTab = 'part' | 'engine' | 'telemetry';

export const CAMERA_OPTIONS: { id: CameraMode; label: string; hint: string }[] = [
  { id: 'perspective', label: 'Perspective', hint: 'Natural three-quarter studio view' },
  { id: 'ortho', label: 'Orthographic', hint: 'Parallel projection, true proportions' },
  { id: 'front', label: 'Front', hint: 'Look straight down the rotation axis' },
  { id: 'side', label: 'Side', hint: 'Profile silhouette view' },
  { id: 'top', label: 'Top', hint: 'Plan view from above' },
];

export const QUALITY_OPTIONS: { id: QualityMode; label: string; hint: string }[] = [
  { id: 'ultra', label: 'Ultra', hint: 'Full-resolution shadows and airflow' },
  { id: 'balanced', label: 'Balanced', hint: 'Lower pixel ratio and particle density' },
];

const AEROSPACE_ENGINES = new Set<EngineType>([
  'turbofan',
  'turbojet',
  'turboprop',
  'turboshaft',
  'airplane-jet',
]);

const SHAFT_ENGINES = new Set<EngineType>(['turboprop', 'turboshaft']);

export const PISTON_ENGINES = new Set<EngineType>([
  'v8',
  'v12',
  'flat6',
  'inline4',
  'ea888-b8',
  'b58',
]);

export const ELECTRIC_ENGINES = new Set<EngineType>([
  'bldc-motor',
  'axial-flux-motor',
  'induction-motor',
  'stepper-motor',
]);

export type PistonEngineType = 'v8' | 'v12' | 'flat6' | 'inline4' | 'ea888-b8' | 'b58';

export function isPiston(engine: EngineType): engine is PistonEngineType {
  return PISTON_ENGINES.has(engine);
}

export function isElectric(engine: EngineType): boolean {
  return ELECTRIC_ENGINES.has(engine);
}

export function isRotary(engine: EngineType): boolean {
  return engine === 'rotary';
}

export function isAerospace(engine: EngineType): boolean {
  return AEROSPACE_ENGINES.has(engine);
}

/** Shaft-power turbines are tested on a dyno, not with flight controls. */
export function isFlightTestbed(engine: EngineType): boolean {
  return engine === 'turbofan' || engine === 'turbojet' || engine === 'airplane-jet';
}

export function isShaftEngine(engine: EngineType): boolean {
  return SHAFT_ENGINES.has(engine);
}

export function supportsAfterburner(engine: EngineType): boolean {
  return engine === 'turbojet' || engine === 'airplane-jet';
}

export function supportsVectoring(engine: EngineType): boolean {
  return engine === 'airplane-jet';
}

export function testbedLabel(engine: EngineType): string {
  if (isFlightTestbed(engine)) return 'Flight Testbed';
  if (isShaftEngine(engine)) return 'Shaft Testbed';
  if (isElectric(engine)) return 'Motor Dyno Testbed';
  return 'Dyno Testbed';
}

const TURBINE_GROUPS: Record<string, string> = {
  fan: 'Inlet & Fan',
  compressor: 'Compression',
  combustor: 'Combustion',
  turbine: 'Expansion',
  nozzle: 'Exhaust',
  casing: 'Structure & Casing',
  shaft: 'Drivetrain',
};

const PISTON_GROUPS: Record<string, string> = {
  block: 'Cylinder Block',
  pistons: 'Reciprocating Assembly',
  rods: 'Reciprocating Assembly',
  crankshaft: 'Rotating Assembly',
  heads: 'Cylinder Head & Valvetrain',
  valvetrain: 'Cylinder Head & Valvetrain',
  manifolds: 'Gas Exchange',
  turbo: 'Forced Induction',
  fuel: 'Fuel & Ignition',
  chargecooler: 'Forced Induction',
};

const ROTARY_GROUPS: Record<string, string> = {
  housing: 'Housing & Ports',
  rotor: 'Rotor Assembly',
  seals: 'Rotor Assembly',
  eccentric: 'Rotor Assembly',
  gears: 'Rotor Assembly',
  endplates: 'Housing & Ports',
  ports: 'Housing & Ports',
};

const BLDC_GROUPS: Record<string, string> = {
  stator: 'Stator & Windings',
  windings: 'Stator & Windings',
  rotor: 'Rotor & Shaft',
  shaft: 'Rotor & Shaft',
  gearhead: 'Transmission & Feedback',
  encoder: 'Transmission & Feedback',
  housing: 'Structure & Cooling',
};

const AXIAL_FLUX_GROUPS: Record<string, string> = {
  stator: 'Stator & Windings',
  windings: 'Stator & Windings',
  rotor: 'Rotor & Shaft',
  shaft: 'Rotor & Shaft',
  inverter: 'Power & Feedback',
  encoder: 'Power & Feedback',
  housing: 'Structure & Cooling',
};

const INDUCTION_GROUPS: Record<string, string> = {
  stator: 'Stator & Windings',
  windings: 'Stator & Windings',
  rotor: 'Rotor & Shaft',
  shaft: 'Rotor & Shaft',
  encoder: 'Power & Feedback',
  housing: 'Structure & Cooling',
};

const STEPPER_GROUPS: Record<string, string> = {
  stator: 'Stator & Windings',
  windings: 'Stator & Windings',
  rotor: 'Rotor & Shaft',
  shaft: 'Rotor & Shaft',
  encoder: 'Power & Feedback',
  housing: 'Structure & Cooling',
};

const AIRFRAME_GROUPS: Record<string, string> = {
  fuselage: 'Airframe',
  wings: 'Airframe',
  canopy: 'Airframe',
  engines: 'Propulsion',
  nozzles: 'Propulsion',
  control_surfaces: 'Control & Gear',
  gear: 'Control & Gear',
};

const GROUP_ORDER: Record<EngineType, string[]> = {
  turbofan: ['Inlet & Fan', 'Compression', 'Combustion', 'Expansion', 'Exhaust', 'Structure & Casing', 'Drivetrain'],
  turbojet: ['Inlet & Fan', 'Compression', 'Combustion', 'Expansion', 'Exhaust', 'Structure & Casing', 'Drivetrain'],
  turboprop: ['Power Output', 'Inlet & Fan', 'Compression', 'Combustion', 'Expansion', 'Exhaust', 'Structure & Casing', 'Drivetrain'],
  turboshaft: ['Power Output', 'Inlet & Fan', 'Compression', 'Combustion', 'Expansion', 'Exhaust', 'Structure & Casing', 'Drivetrain'],
  v8: ['Rotating Assembly', 'Reciprocating Assembly', 'Cylinder Block', 'Cylinder Head & Valvetrain', 'Gas Exchange'],
  v12: ['Rotating Assembly', 'Reciprocating Assembly', 'Cylinder Block', 'Cylinder Head & Valvetrain', 'Gas Exchange'],
  flat6: ['Rotating Assembly', 'Reciprocating Assembly', 'Cylinder Block', 'Cylinder Head & Valvetrain', 'Gas Exchange'],
  inline4: [
    'Rotating Assembly',
    'Reciprocating Assembly',
    'Cylinder Block',
    'Cylinder Head & Valvetrain',
    'Forced Induction',
    'Fuel & Ignition',
    'Gas Exchange',
  ],
  'ea888-b8': [
    'Rotating Assembly',
    'Reciprocating Assembly',
    'Cylinder Block',
    'Cylinder Head & Valvetrain',
    'Forced Induction',
    'Fuel & Ignition',
    'Gas Exchange',
  ],
  b58: [
    'Rotating Assembly',
    'Reciprocating Assembly',
    'Cylinder Block',
    'Cylinder Head & Valvetrain',
    'Forced Induction',
    'Fuel & Ignition',
    'Gas Exchange',
  ],
  rotary: ['Rotor Assembly', 'Housing & Ports'],
  'bldc-motor': ['Stator & Windings', 'Rotor & Shaft', 'Transmission & Feedback', 'Structure & Cooling'],
  'axial-flux-motor': ['Stator & Windings', 'Rotor & Shaft', 'Power & Feedback', 'Structure & Cooling'],
  'induction-motor': ['Stator & Windings', 'Rotor & Shaft', 'Power & Feedback', 'Structure & Cooling'],
  'stepper-motor': ['Stator & Windings', 'Rotor & Shaft', 'Power & Feedback', 'Structure & Cooling'],
  'airplane-jet': ['Airframe', 'Propulsion', 'Control & Gear'],
};

export function partGroup(engine: EngineType, partId: string): string {
  if (isPiston(engine)) return PISTON_GROUPS[partId] ?? 'Other';
  if (engine === 'rotary') return ROTARY_GROUPS[partId] ?? 'Other';
  if (engine === 'bldc-motor') return BLDC_GROUPS[partId] ?? 'Other';
  if (engine === 'axial-flux-motor') return AXIAL_FLUX_GROUPS[partId] ?? 'Other';
  if (engine === 'induction-motor') return INDUCTION_GROUPS[partId] ?? 'Other';
  if (engine === 'stepper-motor') return STEPPER_GROUPS[partId] ?? 'Other';
  if (engine === 'airplane-jet') return AIRFRAME_GROUPS[partId] ?? 'Other';
  if ((engine === 'turboprop' || engine === 'turboshaft') && partId === 'fan') {
    return 'Power Output';
  }
  return TURBINE_GROUPS[partId] ?? 'Other';
}

export interface PartGroup {
  label: string;
  parts: EnginePart[];
}

export function getPartGroups(engine: EngineType, parts: EnginePart[]): PartGroup[] {
  const grouped = new Map<string, EnginePart[]>();
  for (const part of parts) {
    const label = partGroup(engine, part.id);
    const list = grouped.get(label);
    if (list) list.push(part);
    else grouped.set(label, [part]);
  }

  const ordered = GROUP_ORDER[engine] ?? [];
  return [...grouped.entries()]
    .sort(([a], [b]) => {
      const ai = ordered.indexOf(a);
      const bi = ordered.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .map(([label, list]) => ({ label, parts: list }));
}

export const STUDIO_STORAGE_KEY = 'kyntrix.mechanisms.preferences.v1';

const MODES: ViewerState['mode'][] = ['assembled', 'cutaway', 'exploded', 'flight-sim'];
const CAMERAS: CameraMode[] = ['perspective', 'ortho', 'side', 'front', 'top'];
const QUALITIES: QualityMode[] = ['ultra', 'balanced'];

function isEngineType(value: unknown): value is EngineType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ENGINES, value);
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Restore only safe presentation preferences; transient selection/tour state is never persisted. */
export function loadStudioPreferences(): Partial<ViewerState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STUDIO_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const data = parsed as Record<string, unknown>;
    const prefs: Partial<ViewerState> = {};

    if (isEngineType(data.engine)) prefs.engine = data.engine;
    if (typeof data.mode === 'string' && MODES.includes(data.mode as ViewerState['mode'])) {
      prefs.mode = data.mode as ViewerState['mode'];
    }
    if (typeof data.camera === 'string' && CAMERAS.includes(data.camera as CameraMode)) {
      prefs.camera = data.camera as CameraMode;
    }
    if (typeof data.quality === 'string' && QUALITIES.includes(data.quality as QualityMode)) {
      prefs.quality = data.quality as QualityMode;
    }
    if (typeof data.flow === 'boolean') prefs.flow = data.flow;
    if (typeof data.labels === 'boolean') prefs.labels = data.labels;
    if (typeof data.grid === 'boolean') prefs.grid = data.grid;
    if (typeof data.speed === 'number' && Number.isFinite(data.speed)) {
      prefs.speed = [0.25, 0.5, 1, 2].includes(data.speed) ? data.speed : 1;
    }
    if (typeof data.throttle === 'number') {
      prefs.throttle = finiteNumber(data.throttle, 65, 0, 100);
    }
    if (typeof data.altitude === 'number') {
      prefs.altitude = finiteNumber(data.altitude, 3500, 0, 18000);
    }
    if (typeof data.vectoringPitch === 'number') {
      prefs.vectoringPitch = finiteNumber(data.vectoringPitch, 0, -20, 20);
    }
    return prefs;
  } catch {
    return {};
  }
}

export function saveStudioPreferences(state: ViewerState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({
        engine: state.engine,
        mode: state.mode,
        camera: state.camera,
        quality: state.quality,
        flow: state.flow,
        labels: state.labels,
        grid: state.grid,
        speed: state.speed,
        throttle: state.throttle,
        altitude: state.altitude,
        vectoringPitch: state.vectoringPitch,
      })
    );
  } catch {
    // Storage can be unavailable in private browsing or sandboxed frames.
  }
}

export function resetViewState(state: ViewerState): ViewerState {
  return {
    ...state,
    mode: 'assembled',
    explode: 0,
    section: DEFAULT_SECTION_DEPTH,
    sectionPlane: { ...DEFAULT_SECTION_PLANE },
    hidden: [],
    isolated: null,
    isolatedPiece: null,
    selected: null,
    selectedPiece: null,
    selectedParts: [],
    walkthrough: null,
    playing: false,
    afterburner: false,
    vectoringPitch: 0,
    reset: state.reset + 1,
    zoom: 0,
  };
}
