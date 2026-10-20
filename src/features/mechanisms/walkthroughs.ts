import { DEFAULT_SECTION_PLANE } from './sectionPlane';
import type { EngineType, ViewerState, WalkthroughStation } from './types';

const makeStation = (
  id: string,
  title: string,
  body: string,
  parts: string[],
  x: number,
  mechanismAngle?: number
): WalkthroughStation => ({
  id,
  title,
  body,
  parts,
  camera: { position: [x - 6, 5, 10], target: [x, 0, 0] },
  mechanismAngle,
});

const compressor = makeStation(
  'compressor',
  'Multi-Stage Axial Compression',
  'Interleaved rotating rotor blades and stationary stator vanes progressively squeeze air into dense, high-pressure mass flow prior to entering the combustor.',
  ['compressor'],
  -0.6
);

const combustor = makeStation(
  'combustor',
  'Continuous Annular Combustion',
  'High-pressure fuel is atomized and ignited in an annular chamber. Effusion air cooling maintains liner integrity at gas temperatures exceeding 1,700°C.',
  ['combustor'],
  1.55
);

const turbine = makeStation(
  'turbine',
  'Thermal Enthalpy Extraction',
  'Blistering expansion gas drives high- and low-pressure turbine disks, transferring shaft work via concentric drive shafts forward to the compressor and fan.',
  ['turbine', 'shaft'],
  2.95
);

const jet = makeStation(
  'nozzle',
  'Supersonic Jet Acceleration',
  'Convergent-divergent exit geometry accelerates exhausted mass flow rearward at high velocity to generate forward reaction thrust.',
  ['nozzle'],
  4.45
);

function shaftTour(propeller: boolean): WalkthroughStation[] {
  return [
    makeStation(
      'inlet',
      'Core Inlet Guide',
      'Inlet air is guided directly into the compressor face without bypass separation.',
      ['casing', 'compressor'],
      -2.7
    ),
    compressor,
    combustor,
    makeStation(
      'turbine',
      'Dual-Spool Power Turbine',
      'Gas generator stages drive the compressor; an independent free power turbine captures the remaining enthalpy to drive the reduction shaft.',
      ['turbine', 'shaft'],
      2.95
    ),
    makeStation(
      'output',
      propeller ? 'Planetary Gearbox & Propeller' : 'Splined Power Take-Off Flange',
      propeller
        ? 'Two-stage planetary reduction lowers turbine RPM to 1,020 RPM, turning 5 twisted scimitar composite propeller blades.'
        : 'High-torque reduction gearing turns a splined output flange connected to external helicopter rotor or industrial transmissions.',
      ['fan', 'shaft'],
      -3.5
    ),
    makeStation(
      'exhaust',
      'Discharge Ducting',
      'Divergent exhaust stacks route spent gases overboard with minimal backpressure.',
      ['nozzle'],
      4.4
    ),
  ];
}

function pistonTour(v8: boolean): WalkthroughStation[] {
  const offset = v8 ? -Math.PI / 4 : 0;
  return [
    {
      ...makeStation(
        'intake',
        '1. Intake Stroke (Downward Travel)',
        'Cylinder 1 piston travels down from Top Dead Center (TDC) to Bottom Dead Center (BDC), drawing in fresh atmospheric charge through the opened intake valves.',
        ['pistons', 'valvetrain', 'manifolds'],
        -1.8,
        offset + Math.PI / 2
      ),
      camera: { position: [-7.8, 6, 9], target: [-1.8, 1, 0] },
    },
    {
      ...makeStation(
        'compression',
        '2. Compression Stroke (Upward Squeeze)',
        'Both intake and exhaust valves seal tightly. The piston ascends toward TDC, compressing the trapped fuel-air charge to 12 atmospheres.',
        ['pistons', 'heads', 'valvetrain'],
        -1.8,
        offset + (3 * Math.PI) / 2
      ),
      camera: { position: [-7.8, 6, 9], target: [-1.8, 1, 0] },
    },
    {
      ...makeStation(
        'power',
        '3. Combustion & Power Stroke',
        'Spark ignition triggers rapid deflagration. Expanding combustion gases deliver tremendous peak force onto the piston crown, driving the connecting rod down.',
        ['heads', 'pistons', 'rods'],
        -1.8,
        offset + (5 * Math.PI) / 2
      ),
      camera: { position: [-7.8, 6, 9], target: [-1.8, 1, 0] },
    },
    {
      ...makeStation(
        'exhaust',
        '4. Exhaust Stroke (Scavenging)',
        'The exhaust valve opens as the piston sweeps upward, expelling spent gases into the tuned exhaust headers.',
        ['pistons', 'valvetrain', 'manifolds'],
        -1.8,
        offset + (7 * Math.PI) / 2
      ),
      camera: { position: [-7.8, 6, 9], target: [-1.8, 1, 0] },
    },
    {
      ...makeStation(
        'crankshaft',
        'Cross-Plane Crankshaft & Inertia',
        v8
          ? 'Counterweighted cross-plane crankshaft balances second-order reciprocating forces, while the heavy flywheel smooths torque pulsations across 8 cylinders.'
          : 'Flat-plane crankshaft with paired 180° crank throws smooths cyclic torque output to the driveline.',
        ['rods', 'crankshaft'],
        0,
        offset + (5 * Math.PI) / 2
      ),
      camera: { position: [-6, 6, 9], target: [0, 1, 0] },
    },
  ];
}

export const WALKTHROUGHS: Record<EngineType, WalkthroughStation[]> = {
  turbofan: [
    makeStation(
      'inlet',
      'Inlet Cowl & Aerodynamic Lip',
      'Smooth aerofoil lip decelerates incoming freestream air, minimizing boundary layer separation before entering the fan stage.',
      ['fan', 'casing'],
      -3.6
    ),
    makeStation(
      'fan',
      'Wide-Chord Titanium Bypass Fan',
      'Over 85% of total airflow bypasses the core entirely through outer ducts, delivering unmatched propulsive efficiency and quiet operation.',
      ['fan', 'casing'],
      -2.8
    ),
    compressor,
    combustor,
    {
      ...turbine,
      body: 'Dual coaxial spools: high-pressure turbine drives the core compressor; low-pressure multi-stage turbine drives the massive front fan.',
    },
    jet,
  ],
  turbojet: [
    makeStation(
      'inlet',
      'Supersonic Intake Ramp',
      'Diffuser structures compress and guide all inlet flow directly through the core compressor without bypass loss.',
      ['fan'],
      -3.1
    ),
    compressor,
    combustor,
    turbine,
    jet,
  ],
  turboprop: shaftTour(true),
  turboshaft: shaftTour(false),
  v8: pistonTour(true),
  inline4: pistonTour(false),
  rotary: [
    {
      id: 'epitrochoid',
      title: 'Epitrochoid Combustion Chamber',
      body: 'The housing follows a mathematical 2-lobed epitrochoid. The three apexes of the Reuleaux rotor continuously trace this surface, creating 3 isolated moving volumes.',
      parts: ['housing'],
      hidden: ['endplates'],
      mechanismAngle: 0,
      camera: { position: [-8, 3, 5], target: [0, 0, 0] },
    },
    {
      id: 'rotor',
      title: 'Three-Apex Triangular Rotor',
      body: 'Each flank of the rotor acts like a piston face. The rotor performs an eccentric orbit around the output shaft at exactly 1/3 of the shaft speed.',
      parts: ['rotor', 'seals'],
      hidden: ['endplates'],
      mechanismAngle: Math.PI / 2,
      camera: { position: [-7, 2, 4], target: [0, 0.2, 0.3] },
    },
    {
      id: 'eccentric',
      title: 'Eccentric Shaft & Phasing Gears',
      body: 'Internal rotor gear meshes with stationary spur gear at a 3:2 ratio, strictly enforcing smooth continuous rotary translation into pure shaft torque.',
      parts: ['eccentric', 'gears'],
      hidden: ['endplates'],
      mechanismAngle: Math.PI,
      camera: { position: [-6, 2, 4], target: [0, 0, 0] },
    },
  ],
  'bldc-motor': [
    {
      id: 'stator',
      title: '12-Slot Concentrated Stator',
      body: 'Thin silicon steel laminations minimize eddy currents. 12 tooth cores are wound with concentrated copper wire coils for high magnetic flux density.',
      parts: ['stator', 'windings'],
      camera: { position: [-4, 3, 6], target: [0, 0, 0] },
    },
    {
      id: 'rotor',
      title: '14-Pole Permanent Magnet Rotor',
      body: 'High-energy neodymium permanent magnets generate strong radial magnetic flux. Sinusoidal 3-phase currents create a synchronous rotating field.',
      parts: ['rotor', 'shaft'],
      camera: { position: [-3, 2, 5], target: [0, 0, 0] },
    },
    {
      id: 'gearhead',
      title: 'Planetary Gearhead & Encoder',
      body: 'Integrated high-reduction zero-backlash planetary stage multiplies torque for robotic arm joints, monitored by a high-resolution magnetic angle encoder.',
      parts: ['gearhead', 'encoder', 'housing'],
      camera: { position: [-4, 3, 5], target: [0, 0, 0] },
    },
  ],
  'airplane-jet': [
    {
      id: 'airframe',
      title: 'Supersonic Airframe & Supercritical Wings',
      body: 'Carbon-composite blended wing-body with variable camber winglets reduces transonic drag while maximizing lift-to-drag ratio.',
      parts: ['fuselage', 'wings', 'canopy'],
      camera: { position: [-12, 6, 14], target: [0, 0, 0] },
    },
    {
      id: 'propulsion',
      title: 'Twin Turbofan Engines & Afterburner',
      body: 'Dual engines generate massive propulsive thrust. Wet reheat injects fuel directly into the exhaust duct for supersonic dash capability.',
      parts: ['engines', 'nozzles'],
      camera: { position: [-6, 3, 8], target: [1, 0, 0] },
    },
    {
      id: 'dynamics',
      title: '3D Thrust Vectoring & Control Surfaces',
      body: 'Coordinated ailerons, elevators, twin all-moving rudders, and ±20° thrust vectoring nozzles allow high angles of attack and extreme post-stall maneuverability.',
      parts: ['nozzles', 'control_surfaces', 'gear'],
      camera: { position: [-8, 4, 10], target: [2, 0, 0] },
    },
  ],
};

export function startWalkthrough(state: ViewerState): ViewerState {
  const stations = WALKTHROUGHS[state.engine];
  if (!stations || !stations.length) return state;
  const station = stations[0];
  return {
    ...state,
    walkthrough: {
      station: 0,
      playing: true,
      previousFlow: state.flow,
      previous: {
        mode: state.mode,
        explode: state.explode,
        section: state.section,
        sectionPlane: { ...state.sectionPlane },
        flow: state.flow,
        hidden: [...state.hidden],
        selected: state.selected,
        selectedParts: [...state.selectedParts],
        isolated: state.isolated,
        isolatedPiece: state.isolatedPiece,
        playing: state.playing,
      },
    },
    mode: 'cutaway',
    explode: 0,
    hidden: station.hidden ?? [],
    selected: null,
    selectedParts: station.parts,
    isolated: null,
    isolatedPiece: null,
    selectedPiece: null,
    section: 52,
    sectionPlane: { ...DEFAULT_SECTION_PLANE },
    flow: false,
    playing: false,
    cycling: false,
  };
}

export function exitWalkthrough(state: ViewerState): ViewerState {
  if (!state.walkthrough) return state;
  const previous = state.walkthrough.previous;
  return {
    ...state,
    walkthrough: null,
    mode: previous?.mode ?? state.mode,
    explode: previous?.explode ?? state.explode,
    section: previous?.section ?? state.section,
    sectionPlane: previous ? { ...previous.sectionPlane } : state.sectionPlane,
    flow: previous?.flow ?? state.walkthrough?.previousFlow ?? state.flow,
    hidden: previous ? [...previous.hidden] : [],
    selected: previous?.selected ?? null,
    selectedParts: previous ? [...previous.selectedParts] : [],
    isolated: previous?.isolated ?? null,
    isolatedPiece: previous?.isolatedPiece ?? null,
    playing: previous?.playing ?? state.playing,
  };
}

export function stepWalkthrough(state: ViewerState, delta: number): ViewerState {
  if (!state.walkthrough) return state;
  const stations = WALKTHROUGHS[state.engine];
  if (!stations || !stations.length) return state;
  const next = Math.max(0, Math.min(stations.length - 1, state.walkthrough.station + delta));
  const station = stations[next];
  return {
    ...state,
    walkthrough: {
      ...state.walkthrough,
      station: next,
      playing: false,
    },
    selectedParts: station.parts,
    hidden: station.hidden ?? [],
  };
}

export function advanceWalkthrough(state: ViewerState): ViewerState {
  if (!state.walkthrough) return state;
  const stations = WALKTHROUGHS[state.engine];
  if (!stations || !stations.length) return state;
  const next = state.walkthrough.station + 1;
  if (next >= stations.length) {
    return {
      ...state,
      walkthrough: {
        ...state.walkthrough,
        playing: false,
      },
    };
  }
  const station = stations[next];
  return {
    ...state,
    walkthrough: {
      ...state.walkthrough,
      station: next,
    },
    selectedParts: station.parts,
    hidden: station.hidden ?? [],
  };
}
