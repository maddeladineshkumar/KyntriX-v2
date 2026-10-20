import type { EngineType, EngineMeta, EnginePart } from './types';

export const ENGINES: Record<EngineType, EngineMeta> = {
  turbofan: {
    name: 'Turbofan',
    subtitle: 'High-bypass · Two-spool Aviation Gas Turbine',
    code: 'TF-01',
    family: 'Aircraft turbines',
    category: 'AEROSPACE',
    flow: true,
    description:
      'A large front fan propels air through two distinct passages: the central gas generator core and the surrounding annular bypass duct. Dual concentric shafts independently drive low- and high-pressure compression systems.',
    specs: [
      { label: 'Bypass Ratio', value: '11.5 : 1' },
      { label: 'Pressure Ratio', value: '44 : 1' },
      { label: 'Max Thrust', value: '315 kN (70,800 lbf)' },
      { label: 'Thermal Efficiency', value: '54.2%' },
    ],
  },
  turbojet: {
    name: 'Turbojet',
    subtitle: 'Axial-flow · Single-spool Supersonic Core',
    code: 'TJ-02',
    family: 'Aircraft turbines',
    category: 'AEROSPACE',
    flow: true,
    description:
      'All incoming intake air traverses the engine core. A multi-stage axial compressor, annular combustor, and single-shaft expansion turbine discharge through a convergent-divergent supersonic nozzle.',
    specs: [
      { label: 'Bypass Ratio', value: '0.0 (Pure Core)' },
      { label: 'Pressure Ratio', value: '28 : 1' },
      { label: 'Max Thrust', value: '125 kN (Dry) / 185 kN (Reheat)' },
      { label: 'Jet Velocity', value: '720 m/s' },
    ],
  },
  turboprop: {
    name: 'Turboprop',
    subtitle: 'Propeller Drive · Epicyclic Reduction Gearbox',
    code: 'TP-03',
    family: 'Aircraft turbines',
    category: 'AEROSPACE',
    flow: true,
    description:
      'A gas turbine power section delivers extreme torque to a variable-pitch five-bladed composite propeller through a two-stage planetary epicyclic reduction gearbox.',
    specs: [
      { label: 'Shaft Power', value: '3,800 kW (5,100 shp)' },
      { label: 'Gearbox Ratio', value: '13.8 : 1' },
      { label: 'Propeller RPM', value: '1,020 RPM' },
      { label: 'Specific Fuel Consumption', value: '0.245 kg/kWh' },
    ],
  },
  turboshaft: {
    name: 'Turboshaft',
    subtitle: 'Free Power Turbine · Splined Mechanical Take-Off',
    code: 'TS-04',
    family: 'Aircraft turbines',
    category: 'AEROSPACE',
    flow: true,
    description:
      'A gas generator drives an aerodynamically decoupled free power turbine. An external splined output flange transmits high mechanical torque to helicopter rotor transmissions or industrial drivelines.',
    specs: [
      { label: 'Continuous Power', value: '1,950 kW (2,615 shp)' },
      { label: 'Free Turbine RPM', value: '20,900 RPM' },
      { label: 'Output Shaft RPM', value: '6,000 RPM' },
      { label: 'Power-to-Weight', value: '7.8 kW/kg' },
    ],
  },
  v8: {
    name: 'V8 Cross-Plane',
    subtitle: '90° Cylinder Bank · Forged Cross-Plane Crankshaft',
    code: 'V8-05',
    family: 'Piston engines',
    category: 'RECIPROCATING',
    flow: false,
    description:
      'Two banks of four cylinders disposed at 90 degrees drive a cross-plane crankshaft with counterweights. Heavy forged connecting rods convert reciprocating piston thrust into high output torque.',
    specs: [
      { label: 'Displacement', value: '5,038 cc (5.0L)' },
      { label: 'Bore × Stroke', value: '93.0 mm × 92.7 mm' },
      { label: 'Compression Ratio', value: '12.0 : 1' },
      { label: 'Max Output', value: '375 kW (503 HP) @ 7,500 RPM' },
    ],
  },
  inline4: {
    name: 'Inline-Four DOHC',
    subtitle: 'Four Cylinders · Double Overhead Camshafts · 16V',
    code: 'I4-06',
    family: 'Piston engines',
    category: 'RECIPROCATING',
    flow: false,
    description:
      'Four cylinders aligned in a single row actuate a 180° flat-plane crankshaft. Outer pistons (1 & 4) reciprocate opposite inner pistons (2 & 3), driven by chain-timed twin overhead camshafts.',
    specs: [
      { label: 'Displacement', value: '1,998 cc (2.0L Turbo)' },
      { label: 'Valvetrain', value: 'DOHC 16-Valve Dual VVT' },
      { label: 'Max Output', value: '225 kW (302 HP) @ 6,800 RPM' },
      { label: 'Peak Torque', value: '400 N·m @ 2,500–4,500 RPM' },
    ],
  },
  rotary: {
    name: 'Wankel Rotary',
    subtitle: 'Twin-Epitrochoid Housing · Three-Apex Rotor',
    code: 'RE-07',
    family: 'Rotary engines',
    category: 'ROTARY',
    flow: false,
    description:
      'A triangular Reuleaux rotor orbits inside an epitrochoidal combustion chamber. The eccentric shaft rotates at three times rotor speed, yielding continuous intake, compression, combustion, and exhaust cycles without reciprocating inertia.',
    specs: [
      { label: 'Chamber Volume', value: '2 × 654 cc (1.3L)' },
      { label: 'Eccentric Ratio', value: '3 : 1 (Shaft to Rotor)' },
      { label: 'Redline', value: '9,500 RPM' },
      { label: 'Apex Velocity', value: '32.4 m/s @ 9,000 RPM' },
    ],
  },
  'bldc-motor': {
    name: 'High-Torque BLDC Motor',
    subtitle: '12-Slot 14-Pole Actuator · Robotic Joint Drive',
    code: 'EM-08',
    family: 'Electric drives',
    category: 'ELECTROMECHANICAL',
    flow: true,
    description:
      'A precision brushless DC permanent magnet synchronous motor with concentrated copper stator windings, Halbach neodymium rotor ring, magnetic encoder, and planetary gearhead for high-torque robotics actuation.',
    specs: [
      { label: 'Configuration', value: '12S14P Outrunner / Inrunner' },
      { label: 'Continuous Torque', value: '45 N·m (Peak 120 N·m)' },
      { label: 'Nominal Voltage', value: '48 VDC' },
      { label: 'Electrical Efficiency', value: '94.8%' },
    ],
  },
  'airplane-jet': {
    name: 'AeroJet-X Aircraft',
    subtitle: 'Twin-Turbofan Flight Propulsion & Dynamics Testbed',
    code: 'AJ-09',
    family: 'Aerospace systems',
    category: 'AEROSPACE',
    flow: true,
    description:
      'Full flight airframe incorporating dual turbofan nacelles, thrust-vectoring exhaust nozzles, variable sweep wings, control surfaces (elevators, ailerons, rudders), and real-time aerodynamic lift-drag telemetry.',
    specs: [
      { label: 'Max Airspeed', value: 'Mach 2.2 (2,335 km/h)' },
      { label: 'Service Ceiling', value: '18,500 m (60,700 ft)' },
      { label: 'Thrust-to-Weight', value: '1.24 : 1' },
      { label: 'Thrust Vectoring', value: '±20° Pitch & Yaw' },
    ],
  },
};

const makePart = (
  id: string,
  name: string,
  short: string,
  role: string,
  description: string,
  material: string,
  color: string,
  x = 0
): EnginePart => ({
  id,
  name,
  short,
  role,
  description,
  material,
  relation: '',
  x,
  number: '',
  color,
});

export const TURBINE_PARTS: EnginePart[] = [
  makePart(
    'fan',
    'Fan & Inlet Stage',
    'Fan',
    'Accelerate and bypass inlet airflow',
    'Large titanium fan moves ambient air. Bypass air generates the vast majority of subsonic thrust while the core air enters the compression stages.',
    'Titanium Alloy Ti-6Al-4V',
    '#38bdf8',
    -3.1
  ),
  makePart(
    'compressor',
    'Axial Compressor',
    'Compressor',
    'Progressively raise working air pressure',
    'Alternating rotating rotor blades and static stator vanes compress air to over 40 atmospheres prior to the combustor.',
    'Nickel-Chromium Superalloy (Inconel 718)',
    '#60a5fa',
    -0.6
  ),
  makePart(
    'combustor',
    'Annular Combustor',
    'Combustor',
    'Inject and ignite fuel to generate high-enthalpy gas',
    'Continuous combustion chamber with fuel spray nozzles, swirling air inlets, and effusion cooling holes that withstand gas temperatures exceeding 1,700°C.',
    'Ceramic Matrix Composite (CMC) & Hastelloy-X',
    '#f97316',
    1.55
  ),
  makePart(
    'turbine',
    'High & Low Pressure Turbines',
    'Turbine',
    'Extract thermal energy to drive shafts',
    'High-pressure turbine extracts energy to power the compressor; low-pressure stages drive the front fan or external prop shaft.',
    'Single-Crystal Nickel Superalloy (CMSX-4)',
    '#d97706',
    2.95
  ),
  makePart(
    'nozzle',
    'Exhaust Nozzle & Reheat',
    'Exhaust',
    'Accelerate exhaust gases into a high-speed propulsive jet',
    'Convergent duct converts residual gas pressure and heat into maximum exit momentum and thrust.',
    'Niobium Alloy / High-Temp Stainless 310S',
    '#a8a29e',
    4.45
  ),
  makePart(
    'casing',
    'Outer Casing & Bypass Nacelle',
    'Casing',
    'Enclose aerodynamics and structural stator rings',
    'Houses the engine core, contains fan blade off events, and ducts bypass flow with acoustic attenuation panels.',
    'Carbon-Fiber Composite & Titanium Rings',
    '#78716c',
    0
  ),
  makePart(
    'shaft',
    'Concentric Drive Shafts & Bearings',
    'Shafts',
    'Transmit multi-megawatt torque across spools',
    'Coaxial inner and outer shafts spinning at different speeds supported by squeeze-film damping ceramic ball and roller bearings.',
    'High-Strength Maraging Steel',
    '#eab308',
    0
  ),
];

export const PISTON_PARTS: EnginePart[] = [
  makePart(
    'block',
    'Engine Cylinder Block',
    'Block',
    'Structural crankcase and cylinder bore guidance',
    'Precision-machined bores guide the reciprocating pistons. Features integral cooling water jackets and main bearing bulkheads.',
    'Die-Cast Aluminum A380 / Cast Iron Liners',
    '#64748b'
  ),
  makePart(
    'pistons',
    'Pistons & Sealing Rings',
    'Pistons',
    'Receive combustion expansion pressure',
    'Lightweight forged pistons with graphite skirt coatings, compression rings to seal cylinder pressure, and oil control rings.',
    'Forged Aluminum Alloy 2618',
    '#94a3b8'
  ),
  makePart(
    'rods',
    'Connecting Rods & Bearings',
    'Rods',
    'Transmit reciprocating force to the crankpins',
    'H-beam connecting rods pivot at the wrist pin and big-end crank journal, turning linear force into rotational moment.',
    'Forged 4340 Chrome-Moly Steel',
    '#d97706'
  ),
  makePart(
    'crankshaft',
    'Crankshaft & Flywheel',
    'Crankshaft',
    'Convert reciprocating motion into rotational torque',
    'Counterweighted shaft balanced dynamically with heavy flywheel to dampen torsional vibrations and store kinetic energy.',
    'Forged Nitrided Steel EN40B',
    '#eab308'
  ),
  makePart(
    'heads',
    'Cylinder Heads & Spark Plugs',
    'Heads',
    'Seal combustion chambers and seat valves',
    'Accommodates pent-roof combustion chambers, twin intake/exhaust ports, spark plugs, and coolant jackets.',
    'Cast Aluminum A356-T6',
    '#cbd5e1'
  ),
  makePart(
    'valvetrain',
    'Camshafts & Spring Valves',
    'Valvetrain',
    'Synchronize air-fuel intake and exhaust scavenge',
    'Dual overhead camshafts actuate sodium-filled poppet valves held by high-rate dual helical valve springs.',
    'Hardened Chilled Billet Steel',
    '#f59e0b'
  ),
  makePart(
    'manifolds',
    'Intake Runners & Exhaust Headers',
    'Manifolds',
    'Direct fresh charge and scavenge burned gases',
    'Tuned-length intake plenum runners for resonant ram charging and equal-length tubular exhaust headers.',
    'Mandrel-Bent 304 Stainless Steel',
    '#ea580c'
  ),
];

export const ROTARY_PARTS: EnginePart[] = [
  makePart(
    'housing',
    'Epitrochoid Rotor Housing',
    'Housing',
    'Define the peritrochoid combustion path',
    'Inner chamber contour follows an exact two-lobed epitrochoid. Aluminum casing with micro-porous chrome wear-coating.',
    'Chrome-Coated Aluminum Alloy',
    '#64748b'
  ),
  makePart(
    'rotor',
    'Three-Apex Triangular Rotor',
    'Rotor',
    'Form dynamic expanding and contracting chambers',
    'Reuleaux triangle shape with combustion recess pockets on each flank; orbits eccentrically around the output shaft.',
    'Spheroidal Graphite Ductile Cast Iron',
    '#475569'
  ),
  makePart(
    'seals',
    'Apex & Side Gas Seals',
    'Seals',
    'Maintain gas-tight pressure boundaries',
    'Multi-piece silicon nitride ceramic apex seals with corner seals and curved side seals to prevent inter-chamber blow-by.',
    'Silicon Nitride Ceramic & High-Temp Spring Steel',
    '#f59e0b'
  ),
  makePart(
    'eccentric',
    'Eccentric Output Shaft',
    'Shaft',
    'Translate rotor orbital motion into smooth spin',
    'Carries an offset rotor journal lobe. Turns 3 full revolutions for each single revolution of the rotor.',
    'Hardened Forged Chrome-Molybdenum Steel',
    '#eab308'
  ),
  makePart(
    'gears',
    'Phasing & Stationary Gears',
    'Gears',
    'Enforce strict orbital geometric ratio',
    'Fixed stationary spur gear meshes with internal ring gear inside the rotor at a precise 3:2 tooth ratio.',
    'Case-Hardened Alloy Steel',
    '#d97706'
  ),
  makePart(
    'endplates',
    'Side Plates & Intermediate Irons',
    'Side Plates',
    'Seal rotor axial faces and support bearings',
    'Precision-ground flat iron plates bounding the rotor faces with through-bolts clamping the entire housing assembly.',
    'Nodular Cast Iron',
    '#94a3b8'
  ),
  makePart(
    'ports',
    'Peripheral Ports & Dual Spark Plugs',
    'Ports',
    'Time gas exchange and sequential twin ignition',
    'Port apertures uncovered by the passing rotor; dual leading and trailing spark plugs initiate progressive flame propagation.',
    'Silicon Bronze & Alumina Ceramic',
    '#ea580c'
  ),
];

export const BLDC_PARTS: EnginePart[] = [
  makePart(
    'stator',
    '12-Slot Stator Core',
    'Stator',
    'Stationary magnetic back-iron with copper teeth',
    'Thin laminated silicon steel sheets with precision teeth insulated for concentrated 3-phase electromagnetic coils.',
    'Silicon Steel (M19 Laminations)',
    '#64748b'
  ),
  makePart(
    'windings',
    '3-Phase Copper Windings',
    'Coils',
    'Generate rotating stator magnetic field',
    'High-temperature enameled copper wire wound in U-V-W phase distribution, driven by field-oriented control (FOC) inverter.',
    'Oxygen-Free High-Conductivity Copper (OFHC)',
    '#ea580c'
  ),
  makePart(
    'rotor',
    '14-Pole Permanent Magnet Rotor',
    'Rotor Drum',
    'Permanent magnetic excitation flux carrier',
    'External or internal rotor drum supporting 14 alternating North-South sintered neodymium-iron-boron rare-earth magnets.',
    'Neodymium NdFeB (N52SH Grade)',
    '#3b82f6'
  ),
  makePart(
    'shaft',
    'Drive Shaft & Bearings',
    'Output Shaft',
    'Output torque delivery and precision spindle',
    'Hardened ground shaft supported by dual sealed ABEC-7 hybrid ceramic ball bearings designed for high radial load.',
    'Stainless Steel 440C & Ceramic Balls',
    '#eab308'
  ),
  makePart(
    'gearhead',
    'Planetary / Harmonic Reduction Stage',
    'Gearbox',
    'Multiply motor torque and decrease output speed',
    'Zero-backlash planetary reduction unit with sun gear and needle-bearing planet gears delivering immense torque density.',
    'Nitrided Tool Steel 4340',
    '#d97706'
  ),
  makePart(
    'encoder',
    'Magnetic Rotary Encoder',
    'Encoder',
    'Sub-arcsecond absolute angular joint feedback',
    'Hall-effect / optical sensor ring reading absolute rotor angle for closed-loop vector control and position hold.',
    'FR4 PCB & Magnetic Dipole Ring',
    '#10b981'
  ),
  makePart(
    'housing',
    'Actuator Casing & Heat Sink',
    'Housing',
    'Structural enclosure and thermal dissipation fins',
    'Anodized aluminum body with circumferential heat sink fins to dissipate stator I²R resistive heat.',
    'CNC 6061-T6 Anodized Aluminum',
    '#78716c'
  ),
];

export const AIRPLANE_PARTS: EnginePart[] = [
  makePart(
    'fuselage',
    'Supersonic Airframe Fuselage',
    'Fuselage',
    'Aerodynamic body and avionics bay',
    'Area-ruled aerodynamic body designed for minimal transonic wave drag, housing cockpit canopy, radar, and fuel cells.',
    'Carbon-Bismaleimide Composite & Al-Li Alloy',
    '#64748b'
  ),
  makePart(
    'wings',
    'Swept Trapezoidal Wings & Winglets',
    'Wings',
    'Generate aerodynamic lift and fuel containment',
    'Supercritical aerofoil cross-section with vortex generators and high-aspect winglets to minimize induced drag.',
    'Carbon-Fiber Reinforced Polymer (CFRP)',
    '#38bdf8'
  ),
  makePart(
    'engines',
    'Twin Turbofan Propulsion Pods',
    'Nacelles',
    'Generate variable forward and afterburning thrust',
    'Dual high-thrust turbofan engines installed in underwing/fuselage nacelles with variable supersonic shock ramps.',
    'Titanium Ti-6Al-2Sn-4Zr-2Mo & Inconel',
    '#f59e0b'
  ),
  makePart(
    'nozzles',
    '3D Vectoring Exhaust Nozzles',
    'Nozzles',
    'Modulate thrust vector and supersonic expansion',
    'Pitch and yaw thrust vectoring petals providing post-stall maneuverability and supersonic cruise efficiency.',
    'Ceramic-Coated Superalloy Petals',
    '#ea580c'
  ),
  makePart(
    'control_surfaces',
    'Ailerons, Elevators & Dual Rudders',
    'Flight Controls',
    'Control pitch, roll, and yaw aerodynamic moments',
    'Fly-by-wire hydraulic/electro-hydrostatic actuated control surfaces capable of rapid angular deflection.',
    'Honeycomb Core Composite & Titanium Hinges',
    '#60a5fa'
  ),
  makePart(
    'canopy',
    'Cockpit Canopy & Avionics Glass',
    'Cockpit',
    'Pilot visibility and sensor dome enclosure',
    'Polycarbonate bubble canopy with gold indium-tin-oxide radar reflective coating.',
    'Stretched Acrylic & Polycarbonate Laminate',
    '#0ea5e9'
  ),
  makePart(
    'gear',
    'Tricycle Landing Gear & Bays',
    'Landing Gear',
    'Ground taxi, takeoff, and landing shock absorption',
    'Retractable oleo-pneumatic shock struts with dual wheels and anti-skid carbon disc brakes.',
    'High-Strength Forged 300M Steel',
    '#a8a29e'
  ),
];

export function getParts(engine: EngineType): EnginePart[] {
  let parts: EnginePart[];
  switch (engine) {
    case 'v8':
    case 'inline4':
      parts = PISTON_PARTS.map((p) => ({ ...p }));
      break;
    case 'rotary':
      parts = ROTARY_PARTS.map((p) => ({ ...p }));
      break;
    case 'bldc-motor':
      parts = BLDC_PARTS.map((p) => ({ ...p }));
      break;
    case 'airplane-jet':
      parts = AIRPLANE_PARTS.map((p) => ({ ...p }));
      break;
    default:
      parts = TURBINE_PARTS.map((p) => ({ ...p }));
      break;
  }

  // Engine-specific customizations
  if (engine === 'turbojet') {
    parts[0] = {
      ...parts[0],
      name: 'Supersonic Inlet & Struts',
      short: 'Inlet',
      description:
        'Fixed or variable compression ramp decelerates supersonic airflow to subsonic Mach numbers before entering the compressor.',
    };
    parts[5] = {
      ...parts[5],
      name: 'Solid Core Casing',
      short: 'Casing',
      description: 'Houses the compressor and turbine without a secondary bypass duct.',
    };
    parts[6] = {
      ...parts[6],
      description: 'Single high-rigidity shaft linking turbine directly to the compressor.',
    };
  } else if (engine === 'turboprop' || engine === 'turboshaft') {
    parts[0] = {
      ...parts[0],
      name: engine === 'turboprop' ? '5-Blade Propeller & Gearbox' : 'Splined Power Take-Off',
      short: engine === 'turboprop' ? 'Propeller' : 'Output',
      role: 'Deliver massive mechanical shaft power',
      description:
        engine === 'turboprop'
          ? 'Five-bladed scimitar composite propeller driven through epicyclic reduction gearing.'
          : 'Geared output flange coupled to external rotor mast transmission.',
      material: 'Composite / Nitrided Forged Steel',
    };
    parts[3] = {
      ...parts[3],
      name: 'Gas Generator & Power Turbines',
      description:
        'Dual-turbine setup: first stages power the compressor, final free stages deliver shaft power.',
    };
    parts[4] = {
      ...parts[4],
      name: 'Angled Exhaust Duct',
      short: 'Exhaust',
      description: 'Low-backpressure exhaust stacks directing spent gas overboard.',
    };
  }

  return parts.map((p, i) => ({
    ...p,
    number: String(i + 1).padStart(2, '0'),
  }));
}
