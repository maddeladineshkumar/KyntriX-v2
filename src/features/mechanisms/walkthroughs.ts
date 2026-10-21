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

function v12Tour(): WalkthroughStation[] {
  const offset = -Math.PI / 6;
  return [
    {
      ...makeStation(
        'banks',
        'Two 60° Banks, One Crankcase',
        'Six cylinders per bank sit at a 60-degree included angle on a shared aluminium crankcase. The narrow angle keeps the V12 compact enough to package behind the cabin while the opposed banks cancel most first-order shaking forces.',
        ['block', 'heads'],
        -2.4,
        offset + Math.PI / 2
      ),
      camera: { position: [-9.5, 6.5, 10], target: [-1.2, 0.8, 0] },
    },
    {
      ...makeStation(
        'intake',
        '1. Intake — Individual Throttle Bodies',
        'Each of the twelve cylinders draws through its own throttle body and a tuned trumpet. The intake cam opens the valve just before TDC as the piston accelerates down the bore, filling the cylinder with a high-velocity air column.',
        ['pistons', 'valvetrain', 'manifolds'],
        -2.4,
        offset + Math.PI / 2
      ),
      camera: { position: [-8.8, 6.2, 9.5], target: [-2.4, 1, 0] },
    },
    {
      ...makeStation(
        'compression',
        '2. Compression to 11.8 : 1',
        'Both valves seal at BDC. The piston sweeps upward and squeezes the charge into a compact pent-roof chamber with a centrally mounted spark plug, raising pressure and temperature without detonation on 98 RON fuel.',
        ['pistons', 'heads', 'valvetrain'],
        -2.4,
        offset + (3 * Math.PI) / 2
      ),
      camera: { position: [-8.8, 6.2, 9.5], target: [-2.4, 1, 0] },
    },
    {
      ...makeStation(
        'power',
        '3. Power — A Pulse Every 60°',
        'Ignition sweeps across the banks in a 1-7-5-11-3-9-6-12-2-8-4-10 sequence. With twelve cylinders on six throws spaced 60 degrees apart, the next power pulse arrives before the previous one fades — the source of the V12\'s seamless pull.',
        ['heads', 'pistons', 'rods'],
        -2.4,
        offset + (5 * Math.PI) / 2
      ),
      camera: { position: [-8.2, 6, 9.5], target: [-1.4, 1, 0] },
    },
    {
      ...makeStation(
        'crankshaft',
        'Six-Throw Billet Crankshaft',
        'Six crankpins at 60-degree spacing place a firing event every 60 crank degrees. Counterweights and a light flywheel let the engine accelerate from 850 rpm idle to an 8,700 rpm redline almost instantly.',
        ['rods', 'crankshaft'],
        0,
        offset + (5 * Math.PI) / 2
      ),
      camera: { position: [-7.5, 6, 10], target: [0, 0.9, 0] },
    },
  ];
}

function flatSixTour(): WalkthroughStation[] {
  const offset = -Math.PI / 2;
  return [
    {
      ...makeStation(
        'opposed',
        'Horizontally Opposed Boxer Layout',
        'Three cylinders face three more across a shared crankcase. Opposed pistons move outward in mirrored pairs, so the first-order shaking forces cancel and the flat mass sits lower than any inline engine of the same displacement.',
        ['block', 'pistons'],
        -1.36,
        offset + Math.PI / 2
      ),
      camera: { position: [-8, 5.5, 9.5], target: [-0.6, 0.4, 0] },
    },
    {
      ...makeStation(
        'intake',
        '1. Intake — Short, Direct Ports',
        'Air passes an individual throttle body and turns through a short, downdraft port aimed straight at the back of the intake valve. The direct path keeps pumping losses low even at 9,000 rpm.',
        ['pistons', 'valvetrain', 'manifolds'],
        -1.36,
        offset + Math.PI / 2
      ),
      camera: { position: [-7.4, 5, 9], target: [-1.36, 0.6, 0] },
    },
    {
      ...makeStation(
        'compression',
        '2. Compression at 13.3 : 1',
        'The boxer chamber runs a high 13.3:1 compression ratio thanks to central direct injection and efficient charge cooling. Squish bands around the flat piston crown accelerate the burn.',
        ['pistons', 'heads', 'valvetrain'],
        -1.36,
        offset + (3 * Math.PI) / 2
      ),
      camera: { position: [-7.4, 5, 9], target: [-1.36, 0.6, 0] },
    },
    {
      ...makeStation(
        'power',
        '3. Power — 120° Firing Interval',
        'The 1-6-2-4-3-5 firing order alternates banks every 120 degrees. Each pair of opposed pistons reaches top dead centre together, but fires one crankshaft revolution apart, giving the flat-six its hard, ripping exhaust note.',
        ['heads', 'pistons', 'rods'],
        -1.36,
        offset + (5 * Math.PI) / 2
      ),
      camera: { position: [-7.6, 5.2, 9.2], target: [-0.8, 0.8, 0] },
    },
    {
      ...makeStation(
        'crankshaft',
        'Three-Throw Crankshaft & Dry Sump',
        'Only three throws at 120 degrees carry all six rods, keeping the crank short and stiff. A dry-sump pump scavenges oil from the flat sump so the boxer keeps pressure under sustained cornering load.',
        ['rods', 'crankshaft', 'block'],
        0,
        offset + (5 * Math.PI) / 2
      ),
      camera: { position: [-7, 5, 9], target: [0, 0.4, 0] },
    },
  ];
}

function turboPistonTour(engine: 'ea888-b8' | 'b58'): WalkthroughStation[] {
  const b58 = engine === 'b58';
  const ratio = b58 ? '11.0:1' : '9.6:1';
  const boost = b58 ? '1.3 bar' : '1.2 bar';
  return [
    {
      ...makeStation(
        'intake',
        '1. Intake Stroke & Charge Cooling',
        `The piston descends from TDC to BDC while the intake valves open. The turbocharger has already compressed the charge to ${boost}; the intercooler then removes compressor heat to densify the air and suppress knock.`,
        ['pistons', 'valvetrain', 'turbo', 'chargecooler'],
        -1.8,
        Math.PI / 2
      ),
      camera: { position: [-7.8, 6, 9], target: [-1.8, 1, 0] },
    },
    {
      ...makeStation(
        'compression',
        '2. Compression Stroke & Direct Injection',
        `Both valves seal as the piston rises. The ${b58 ? '350-bar' : '150-bar'} direct-injection system sprays fuel late in the stroke, using charge cooling to allow a ${ratio} compression ratio on pump fuel.`,
        ['pistons', 'heads', 'valvetrain', 'fuel'],
        -1.8,
        (3 * Math.PI) / 2
      ),
      camera: { position: [-7.8, 6, 9], target: [-1.8, 1, 0] },
    },
    {
      ...makeStation(
        'power',
        '3. Combustion & Power Stroke',
        'A powerful spark initiates a fast burn. Peak cylinder pressure acts on the piston crown and is converted into crank torque through the connecting rod. Knock feedback retards spark if detonation is detected.',
        ['heads', 'pistons', 'rods'],
        -1.8,
        (5 * Math.PI) / 2
      ),
      camera: { position: [-7.8, 6, 9], target: [-1.8, 1, 0] },
    },
    {
      ...makeStation(
        'exhaust',
        '4. Exhaust Stroke & Turbine Drive',
        'The exhaust valve opens and the piston sweeps out spent gas. Hot, high-enthalpy exhaust enters the turbine housing, spinning the compressor that feeds the next intake event.',
        ['pistons', 'valvetrain', 'manifolds', 'turbo'],
        -1.8,
        (7 * Math.PI) / 2
      ),
      camera: { position: [-7.8, 6, 9], target: [-1.8, 1, 0] },
    },
    {
      ...makeStation(
        'turbo',
        b58 ? 'Twin-Scroll Turbine & Wastegate' : 'Water-Cooled K03 Turbocharger',
        b58
          ? 'The twin-scroll volute keeps cylinders 1–3 and 4–6 in separate scrolls, preserving exhaust pulse energy for quicker spool. An electronic wastegate holds boost at 1.3 bar.'
          : 'Exhaust pulses spin a compact BorgWarner K03 turbine. A water-cooled centre housing protects the bearings during hot shutdown, while the wastegate regulates 1.2 bar of boost.',
        ['turbo', 'manifolds'],
        2.4,
        (5 * Math.PI) / 2
      ),
      camera: { position: [4.2, 4.5, 8], target: [2.4, 0.6, 0] },
    },
    {
      ...makeStation(
        'crankshaft',
        b58 ? 'Seven-Main-Bearing Forged Crankshaft' : 'Forged Crank & Balance Shafts',
        b58
          ? 'A forged crankshaft runs in seven main bearings to tame the long inline-six crank. Even 120° firing intervals give the B58 its turbine-smooth power delivery.'
          : 'A forged crankshaft converts four power pulses per cycle into torque. Chain-driven balance shafts cancel the second-order shaking forces inherent to a large-bore inline-four.',
        ['rods', 'crankshaft', 'block'],
        0,
        (5 * Math.PI) / 2
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
  v12: v12Tour(),
  flat6: flatSixTour(),
  inline4: pistonTour(false),
  'ea888-b8': turboPistonTour('ea888-b8'),
  b58: turboPistonTour('b58'),
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
  'axial-flux-motor': [
    {
      id: 'stators',
      title: 'Twin Yokeless Stator Discs',
      body: 'Two segmented stator cores face each other across the rotor. Removing the traditional iron yoke shortens the magnetic circuit, cutting core mass and axial length while raising torque density.',
      parts: ['stator', 'windings'],
      camera: { position: [-4.5, 3.5, 6], target: [0, 0, 0] },
    },
    {
      id: 'rotor',
      title: 'Carbon-Fibre Magnet Rotor',
      body: 'A thin carbon-fibre disc carries segmented NdFeB magnets between the stators. Because the rotor has no active iron, eddy-current loss is minimal and the machine spins to 12,000 rpm.',
      parts: ['rotor', 'shaft'],
      camera: { position: [-3.5, 2.5, 5], target: [0, 0, 0] },
    },
    {
      id: 'inverter',
      title: 'SiC Inverter & Field-Oriented Control',
      body: 'Silicon-carbide MOSFETs switch the 400 V bus into three-phase currents. The controller tracks rotor angle from the resolver and commands torque-producing current independently of flux.',
      parts: ['inverter', 'encoder', 'housing'],
      camera: { position: [-4.5, 3.5, 5], target: [0, 0.4, 0] },
    },
  ],
  'induction-motor': [
    {
      id: 'stator',
      title: 'Laminated Stator & Distributed Windings',
      body: 'Insulated silicon-steel laminations form a low-loss flux path. Three-phase distributed windings produce a smooth rotating magnetomotive force across 48 slots.',
      parts: ['stator', 'windings'],
      camera: { position: [-4.5, 3.5, 6], target: [0, 0, 0] },
    },
    {
      id: 'rotor',
      title: 'Copper Squirrel-Cage Rotor',
      body: 'The rotating field induces current in solid copper bars shorted by end rings. Interaction with the stator field produces torque only when the rotor slips slightly behind synchronous speed.',
      parts: ['rotor', 'shaft'],
      camera: { position: [-3.5, 2.5, 5], target: [0, 0, 0] },
    },
    {
      id: 'control',
      title: 'Vector Control & Slip Estimation',
      body: 'The inverter estimates rotor flux and slip from the encoder, then independently regulates magnetizing and torque current. Field weakening extends operation to 14,000 rpm.',
      parts: ['encoder', 'housing'],
      camera: { position: [-4.5, 3.5, 5], target: [0, 0.4, 0] },
    },
  ],
  'stepper-motor': [
    {
      id: 'stator',
      title: 'Eight-Pole Toothed Stator',
      body: 'Eight salient poles carry fine teeth. Energizing opposing pole pairs in sequence pulls the rotor to the nearest stable tooth alignment, defining each discrete step.',
      parts: ['stator', 'windings'],
      camera: { position: [-4, 3, 5.5], target: [0, 0, 0] },
    },
    {
      id: 'rotor',
      title: 'Hybrid Rotor & 1.8° Step Geometry',
      body: 'Two offset toothed cups sandwich an axially magnetized permanent magnet. The 50-tooth pattern produces 200 full steps per revolution, or 0.9° per half step.',
      parts: ['rotor', 'shaft'],
      camera: { position: [-3.2, 2.2, 4.8], target: [0, 0, 0] },
    },
    {
      id: 'feedback',
      title: 'Microstepping & Closed-Loop Option',
      body: 'A chopper drive proportions current between phases to microstep between detents. The rear encoder adds stall detection and step-loss recovery for demanding motion axes.',
      parts: ['encoder', 'housing'],
      camera: { position: [-4, 3, 4.8], target: [0, 0.3, 0] },
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
