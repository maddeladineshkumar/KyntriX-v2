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
export function buildPistonEngine(kind: 'v8' | 'inline4', ctx: BuildContext) {
  const w = createWorkshop(ctx);
  const g = ctx.groups;
  const v8 = kind === 'v8';
  const r = 0.45;
  const L = 1.75;
  const cy = -0.5;

  const crank = new T.Group();
  crank.position.y = cy;
  g.crankshaft.add(crank);

  w.cylinder(0.17, 5.8, [0, 0, 0], w.steel, crank, 'Main Crankshaft Spindle', 'x');
  const positions = [-1.8, -0.6, 0.6, 1.8];
  const phases = v8
    ? [0, Math.PI / 2, (3 * Math.PI) / 2, Math.PI]
    : [0, Math.PI, Math.PI, 0];

  for (let j = 0; j < 4; j++) {
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

  for (const x of [-2.45, -1.2, 0, 1.2, 2.45]) {
    w.cylinder(0.26, 0.22, [x, 0, 0], w.polish, crank, 'Main Journal', 'x');
    w.ring(0.29, 0.07, [x, cy, 0], w.bronze, g.block, 'Main Bearing Saddle', 'x');
  }

  const fly = w.gear(1.05, 72, 0.22, crank, 'Flywheel Starter Ring Gear');
  fly.position.x = 3;
  w.cylinder(0.72, 0.24, [3, 0, 0], w.dark, crank, 'Flywheel Inertia Disc', 'x');
  for (let i = 0; i < 8; i++) {
    w.bolt([3.15, Math.cos((i / 8) * TAU) * 0.44, Math.sin((i / 8) * TAU) * 0.44], crank, 'x');
  }

  const pulley = w.gear(0.58, 32, 0.22, crank, 'Timing Chain Drive Sprocket');
  pulley.position.x = -3.05;

  const motions: Array<(a: number) => void> = [];
  const banks = v8 ? [-Math.PI / 4, Math.PI / 4] : [0];

  banks.forEach((beta, bankIndex) => {
    const bank = new T.Group();
    bank.rotation.x = beta;
    bank.position.set(v8 ? (bankIndex === 0 ? -0.105 : 0.105) : 0, cy, 0);
    g.block.add(bank);

    const blockShape = new T.Shape();
    blockShape.moveTo(-2.52, -0.78);
    blockShape.lineTo(2.52, -0.78);
    blockShape.lineTo(2.52, 0.78);
    blockShape.lineTo(-2.52, 0.78);
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
    heads.position.set(v8 ? (bankIndex === 0 ? -0.105 : 0.105) : 0, cy, 0);
    g.heads.add(heads);
    w.box([5.15, 0.34, 1.56], [0, 2.8, 0], w.head, heads, 'Cylinder Head Deck');
    w.box([5.2, 0.28, 1.5], [0, 3.49, 0], w.cover, heads, 'Camshaft Valve Cover');

    for (let i = 0; i < 12; i++) {
      w.bolt([-2.27 + (i % 6) * 0.91, 3.68, i < 6 ? -0.62 : 0.62], heads);
    }

    const cams = new T.Group();
    cams.rotation.x = beta;
    cams.position.set(v8 ? (bankIndex === 0 ? -0.105 : 0.105) : 0, cy, 0);
    g.valvetrain.add(cams);

    const camRotors: T.Group[] = [];
    for (const z of [-0.43, 0.43]) {
      const cam = new T.Group();
      cam.position.set(0, 3.25, z);
      cams.add(cam);
      w.cylinder(0.1, 5.4, [0, 0, 0], w.polish, cam, 'DOHC Camshaft Shaft', 'x');
      for (const x of positions) {
        const lobe = w.cylinder(0.15, 0.17, [x, 0.065, 0], w.dark, cam, 'Egg-Profile Cam Lobe', 'x');
        lobe.rotation.x = 0;
      }
      const wheel = w.gear(0.46, 40, 0.12, cam, 'Camshaft Timing Sprocket');
      wheel.position.x = -2.9;
      camRotors.push(cam);
    }

    const manifolds = new T.Group();
    manifolds.rotation.x = beta;
    manifolds.position.set(v8 ? (bankIndex === 0 ? -0.105 : 0.105) : 0, cy, 0);
    g.manifolds.add(manifolds);

    for (let j = 0; j < 4; j++) {
      const x = positions[j];
      const phase = phases[j];
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
      w.mesh(pg, w.polish, piston, `Forged Piston #${bankIndex * 4 + j + 1}`);

      for (const y of [0.17, 0.09, -0.14]) {
        w.ring(0.482, 0.015, [0, y, 0], w.dark, piston, 'Gas Compression Ring');
      }
      w.cylinder(0.095, 0.92, [0, -0.06, 0], w.steel, piston, 'Gudgeon Wrist Pin', 'x');

      const rod = new T.Group();
      g.rods.add(rod);
      w.box([0.14, L - 0.25, 0.16], [0, 0, 0], w.steel, rod, 'Connecting Rod H-Beam');
      w.cylinder(0.24, 0.2, [0, -L / 2, 0], w.dark, rod, 'Big-End Rod Journal', 'x');
      w.ring(0.155, 0.038, [0.11, -L / 2, 0], w.bronze, rod, 'Big-End Shell Bearing', 'x');
      w.cylinder(0.14, 0.19, [0, L / 2, 0], w.steel, rod, 'Small-End Pin Eye', 'x');
      for (const y of [-L / 2 - 0.12, -L / 2 + 0.12]) {
        w.bolt([0, y, 0.22], rod, 'z', 0.24);
      }

      // Slider-crank constraint equation
      motions.push((theta) => {
        const a = theta + phase;
        const pin = new T.Vector3(
          x + (v8 ? (bankIndex === 0 ? -0.105 : 0.105) : 0),
          cy + r * Math.cos(a),
          r * Math.sin(a)
        );
        const relative = a - beta;
        const q =
          r * Math.cos(relative) +
          Math.sqrt(L * L - r * r * Math.sin(relative) ** 2);
        const wrist = n
          .clone()
          .multiplyScalar(q)
          .add(new T.Vector3(pin.x, cy, 0));
        piston.position.copy(wrist);
        const delta = wrist.clone().sub(pin);
        rod.position.copy(pin).add(wrist).multiplyScalar(0.5);
        rod.quaternion.setFromUnitVectors(Y_AXIS, delta.normalize());
      });

      // Intake and exhaust valves
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
          const c =
            (((theta + phase + (j > 1 ? TAU : 0)) % (TAU * 2)) + TAU * 2) % (TAU * 2);
          const start = v ? 3 * Math.PI : 0;
          const lift =
            c >= start && c <= start + Math.PI ? 0.13 * Math.sin(c - start) : 0;
          valve.position.y = 3 - lift;
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

    w.box([4.9, 0.45, 0.5], [0, 3.4, -0.95], w.dark, manifolds, 'Intake Plenum Chamber');
    motions.push((theta) => camRotors.forEach((c) => (c.rotation.x = theta / 2)));
  });

  w.box([5.4, 0.55, v8 ? 1.5 : 1.4], [0, -1.35, 0], w.cast, g.block, 'Oil Pan Sump');
  for (const x of [-2.4, -1.2, 0, 1.2, 2.4]) {
    for (const z of [-0.66, 0.66]) {
      w.bolt([x, -1.04, z], g.block, 'y');
    }
  }

  const animate = (theta: number) => {
    crank.rotation.x = theta;
    motions.forEach((fn) => fn(theta));
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
