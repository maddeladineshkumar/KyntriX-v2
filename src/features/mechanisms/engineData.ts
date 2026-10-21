import type { EngineType, EngineMeta, EnginePart } from './types';

export const ENGINES: Record<EngineType, EngineMeta> = {
  turbofan: {
    name: 'Turbofan',
    subtitle: 'High-bypass · Two-spool Aviation Gas Turbine',
    code: 'TF-01',
    tags: ['Two-spool', 'High-bypass', '11.5:1 BPR'],
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
    tags: ['Single-spool', 'Pure turbojet', 'Reheat'],
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
    tags: ['Free turbine', '13.8:1 gearbox', '5-blade prop'],
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
    tags: ['Free turbine', 'Splined PTO', '20.9k rpm'],
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
    tags: ['V8', '90° bank', 'Cross-plane', 'Naturally aspirated'],
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
  v12: {
    name: 'V12 60° Naturally Aspirated',
    subtitle: 'Sixty-Degree Bank · Six-Throw Billet Crank · 8,700 RPM',
    code: 'V12-15',
    tags: ['V12', '60° bank', 'Naturally aspirated', '8,700 rpm'],
    family: 'Piston engines',
    category: 'RECIPROCATING',
    flow: false,
    description:
      'Twelve cylinders in two 60-degree banks share six crank throws spaced 60 degrees apart, so a power pulse arrives every 60 crank degrees. Individual throttle bodies, a variable-length intake manifold and a 12-cylinder firing cadence produce a seamless, high-pitched pull to 8,700 rpm.',
    specs: [
      { label: 'Displacement', value: '6,498 cc (6.5L)' },
      { label: 'Bore × Stroke', value: '95.0 mm × 76.4 mm' },
      { label: 'Compression Ratio', value: '11.8 : 1' },
      { label: 'Max Output', value: '574 kW (780 PS) @ 8,500 RPM' },
      { label: 'Peak Torque', value: '720 N·m @ 6,750 RPM' },
      { label: 'Firing Order', value: '1–7–5–11–3–9–6–12–2–8–4–10' },
      { label: 'Firing Interval', value: '60° even' },
      { label: 'Redline', value: '8,700 RPM' },
    ],
  },
  flat6: {
    name: 'Flat-Six Boxer',
    subtitle: 'Horizontally Opposed · 9,000 RPM · Dry-Sump Lubrication',
    code: 'F6-16',
    tags: ['Flat-six', 'Boxer', 'Naturally aspirated', '9,000 rpm'],
    family: 'Piston engines',
    category: 'RECIPROCATING',
    flow: false,
    description:
      'Three crank throws spaced 120 degrees apart carry six opposed pistons that sweep outward in mirrored pairs. The resulting flat, low-mounted mass keeps the centre of gravity beneath the crank axis while the 4.0-litre boxer revs cleanly to 9,000 rpm on individual throttle bodies.',
    specs: [
      { label: 'Displacement', value: '3,996 cc (4.0L)' },
      { label: 'Bore × Stroke', value: '102.0 mm × 81.5 mm' },
      { label: 'Compression Ratio', value: '13.3 : 1' },
      { label: 'Max Output', value: '375 kW (510 PS) @ 8,400 RPM' },
      { label: 'Peak Torque', value: '470 N·m @ 6,100 RPM' },
      { label: 'Firing Order', value: '1–6–2–4–3–5' },
      { label: 'Firing Interval', value: '120° even' },
      { label: 'Redline', value: '9,000 RPM' },
    ],
  },
  inline4: {
    name: 'Inline-Four DOHC',
    subtitle: 'Four Cylinders · Double Overhead Camshafts · 16V',
    code: 'I4-06',
    tags: ['Inline-4', 'DOHC 16V', 'Turbocharged'],
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
  'ea888-b8': {
    name: 'EA888 Gen2 2.0 TFSI',
    subtitle: 'Audi B8 A4 · Turbocharged Direct-Injection Inline-Four',
    code: 'I4-10',
    tags: ['EA888 Gen2', 'Inline-4', 'Direct injection', 'Turbo'],
    family: 'Piston engines',
    category: 'RECIPROCATING',
    flow: false,
    description:
      'The EA888 Gen2 (CAEB) that powered the Audi A4 B8 combines direct fuel injection, a water-cooled BorgWarner K03 turbocharger, chain-driven DOHC valvetrain, and variable intake cam timing. Its long 92.8 mm stroke and 9.6:1 compression deliver a broad 350 N·m torque plateau from just 1,500 rpm.',
    specs: [
      { label: 'Displacement', value: '1,984 cc (2.0L)' },
      { label: 'Bore × Stroke', value: '82.5 mm × 92.8 mm' },
      { label: 'Compression Ratio', value: '9.6 : 1' },
      { label: 'Max Output', value: '155 kW (211 PS) @ 4,300–6,000 RPM' },
      { label: 'Peak Torque', value: '350 N·m @ 1,500–4,200 RPM' },
      { label: 'Firing Order', value: '1–3–4–2' },
      { label: 'Max Boost', value: '1.2 bar (17.4 psi)' },
      { label: 'Engine Code', value: 'CAEB / CDNC' },
    ],
  },
  b58: {
    name: 'BMW B58B30 Inline-Six',
    subtitle: 'Twin-Scroll Turbo · Direct Injection · Valvetronic',
    code: 'I6-11',
    tags: ['Inline-6', 'Twin-scroll turbo', 'Valvetronic'],
    family: 'Piston engines',
    category: 'RECIPROCATING',
    flow: false,
    description:
      'BMW\'s modular B58 straight-six pairs a closed-deck aluminium block with a twin-scroll turbocharger, 350-bar direct injection, Valvetronic fully variable valve lift, and Double VANOS. The result is a famously linear 500 N·m torque plateau and one of the smoothest firing cadences in production.',
    specs: [
      { label: 'Displacement', value: '2,998 cc (3.0L)' },
      { label: 'Bore × Stroke', value: '82.0 mm × 94.6 mm' },
      { label: 'Compression Ratio', value: '11.0 : 1' },
      { label: 'Max Output', value: '285 kW (382 HP) @ 5,800–6,500 RPM' },
      { label: 'Peak Torque', value: '500 N·m @ 1,800–5,000 RPM' },
      { label: 'Firing Order', value: '1–5–3–6–2–4' },
      { label: 'Max Boost', value: '1.3 bar (18.9 psi)' },
      { label: 'Valvetrain', value: 'DOHC 24V · Valvetronic + VANOS' },
    ],
  },
  rotary: {
    name: 'Wankel Rotary',
    subtitle: 'Twin-Epitrochoid Housing · Three-Apex Rotor',
    code: 'RE-07',
    tags: ['13B rotary', '2 rotors', '1.3 L'],
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
    tags: ['BLDC', '14 poles', 'Planetary gearhead'],
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
  'axial-flux-motor': {
    name: 'YASA Axial-Flux Motor',
    subtitle: 'Double-Stator Coreless PM · Direct-Drive Traction Hub',
    code: 'EM-12',
    tags: ['Axial flux', '250 kW', 'Direct drive'],
    family: 'Electric drives',
    category: 'ELECTROMECHANICAL',
    flow: true,
    description:
      'A yokeless and segmented armature (YASA) axial-flux machine. Two segmented stator faces sandwich a carbon-fibre rotor carrying rare-earth magnets, producing exceptional torque density in a short axial package with no gearbox.',
    specs: [
      { label: 'Peak Power', value: '250 kW (335 HP)' },
      { label: 'Peak Torque', value: '500 N·m' },
      { label: 'Max Speed', value: '12,000 RPM' },
      { label: 'Peak Efficiency', value: '96.5%' },
      { label: 'Bus Voltage', value: '400 VDC' },
      { label: 'Pole Count', value: '24 Poles' },
    ],
  },
  'induction-motor': {
    name: 'AC Induction Traction Motor',
    subtitle: 'Squirrel-Cage Rotor · Field-Oriented Vector Drive',
    code: 'EM-13',
    tags: ['Induction', 'Squirrel cage', '400 V'],
    family: 'Electric drives',
    category: 'ELECTROMECHANICAL',
    flow: true,
    description:
      'A three-phase AC asynchronous machine with a copper or aluminium squirrel-cage rotor. Field-oriented control estimates rotor flux and independently commands torque-producing current, enabling robust traction with natural field weakening at high speed.',
    specs: [
      { label: 'Peak Power', value: '200 kW (268 HP)' },
      { label: 'Peak Torque', value: '350 N·m' },
      { label: 'Max Speed', value: '14,000 RPM' },
      { label: 'Peak Efficiency', value: '95.2%' },
      { label: 'Bus Voltage', value: '400 VDC' },
      { label: 'Rated Slip', value: '2.5%' },
    ],
  },
  'stepper-motor': {
    name: 'Hybrid Stepper Motor',
    subtitle: 'NEMA 34 · 1.8° Full Step · Microstepping Positioner',
    code: 'EM-14',
    tags: ['Stepper', 'NEMA 34', '1.8° step'],
    family: 'Electric drives',
    category: 'ELECTROMECHANICAL',
    flow: true,
    description:
      'A two-phase hybrid stepper with a toothed rotor and eight stator poles. Energizing the phases in sequence pulls the rotor through precise 1.8° detents, giving repeatable open-loop positioning for CNC axes, lab automation, and 3D printers.',
    specs: [
      { label: 'Holding Torque', value: '8.5 N·m' },
      { label: 'Step Angle', value: '1.8° (200 steps/rev)' },
      { label: 'Max Practical Speed', value: '1,500 RPM' },
      { label: 'Bus Voltage', value: '48 VDC' },
      { label: 'Phase Current', value: '6.0 A / phase' },
      { label: 'Drive Efficiency', value: '86%' },
    ],
  },
  'airplane-jet': {
    name: 'AeroJet-X Aircraft',
    subtitle: 'Twin-Turbofan Flight Propulsion & Dynamics Testbed',
    code: 'AJ-09',
    tags: ['Twin turbofan', 'Thrust vectoring', 'Mach 2.2'],
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

/** Hardware added only to forced-induction piston engines. */
export const BOOST_PARTS: EnginePart[] = [
  makePart(
    'turbo',
    'Twin-Scroll Turbocharger',
    'Turbo',
    'Recover exhaust enthalpy and pressurize intake charge',
    'An exhaust-driven turbine wheel spins a coaxial compressor through a floating-bearing centre housing. A twin-scroll volute separates exhaust pulses to preserve scavenging energy and cut lag.',
    'Inconel 713C Turbine · Billet Aluminum Compressor',
    '#f97316'
  ),
  makePart(
    'fuel',
    'Direct-Injection Fuel System',
    'Fuel',
    'Atomize fuel at high pressure inside the cylinder',
    'A cam-driven high-pressure pump feeds a stainless rail and multi-hole solenoid injectors. Spray targeting, multiple injections per cycle, and lambda feedback control mixture preparation.',
    'Stainless Steel 1.4404 Rail · Nitrided Injector Bodies',
    '#dc2626'
  ),
  makePart(
    'chargecooler',
    'Charge-Air Cooling Module',
    'Charge Cooler',
    'Densify compressed charge and suppress detonation',
    'Air-to-air or air-to-water heat exchanger rejects compressor heat after the turbo, lowering manifold charge temperature and allowing more spark advance at full boost.',
    'Brazed Aluminum Micro-Channel Core',
    '#0ea5e9'
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

export const AXIAL_FLUX_PARTS: EnginePart[] = [
  makePart(
    'stator',
    'Twin Segmented Stator Cores',
    'Stators',
    'Carry alternating magnetic flux across the air gap',
    'Two yokeless stator discs use grain-oriented electrical steel segments. Eliminating the heavy yoke saves mass and shortens the magnetic circuit.',
    'Grain-Oriented Silicon Steel (NO20)',
    '#64748b'
  ),
  makePart(
    'windings',
    'Concentrated Toroidal Windings',
    'Windings',
    'Generate axial magnetic flux in three phases',
    'Pre-formed copper coils surround each stator tooth. Short end-windings reduce copper loss and axial length compared with radial machines.',
    'Enamelled OFHC Copper',
    '#ea580c'
  ),
  makePart(
    'rotor',
    'Carbon-Fibre Magnet Rotor Disc',
    'Rotor',
    'Carry permanent-magnet flux through the air gap',
    'A lightweight carbon-fibre carrier retains segmented NdFeB magnets. The rotor has no iron core in the active zone, eliminating rotor eddy-current loss.',
    'CFRP Carrier · NdFeB N48SH Magnets',
    '#3b82f6'
  ),
  makePart(
    'shaft',
    'Hollow Output Shaft & Bearings',
    'Shaft',
    'Deliver direct-drive wheel torque',
    'A large-diameter hollow shaft passes the drive half-shaft while dual angular-contact bearings carry combined axial and radial loads.',
    'Forged 42CrMo4 Steel',
    '#eab308'
  ),
  makePart(
    'inverter',
    'SiC Traction Inverter',
    'Inverter',
    'Convert DC bus power into three-phase AC',
    'Silicon-carbide MOSFET modules switch at high frequency with low loss. Field-oriented control regulates torque and field weakening.',
    'Silicon Carbide Power Modules',
    '#10b981'
  ),
  makePart(
    'encoder',
    'Resolver Rotor Position Sensor',
    'Resolver',
    'Provide absolute rotor angle to the controller',
    'A variable-reluctance resolver survives heat and vibration, supplying sine/cosine signals for precise commutation and torque control.',
    'Nickel-Iron Laminations & Copper Coils',
    '#8b5cf6'
  ),
  makePart(
    'housing',
    'Axial Cooling Jacket & Housing',
    'Housing',
    'Clamp stator stack and remove waste heat',
    'A cast aluminium housing with an integrated water jacket surrounds both stators. Coolant passages target the winding hot spots.',
    'Cast A356-T6 Aluminum',
    '#78716c'
  ),
];

export const INDUCTION_PARTS: EnginePart[] = [
  makePart(
    'stator',
    'Laminated Stator Core',
    'Stator',
    'Establish the rotating magnetic field',
    'Thin electrical-steel laminations are stacked and insulated to suppress eddy currents while providing a low-reluctance flux path.',
    'Silicon Steel M19 Laminations',
    '#64748b'
  ),
  makePart(
    'windings',
    'Three-Phase Distributed Windings',
    'Windings',
    'Create sinusoidally distributed magnetomotive force',
    'Overlapping copper coils are distributed across 48 slots to produce a smooth rotating field with low harmonic content.',
    'Class-H Enamelled Copper',
    '#ea580c'
  ),
  makePart(
    'rotor',
    'Copper Squirrel-Cage Rotor',
    'Rotor Cage',
    'Induce rotor current and produce torque',
    'Solid copper bars brazed into short-circuit end rings form the squirrel cage. Rotor current is induced by slip relative to the synchronous field.',
    'Copper Alloy Bars · Silicon Steel Core',
    '#3b82f6'
  ),
  makePart(
    'shaft',
    'Rotor Shaft & Bearings',
    'Shaft',
    'Transmit induction torque to the driveline',
    'A stiff rotor shaft runs in deep-groove and cylindrical-roller bearings sized for high radial load and 14,000 rpm.',
    'Hardened 4140 Steel',
    '#eab308'
  ),
  makePart(
    'encoder',
    'Incremental Encoder',
    'Encoder',
    'Feed rotor speed and position to the inverter',
    'An optical or magnetic encoder provides A/B quadrature channels for slip estimation and closed-loop vector control.',
    'Glass Disc / Magnetic Ring',
    '#8b5cf6'
  ),
  makePart(
    'housing',
    'Motor Frame & Cooling Fins',
    'Housing',
    'Support the stator and dissipate rotor loss',
    'A cast-iron or aluminium frame carries the stator core. Axial fins and an optional water jacket control winding temperature.',
    'Cast Aluminum / Grey Iron',
    '#78716c'
  ),
];

export const STEPPER_PARTS: EnginePart[] = [
  makePart(
    'stator',
    'Eight-Pole Toothed Stator',
    'Stator',
    'Provide discrete magnetic detents',
    'Eight salient poles each carry a toothed lamination stack. Alternating phase excitation aligns the nearest rotor teeth with the energized poles.',
    'Silicon Steel Laminations',
    '#64748b'
  ),
  makePart(
    'windings',
    'Two-Phase Bipolar Windings',
    'Windings',
    'Energize opposing pole pairs in sequence',
    'Two independent phase windings are driven by an H-bridge or microstepping chopper. Current vector angle sets the equilibrium position.',
    'Enamelled Copper Wire',
    '#ea580c'
  ),
  makePart(
    'rotor',
    'Toothed Hybrid Rotor',
    'Rotor',
    'Step in precise 1.8-degree increments',
    'Two axially magnetized rotor cups carry 50 offset teeth around a permanent magnet. The tooth pattern yields 200 full steps per revolution.',
    'NdFeB Magnet · Soft Iron Cups',
    '#3b82f6'
  ),
  makePart(
    'shaft',
    'Precision Output Shaft',
    'Shaft',
    'Deliver detent torque without feedback',
    'A ground shaft runs in preloaded ball bearings to minimize backlash and maintain concentricity under belt or lead-screw loads.',
    'Hardened Stainless Steel 440C',
    '#eab308'
  ),
  makePart(
    'encoder',
    'Optional Closed-Loop Encoder',
    'Encoder',
    'Detect missed steps and enable stall detection',
    'A rear-mounted magnetic encoder upgrades open-loop microstepping into a closed-loop positioner with stall and step-loss detection.',
    'Magnetic ASIC & Diametric Magnet',
    '#8b5cf6'
  ),
  makePart(
    'housing',
    'NEMA 34 Aluminium Housing',
    'Housing',
    'Locate stator, bearings, and mounting flange',
    'A precision-machined NEMA 34 square frame provides a standard mounting pattern, heatsinking, and protection for the rotor stack.',
    'Extruded 6063-T6 Aluminum',
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
    case 'v12':
    case 'flat6':
      parts = PISTON_PARTS.map((p) => ({ ...p }));
      break;
    case 'inline4':
    case 'ea888-b8':
    case 'b58':
      parts = [...PISTON_PARTS, ...BOOST_PARTS].map((p) => ({ ...p }));
      break;
    case 'rotary':
      parts = ROTARY_PARTS.map((p) => ({ ...p }));
      break;
    case 'bldc-motor':
      parts = BLDC_PARTS.map((p) => ({ ...p }));
      break;
    case 'axial-flux-motor':
      parts = AXIAL_FLUX_PARTS.map((p) => ({ ...p }));
      break;
    case 'induction-motor':
      parts = INDUCTION_PARTS.map((p) => ({ ...p }));
      break;
    case 'stepper-motor':
      parts = STEPPER_PARTS.map((p) => ({ ...p }));
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
  } else if (engine === 'ea888-b8' || engine === 'b58') {
    const b58 = engine === 'b58';
    const part = (id: string) => parts.find((p) => p.id === id);
    const block = part('block');
    if (block) {
      block.name = b58 ? 'Closed-Deck Aluminium Block' : 'Cast-Iron Cylinder Block';
      block.description = b58
        ? 'Deep-skirt closed-deck aluminium casting with sprayed iron bore coatings, integrated coolant passages, and a forged crankshaft running in seven main bearings.'
        : 'High-strength cast-iron block with a forged crankshaft, chain-driven balance shafts, and integrated water pump housing. Rugged bottom end supports high specific output.';
      block.material = b58 ? 'Aluminium AlSi9Cu3 · Twin-Wire Arc Sprayed Bores' : 'GJL 250 Grey Cast Iron';
    }
    const pistons = part('pistons');
    if (pistons) {
      pistons.name = b58 ? 'Forged Mahle Pistons & Rings' : 'Reinforced Turbo Pistons';
      pistons.description = b58
        ? 'Mahle forged aluminium pistons with anodized crowns, low-friction skirt coating, and a three-ring sealing pack designed for 11.0:1 compression and high boost.'
        : 'Reinforced eutectic pistons with oil-cooling galleries, low-friction skirt coating, and high-temperature compression rings for turbocharged direct injection.';
    }
    const heads = part('heads');
    if (heads) {
      heads.name = b58 ? 'Cross-Flow Cylinder Head' : 'EA888 Cylinder Head';
      heads.description = b58
        ? 'Cross-flow aluminium head with integrated exhaust manifold, 350-bar direct injectors, and Valvetronic continuously variable intake valve lift.'
        : 'Counter-flow head with direct-injection injector seats, integrated exhaust manifold in later variants, and sodium-filled exhaust valves.';
    }
    const valvetrain = part('valvetrain');
    if (valvetrain) {
      valvetrain.name = b58 ? 'Valvetronic & Double VANOS' : 'Chain-Driven DOHC & VVT';
      valvetrain.description = b58
        ? 'Fully variable Valvetronic intake lift replaces the throttle for part-load efficiency, while Double VANOS phasors vary both camshafts across the speed range.'
        : 'Single-row roller chain drives twin camshafts. Intake cam phasing is continuously variable; hydraulic lifters maintain zero lash across the 16-valve train.';
    }
    const manifolds = part('manifolds');
    if (manifolds) {
      manifolds.name = b58 ? 'Integrated Exhaust Manifold' : 'Intake Plenum & Exhaust Manifold';
      manifolds.description = b58
        ? 'Exhaust runners are cast into the cylinder head to shorten the hot path to the twin-scroll turbine, improving catalyst light-off and turbo response.'
        : 'Tuned intake plenum feeds four ports; a compact high-flow exhaust manifold channels paired cylinder pulses into the turbocharger volute.';
    }
    const turbo = part('turbo');
    if (turbo) {
      turbo.name = b58 ? 'Twin-Scroll Turbocharger' : 'BorgWarner K03 Turbocharger';
      turbo.description = b58
        ? 'A twin-scroll turbine housing separates cylinders 1–3 from 4–6, preserving exhaust pulse energy. An electronically controlled wastegate regulates up to 1.3 bar of boost.'
        : 'Water-cooled BorgWarner K03 turbocharger with an integrated wastegate actuator. Small turbine inertia delivers 1.2 bar of boost from low engine speed.';
    }
  } else if (engine === 'v12' || engine === 'flat6') {
    const v12 = engine === 'v12';
    const part = (id: string) => parts.find((p) => p.id === id);
    const block = part('block');
    if (block) {
      block.name = v12 ? '60° V12 Crankcase & Liners' : 'Opposed Cylinder Block';
      block.description = v12
        ? 'Two 60-degree banks share a stiff aluminium crankcase with six bolted main caps and a windage-tray sump. Nikasil-coated bores keep friction low at 8,700 rpm.'
        : 'Two horizontally opposed banks bolt to a compact central crankcase, placing the crank axis high and the mass low. A dry-sump circuit scavenges oil under sustained lateral load.';
      block.material = v12
        ? 'Cast Aluminium A356-T6 · Nikasil Bores'
        : 'Cast Aluminium · Plasma-Sprayed Iron Bores';
    }
    const crankshaft = part('crankshaft');
    if (crankshaft) {
      crankshaft.name = v12 ? 'Billet Six-Throw Crankshaft' : 'Three-Throw Boxer Crankshaft';
      crankshaft.description = v12
        ? 'A billet steel crank carries six throws at 60-degree spacing, giving 12 evenly spaced power pulses every 720 degrees and a turbine-smooth torque delivery.'
        : 'Three throws at 120 degrees carry mirrored rod pairs. Opposed pistons accelerate outward together, cancelling the first-order shaking force that plagues inline engines.';
      crankshaft.material = v12 ? 'Billet EN30B Nitrided Steel' : 'Forged Micro-Alloy Steel';
    }
    const pistons = part('pistons');
    if (pistons) {
      pistons.name = v12 ? 'Twelve Forged Race Pistons' : 'Opposed Low-Friction Pistons';
      pistons.description = v12
        ? 'Short-skirt forged pistons keep reciprocating mass down so the V12 can spin to 8,700 rpm without floating the valves. Oil-squirt cooling targets the crown.'
        : 'Lightweight pistons with offset wrist pins reduce bore slap. Short skirts and low-drag rings hold friction down at 9,000 rpm.';
    }
    const heads = part('heads');
    if (heads) {
      heads.name = v12 ? 'Four-Valve Pent-Roof Heads' : 'Opposed Four-Valve Heads';
      heads.description = v12
        ? 'Four-valve pent-roof combustion chambers with central spark plugs and an 11.8:1 compression ratio. Ports are shaped for high-lift, high-rpm flow.'
        : 'Flat four-valve heads sit directly outboard of the cylinders, keeping the engine only 250 mm tall. Central plugs and high-tumble ports support a 13.3:1 compression ratio.';
    }
    const valvetrain = part('valvetrain');
    if (valvetrain) {
      valvetrain.name = v12 ? 'Four Camshafts & 48 Valves' : 'Chain-Driven Boxer Camshafts';
      valvetrain.description = v12
        ? 'Four overhead camshafts actuate 48 valves with variable intake and exhaust timing, allowing a broad torque curve on top of the 8,500 rpm power peak.'
        : 'Two chain-driven camshafts per bank work with variable valve timing and short, stiff followers to control 24 valves at 9,000 rpm.';
    }
    const manifolds = part('manifolds');
    if (manifolds) {
      manifolds.name = v12 ? 'Individual Throttle Bodies & Headers' : 'Equal-Length Boxer Headers';
      manifolds.description = v12
        ? 'Twelve individual throttle bodies feed equal-length intake runners, while a tuned equal-length header extracts exhaust pulses for maximum volumetric efficiency.'
        : 'Short opposed exhaust ports merge into equal-length headers that tuck beneath the crankcase, keeping the centre of gravity low.';
    }
  }

  return parts.map((p, i) => ({
    ...p,
    number: String(i + 1).padStart(2, '0'),
  }));
}
