import * as T from 'three';

export interface BuildContext {
  groups: Record<string, T.Group>;
  clip: T.Plane;
  materials: T.MeshStandardMaterial[];
}

const TAU = Math.PI * 2;
const Y_AXIS = new T.Vector3(0, 1, 0);

export function createWorkshop(ctx: BuildContext) {
  const { materials, clip } = ctx;

  const mat = (color: number, rough = 0.3, metal = 0.85, cut = false) => {
    const m = new T.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      side: T.DoubleSide,
      clippingPlanes: cut ? [clip] : [],
    });
    m.userData.base = new T.Color(color);
    m.userData.baseEmissive = new T.Color(0);
    m.userData.baseEmissiveIntensity = 0;
    materials.push(m);
    return m;
  };

  const steel = mat(0xaab5bf, 0.28, 0.88);
  const polish = mat(0xdde4e8, 0.18, 0.95);
  const dark = mat(0x3e4752, 0.35, 0.82);
  const cast = mat(0x526375, 0.46, 0.72, true);
  const head = mat(0xa1b0bd, 0.36, 0.8, true);
  const bronze = mat(0xb4916a, 0.32, 0.85);
  const copper = mat(0xc87d55, 0.25, 0.9);
  const rubber = mat(0x23282d, 0.8, 0.05);
  const ceramic = mat(0xf3ece0, 0.45, 0.1);
  const cover = mat(0x334a62, 0.3, 0.72, true);
  const titanium = mat(0x9ca9b6, 0.24, 0.92);
  const glowOrange = mat(0xff6b00, 0.1, 0.3);
  glowOrange.emissive = new T.Color(0xff4500);
  glowOrange.emissiveIntensity = 0.9;
  glowOrange.userData.baseEmissive = glowOrange.emissive.clone();
  glowOrange.userData.baseEmissiveIntensity = 0.9;

  function mesh(geo: T.BufferGeometry, m: T.Material, parent: T.Object3D, name: string): T.Mesh {
    const o = new T.Mesh(geo, m);
    o.castShadow = true;
    o.receiveShadow = true;
    o.userData.pieceName = name;
    parent.add(o);
    return o;
  }

  function box(
    size: number[],
    pos: number[],
    m: T.Material,
    parent: T.Object3D,
    name: string
  ): T.Mesh {
    const shape = new T.Shape();
    const [w, h, d] = size;
    const r = Math.min(0.07, w * 0.12, h * 0.12);
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const g = new T.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: true,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 5,
    });
    g.translate(0, 0, -d / 2);
    const o = mesh(g, m, parent, name);
    o.position.set(pos[0], pos[1], pos[2]);
    return o;
  }

  function cylinder(
    radius: number,
    length: number,
    pos: number[],
    m: T.Material,
    parent: T.Object3D,
    name: string,
    axis = 'y',
    segments = 64
  ): T.Mesh {
    const geo = new T.CylinderGeometry(radius, radius, length, segments);
    if (axis === 'x') geo.rotateZ(-Math.PI / 2);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    const o = mesh(geo, m, parent, name);
    o.position.set(pos[0], pos[1], pos[2]);
    return o;
  }

  function ring(
    radius: number,
    thickness: number,
    pos: number[],
    m: T.Material,
    parent: T.Object3D,
    name: string,
    axis = 'y'
  ): T.Mesh {
    const geo = new T.TorusGeometry(radius, thickness, 10, 72);
    if (axis === 'y') geo.rotateX(Math.PI / 2);
    if (axis === 'x') geo.rotateY(Math.PI / 2);
    const o = mesh(geo, m, parent, name);
    o.position.set(pos[0], pos[1], pos[2]);
    return o;
  }

  function tube(
    points: T.Vector3[],
    radius: number,
    m: T.Material,
    parent: T.Object3D,
    name: string
  ): T.Mesh {
    return mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(points), 32, radius, 10, false),
      m,
      parent,
      name
    );
  }

  function bolt(pos: number[], parent: T.Object3D, axis = 'y', length = 0.18) {
    cylinder(0.055, length, pos, steel, parent, 'Bolt Shank', axis, 12);
    const cap = [...pos];
    cap[axis === 'x' ? 0 : axis === 'y' ? 1 : 2] += length / 2;
    cylinder(0.085, 0.06, cap, polish, parent, 'Hex Fastener', axis, 6);
  }

  function gear(
    radius: number,
    teeth: number,
    width: number,
    parent: T.Object3D,
    name: string
  ): T.Mesh {
    const shape = new T.Shape();
    for (let i = 0; i < teeth * 4; i++) {
      const a = (i / (teeth * 4)) * TAU;
      const r = radius * (i % 4 === 0 || i % 4 === 3 ? 0.9 : 1);
      const y = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (i === 0) shape.moveTo(y, z);
      else shape.lineTo(y, z);
    }
    shape.closePath();
    const hole = new T.Path();
    hole.absarc(0, 0, radius * 0.27, 0, TAU, true);
    shape.holes.push(hole);
    const geo = new T.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      curveSegments: 40,
    });
    geo.translate(0, 0, -width / 2);
    geo.rotateY(Math.PI / 2);
    return mesh(geo, steel, parent, name);
  }

  return {
    mat,
    mesh,
    box,
    cylinder,
    ring,
    tube,
    bolt,
    gear,
    steel,
    polish,
    dark,
    cast,
    head,
    bronze,
    copper,
    rubber,
    ceramic,
    cover,
    titanium,
    glowOrange,
  };
}

/** Piston engine builder with exact slider-crank kinematics: q = r*cos(a - beta) + sqrt(L^2 - r^2*sin^2(a - beta)) */
export interface MechanismFrame {
  load: number;
  rpm: number;
  time: number;
}

export type MechanismAnimator = (theta: number, frame?: MechanismFrame) => void;

export type PistonKind = 'v8' | 'v12' | 'flat6' | 'inline4' | 'ea888-b8' | 'b58';

/** Static geometry of one reciprocating architecture. */
interface PistonLayout {
  /** Cylinders per bank. */
  count: number;
  /** Cant angle of each bank about the crank axis. */
  banks: number[];
  /** Offset of each bank along the crank axis (rods share a journal side by side). */
  bankX: (bankIndex: number) => number;
  positions: number[];
  /** Crankpin angle of each cylinder within a bank. */
  phases: number[];
  /** Firing angle of each cylinder within the 720-degree cycle. */
  fireAngles: number[];
  /** Cycle offset applied to each successive bank for valve timing and ignition. */
  bankFireOffset: number;
  blockHalf: number;
  camLength: number;
  camSprocketX: number;
  mainXs: number[];
  flyX: number;
  pulleyX: number;
  boltCount: number;
  spindle: number;
}

const SIX_SPAN = [-2.4, -1.44, -0.48, 0.48, 1.44, 2.4];
const FOUR_SPAN = [-1.8, -0.6, 0.6, 1.8];
const SEVEN_MAINS = [-3.2, -2.12, -1.04, 0, 1.04, 2.12, 3.2];
const FIVE_MAINS = [-2.45, -1.2, 0, 1.2, 2.45];

/**
 * Geometry table for each piston architecture.
 *
 * A 90-degree cross-plane V8 shares every crankpin between banks, a 60-degree
 * V12 spaces six throws 60 degrees apart so the banks alternate firing every
 * 60 degrees, and a flat-six places three throws at 120 degrees with mirrored
 * opposed pistons that reach TDC together and fire 360 degrees apart.
 */
function pistonLayout(kind: PistonKind): PistonLayout {
  if (kind === 'v12') {
    return {
      count: 6,
      banks: [-Math.PI / 6, Math.PI / 6],
      bankX: (bankIndex) => (bankIndex === 0 ? -0.12 : 0.12),
      positions: SIX_SPAN,
      phases: [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3],
      fireAngles: [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3],
      bankFireOffset: Math.PI / 3,
      blockHalf: 3.46,
      camLength: 7.7,
      camSprocketX: -4.18,
      mainXs: SEVEN_MAINS,
      flyX: 4.05,
      pulleyX: -4.1,
      boltCount: 18,
      spindle: 8.3,
    };
  }
  if (kind === 'flat6') {
    return {
      count: 3,
      banks: [-Math.PI / 2, Math.PI / 2],
      bankX: (bankIndex) => (bankIndex === 0 ? -0.1 : 0.1),
      positions: [-1.36, 0, 1.36],
      phases: [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3],
      fireAngles: [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3],
      bankFireOffset: Math.PI,
      blockHalf: 1.95,
      camLength: 4.4,
      camSprocketX: -2.72,
      mainXs: [-2.02, -0.7, 0.7, 2.02],
      flyX: 2.6,
      pulleyX: -2.62,
      boltCount: 8,
      spindle: 5.2,
    };
  }
  if (kind === 'v8') {
    return {
      count: 4,
      banks: [-Math.PI / 4, Math.PI / 4],
      bankX: (bankIndex) => (bankIndex === 0 ? -0.105 : 0.105),
      positions: FOUR_SPAN,
      phases: [0, Math.PI / 2, (3 * Math.PI) / 2, Math.PI],
      fireAngles: [0, Math.PI / 2, (3 * Math.PI) / 2, Math.PI],
      bankFireOffset: Math.PI,
      blockHalf: 2.52,
      camLength: 5.4,
      camSprocketX: -2.9,
      mainXs: FIVE_MAINS,
      flyX: 3,
      pulleyX: -3.05,
      boltCount: 12,
      spindle: 5.8,
    };
  }
  if (kind === 'b58') {
    return {
      count: 6,
      banks: [0],
      bankX: () => 0,
      positions: SIX_SPAN,
      phases: [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3, (4 * Math.PI) / 3, (2 * Math.PI) / 3, 0],
      fireAngles: [0, (8 * Math.PI) / 3, (4 * Math.PI) / 3, (10 * Math.PI) / 3, (2 * Math.PI) / 3, 2 * Math.PI],
      bankFireOffset: 0,
      blockHalf: 3.46,
      camLength: 7.7,
      camSprocketX: -4.18,
      mainXs: SEVEN_MAINS,
      flyX: 4.05,
      pulleyX: -4.1,
      boltCount: 18,
      spindle: 8.3,
    };
  }
  return {
    count: 4,
    banks: [0],
    bankX: () => 0,
    positions: FOUR_SPAN,
    phases: [0, Math.PI, Math.PI, 0],
    fireAngles: [0, 3 * Math.PI, Math.PI, 2 * Math.PI],
    bankFireOffset: 0,
    blockHalf: 2.52,
    camLength: 5.4,
    camSprocketX: -2.9,
    mainXs: FIVE_MAINS,
    flyX: 3,
    pulleyX: -3.05,
    boltCount: 12,
    spindle: 5.8,
  };
}

/**
 * Parametric reciprocating-engine builder. Supports the 90-degree cross-plane
 * V8, the 60-degree V12, a horizontally opposed flat-six, the 2.0-litre
 * inline-four, the Audi EA888 Gen2 (B8) and BMW B58 inline-six. The same
 * slider-crank constraint drives every piston; boosted variants add
 * turbocharger, direct-injection and charge-cooling hardware.
 */
export function buildPistonEngine(kind: PistonKind, ctx: BuildContext): MechanismAnimator {
  const w = createWorkshop(ctx);
  const g = ctx.groups;
  const layout = pistonLayout(kind);
  const i6 = kind === 'b58';
  const boosted = kind === 'ea888-b8' || i6 || kind === 'inline4';
  const { count, positions, phases, fireAngles, banks, blockHalf, camLength, mainXs, flyX, pulleyX, spindle } =
    layout;
  const bankOffset = layout.bankX;
  const r = 0.45;
  const L = 1.75;
  const cy = -0.5;
  const headWidth = blockHalf * 2 + 0.11;
  const camSprocketX = layout.camSprocketX;
  const boltCount = layout.boltCount;

  const crank = new T.Group();
  crank.position.y = cy;
  g.crankshaft.add(crank);

  w.cylinder(0.17, spindle, [0, 0, 0], w.steel, crank, 'Main Crankshaft Spindle', 'x');

  for (let j = 0; j < count; j++) {
    const x = positions[j];
    const a = phases[j];
    w.cylinder(0.19, 0.62, [x, Math.cos(a) * r, Math.sin(a) * r], w.polish, crank, 'Crankpin Journal', 'x');
    for (const dx of [-0.32, 0.32]) {
      const cw = w.box(
        [0.18, 0.77, 0.7],
        [x + dx, -Math.cos(a) * 0.24, -Math.sin(a) * 0.24],
        w.dark,
        crank,
        'Crankshaft Counterweight'
      );
      cw.rotation.x = a;
      const cheek = w.box(
        [0.18, 0.58, 0.29],
        [x + dx, Math.cos(a) * 0.24, Math.sin(a) * 0.24],
        w.steel,
        crank,
        'Crank Web Cheek'
      );
      cheek.rotation.x = a;
    }
  }

  for (const x of mainXs) {
    w.cylinder(0.26, 0.22, [x, 0, 0], w.polish, crank, 'Main Journal', 'x');
    w.ring(0.29, 0.07, [x, cy, 0], w.bronze, g.block, 'Main Bearing Saddle', 'x');
  }

  const fly = w.gear(1.05, 72, 0.22, crank, 'Flywheel Starter Ring Gear');
  fly.position.x = flyX;
  w.cylinder(0.72, 0.24, [flyX, 0, 0], w.dark, crank, 'Flywheel Inertia Disc', 'x');
  for (let i = 0; i < 8; i++) {
    w.bolt([flyX + 0.15, Math.cos((i / 8) * TAU) * 0.44, Math.sin((i / 8) * TAU) * 0.44], crank, 'x');
  }

  const pulley = w.gear(0.58, 32, 0.22, crank, 'Timing Chain Drive Sprocket');
  pulley.position.x = pulleyX;

  const motions: Array<(a: number) => void> = [];
  const combustionFlashes: T.Mesh[] = [];
  const combustionMaterials: T.MeshBasicMaterial[] = [];
  const combustionLights: T.PointLight[] = [];
  const wrapCycle = (a: number) => ((a % (TAU * 2)) + TAU * 2) % (TAU * 2);
  const valveLift = (phi: number, exhaust: boolean) => {
    const open = exhaust ? 0.92 * Math.PI : 1.82 * Math.PI;
    const close = exhaust ? 2.12 * Math.PI : 3.18 * Math.PI;
    if (phi < open || phi > close) return 0;
    return Math.sin((Math.PI * (phi - open)) / (close - open));
  };

  banks.forEach((beta, bankIndex) => {
    const bank = new T.Group();
    bank.rotation.x = beta;
    bank.position.set(bankOffset(bankIndex), cy, 0);
    g.block.add(bank);

    const blockShape = new T.Shape();
    blockShape.moveTo(-blockHalf, -0.78);
    blockShape.lineTo(blockHalf, -0.78);
    blockShape.lineTo(blockHalf, 0.78);
    blockShape.lineTo(-blockHalf, 0.78);
    blockShape.closePath();

    for (const x of positions) {
      const hole = new T.Path();
      hole.absarc(x, 0, 0.505, 0, TAU, true);
      blockShape.holes.push(hole);
    }

    const blockGeo = new T.ExtrudeGeometry(blockShape, {
      depth: 1.55,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 2,
      curveSegments: 48,
    });
    blockGeo.rotateX(-Math.PI / 2);
    const block = w.mesh(blockGeo, w.cast, bank, 'Cylinder Block Casting');
    block.position.y = 1.04;

    for (const x of positions) {
      const liner = new T.LatheGeometry(
        [
          new T.Vector2(0.5, 1.04),
          new T.Vector2(0.5, 2.58),
          new T.Vector2(0.53, 2.58),
          new T.Vector2(0.53, 1.04),
        ],
        64
      );
      const shell = w.mesh(liner, w.mat(0x9aabb8, 0.23, 0.85, true), bank, 'Cylinder Liner Sleeve');
      shell.position.x = x;
      w.ring(0.51, 0.025, [x, 2.6, 0], w.bronze, bank, 'Head Gasket Fire Ring');
    }

    const heads = new T.Group();
    heads.rotation.x = beta;
    heads.position.set(bankOffset(bankIndex), cy, 0);
    g.heads.add(heads);
    w.box([headWidth, 0.34, 1.56], [0, 2.8, 0], w.head, heads, 'Cylinder Head Deck');
    w.box([headWidth + 0.06, 0.28, 1.5], [0, 3.49, 0], w.cover, heads, 'Camshaft Valve Cover');

    for (let i = 0; i < boltCount; i++) {
      const perRow = boltCount / 2;
      const bx = -(blockHalf - 0.25) + (i % perRow) * ((blockHalf - 0.25) * 2) / (perRow - 1);
      w.bolt([bx, 3.68, i < perRow ? -0.62 : 0.62], heads);
    }

    const combustionLight = new T.PointLight(0xff5a12, 0, 9, 2);
    combustionLight.position.set(0, 2.68, 0);
    heads.add(combustionLight);
    combustionLights.push(combustionLight);

    const cams = new T.Group();
    cams.rotation.x = beta;
    cams.position.set(bankOffset(bankIndex), cy, 0);
    g.valvetrain.add(cams);

    const camRotors: T.Group[] = [];
    for (const z of [-0.43, 0.43]) {
      const cam = new T.Group();
      cam.position.set(0, 3.25, z);
      cams.add(cam);
      w.cylinder(0.1, camLength, [0, 0, 0], w.polish, cam, 'DOHC Camshaft Shaft', 'x');
      for (const x of positions) {
        const lobe = w.cylinder(0.15, 0.17, [x, 0.065, 0], w.dark, cam, 'Egg-Profile Cam Lobe', 'x');
        lobe.rotation.x = 0;
      }
      const wheel = w.gear(0.46, 40, 0.12, cam, 'Camshaft Timing Sprocket');
      wheel.position.x = camSprocketX;
      camRotors.push(cam);
    }

    const manifolds = new T.Group();
    manifolds.rotation.x = beta;
    manifolds.position.set(bankOffset(bankIndex), cy, 0);
    g.manifolds.add(manifolds);

    for (let j = 0; j < count; j++) {
      const x = positions[j];
      const phase = phases[j];
      const fire = fireAngles[j];
      const n = new T.Vector3(0, Math.cos(beta), Math.sin(beta));

      const piston = new T.Group();
      piston.rotation.x = beta;
      g.pistons.add(piston);

      const pg = new T.LatheGeometry(
        [
          new T.Vector2(0, 0.28),
          new T.Vector2(0.43, 0.28),
          new T.Vector2(0.475, 0.24),
          new T.Vector2(0.475, -0.32),
          new T.Vector2(0.39, -0.32),
          new T.Vector2(0.39, 0.14),
          new T.Vector2(0, 0.14),
        ],
        72
      );
      w.mesh(pg, w.polish, piston, `Forged Piston #${bankIndex * count + j + 1}`);

      for (const y of [0.17, 0.09, -0.14]) {
        w.ring(0.482, 0.015, [0, y, 0], w.dark, piston, 'Gas Compression Ring');
      }
      w.cylinder(0.095, 0.92, [0, -0.06, 0], w.steel, piston, 'Gudgeon Wrist Pin', 'x');

      // Combustion flash kernel, hidden until ignition.
      const flashMat = new T.MeshBasicMaterial({
        color: 0xff7a1a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: T.AdditiveBlending,
      });
      const flash = w.mesh(new T.SphereGeometry(0.245, 18, 12), flashMat, heads, 'Combustion Flame Kernel');
      flash.userData.excludeFromExplosion = true;
      flash.position.set(x, 2.58, 0);
      flash.scale.set(1, 0.62, 1);
      flash.visible = false;
      combustionMaterials.push(flashMat);
      combustionFlashes.push(flash);

      const rod = new T.Group();
      g.rods.add(rod);
      w.box([0.14, L - 0.25, 0.16], [0, 0, 0], w.steel, rod, 'Connecting Rod H-Beam');
      w.cylinder(0.24, 0.2, [0, -L / 2, 0], w.dark, rod, 'Big-End Rod Journal', 'x');
      w.ring(0.155, 0.038, [0.11, -L / 2, 0], w.bronze, rod, 'Big-End Shell Bearing', 'x');
      w.cylinder(0.14, 0.19, [0, L / 2, 0], w.steel, rod, 'Small-End Pin Eye', 'x');
      for (const y of [-L / 2 - 0.12, -L / 2 + 0.12]) {
        w.bolt([0, y, 0.22], rod, 'z', 0.24);
      }

      // Slider-crank constraint equation, evaluated in the bank plane.
      motions.push((theta) => {
        const a = theta + phase;
        const pin = new T.Vector3(
          x + bankOffset(bankIndex),
          cy + r * Math.cos(a),
          r * Math.sin(a)
        );
        const relative = a - beta;
        const q = r * Math.cos(relative) + Math.sqrt(L * L - r * r * Math.sin(relative) ** 2);
        const wrist = n.clone().multiplyScalar(q).add(new T.Vector3(pin.x, cy, 0));
        piston.position.copy(wrist);
        const delta = wrist.clone().sub(pin);
        rod.position.copy(pin).add(wrist).multiplyScalar(0.5);
        rod.quaternion.setFromUnitVectors(Y_AXIS, delta.normalize());
      });

      // Intake and exhaust poppet valves with realistic 720-degree timing.
      for (let v = 0; v < 2; v++) {
        const valve = new T.Group();
        valve.position.set(x, 3.0, v ? 0.35 : -0.35);
        cams.add(valve);
        w.cylinder(0.043, 0.52, [0, 0, 0], w.polish, valve, 'Poppet Valve Stem');
        w.cylinder(0.19, 0.045, [0, -0.25, 0], w.steel, valve, v ? 'Exhaust Valve Head' : 'Intake Valve Head');
        const springPts = Array.from(
          { length: 100 },
          (_, i) =>
            new T.Vector3(
              Math.cos((i / 99) * TAU * 6) * 0.09,
              -0.1 + (i / 99) * 0.28,
              Math.sin((i / 99) * TAU * 6) * 0.09
            )
        );
        w.tube(springPts, 0.014, w.dark, valve, 'Helical Valve Spring');

        motions.push((theta) => {
          const phi = wrapCycle(theta - fire + bankIndex * layout.bankFireOffset);
          valve.position.y = 3 - 0.14 * valveLift(phi, v === 1);
        });
      }

      w.cylinder(0.085, 0.28, [x, 3.08, 0], w.ceramic, heads, 'Spark Plug Ceramic Insulator');
      w.cylinder(0.07, 0.22, [x, 2.87, 0], w.steel, heads, 'Spark Plug Threaded Body');
      w.tube(
        [
          new T.Vector3(x, 2.75, 0.76),
          new T.Vector3(x, 2.7, 1.14),
          new T.Vector3(x - 0.1, 1.8, 1.4),
          new T.Vector3(x - 0.35, 1.4, 1.55),
        ],
        0.13,
        w.bronze,
        manifolds,
        'Exhaust Runner Header'
      );
      w.tube(
        [
          new T.Vector3(x, 2.8, -0.75),
          new T.Vector3(x, 3.03, -1),
          new T.Vector3(x, 3.3, -0.86),
        ],
        0.15,
        w.steel,
        manifolds,
        'Intake Runner Tube'
      );
    }

    w.box([blockHalf * 2 - 0.12, 0.45, 0.5], [0, 3.4, -0.95], w.dark, manifolds, 'Intake Plenum Chamber');
    motions.push((theta) => camRotors.forEach((c) => (c.rotation.x = theta / 2)));
  });

  w.box(
    [blockHalf * 2 + 0.36, 0.55, kind === 'flat6' ? 2.7 : kind === 'v8' ? 1.5 : 1.4],
    [0, -1.35, 0],
    w.cast,
    g.block,
    'Oil Pan Sump'
  );
  for (const x of mainXs) {
    for (const z of [-0.66, 0.66]) {
      w.bolt([x, -1.04, z], g.block, 'y');
    }
  }

  let turboRotor: T.Group | null = null;
  if (boosted) {
    const turboGroup = new T.Group();
    turboGroup.position.set(i6 ? 3.45 : 3.02, -0.15, 1.62);
    g.turbo.add(turboGroup);

    w.cylinder(0.42, 1.15, [0, 0, 0], w.dark, turboGroup, 'Turbocharger Centre Housing', 'x');
    w.ring(0.56, 0.16, [-0.72, 0, 0], w.cast, turboGroup, 'Turbine Volute Housing', 'x');
    w.ring(0.5, 0.15, [0.7, 0, 0], w.cast, turboGroup, 'Compressor Volute Housing', 'x');
    w.cylinder(0.12, 0.34, [0, 0.5, 0.12], w.steel, turboGroup, 'Wastegate Actuator Can', 'y');
    w.tube(
      [
        new T.Vector3(0, 0.32, 0.1),
        new T.Vector3(0.1, 0.6, 0.2),
        new T.Vector3(0.45, 0.62, 0.25),
      ],
      0.035,
      w.bronze,
      turboGroup,
      'Wastegate Control Linkage'
    );
    w.tube(
      [
        new T.Vector3(-0.55, 0.25, 0.15),
        new T.Vector3(-0.55, 0.75, 0.4),
        new T.Vector3(-0.2, 1.0, 0.55),
      ],
      0.05,
      w.steel,
      turboGroup,
      'Turbo Oil Feed Line'
    );
    w.tube(
      [
        new T.Vector3(0.82, -0.05, 0.12),
        new T.Vector3(1.3, -0.35, 0.55),
        new T.Vector3(1.6, -0.8, 0.9),
      ],
      0.11,
      w.steel,
      turboGroup,
      'Turbo Downpipe'
    );

    turboRotor = new T.Group();
    turboRotor.position.set(0, 0, 0);
    turboGroup.add(turboRotor);
    const turbineWheel = w.gear(0.34, 13, 0.12, turboRotor, 'Inconel Turbine Wheel');
    turbineWheel.position.x = -0.62;
    const compressorWheel = w.gear(0.31, 11, 0.12, turboRotor, 'Billet Compressor Wheel');
    compressorWheel.position.x = 0.6;
    w.cylinder(0.055, 1.4, [0, 0, 0], w.polish, turboRotor, 'Turbocharger Shaft', 'x');

    const charge = new T.Group();
    charge.position.set(i6 ? 2.2 : 1.9, 0.15, -1.65);
    g.chargecooler.add(charge);
    w.box([i6 ? 2.6 : 2.2, 0.9, 0.34], [0, 0, 0], w.titanium, charge, 'Charge-Air Intercooler Core');
    w.box([0.24, 0.96, 0.42], [-(i6 ? 1.3 : 1.1), 0, 0], w.steel, charge, 'Intercooler End Tank');
    w.box([0.24, 0.96, 0.42], [i6 ? 1.3 : 1.1, 0, 0], w.steel, charge, 'Intercooler End Tank');
    w.tube(
      [
        new T.Vector3(i6 ? 1.4 : 1.2, 0, -1.65),
        new T.Vector3(i6 ? 2.3 : 1.9, 0.3, -1.4),
        new T.Vector3(3.25, 0.3, 1.5),
        new T.Vector3(3.05, 0.15, 1.7),
      ],
      0.12,
      w.polish,
      g.chargecooler,
      'Compressor-to-Intercooler Charge Pipe'
    );
    w.tube(
      [
        new T.Vector3(-(i6 ? 1.4 : 1.2), 0, -1.65),
        new T.Vector3(-1.9, 0.35, -1.3),
        new T.Vector3(-1.6, 0.7, -0.85),
        new T.Vector3(-0.8, 0.9, -0.8),
      ],
      0.12,
      w.polish,
      g.chargecooler,
      'Intercooler-to-Throttle Body Pipe'
    );

    const fuel = new T.Group();
    g.fuel.add(fuel);
    const railX = blockHalf - 0.3;
    w.cylinder(0.065, railX * 2, [0, 3.12, 0.55], w.steel, fuel, 'High-Pressure Fuel Rail', 'x');
    for (const x of positions) {
      w.cylinder(0.055, 0.5, [x, 3.13, 0.3], w.steel, fuel, 'Direct Injector Body', 'z');
      w.cylinder(0.035, 0.26, [x, 2.88, 0.05], w.polish, fuel, 'Injector Nozzle Tip', 'y');
      w.tube(
        [
          new T.Vector3(x, 3.12, 0.55),
          new T.Vector3(x, 3.2, 0.65),
          new T.Vector3(x, 3.2, 0.85),
        ],
        0.025,
        w.dark,
        fuel,
        'Injector Electrical Connector'
      );
    }
    w.cylinder(0.18, 0.5, [-railX + 0.15, 3.0, 0.6], w.dark, fuel, 'Cam-Driven High-Pressure Pump', 'x');
    w.tube(
      [
        new T.Vector3(-railX + 0.15, 3.0, 0.6),
        new T.Vector3(-railX + 0.4, 3.12, 0.6),
      ],
      0.04,
      w.steel,
      fuel,
      'High-Pressure Fuel Line'
    );

    if (i6) {
      w.cylinder(0.16, 0.46, [-3.9, 3.32, 0.5], w.steel, g.valvetrain, 'Valvetronic Actuator Motor', 'x');
      w.gear(0.2, 18, 0.1, g.valvetrain, 'Valvetronic Worm Drive').position.set(-3.68, 3.32, 0.5);
    } else {
      w.box([0.26, 2.5, 1.35], [-3.22, 1.45, 0], w.cover, g.valvetrain, 'Timing Chain Cover');
      w.ring(0.66, 0.055, [-3.32, 0.0, 0], w.dark, g.valvetrain, 'Front Crankshaft Seal', 'x');
    }
  }

  const animate: MechanismAnimator = (theta, frame) => {
    crank.rotation.x = theta;
    motions.forEach((fn) => fn(theta));

    const load = frame ? Math.max(0, Math.min(1, frame.load)) : 0.55;
    let peak = 0;
    let peakX = 0;
    for (let i = 0; i < combustionFlashes.length; i++) {
      const cylinderIndex = i % count;
      const fire = fireAngles[cylinderIndex];
      const phi = wrapCycle(theta - fire);
      // Flame kernel grows just after TDC and fades through the power stroke.
      const burn =
        phi < Math.PI
          ? Math.max(0, Math.sin((phi / Math.PI) * Math.PI)) * Math.exp(-phi * 1.4)
          : 0;
      const intensity = Math.min(1, burn * (0.25 + load * 0.95));
      const mat = combustionMaterials[i];
      const flash = combustionFlashes[i];
      mat.opacity = intensity * 0.85;
      flash.visible = intensity > 0.015;
      flash.scale.setScalar(0.7 + intensity * 0.9);
      if (intensity > peak) {
        peak = intensity;
        peakX = positions[cylinderIndex];
      }
    }
    for (const light of combustionLights) {
      light.intensity = peak * 5.5;
      light.position.x = peakX;
    }
    if (turboRotor) turboRotor.rotation.x = theta * 4.2;
  };
  animate(0);
  return animate;
}

/** Rotary engine builder with epitrochoidal chamber: R exp(i phi) + e exp(i 3 phi) */
export function buildRotaryEngine(ctx: BuildContext) {
  const w = createWorkshop(ctx);
  const g = ctx.groups;
  const R = 1.55;
  const e = 0.25;
  const depth = 1.3;

  const chamber = (margin = 0) => {
    const path = new T.Shape();
    for (let i = 0; i <= 240; i++) {
      const a = (i / 240) * TAU;
      const y = R * Math.cos(a) + e * Math.cos(3 * a);
      const z = R * Math.sin(a) + e * Math.sin(3 * a);
      const length = Math.hypot(y, z);
      const f = 1 + margin / length;
      if (!i) path.moveTo(y * f, z * f);
      else path.lineTo(y * f, z * f);
    }
    path.closePath();
    return path;
  };

  const ringShape = chamber(0.28);
  ringShape.holes.push(new T.Path(chamber().getPoints(240)).closePath());

  function extrude(
    shape: T.Shape,
    d: number,
    x: number,
    m: T.Material,
    parent: T.Object3D,
    name: string
  ): T.Mesh {
    const geo = new T.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: true,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      bevelSegments: 2,
      curveSegments: 72,
    });
    geo.translate(0, 0, -d / 2);
    geo.applyMatrix4(
      new T.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1)
    );
    const o = w.mesh(geo, m, parent, name);
    o.position.x = x;
    return o;
  }

  extrude(ringShape, depth, 0, w.cast, g.housing, 'Epitrochoid Rotor Housing');

  for (const x of [-0.49, -0.24, 0, 0.24, 0.49]) {
    const fin = chamber(0.4);
    fin.holes.push(new T.Path(chamber(0.29).getPoints(240)).closePath());
    extrude(fin, 0.045, x, w.head, g.housing, 'Housing Cooling Fin');
  }

  for (const x of [-0.79, 0.79]) {
    const side = chamber(0.26);
    const bore = new T.Path();
    bore.absarc(0, 0, 0.43, 0, TAU, true);
    side.holes.push(bore);
    extrude(side, 0.18, x, w.head, g.endplates, 'Side Housing End Plate');
    w.ring(0.37, 0.08, [x, 0, 0], w.bronze, g.endplates, 'Eccentric Shaft Bearing', 'x');
  }

  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    const y = (R + 0.44) * Math.cos(a);
    const z = (R - 0.05) * Math.sin(a);
    w.bolt([-0.96, y, z], g.endplates, 'x', 0.23);
    w.bolt([0.96, y, z], g.endplates, 'x', 0.23);
  }

  const rotorMotion = new T.Group();
  const sealMotion = new T.Group();
  const gearMotion = new T.Group();
  g.rotor.add(rotorMotion);
  g.seals.add(sealMotion);
  g.gears.add(gearMotion);

  const tri = new T.Shape();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    const b = ((k + 1) / 3) * TAU;
    for (let i = 0; i < 32; i++) {
      const t = i / 32;
      const y = R * ((1 - t) * Math.cos(a) + t * Math.cos(b));
      const z = R * ((1 - t) * Math.sin(a) + t * Math.sin(b));
      if (k === 0 && i === 0) tri.moveTo(y, z);
      else tri.lineTo(y, z);
    }
  }
  tri.closePath();
  const hole = new T.Path();
  hole.absarc(0, 0, 0.36, 0, TAU, true);
  tri.holes.push(hole);
  extrude(tri, 1.12, 0, w.dark, rotorMotion, 'Three-Apex Reuleaux Rotor');

  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    const y = R * Math.cos(a);
    const z = R * Math.sin(a);
    w.box([1.16, 0.045, 0.045], [0, y, z], w.polish, sealMotion, 'Apex Gas Seal');
    const b = ((k + 1) / 3) * TAU;
    for (const x of [-0.575, 0.575]) {
      w.tube(
        [
          new T.Vector3(x, y * 0.96, z * 0.96),
          new T.Vector3(
            x,
            R * (Math.cos(a) + Math.cos(b)) * 0.48,
            R * (Math.sin(a) + Math.sin(b)) * 0.48
          ),
          new T.Vector3(x, R * Math.cos(b) * 0.96, R * Math.sin(b) * 0.96),
        ],
        0.018,
        w.polish,
        sealMotion,
        'Side Face Gas Seal'
      );
    }
  }

  // 30-tooth internal gear around 20-tooth fixed gear
  const fixed = w.gear(0.5, 20, 0.1, g.gears, 'Stationary Timing Sun Gear');
  fixed.position.x = 0.59;

  const internal = new T.Shape();
  internal.absarc(0, 0, 0.91, 0, TAU, false);
  const inner = new T.Path();
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * TAU;
    const rad = i % 4 === 0 || i % 4 === 3 ? 0.75 : 0.71;
    if (!i) inner.moveTo(rad * Math.cos(a), rad * Math.sin(a));
    else inner.lineTo(rad * Math.cos(a), rad * Math.sin(a));
  }
  inner.closePath();
  internal.holes.push(inner);
  extrude(internal, 0.1, 0.59, w.steel, gearMotion, 'Internal Rotor Annulus Gear');

  const eccentric = new T.Group();
  g.eccentric.add(eccentric);
  w.cylinder(0.22, 3.8, [0, 0, 0], w.polish, eccentric, 'Eccentric Output Shaft', 'x');
  w.cylinder(0.35, 1.08, [0, e, 0], w.steel, eccentric, 'Eccentric Rotor Journal', 'x');
  w.cylinder(0.6, 0.16, [-1.25, -0.12, 0], w.dark, eccentric, 'Dynamic Balance Weight', 'x');
  w.cylinder(0.65, 0.15, [1.4, 0, 0], w.steel, eccentric, 'Output Power Flange', 'x');

  for (const sign of [-1, 1]) {
    w.tube(
      [
        new T.Vector3(-0.1, -0.8, sign * 1.43),
        new T.Vector3(-0.1, -0.85, sign * 1.85),
        new T.Vector3(0.55, -0.75, sign * 2.15),
      ],
      0.18,
      sign === 1 ? w.bronze : w.steel,
      g.ports,
      sign === 1 ? 'Exhaust Peripheral Port' : 'Intake Peripheral Port'
    );
  }

  for (const x of [-0.3, 0.3]) {
    w.cylinder(0.07, 0.35, [x, 1.85, 0], w.ceramic, g.ports, 'Spark Plug Insulator');
    w.cylinder(0.09, 0.2, [x, 1.62, 0], w.steel, g.ports, 'Spark Plug Base');
  }

  const animate = (theta: number) => {
    eccentric.rotation.x = theta;
    for (const group of [rotorMotion, sealMotion, gearMotion]) {
      group.position.set(0, e * Math.cos(theta), e * Math.sin(theta));
      group.rotation.x = theta / 3;
    }
  };
  animate(0);
  return animate;
}

/** Shaft output & reduction gearbox builder (turboprop & turboshaft) */
export function buildShaftOutput(kind: 'turboprop' | 'turboshaft', ctx: BuildContext) {
  const w = createWorkshop(ctx);
  const parent = ctx.groups.fan;

  w.cylinder(0.98, 0.72, [-3.55, 0, 0], w.head, parent, 'Epicyclic Gearbox Casing', 'x');

  const sun = new T.Group();
  const carrier = new T.Group();
  const output = new T.Group();
  sun.position.x = carrier.position.x = -3.93;
  output.position.x = -4.18;
  parent.add(sun, carrier, output);

  w.gear(0.29, 20, 0.16, sun, 'Sun Input Gear');
  const planets: T.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const planet = w.gear(0.29, 20, 0.16, carrier, `Planet Gear #${i + 1}`);
    planet.position.set(0, Math.cos(a) * 0.58, Math.sin(a) * 0.58);
    planets.push(planet);
    w.cylinder(0.075, 0.3, [0, planet.position.y, planet.position.z], w.bronze, carrier, 'Planet Bearing Pin', 'x');
  }

  w.ring(0.9, 0.045, [-3.93, 0, 0], w.steel, parent, 'Fixed Ring Gear Rim', 'x');
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    const tooth = w.box(
      [0.16, 0.045, 0.045],
      [-3.93, Math.cos(a) * 0.875, Math.sin(a) * 0.875],
      w.steel,
      parent,
      'Internal Ring Gear Tooth'
    );
    tooth.rotation.x = a;
  }

  w.cylinder(0.21, 0.85, [-4.22, 0, 0], w.polish, parent, 'Reduction Spindle Shaft', 'x');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    w.bolt([-3.98, Math.cos(a) * 0.97, Math.sin(a) * 0.97], parent, 'x');
  }

  if (kind === 'turboprop') {
    w.cylinder(0.36, 0.4, [0, 0, 0], w.steel, output, 'Propeller Hub Root', 'x');
    for (let k = 0; k < 5; k++) {
      const blade = new T.Group();
      blade.rotation.x = (k / 5) * TAU;
      output.add(blade);
      const verts: number[] = [];
      const indices: number[] = [];
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const span = 0.32 + t * 2.9;
        const chord = 0.48 * Math.sin(Math.PI * (0.08 + 0.9 * t)) + 0.13;
        const twist = 0.85 * (1 - t) + 0.12;
        for (let j = 0; j < 24; j++) {
          const a = (j / 24) * TAU;
          const u = (Math.cos(a) * chord) / 2;
          const th = Math.sin(a) * 0.035 * (1 - t * 0.7);
          verts.push(
            u * Math.cos(twist) - th * Math.sin(twist) + 0.16 * t * t,
            span,
            u * Math.sin(twist) + th * Math.cos(twist) + 0.17 * t * t
          );
        }
      }
      for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 24; j++) {
          const a = i * 24 + j;
          const b = i * 24 + ((j + 1) % 24);
          indices.push(a, b, a + 24, b, b + 24, a + 24);
        }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      w.mesh(geo, w.dark, blade, `Propeller Scimitar Blade #${k + 1}`);
      w.cylinder(0.15, 0.32, [0, 0.42, 0], w.steel, blade, 'Blade Retention Cuff');
    }

    const spinner = new T.LatheGeometry(
      [
        new T.Vector2(0, -0.58),
        new T.Vector2(0.14, -0.51),
        new T.Vector2(0.34, -0.12),
        new T.Vector2(0.38, 0.12),
      ],
      80
    );
    spinner.rotateZ(-Math.PI / 2);
    w.mesh(spinner, w.polish, output, 'Aerodynamic Propeller Spinner');
  } else {
    w.cylinder(0.52, 0.2, [-0.3, 0, 0], w.polish, output, 'Power Take-Off Flange', 'x');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      w.bolt([-0.45, Math.cos(a) * 0.37, Math.sin(a) * 0.37], output, 'x');
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const spline = w.box(
        [0.55, 0.025, 0.04],
        [-0.08, Math.cos(a) * 0.22, Math.sin(a) * 0.22],
        w.steel,
        output,
        'Shaft Spline Tooth'
      );
      spline.rotation.x = a;
    }
  }

  return (theta: number) => {
    sun.rotation.x = theta * 1.2;
    carrier.rotation.x = theta * 0.3;
    output.rotation.x = theta * 0.3;
    planets.forEach((p) => (p.rotation.x = -theta * 0.9));
  };
}

/** 12-Slot 14-Pole Brushless DC Motor & Robotic Joint Actuator builder */
export function buildElectricMotor(ctx: BuildContext) {
  const w = createWorkshop(ctx);
  const g = ctx.groups;

  // Stator Core: 12 laminated teeth
  const statorGroup = new T.Group();
  g.stator.add(statorGroup);
  w.cylinder(1.6, 1.2, [0, 0, 0], w.steel, statorGroup, 'Stator Back-Iron Lamination', 'x');

  // Windings: 12 copper tooth coils
  const windingGroup = new T.Group();
  g.windings.add(windingGroup);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const toothPos = [0, Math.cos(a) * 1.15, Math.sin(a) * 1.15];
    const coil = w.box([0.9, 0.32, 0.24], toothPos, w.copper, windingGroup, `Phase Coil #${i + 1}`);
    coil.rotation.x = a;
    w.cylinder(0.08, 0.95, toothPos, w.steel, statorGroup, `Stator Tooth Pole #${i + 1}`, 'x');
  }

  // Rotor Drum: 14 alternating permanent magnets
  const rotorGroup = new T.Group();
  g.rotor.add(rotorGroup);
  w.cylinder(1.72, 1.4, [0, 0, 0], w.dark, rotorGroup, 'Rotor Magnet Flux Return Ring', 'x');
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    const isNorth = i % 2 === 0;
    const magnet = w.box(
      [1.1, 0.09, 0.22],
      [0, Math.cos(a) * 1.58, Math.sin(a) * 1.58],
      isNorth ? w.polish : w.titanium,
      rotorGroup,
      `Neodymium Magnet Pole #${i + 1} (${isNorth ? 'N' : 'S'})`
    );
    magnet.rotation.x = a;
  }

  // Output Shaft & Bearings
  const shaftGroup = new T.Group();
  g.shaft.add(shaftGroup);
  w.cylinder(0.28, 4.2, [0, 0, 0], w.polish, shaftGroup, 'Main Hardened Spindle Shaft', 'x');
  w.ring(0.55, 0.12, [-1.2, 0, 0], w.bronze, shaftGroup, 'Front Hybrid Ceramic Ball Bearing', 'x');
  w.ring(0.55, 0.12, [1.2, 0, 0], w.bronze, shaftGroup, 'Rear Hybrid Ceramic Ball Bearing', 'x');

  // Planetary reduction gearhead
  const gearheadGroup = new T.Group();
  g.gearhead.add(gearheadGroup);
  const sunGear = w.gear(0.35, 24, 0.22, gearheadGroup, 'Gearhead Sun Input Pinion');
  sunGear.position.x = 1.6;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const planet = w.gear(0.35, 24, 0.22, gearheadGroup, `Gearhead Planet Gear #${i + 1}`);
    planet.position.set(1.6, Math.cos(a) * 0.72, Math.sin(a) * 0.72);
  }
  w.ring(1.15, 0.08, [1.6, 0, 0], w.steel, gearheadGroup, 'Internal Annulus Ring Gear', 'x');

  // Magnetic Encoder
  const encoderGroup = new T.Group();
  g.encoder.add(encoderGroup);
  w.ring(0.8, 0.04, [-1.6, 0, 0], w.mat(0x10b981, 0.4, 0.2), encoderGroup, 'Magnetic Dipole Encoder Ring', 'x');
  w.box([0.08, 0.35, 0.45], [-1.75, 0.8, 0], w.dark, encoderGroup, 'Encoder Hall-Effect Sensor PCB');

  // Actuator Outer Housing with Cooling Fins
  const housingGroup = new T.Group();
  g.housing.add(housingGroup);
  w.cylinder(1.95, 2.2, [0, 0, 0], w.cast, housingGroup, 'Actuator Outer Body', 'x');
  for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) {
    w.ring(2.1, 0.05, [x, 0, 0], w.cast, housingGroup, 'Circumferential Heat Sink Fin', 'x');
  }

  const animate = (theta: number) => {
    rotorGroup.rotation.x = theta;
    shaftGroup.rotation.x = theta;
    sunGear.rotation.x = theta;
  };
  animate(0);
  return animate;
}

/** Double-stator axial-flux traction motor with segmented coreless windings. */
export function buildAxialFluxMotor(ctx: BuildContext): MechanismAnimator {
  const w = createWorkshop(ctx);
  const g = ctx.groups;

  const statorGroup = new T.Group();
  g.stator.add(statorGroup);
  for (const x of [-0.36, 0.36]) {
    w.cylinder(1.62, 0.16, [x, 0, 0], w.steel, statorGroup, 'Segmented Stator Lamination Stack', 'x');
    w.ring(1.58, 0.06, [x, 0, 0], w.dark, statorGroup, 'Stator Segment Retaining Ring', 'x');
  }

  const windingGroup = new T.Group();
  g.windings.add(windingGroup);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    for (const x of [-0.49, 0.49]) {
      const coil = w.box(
        [0.34, 0.3, 0.17],
        [x, Math.cos(a) * 1.18, Math.sin(a) * 1.18],
        w.copper,
        windingGroup,
        `Toroidal Phase Coil #${i + 1}`
      );
      coil.rotation.x = a;
    }
  }

  const rotorGroup = new T.Group();
  g.rotor.add(rotorGroup);
  w.cylinder(1.78, 0.2, [0, 0, 0], w.rubber, rotorGroup, 'Carbon-Fibre Rotor Carrier', 'x');
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const north = i % 2 === 0;
    const magnet = w.box(
      [0.22, 0.34, 0.18],
      [0, Math.cos(a) * 1.5, Math.sin(a) * 1.5],
      north ? w.polish : w.titanium,
      rotorGroup,
      `Segmented NdFeB Magnet #${i + 1} (${north ? 'N' : 'S'})`
    );
    magnet.rotation.x = a;
  }

  const shaftGroup = new T.Group();
  g.shaft.add(shaftGroup);
  w.cylinder(0.34, 4.4, [0, 0, 0], w.polish, shaftGroup, 'Hollow Direct-Drive Output Shaft', 'x');
  w.cylinder(0.19, 4.5, [0, 0, 0], w.dark, shaftGroup, 'Hollow Shaft Bore', 'x');
  w.ring(0.62, 0.12, [-1.35, 0, 0], w.bronze, shaftGroup, 'Angular-Contact Bearing', 'x');
  w.ring(0.62, 0.12, [1.35, 0, 0], w.bronze, shaftGroup, 'Angular-Contact Bearing', 'x');

  const inverter = new T.Group();
  g.inverter.add(inverter);
  w.box([1.05, 0.6, 0.9], [0, 1.95, 0], w.dark, inverter, 'SiC Traction Inverter Housing');
  for (let i = 0; i < 6; i++) {
    w.box([0.9, 0.04, 0.72], [0, 2.18 + i * 0.045, 0], w.steel, inverter, 'Inverter Cooling Fin');
  }
  w.cylinder(0.055, 2.2, [0, 1.65, 0.28], w.copper, inverter, 'Three-Phase Busbar', 'x');

  const encoderGroup = new T.Group();
  g.encoder.add(encoderGroup);
  w.ring(0.74, 0.05, [-1.7, 0, 0], w.mat(0x8b5cf6, 0.4, 0.3), encoderGroup, 'Resolver Stator Ring', 'x');
  w.cylinder(0.44, 0.08, [-1.7, 0, 0], w.dark, encoderGroup, 'Resolver Rotor Lamination', 'x');
  w.box([0.16, 0.3, 0.44], [-1.85, 0.72, 0], w.dark, encoderGroup, 'Resolver Signal Connector');

  const housingGroup = new T.Group();
  g.housing.add(housingGroup);
  for (const x of [-0.72, 0.72]) {
    w.ring(2.02, 0.16, [x, 0, 0], w.cast, housingGroup, 'Cooling-Jacket End Flange', 'x');
  }
  w.cylinder(2.04, 0.95, [0, 0, 0], w.cast, housingGroup, 'Water-Cooled Outer Housing', 'x');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    w.box(
      [1.0, 0.08, 0.18],
      [0, Math.cos(a) * 2.08, Math.sin(a) * 2.08],
      w.cast,
      housingGroup,
      'Axial Cooling Fin'
    ).rotation.x = a;
  }
  w.box([0.55, 0.35, 0.45], [0, 2.2, 0.1], w.steel, housingGroup, 'Coolant Inlet Port');

  const animate: MechanismAnimator = (theta) => {
    rotorGroup.rotation.x = theta;
    shaftGroup.rotation.x = theta;
    inverter.rotation.x = Math.sin(theta * 0.2) * 0.01;
  };
  animate(0);
  return animate;
}

/** Three-phase induction motor with a copper squirrel-cage rotor. */
export function buildInductionMotor(ctx: BuildContext): MechanismAnimator {
  const w = createWorkshop(ctx);
  const g = ctx.groups;

  const statorGroup = new T.Group();
  g.stator.add(statorGroup);
  w.cylinder(1.72, 2.0, [0, 0, 0], w.steel, statorGroup, 'Laminated Stator Core', 'x');
  w.cylinder(1.36, 2.04, [0, 0, 0], w.dark, statorGroup, 'Stator Bore Lamination Stack', 'x');
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const tooth = w.box(
      [1.96, 0.26, 0.12],
      [0, Math.cos(a) * 1.3, Math.sin(a) * 1.3],
      w.steel,
      statorGroup,
      `Stator Slot Tooth #${i + 1}`
    );
    tooth.rotation.x = a;
  }

  const windingGroup = new T.Group();
  g.windings.add(windingGroup);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const coil = w.box(
      [1.7, 0.3, 0.2],
      [0, Math.cos(a) * 1.52, Math.sin(a) * 1.52],
      i % 3 === 0 ? w.copper : i % 3 === 1 ? w.bronze : w.polish,
      windingGroup,
      `Distributed ${i % 3 === 0 ? 'U' : i % 3 === 1 ? 'V' : 'W'}-Phase Coil #${i + 1}`
    );
    coil.rotation.x = a;
  }

  const rotorGroup = new T.Group();
  g.rotor.add(rotorGroup);
  w.cylinder(1.24, 1.9, [0, 0, 0], w.dark, rotorGroup, 'Rotor Lamination Core', 'x');
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    w.cylinder(0.075, 2.0, [0, Math.cos(a) * 1.12, Math.sin(a) * 1.12], w.copper, rotorGroup, `Squirrel-Cage Copper Bar #${i + 1}`, 'x');
  }
  for (const x of [-0.98, 0.98]) {
    w.ring(1.15, 0.1, [x, 0, 0], w.copper, rotorGroup, 'Short-Circuit End Ring', 'x');
  }

  const shaftGroup = new T.Group();
  g.shaft.add(shaftGroup);
  w.cylinder(0.3, 4.2, [0, 0, 0], w.polish, shaftGroup, 'Induction Rotor Shaft', 'x');
  w.ring(0.48, 0.11, [-1.25, 0, 0], w.bronze, shaftGroup, 'Deep-Groove Ball Bearing', 'x');
  w.ring(0.48, 0.11, [1.25, 0, 0], w.bronze, shaftGroup, 'Cylindrical Roller Bearing', 'x');

  const encoderGroup = new T.Group();
  g.encoder.add(encoderGroup);
  w.ring(0.6, 0.04, [-1.6, 0, 0], w.mat(0x8b5cf6, 0.4, 0.3), encoderGroup, 'Incremental Encoder Disc', 'x');
  w.box([0.12, 0.28, 0.4], [-1.75, 0.62, 0], w.dark, encoderGroup, 'Encoder Optical Read Head');

  const housingGroup = new T.Group();
  g.housing.add(housingGroup);
  w.cylinder(1.9, 2.2, [0, 0, 0], w.cast, housingGroup, 'Motor Frame', 'x');
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    w.box(
      [2.1, 0.1, 0.2],
      [0, Math.cos(a) * 2.0, Math.sin(a) * 2.0],
      w.cast,
      housingGroup,
      'Axial Cooling Fin'
    ).rotation.x = a;
  }
  w.box([0.7, 0.45, 0.55], [0, 2.05, 0], w.dark, housingGroup, 'Terminal Box');
  w.cylinder(0.05, 0.6, [0, 2.4, 0.1], w.copper, housingGroup, 'Phase Terminal Stud', 'y');

  const animate: MechanismAnimator = (theta) => {
    rotorGroup.rotation.x = theta;
    shaftGroup.rotation.x = theta;
  };
  animate(0);
  return animate;
}

/** Two-phase hybrid stepper with visible tooth detents. */
export function buildStepperMotor(ctx: BuildContext): MechanismAnimator {
  const w = createWorkshop(ctx);
  const g = ctx.groups;

  const statorGroup = new T.Group();
  g.stator.add(statorGroup);
  w.cylinder(1.45, 1.5, [0, 0, 0], w.steel, statorGroup, 'Eight-Pole Stator Core', 'x');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const pole = w.box(
      [1.62, 0.5, 0.34],
      [0, Math.cos(a) * 1.05, Math.sin(a) * 1.05],
      w.steel,
      statorGroup,
      `Stator Pole #${i + 1}`
    );
    pole.rotation.x = a;
    for (let k = -3; k <= 3; k++) {
      w.box(
        [1.5, 0.1, 0.28],
        [k * 0.17, Math.cos(a) * 1.34, Math.sin(a) * 1.34],
        w.dark,
        statorGroup,
        'Stator Pole Tooth'
      ).rotation.x = a;
    }
  }

  const windingGroup = new T.Group();
  g.windings.add(windingGroup);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const phaseA = i % 4 < 2;
    const coil = w.box(
      [0.62, 0.65, 0.42],
      [0, Math.cos(a) * 1.03, Math.sin(a) * 1.03],
      phaseA ? w.copper : w.bronze,
      windingGroup,
      `Phase ${phaseA ? 'A' : 'B'} Coil #${i + 1}`
    );
    coil.rotation.x = a;
    w.tube(
      [
        new T.Vector3(0.38, Math.cos(a) * 1.03, Math.sin(a) * 1.03),
        new T.Vector3(0.9, Math.cos(a) * 1.5, Math.sin(a) * 1.65),
        new T.Vector3(1.2, Math.cos(a) * 1.9, Math.sin(a) * 2.0),
      ],
      0.035,
      phaseA ? w.copper : w.bronze,
      windingGroup,
      'Phase Lead Wire'
    );
  }

  const rotorGroup = new T.Group();
  g.rotor.add(rotorGroup);
  w.cylinder(0.82, 1.15, [0, 0, 0], w.dark, rotorGroup, 'Hybrid Rotor Magnet Core', 'x');
  for (let i = 0; i < 50; i++) {
    const a = (i / 50) * TAU;
    w.box(
      [0.5, 0.2, 0.12],
      [0, Math.cos(a) * 0.86, Math.sin(a) * 0.86],
      w.steel,
      rotorGroup,
      `Rotor Tooth #${i + 1}`
    ).rotation.x = a;
  }
  w.ring(0.9, 0.08, [-0.5, 0, 0], w.dark, rotorGroup, 'Rotor Cup A', 'x');
  w.ring(0.9, 0.08, [0.5, 0, 0], w.dark, rotorGroup, 'Rotor Cup B', 'x');

  const shaftGroup = new T.Group();
  g.shaft.add(shaftGroup);
  w.cylinder(0.22, 3.4, [0, 0, 0], w.polish, shaftGroup, 'Precision Output Shaft', 'x');
  w.ring(0.38, 0.09, [-0.95, 0, 0], w.bronze, shaftGroup, 'Preloaded Ball Bearing', 'x');
  w.ring(0.38, 0.09, [0.95, 0, 0], w.bronze, shaftGroup, 'Preloaded Ball Bearing', 'x');

  const encoderGroup = new T.Group();
  g.encoder.add(encoderGroup);
  w.ring(0.48, 0.035, [-1.3, 0, 0], w.mat(0x8b5cf6, 0.4, 0.3), encoderGroup, 'Magnetic Encoder Magnet', 'x');
  w.box([0.1, 0.24, 0.32], [-1.45, 0.5, 0], w.dark, encoderGroup, 'Encoder ASIC Board');

  const housingGroup = new T.Group();
  g.housing.add(housingGroup);
  for (const x of [-0.78, 0.78]) {
    w.box([0.22, 2.25, 2.25], [x, 0, 0], w.cast, housingGroup, 'NEMA 34 End Plate');
    for (const [y, z] of [
      [0.82, 0.82],
      [-0.82, 0.82],
      [0.82, -0.82],
      [-0.82, -0.82],
    ]) {
      w.cylinder(0.075, 0.28, [x + Math.sign(x) * 0.02, y, z], w.dark, housingGroup, 'Mounting Bolt Hole', 'x');
    }
  }
  w.box([1.4, 0.3, 2.05], [0, 1.03, 0], w.cast, housingGroup, 'Motor Body Heatsink Rail');
  w.box([0.55, 0.35, 0.5], [0.9, 0.2, 0.9], w.dark, housingGroup, 'Terminal Connector Block');

  const stepAngle = TAU / 200;
  const animate: MechanismAnimator = (theta) => {
    const snapped = Math.round(theta / stepAngle) * stepAngle;
    rotorGroup.rotation.x = snapped;
    shaftGroup.rotation.x = snapped;
  };
  animate(0);
  return animate;
}

/** AeroJet-X Supersonic Aircraft Airframe & Dual Turbofans builder */
export function buildAirplaneJet(ctx: BuildContext) {
  const w = createWorkshop(ctx);
  const g = ctx.groups;

  // Fuselage: Area-ruled streamlined supersonic body
  const fuselageGroup = new T.Group();
  g.fuselage.add(fuselageGroup);

  const fuselageProfile = [
    new T.Vector2(0, -6.5),
    new T.Vector2(0.25, -6.0),
    new T.Vector2(0.65, -4.5),
    new T.Vector2(0.95, -2.5),
    new T.Vector2(1.15, 0),
    new T.Vector2(1.15, 3.5),
    new T.Vector2(0.9, 5.5),
    new T.Vector2(0.55, 6.8),
    new T.Vector2(0.1, 7.5),
  ];
  const fuselageGeo = new T.LatheGeometry(fuselageProfile, 64);
  fuselageGeo.rotateZ(-Math.PI / 2);
  fuselageGeo.scale(1, 0.75, 1.35);
  w.mesh(fuselageGeo, w.cast, fuselageGroup, 'Supersonic Blended Fuselage');

  // Cockpit Canopy
  const canopyGroup = new T.Group();
  g.canopy.add(canopyGroup);
  const canopyGeo = new T.SphereGeometry(1.2, 32, 16);
  canopyGeo.scale(2.2, 0.65, 0.65);
  const canopyMesh = w.mesh(canopyGeo, w.mat(0x0284c7, 0.1, 0.2), canopyGroup, 'Avionics Bubble Canopy');
  canopyMesh.position.set(-2.2, 0.75, 0);

  // Wings: Swept trapezoidal supercritical delta wings with winglets
  const wingsGroup = new T.Group();
  g.wings.add(wingsGroup);

  for (const sign of [-1, 1]) {
    const wingShape = new T.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-1.8, sign * 5.8);
    wingShape.lineTo(-0.6, sign * 6.0); // winglet root
    wingShape.lineTo(2.4, sign * 5.2);
    wingShape.lineTo(3.2, 0);
    wingShape.closePath();

    const wingGeo = new T.ExtrudeGeometry(wingShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelThickness: 0.04,
      bevelSize: 0.04,
    });
    wingGeo.rotateX(Math.PI / 2);
    const wingMesh = w.mesh(wingGeo, w.titanium, wingsGroup, `Delta Wing Assembly (${sign > 0 ? 'Starboard' : 'Port'})`);
    wingMesh.position.set(-0.5, 0, 0);

    // Vertical winglet
    const winglet = w.box([0.9, 0.85, 0.06], [0.3, 0.42, sign * 5.9], w.titanium, wingsGroup, 'Aerodynamic Winglet');
    winglet.rotation.z = -0.15;
  }

  // Dual Underwing / Fuselage Turbofan Nacelles
  const enginesGroup = new T.Group();
  g.engines.add(enginesGroup);
  const nacelleFans: T.Group[] = [];

  for (const sign of [-1, 1]) {
    const nacelleZ = sign * 1.55;
    w.cylinder(0.68, 4.4, [1.4, -0.35, nacelleZ], w.dark, enginesGroup, `Turbofan Nacelle Cowling (${sign > 0 ? 'Right' : 'Left'})`, 'x');

    const fanGroup = new T.Group();
    fanGroup.position.set(-0.6, -0.35, nacelleZ);
    enginesGroup.add(fanGroup);
    nacelleFans.push(fanGroup);

    // Spinning fan blades inside nacelle
    for (let k = 0; k < 18; k++) {
      const blade = w.box([0.08, 0.55, 0.08], [0, 0.28, 0], w.polish, fanGroup, `Inlet Fan Blade #${k + 1}`);
      blade.rotation.x = (k / 18) * TAU;
    }
  }

  // 3D Thrust Vectoring Exhaust Nozzles with Reheat Glow
  const nozzlesGroup = new T.Group();
  g.nozzles.add(nozzlesGroup);
  const vectoringNozzles: T.Group[] = [];
  const reheatGlows: T.Mesh[] = [];
  const reheatPlumes: T.Mesh[] = [];

  for (const sign of [-1, 1]) {
    const nozzleGroup = new T.Group();
    nozzleGroup.position.set(3.6, -0.35, sign * 1.55);
    nozzlesGroup.add(nozzleGroup);
    vectoringNozzles.push(nozzleGroup);

    w.cylinder(0.55, 0.9, [0, 0, 0], w.steel, nozzleGroup, `Thrust Vectoring Nozzle Petal Ring (${sign > 0 ? 'Right' : 'Left'})`, 'x');

    // Afterburner reheat core glow
    const glow = w.cylinder(0.42, 0.8, [0.35, 0, 0], w.glowOrange, nozzleGroup, 'Supersonic Afterburner Reheat Core', 'x');
    glow.scale.set(0.9, 0.9, 0.9);
    reheatGlows.push(glow);

    // Translucent exhaust plume, hidden until reheat is armed.
    const outerMat = new T.MeshBasicMaterial({
      color: 0xff7a18,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
    });
    const outerGeo = new T.ConeGeometry(0.34, 1.9, 24, 1, true);
    outerGeo.rotateZ(-Math.PI / 2);
    const outerPlume = new T.Mesh(outerGeo, outerMat);
    outerPlume.position.x = 1.35;
    outerPlume.visible = false;
    outerPlume.userData.plumeRole = 'outer';
    outerPlume.userData.excludeFromExplosion = true;
    nozzleGroup.add(outerPlume);
    reheatPlumes.push(outerPlume);

    const innerMat = new T.MeshBasicMaterial({
      color: 0xfff1b8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
    });
    const innerGeo = new T.ConeGeometry(0.17, 1.15, 20, 1, true);
    innerGeo.rotateZ(-Math.PI / 2);
    const innerPlume = new T.Mesh(innerGeo, innerMat);
    innerPlume.position.x = 1.05;
    innerPlume.visible = false;
    innerPlume.userData.plumeRole = 'inner';
    innerPlume.userData.excludeFromExplosion = true;
    nozzleGroup.add(innerPlume);
    reheatPlumes.push(innerPlume);
  }

  nozzlesGroup.userData.reheatRig = {
    nozzles: vectoringNozzles,
    plumes: reheatPlumes,
    glows: reheatGlows,
  };

  // Flight Control Surfaces: Elevators and Twin Cant-Angled Vertical Fins with Rudders
  const controlsGroup = new T.Group();
  g.control_surfaces.add(controlsGroup);

  for (const sign of [-1, 1]) {
    // Twin canted vertical tail fins
    const fin = w.box([1.4, 2.2, 0.08], [4.5, 1.1, sign * 1.4], w.titanium, controlsGroup, `Vertical Stabilizer Fin (${sign > 0 ? 'Right' : 'Left'})`);
    fin.rotation.x = sign * -0.22; // Canted outward
    fin.rotation.z = -0.35; // Swept rearward

    // Horizontal stabilators / elevators
    const elev = w.box([1.2, 0.08, 1.4], [5.2, -0.1, sign * 2.1], w.titanium, controlsGroup, `Horizontal Stabilator (${sign > 0 ? 'Right' : 'Left'})`);
    elev.rotation.y = sign * 0.15;
  }

  // Tricycle Retractable Landing Gear
  const gearGroup = new T.Group();
  g.gear.add(gearGroup);

  // Nose gear
  w.cylinder(0.06, 1.4, [-3.2, -1.0, 0], w.steel, gearGroup, 'Nose Gear Oleo Strut');
  w.cylinder(0.24, 0.16, [-3.2, -1.7, 0], w.rubber, gearGroup, 'Nose Wheel Tire', 'z');

  // Main gear (left and right)
  for (const sign of [-1, 1]) {
    w.cylinder(0.08, 1.4, [0.6, -1.0, sign * 1.8], w.steel, gearGroup, `Main Landing Strut (${sign > 0 ? 'Right' : 'Left'})`);
    w.cylinder(0.32, 0.22, [0.6, -1.7, sign * 1.8], w.rubber, gearGroup, `Main Dual Wheel (${sign > 0 ? 'Right' : 'Left'})`, 'z');
  }

  const animate = (theta: number) => {
    nacelleFans.forEach((fan) => (fan.rotation.x = theta * 1.8));
  };
  animate(0);
  return animate;
}
