import React, { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ENGINES,
  getParts,
} from './engineData';
import type {
  EngineType,
  ViewerState,
  PieceInfo,
} from './types';
import {
  buildPistonEngine,
  buildRotaryEngine,
  buildShaftOutput,
  buildElectricMotor,
  buildAirplaneJet,
} from './mechanicalEngines';
import { SectionRendering, SectionGizmo } from './sectionRendering';
import { WALKTHROUGHS } from './walkthroughs';
import { fitWalkthroughCamera } from './walkthroughCamera';
import { ExplosionController } from './explosionController';

interface MechanismsSceneProps {
  state: ViewerState;
  onSelect: (id: string | null, piece?: PieceInfo | null) => void;
  onStats?: (total: number, visible: number) => void;
}

const TAU = Math.PI * 2;

interface ReheatRig {
  nozzles: T.Group[];
  plumes: T.Mesh[];
  glows: T.Mesh[];
}

interface LabelMetric {
  width: number;
  height: number;
  x: number;
  y: number;
  hidden: boolean;
  selected: boolean;
}

const MechanismsSceneComponent: React.FC<MechanismsSceneProps> = ({
  state,
  onSelect,
  onStats,
}) => {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(state);
  const select = useRef(onSelect);
  const stats = useRef(onStats);

  useEffect(() => {
    live.current = state;
    select.current = onSelect;
    stats.current = onStats;
  }, [state, onSelect, onStats]);

  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    const mountEl = mount;

    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      // oxlint-disable-next-line react/set-state-in-effect
      setError('WebGL is unavailable in this environment.');
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xf7f4ed, 0); // Transparent over beige background
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    mountEl.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      'aria-label',
      '3D Interactive Mechanism Studio. Drag to orbit, scroll to zoom, click parts to inspect.'
    );

    const scene = new T.Scene();
    const perspective = new T.PerspectiveCamera(34, 1, 0.1, 3000);
    const orthographic = Object.assign(
      new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 3000),
      { aspect: 1 }
    );
    let camera: T.PerspectiveCamera | typeof orthographic = perspective;
    camera.position.set(-10, 6.5, 13.5);

    const controls = new OrbitControls(camera as unknown as T.Camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = 2.5;
    controls.maxDistance = 2000;
    controls.target.set(0.25, 0, 0);
    controls.maxPolarAngle = Math.PI * 0.94;

    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.95;
    room.dispose();
    pmrem.dispose();

    // Studio Lighting tailored for KyntriX Warm Beige Theme
    scene.add(new T.HemisphereLight(0xfff7ed, 0x44403c, 1.8));

    const keyLight = new T.DirectionalLight(0xfffbeb, 4.5);
    keyLight.position.set(-6, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    Object.assign(keyLight.shadow.camera, {
      left: -14,
      right: 14,
      top: 10,
      bottom: -10,
      near: 0.5,
      far: 40,
    });
    keyLight.shadow.normalBias = 0.035;
    scene.add(keyLight);

    const rimLight = new T.DirectionalLight(0xfde68a, 2.8);
    rimLight.position.set(5, 5, -8);
    scene.add(rimLight);

    const fillLight = new T.DirectionalLight(0xffffff, 1.6);
    fillLight.position.set(-8, 1, 3);
    scene.add(fillLight);

    // Warm beige ground shadow receiver
    const floor = new T.Mesh(
      new T.PlaneGeometry(160, 160),
      new T.ShadowMaterial({ opacity: 0.22 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.7;
    floor.receiveShadow = true;
    scene.add(floor);

    // Soft radial fading grid for mechanical precision
    const grid = new T.Mesh(
      new T.PlaneGeometry(60, 60),
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * 60.0;
            vec2 g = abs(fract(p + 0.5) - 0.5) / fwidth(p);
            float line = 1.0 - min(min(g.x, g.y), 1.0);
            float fade = 1.0 - smoothstep(4.0, 14.0, length(p));
            // Warm amber/stone grid line color
            gl_FragColor = vec4(vec3(0.72, 0.65, 0.58), line * fade * 0.45);
          }
        `,
      })
    );
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -2.72;
    scene.add(grid);

    let root = new T.Group();
    scene.add(root);

    let groups: Record<string, T.Group> = {};
    let rotors: T.Group[] = [];
    let picks: T.Object3D[] = [];
    let materials: T.MeshStandardMaterial[] = [];
    let labels: HTMLButtonElement[] = [];
    let labelMetrics: LabelMetric[] = [];
    let explosion: ExplosionController | null = null;
    let PARTS = getParts(live.current.engine);
    let mechanism: ((time: number) => void) | null = null;
    let mechanismTime = 0;
    let spool = 0;
    const modelBounds = new T.Box3();

    const clip = new T.Plane(new T.Vector3(0, -1, 0), 0.15);
    const sectionRendering = new SectionRendering(clip);
    const sectionGizmo = new SectionGizmo();
    scene.add(sectionGizmo.root);

    let currentEngine = '';

    function material(color: number, rough = 0.33, metal = 0.88, clipped = false) {
      const m = new T.MeshStandardMaterial({
        color,
        roughness: rough,
        metalness: metal,
        side: T.DoubleSide,
        clippingPlanes: clipped ? [clip] : [],
      });
      m.userData.base = new T.Color(color);
      m.userData.baseEmissive = new T.Color(0);
      m.userData.baseEmissiveIntensity = 0;
      materials.push(m);
      return m;
    }

    function mesh(g: T.BufferGeometry, m: T.Material, parent: T.Object3D) {
      const o = new T.Mesh(g, m);
      o.castShadow = true;
      o.receiveShadow = true;
      parent.add(o);
      return o;
    }

    function lathe(profile: number[][], m: T.Material, parent: T.Object3D) {
      const g = new T.LatheGeometry(
        profile.map((p) => new T.Vector2(p[1], p[0])),
        128
      );
      g.rotateZ(-Math.PI / 2);
      const o = mesh(g, m, parent);
      o.userData.pieceName = profile[0][1] === 0 ? 'Spinner Cone' : 'Aerodynamic Cowling';
      return o;
    }

    function cyl(
      x: number,
      len: number,
      r: number,
      m: T.Material,
      parent: T.Object3D,
      r2 = r
    ) {
      const g = new T.CylinderGeometry(r2, r, len, 80);
      g.rotateZ(-Math.PI / 2);
      const o = mesh(g, m, parent);
      o.position.x = x;
      o.userData.pieceName = r < 0.1 ? 'Fuel Injector Nozzle' : 'Spool Shaft Sleeve';
      return o;
    }

    function ring(
      x: number,
      r: number,
      t: number,
      m: T.Material,
      parent: T.Object3D
    ) {
      const g = new T.TorusGeometry(r, t, 10, 112);
      g.rotateY(Math.PI / 2);
      const o = mesh(g, m, parent);
      o.position.x = x;
      o.userData.pieceName = 'Retaining Stator Ring';
      return o;
    }

    function blade(
      inner: number,
      outer: number,
      chord: number,
      sweep: number,
      twist: number
    ) {
      const verts: number[] = [];
      const idx: number[] = [];
      const spans = 18;
      const around = 32;

      for (let i = 0; i <= spans; i++) {
        const t = i / spans;
        const r = inner + (outer - inner) * t;
        const c = chord * (1 - 0.38 * t);
        const ang = twist * (1 - t) + 0.2;
        for (let j = 0; j < around; j++) {
          const a = (j / around) * TAU;
          const u = (1 - Math.cos(a)) * 0.5;
          const thick =
            5 *
            0.105 *
            (0.2969 * Math.sqrt(u) -
              0.126 * u -
              0.3516 * u * u +
              0.2843 * u * u * u -
              0.1036 * u * u * u * u) *
            Math.sign(Math.sin(a));
          const camber = 0.05 * Math.sin(Math.PI * u);
          const xx = (u - 0.5) * c;
          const zz = (thick + camber) * c;
          verts.push(
            xx * Math.cos(ang) - zz * Math.sin(ang) + sweep * t * t,
            r,
            xx * Math.sin(ang) + zz * Math.cos(ang) + 0.14 * t * t
          );
        }
      }

      for (let i = 0; i < spans; i++) {
        for (let j = 0; j < around; j++) {
          const a = i * around + j;
          const b = i * around + ((j + 1) % around);
          const c = a + around;
          const d = b + around;
          idx.push(a, b, c, b, d, c);
        }
      }

      for (let j = 1; j < around - 1; j++) {
        idx.push(0, j + 1, j);
        const b = spans * around;
        idx.push(b, b + j, b + j + 1);
      }

      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }

    function blades(
      parent: T.Group,
      x: number,
      inner: number,
      outer: number,
      count: number,
      chord: number,
      m: T.Material,
      rotating: boolean,
      sweep = 0.15,
      twist = 0.7
    ) {
      const group = new T.Group();
      group.position.x = x;
      parent.add(group);
      if (rotating) rotors.push(group);

      const geo = blade(inner, outer, chord, sweep, twist);
      const batch = new T.InstancedMesh(geo, m, count);
      const mat = new T.Matrix4();
      for (let i = 0; i < count; i++) {
        mat.makeRotationX((i / count) * TAU);
        batch.setMatrixAt(i, mat);
      }
      batch.userData.pieceName = rotating ? 'Airfoil Rotor Blade' : 'Stator Aerodynamic Vane';
      batch.userData.inventoryFlat = true;
      batch.castShadow = true;
      batch.receiveShadow = true;
      group.add(batch);
      return group;
    }

    function bolts(
      parent: T.Group,
      x: number,
      r: number,
      count: number,
      m: T.Material
    ) {
      const g = new T.CylinderGeometry(0.042, 0.042, 0.065, 6);
      g.rotateZ(Math.PI / 2);
      const b = new T.InstancedMesh(g, m, count);
      const mat = new T.Matrix4();
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU;
        mat.makeTranslation(x, Math.sin(a) * r, Math.cos(a) * r);
        b.setMatrixAt(i, mat);
      }
      b.userData.pieceName = 'High-Tensile Fastener';
      parent.add(b);
    }

    function pipe(
      points: T.Vector3[],
      r: number,
      m: T.Material,
      parent: T.Object3D
    ) {
      const o = mesh(
        new T.TubeGeometry(new T.CatmullRomCurve3(points), 32, r, 8, false),
        m,
        parent
      );
      o.userData.pieceName = 'Hydraulic Conduit';
      o.userData.inventoryFlat = true;
      return o;
    }

    function clearModel() {
      mechanism = null;
      mechanismTime = 0;
      if (explosion) {
        scene.remove(explosion.root);
        explosion.dispose();
        explosion = null;
      }
      root.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      materials.forEach((m) => {
        m.clippingPlanes = [];
        m.dispose();
      });
      scene.remove(root);
      labels.forEach((l) => l.remove());
      root = new T.Group();
      scene.add(root);
      groups = {};
      rotors = [];
      picks = [];
      materials = [];
      labels = [];
      labelMetrics = [];
    }

    function build(kind: EngineType) {
      clearModel();
      spool = 0;
      PARTS = getParts(kind);
      const fan = kind === 'turbofan';
      const power = kind === 'turboprop' || kind === 'turboshaft';

      PARTS.forEach((p) => {
        const g = new T.Group();
        g.userData.id = p.id;
        g.userData.explode = p.x * 0.32;
        root.add(g);
        groups[p.id] = g;

        // Interactive HTML callout tag
        const l = document.createElement('button');
        l.type = 'button';
        l.className =
          'absolute px-2 py-1 text-[11px] font-black rounded-lg border shadow-xs transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600';
        l.style.background = '#ffffff';
        l.style.borderColor = '#d6d3d1';
        l.style.color = '#1c1917';
        l.style.left = '0';
        l.style.top = '0';
        l.style.transform = 'translate3d(-9999px, -9999px, 0) translate(-50%, -50%)';
        l.style.willChange = 'transform';
        l.setAttribute('aria-label', `Inspect ${p.name}`);
        l.title = p.name;
        l.innerHTML = `<span>${p.short}</span>`;
        l.onclick = () => select.current(p.id);
        mountEl.appendChild(l);
        labels.push(l);
        labelMetrics.push({
          width: l.offsetWidth || 72,
          height: l.offsetHeight || 24,
          x: -9999,
          y: -9999,
          hidden: true,
          selected: false,
        });
      });

      if (kind === 'v8' || kind === 'inline4') {
        mechanism = buildPistonEngine(kind, { groups, clip, materials });
      } else if (kind === 'rotary') {
        mechanism = buildRotaryEngine({ groups, clip, materials });
      } else if (kind === 'bldc-motor') {
        mechanism = buildElectricMotor({ groups, clip, materials });
      } else if (kind === 'airplane-jet') {
        mechanism = buildAirplaneJet({ groups, clip, materials });
      } else {
        // Gas turbine architectures (Turbofan, Turbojet, Turboprop, Turboshaft)
        const titanium = material(0xb0bdc9, 0.29);
        const silver = material(0xd1d5db, 0.22);
        const dark = material(0x4b5563, 0.37);
        const steel = material(0x9ca3af, 0.3);
        const warm = material(0xa88365, 0.38);
        const nickel = material(0xb7b0a5, 0.32);
        const shell = material(0xa3abb5, 0.34, 0.8, true);
        const shellDark = material(0x4b5563, 0.4, 0.85, true);
        const liner = material(0x9a8470, 0.5, 0.8, true);

        const fg = groups.fan;
        if (fan) {
          blades(fg, -3.02, 0.53, 2.13, 24, 0.94, titanium, true, 0.3, 1.05);
          lathe(
            [
              [-4.03, 0],
              [-3.98, 0.13],
              [-3.8, 0.32],
              [-3.5, 0.47],
              [-3.13, 0.54],
              [-2.85, 0.52],
            ],
            silver,
            fg
          );
          ring(-3.1, 0.53, 0.04, dark, fg);
          blades(fg, -2.55, 0.65, 2.1, 36, 0.36, dark, false, 0.05, -0.5);
        } else if (power) {
          blades(groups.compressor, -2.77, 0.49, 1.27, 30, 0.4, titanium, true);
          mechanism = buildShaftOutput(kind as 'turboprop' | 'turboshaft', {
            groups,
            clip,
            materials,
          });
        } else {
          lathe(
            [
              [-3.6, 0],
              [-3.35, 0.25],
              [-2.95, 0.45],
              [-2.6, 0.52],
            ],
            silver,
            fg
          );
          blades(fg, -2.77, 0.49, 1.27, 30, 0.4, titanium, true);
        }

        const cg = groups.compressor;
        lathe(
          [
            [-2.7, 0.44],
            [-2.4, 0.57],
            [-1.5, 0.7],
            [-0.5, 0.78],
            [0.55, 0.83],
            [0.75, 0.8],
          ],
          dark,
          cg
        );
        for (let i = 0; i < 9; i++) {
          const x = -2.35 + i * 0.335;
          const outer = 1.25 - i * 0.036;
          const inner = 0.56 + i * 0.033;
          blades(
            cg,
            x,
            inner,
            outer,
            36 + i * 2,
            0.27,
            i % 2 ? steel : silver,
            true,
            0.035,
            0.68
          );
          ring(x, inner, 0.044, steel, cg);
          if (i < 8) {
            blades(
              cg,
              x + 0.17,
              inner + 0.025,
              outer + 0.015,
              40 + i * 2,
              0.16,
              dark,
              false,
              0,
              -0.7
            );
          }
          ring(x, outer + 0.035, 0.035, shellDark, cg);
        }

        const bg = groups.combustor;
        lathe(
          [
            [0.7, 0.98],
            [0.88, 1.07],
            [1.1, 1.1],
            [2.1, 1.03],
            [2.34, 0.91],
            [2.34, 0.85],
            [2.08, 0.97],
            [1.1, 1.04],
            [0.88, 1.01],
            [0.7, 0.92],
          ],
          liner,
          bg
        );
        lathe(
          [
            [0.75, 0.53],
            [0.95, 0.6],
            [1.9, 0.63],
            [2.3, 0.55],
          ],
          warm,
          bg
        );
        ring(0.9, 1.09, 0.06, nickel, bg);
        ring(2.22, 0.97, 0.055, nickel, bg);

        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * TAU;
          const inj = cyl(0.91, 0.2, 0.085, nickel, bg);
          inj.position.y = Math.sin(a) * 0.84;
          inj.position.z = Math.cos(a) * 0.84;
          pipe(
            [
              new T.Vector3(0.9, Math.sin(a) * 0.84, Math.cos(a) * 0.84),
              new T.Vector3(0.68, Math.sin(a) * 1.13, Math.cos(a) * 1.13),
              new T.Vector3(0.5, Math.sin(a) * 1.13, Math.cos(a) * 1.13),
            ],
            0.025,
            steel,
            bg
          );
        }

        const tg = groups.turbine;
        lathe(
          [
            [2.35, 0.52],
            [2.7, 0.61],
            [3.2, 0.64],
            [3.75, 0.53],
          ],
          dark,
          tg
        );
        for (let i = 0; i < 5; i++) {
          const x = 2.38 + i * 0.29;
          const r = 0.98 - i * 0.015;
          const rotor = blades(
            tg,
            x,
            0.56,
            r,
            52,
            0.22,
            i < 2 ? warm : nickel,
            true,
            0.025,
            0.65
          );
          rotor.userData.rate = (fan || power) && i >= 2 ? 0.7 : 1.1;
          ring(x, 0.58, 0.065, steel, tg);
          if (i < 4) {
            blades(tg, x + 0.16, 0.58, r, 48, 0.13, dark, false, 0, -0.6);
          }
          ring(x, r + 0.07, 0.035, shellDark, tg);
        }

        const ng = groups.nozzle;
        if (power) {
          lathe(
            [
              [3.78, 1.03],
              [4.3, 1.03],
              [4.3, 0.97],
              [3.78, 0.97],
            ],
            shellDark,
            ng
          );
          for (const side of kind === 'turboprop' ? [-1, 1] : [1]) {
            pipe(
              [
                new T.Vector3(4.0, 0, 0),
                new T.Vector3(4.3, 0, side * 0.8),
                new T.Vector3(4.4, 0.2, side * 1.65),
              ],
              0.38,
              warm,
              ng
            );
          }
          ring(3.84, 1.02, 0.05, steel, ng);
          bolts(ng, 3.84, 1.04, 36, silver);
        } else {
          lathe(
            [
              [3.78, 1.03],
              [4.1, 1],
              [4.7, 0.81],
              [5.1, 0.64],
              [5.1, 0.59],
              [4.7, 0.76],
              [4.1, 0.95],
              [3.78, 0.98],
            ],
            shellDark,
            ng
          );
          lathe(
            [
              [3.65, 0.48],
              [3.9, 0.46],
              [4.35, 0.32],
              [4.85, 0.04],
              [4.9, 0],
            ],
            nickel,
            ng
          );
          ring(3.84, 1.02, 0.05, steel, ng);
          bolts(ng, 3.84, 1.04, 36, silver);
        }

        const sg = groups.shaft;
        cyl(0.05, 7.1, 0.13, silver, sg);
        if (fan || power) cyl(0.62, 5.1, 0.205, dark, sg);
        [-2.64, 0.58, 3.71].forEach((x) => {
          ring(x, 0.25, 0.065, silver, sg);
          blades(sg, x, 0.25, 0.5, 8, 0.16, dark, false, 0, 0);
        });

        const casing = groups.casing;
        if (fan) {
          lathe(
            [
              [-3.62, 2.21],
              [-3.67, 2.29],
              [-3.57, 2.36],
              [-3.32, 2.38],
              [-2.6, 2.34],
              [-1.6, 2.2],
              [0.2, 1.92],
              [1.2, 1.67],
              [1.2, 1.6],
              [0.2, 1.85],
              [-1.6, 2.13],
              [-2.6, 2.27],
              [-3.32, 2.3],
              [-3.5, 2.28],
              [-3.62, 2.21],
            ],
            shell,
            casing
          );
          [-3.25, -2.5, -1.2, 0.5].forEach((x, i) => {
            ring(x, [2.35, 2.32, 2.14, 1.85][i], 0.035, shellDark, casing);
            bolts(casing, x, [2.35, 2.32, 2.14, 1.85][i], 48, shellDark);
          });
        } else if (power) {
          lathe(
            [
              [-2.8, 1.32],
              [-2.5, 1.32],
              [-2.5, 1.25],
              [-2.8, 1.25],
            ],
            shell,
            casing
          );
        } else {
          lathe(
            [
              [-3.6, 1.32],
              [-3.65, 1.39],
              [-3.4, 1.45],
              [-2.8, 1.38],
              [-2.5, 1.32],
              [-2.5, 1.26],
              [-3.4, 1.38],
              [-3.6, 1.32],
            ],
            shell,
            casing
          );
        }

        lathe(
          [
            [-2.5, 1.3],
            [-1.5, 1.22],
            [0.6, 1.13],
            [0.85, 1.19],
            [2.2, 1.13],
            [2.4, 1.1],
            [3.8, 1.09],
            [3.8, 1.03],
            [2.4, 1.04],
            [2.2, 1.07],
            [0.85, 1.13],
            [0.6, 1.07],
            [-1.5, 1.16],
            [-2.5, 1.24],
          ],
          shell,
          casing
        );

        [-2.4, -0.2, 0.7, 2.2, 3.75].forEach((x, i) => {
          const r = [1.3, 1.17, 1.15, 1.14, 1.09][i];
          ring(x, r, 0.06, shellDark, casing);
          bolts(casing, x, r, 40, shellDark);
        });

        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + 0.1;
          const pts = [-0.4, 0.3, 1.1, 2, 2.5].map(
            (x, j) =>
              new T.Vector3(
                x,
                Math.sin(a) * [1.22, 1.2, 1.28, 1.24, 1.17][j],
                Math.cos(a) * [1.22, 1.2, 1.28, 1.24, 1.17][j]
              )
          );
          pipe(pts, 0.018, shellDark, casing);
        }
      }

      if (kind === 'turbojet') {
        // A dedicated translucent reheat plume for the single-spool turbojet.
        const plumeGroup = new T.Group();
        groups.nozzle.add(plumeGroup);
        const plumeSpecs = [
          { radius: 0.52, length: 2.6, x: 6.1, color: 0xff7a18, role: 'outer' },
          { radius: 0.28, length: 1.65, x: 5.7, color: 0xfff1b8, role: 'inner' },
        ];
        const plumes: T.Mesh[] = [];
        for (const spec of plumeSpecs) {
          const material = new T.MeshBasicMaterial({
            color: spec.color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: T.AdditiveBlending,
            side: T.DoubleSide,
          });
          const geometry = new T.ConeGeometry(spec.radius, spec.length, 24, 1, true);
          geometry.rotateZ(-Math.PI / 2);
          const plume = new T.Mesh(geometry, material);
          plume.position.x = spec.x;
          plume.visible = false;
          plume.userData.plumeRole = spec.role;
          plume.userData.excludeFromExplosion = true;
          plumeGroup.add(plume);
          plumes.push(plume);
        }
        groups.nozzle.userData.reheatRig = {
          nozzles: [],
          plumes,
          glows: [],
        } satisfies ReheatRig;
      }

      // Configure section rendering materials per part
      const partMaterials = new Map<string, T.MeshStandardMaterial>();
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          let p: T.Object3D | null = o;
          while (p && !p.userData.id) p = p.parent;
          o.userData.part = p?.userData.id;
          const source = o.material as T.MeshStandardMaterial;
          const key = o.userData.part + source.uuid;
          let local = partMaterials.get(key);
          if (!local) {
            local = source.clone();
            local.userData.base = source.userData.base?.clone() ?? new T.Color(source.color);
            local.userData.baseEmissive =
              source.userData.baseEmissive?.clone() ??
              (source.emissive ? source.emissive.clone() : new T.Color(0));
            local.userData.baseEmissiveIntensity =
              source.userData.baseEmissiveIntensity ?? (source.emissiveIntensity ?? 0);
            sectionRendering.configureMaterial(
              local,
              !!source.clippingPlanes?.length
            );
            partMaterials.set(key, local);
            materials.push(local);
          }
          o.material = local;
          picks.push(o);
        }
      });

      root.updateWorldMatrix(true, true);
      modelBounds.setFromObject(root);
      for (const group of Object.values(groups)) {
        const bounds = new T.Box3().setFromObject(group);
        group.userData.anchor = bounds.getCenter(new T.Vector3());
      }

      currentEngine = kind;
      explosion = new ExplosionController(root);
      scene.add(explosion.root);
      stats.current?.(explosion.count, explosion.count);
    }

    build(live.current.engine);

    // 2400-Particle Aerodynamic Airflow simulation
    const n = 2400;
    const flowSeg = new Float32Array(n * 6);
    const flowSegColor = new Float32Array(n * 6);
    const flowHead = new Float32Array(n * 3);
    const flowHeadColor = new Float32Array(n * 3);

    const segGeo = new T.BufferGeometry();
    segGeo.setAttribute('position', new T.BufferAttribute(flowSeg, 3));
    segGeo.setAttribute('color', new T.BufferAttribute(flowSegColor, 3));

    const headGeo = new T.BufferGeometry();
    headGeo.setAttribute('position', new T.BufferAttribute(flowHead, 3));
    headGeo.setAttribute('color', new T.BufferAttribute(flowHeadColor, 3));
    segGeo.setDrawRange(0, n * 2);
    headGeo.setDrawRange(0, n);
    let particleCount = n;

    const flowLines = new T.LineSegments(
      segGeo,
      new T.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );
    const flowHeads = new T.Points(
      headGeo,
      new T.PointsMaterial({
        size: 0.09,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );

    flowLines.frustumCulled = false;
    flowHeads.frustumCulled = false;
    const flow = new T.Group();
    flow.add(flowLines);
    flow.add(flowHeads);
    scene.add(flow);

    let flowTime = 0;
    const flowP = new T.Vector3();
    const flowQ = new T.Vector3();
    const flowC = new T.Color();
    const flowD = new T.Color();

    const flowSeedP = new Float32Array(n);
    const flowSeedA = new Float32Array(n);
    const flowSeedJ = new Float32Array(n);
    const flowSeedR = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const h = (k: number) => {
        const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
        return v - Math.floor(v);
      };
      flowSeedP[i] = h(1);
      flowSeedA[i] = h(2) * TAU;
      flowSeedJ[i] = h(3) - 0.5;
      flowSeedR[i] = h(4);
    }

    const mix3 = (c: T.Color, r: number, g: number, b: number, t: number) => {
      c.r += (r - c.r) * t;
      c.g += (g - c.g) * t;
      c.b += (b - c.b) * t;
    };

    function flowSample(
      p: number,
      i: number,
      bypass: boolean,
      fan: boolean,
      power: boolean,
      out: T.Vector3,
      c: T.Color
    ) {
      const a = flowSeedA[i];
      const jit = flowSeedJ[i];
      const wob = Math.sin(flowTime * 2.3 + i * 1.31);

      if (p < 0.3) {
        const lip = bypass ? 1.9 : fan ? 1.3 : 0.95;
        const capture = (bypass ? 2.75 : fan ? 2.45 : 1.9) + jit * 0.3;
        const t = p / 0.3;
        const x = -6.4 + t * 3.4;
        const r = lip + (capture - lip) * (1 - t) * (1 - t) + wob * 0.02;
        const sw = a + flowTime * 0.42 + t * t * 2.6;
        out.set(x + jit * 0.5, Math.sin(sw) * r, Math.cos(sw) * r);
        c.setRGB(0.32, 0.58, 1);
        mix3(c, 0.55, 0.85, 1, t);
        c.multiplyScalar((0.3 + 0.7 * t * t) * (0.82 + 0.18 * wob) * Math.min(1, p * 24));
        return;
      }

      if (bypass) {
        if (p < 0.44) {
          const t = (p - 0.3) / 0.14;
          const x = -3 + t * 4.2;
          const r = 1.62 + jit * 0.1;
          const sw = a + flowTime * 0.28 + t * 1.1;
          out.set(x, Math.sin(sw) * r, Math.cos(sw) * r);
          c.setRGB(0.5, 0.78, 1).multiplyScalar(0.9);
        } else {
          const t = (p - 0.44) / 0.56;
          const x = 1.2 + t * 4.4;
          const r = 1.66 + t * 0.42 + wob * (0.02 + t * 0.05);
          const sw = a + flowTime * 0.28 + 1.1 + t * 0.5;
          out.set(x, Math.sin(sw) * r, Math.cos(sw) * r);
          c.setRGB(0.55, 0.8, 1).multiplyScalar(
            (1 - t * 0.8) * (0.85 + 0.15 * Math.sin(flowTime * 3.1 + i * 2.1))
          );
        }
        c.multiplyScalar(Math.min(1, (1 - p) * 6));
        return;
      }

      if (p < 0.46) {
        const t = (p - 0.3) / 0.16;
        const x = -2.7 + t * 7.7;
        const r = Math.max(0.1, (0.85 - t * 0.35) * (1 + jit * 0.12) + wob * 0.03);
        const sw = a + flowTime * 0.35 + t * 4.2;
        out.set(x, Math.sin(sw) * r, Math.cos(sw) * r);
        c.setRGB(0.6, 0.82, 1);
        mix3(c, 1, 0.66, 0.26, Math.min(1, Math.max(0, (t - 0.42) * 2.4)));
        mix3(c, 1, 0.9, 0.62, Math.max(0, (t - 0.75) * 3) * 0.6);
        c.multiplyScalar(1 + 0.3 * Math.sin(flowTime * 7 + i * 3.7) * Math.max(0, t - 0.4));
        return;
      }

      // Jet exhaust & supersonic shock diamonds
      const t = (p - 0.46) / 0.54;
      const x = 5 + (1 - Math.pow(1 - t, 1.4)) * (power ? 2.2 : 3.9);
      const r = Math.max(0.05, (0.5 + t * t * (power ? 0.5 : 1.05)) * (1 + jit * 0.2) + wob * (0.02 + t * 0.14));
      const sw = a + flowTime * 0.3 + 4.2 + t * 0.8;
      out.set(x + wob * t * 0.06, Math.sin(sw) * r, Math.cos(sw) * r);
      c.setRGB(1, 0.94, 0.75);
      mix3(c, 1, 0.5, 0.16, Math.min(1, t * 1.9));
      mix3(c, 0.5, 0.12, 0.05, Math.max(0, (t - 0.55) * 2.2));
      const diamonds = power
        ? 1
        : 1 + 0.6 * Math.exp(-t * 3) * Math.pow(Math.sin((x - 5) * 4.6), 2);
      c.multiplyScalar(diamonds * (1 - t * t * 0.75) * (power ? 0.5 : 0.95) * Math.min(1, (1 - p) * 5));
    }

    // Raycast picking and hover inspection
    const raycaster = new T.Raycaster();
    const pointer = new T.Vector2();
    let downPos = [0, 0];

    interface PickResult {
      partId: string;
      name: string;
      piece: PieceInfo | null;
    }

    const pickAt = (clientX: number, clientY: number): PickResult | null => {
      const b = renderer.domElement.getBoundingClientRect();
      if (!b.width || !b.height) return null;
      pointer.set(
        ((clientX - b.left) / b.width) * 2 - 1,
        -((clientY - b.top) / b.height) * 2 + 1
      );
      raycaster.setFromCamera(pointer, camera);

      if (explosion?.root.visible) {
        const hit = explosion.pick(raycaster);
        return hit ? { partId: hit.part, name: hit.name, piece: hit } : null;
      }

      const hits = raycaster.intersectObjects(picks, false);
      const hit = hits.find((h) => {
        if (!h.object.userData.part) return false;
        let p: T.Object3D | null = h.object;
        while (p) {
          if (!p.visible) return false;
          p = p.parent;
        }
        const m = (h.object as T.Mesh).material as T.MeshStandardMaterial;
        return (
          !m.clippingPlanes?.length ||
          m.clippingPlanes.every((plane) => plane.distanceToPoint(h.point) >= 0)
        );
      });
      if (!hit) return null;
      const partId = hit.object.userData.part as string;
      const meta = PARTS.find((part) => part.id === partId);
      return { partId, name: meta?.name ?? 'Component', piece: null };
    };

    const tooltip = document.createElement('div');
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      'z-index:30',
      'display:none',
      'max-width:min(220px,calc(100% - 16px))',
      'overflow:hidden',
      'text-overflow:ellipsis',
      'white-space:nowrap',
      'padding:5px 9px',
      'border-radius:9px',
      'background:rgba(28,25,23,0.94)',
      'color:#fff',
      'font:800 11px/1.25 ui-sans-serif,system-ui,sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,0.24)',
      'transform:translate(0,-50%)',
    ].join(';');
    mountEl.appendChild(tooltip);
    let lastHoverCheck = 0;

    const pointerDown = (e: PointerEvent) => {
      downPos = [e.clientX, e.clientY];
      tooltip.style.display = 'none';
      renderer.domElement.style.cursor = 'grabbing';
    };

    const pointerUp = (e: PointerEvent) => {
      renderer.domElement.style.cursor = 'grab';
      if (Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) > 5) return;
      const hit = pickAt(e.clientX, e.clientY);
      select.current(hit?.partId ?? null, hit?.piece ?? null);
    };

    const pointerMove = (e: PointerEvent) => {
      if (e.buttons) {
        tooltip.style.display = 'none';
        return;
      }
      const now = performance.now();
      if (now - lastHoverCheck < 45) return;
      lastHoverCheck = now;
      const hit = pickAt(e.clientX, e.clientY);
      if (!hit) {
        tooltip.style.display = 'none';
        renderer.domElement.style.cursor = 'grab';
        return;
      }
      tooltip.textContent = hit.name;
      tooltip.style.display = 'block';
      const b = renderer.domElement.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - b.left + 14, 8), Math.max(8, b.width - 8));
      const y = Math.min(Math.max(e.clientY - b.top + 14, 8), Math.max(8, b.height - 8));
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
      renderer.domElement.style.cursor = 'pointer';
    };

    const pointerLeave = () => {
      tooltip.style.display = 'none';
      renderer.domElement.style.cursor = 'grab';
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerleave', pointerLeave);

    let walkthroughKey = '';
    let layoutKey = '';
    let fitRequested = true;
    let layoutBlend = 1;

    const resize = () => {
      const w = mountEl.clientWidth;
      const h = mountEl.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      orthographic.aspect = w / h;
      perspective.aspect = w / h;
      if (camera instanceof T.OrthographicCamera) {
        camera.left = -camera.top * camera.aspect;
        camera.right = camera.top * camera.aspect;
      }
      camera.updateProjectionMatrix();
      layoutKey = '';
      fitRequested = true;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mountEl);
    resize();

    let frameId = 0;
    let lastTime = performance.now();
    let reduceMotion = false;
    try {
      reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      reduceMotion = false;
    }
    let prevReset = -1;
    let prevCamera = '';
    let prevZoom = 0;
    let prevQuality = '';
    let prevSelected: string | null = null;
    let prevIsolation: string | null = null;
    let progress = 0;
    let prevMode = '';
    let prevAmount = -1;
    let previousMatrixProgress = -1;
    let inventoryWasVisible = false;
    let previousSlider = -1;
    let goal: T.Vector3 | null = null;
    let targetGoal: T.Vector3 | null = null;

    // Any direct user manipulation (orbit drag, pan, wheel zoom, touch) cancels
    // an in-flight auto-framing fly-to so manual camera control always wins.
    const cancelFlyTo = () => {
      goal = null;
      targetGoal = null;
    };
    controls.addEventListener('start', cancelFlyTo);

    function overview() {
      const s = live.current;
      const size = modelBounds.getSize(new T.Vector3());
      const center = modelBounds.getCenter(new T.Vector3());
      const distance = Math.max(
        12,
        Math.max(size.y, size.x / Math.max(0.4, camera.aspect)) * 1.9 + size.z
      );
      const dir = new T.Vector3(
        ...(s.camera === 'front'
          ? [-1, 0.06, 0]
          : s.camera === 'side'
          ? [0, 0.1, 1]
          : s.camera === 'top'
          ? [0, 1, 0.01]
          : s.camera === 'ortho'
          ? [-10, 6.5, 13.5]
          : [-0.55, 0.36, 0.75])
      ).normalize();
      goal = dir.clone().multiplyScalar(distance).add(center);
      targetGoal = center;
    }

    function fitExplosion(amount: number) {
      if (!explosion) return;
      const fit = explosion.fit(amount, camera.aspect);
      if (camera instanceof T.OrthographicCamera) {
        camera.zoom = 1;
        camera.updateProjectionMatrix();
      }
      const inventory = live.current.explodeLayout === 'inventory';
      const stage = inventory ? T.MathUtils.clamp((amount - 0.3) / 0.5, 0, 1) : 0;
      const direction = new T.Vector3(-10, 6.5, 13.5)
        .normalize()
        .lerp(
          inventory ? new T.Vector3(0, 0, 1) : new T.Vector3(-0.12, 0.32, 1).normalize(),
          inventory ? stage : 1
        )
        .normalize();

      goal = fit.center.clone().addScaledVector(direction, fit.distance * (inventory ? 1 : 1.15));
      targetGoal = fit.center;
    }

    function animateLoop(now: number) {
      frameId = requestAnimationFrame(animateLoop);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (document.hidden) return;
      const s = live.current;

      if (s.engine !== currentEngine) {
        build(s.engine);
        progress = 0;
        prevReset = -1;
        prevSelected = null;
        prevMode = '';
        layoutKey = '';
        previousMatrixProgress = -1;
      }

      const ex = explosion!;
      const needsOrtho =
        (s.mode === 'exploded' && s.explodeLayout === 'inventory') ||
        s.camera === 'ortho';

      if (needsOrtho !== (camera instanceof T.OrthographicCamera)) {
        const old = camera;
        camera = needsOrtho ? orthographic : perspective;
        camera.position.copy(old.position);
        camera.quaternion.copy(old.quaternion);
        camera.aspect = old.aspect;
        if (needsOrtho) {
          const half = old.position.distanceTo(controls.target) * Math.tan((34 * Math.PI) / 360);
          orthographic.top = half;
          orthographic.bottom = -half;
          orthographic.left = -half * camera.aspect;
          orthographic.right = half * camera.aspect;
          orthographic.zoom = 1;
        }
        controls.object = camera as unknown as T.Camera;
        camera.updateProjectionMatrix();
        fitRequested = true;
        prevReset = -1;
      }

      if (s.quality !== prevQuality) {
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, s.quality === 'ultra' ? 2 : 1.25)
        );
        renderer.shadowMap.enabled = s.quality === 'ultra';
        keyLight.castShadow = s.quality === 'ultra';
        renderer.shadowMap.needsUpdate = true;
        resize();
        prevQuality = s.quality;
      }

      const desiredParticles = s.quality === 'balanced' ? Math.floor(n * 0.5) : n;
      if (desiredParticles !== particleCount) {
        particleCount = desiredParticles;
        segGeo.setDrawRange(0, particleCount * 2);
        headGeo.setDrawRange(0, particleCount);
      }

      if (s.mode === 'exploded' && prevMode !== 'exploded') {
        if (progress === 0) ex.captureHome();
        layoutKey = '';
        fitRequested = true;
        previousMatrixProgress = -1;
      }

      if (s.mode !== prevMode) {
        if (s.mode !== 'exploded') overview();
        prevMode = s.mode;
      }

      const key = [
        s.explodeLayout,
        s.spacing,
        camera.aspect.toFixed(3),
        s.hidden.join(','),
        s.isolated,
        s.isolatedPiece,
      ].join('|');

      if (key !== layoutKey) {
        ex.layout({
          layout: s.explodeLayout,
          spacing: s.spacing,
          aspect: camera.aspect,
          hidden: s.hidden,
          isolated: s.isolated,
          isolatedPiece: s.isolatedPiece,
        });
        layoutKey = key;
        layoutBlend = 0;
        fitRequested = true;
        previousMatrixProgress = -1;
        stats.current?.(ex.count, ex.visibleCount);
      }

      const desired = s.mode === 'exploded' ? s.explode / 100 : 0;
      progress = desired;
      if (desired !== previousSlider) {
        layoutBlend = 1;
        previousSlider = desired;
      }

      const inventoryVisible = s.mode === 'exploded' || progress > 0;
      ex.root.visible = inventoryVisible;
      root.visible = !inventoryVisible;
      floor.visible = !inventoryVisible;
      grid.visible =
        s.grid &&
        !(s.mode === 'exploded' && s.explodeLayout === 'inventory' && progress > 0.3);

      const morphing = layoutBlend < 1;
      layoutBlend = Math.min(1, layoutBlend + dt / 0.65);
      if (
        inventoryVisible &&
        (progress !== previousMatrixProgress || !inventoryWasVisible || morphing)
      ) {
        ex.update(progress, layoutBlend);
        previousMatrixProgress = progress;
      }
      inventoryWasVisible = inventoryVisible;

      if (s.mode === 'exploded') {
        if (fitRequested || s.explode !== prevAmount) {
          fitExplosion(desired);
          fitRequested = false;
          prevAmount = s.explode;
        }
        ex.highlight(s.selected, s.selectedPiece);
      }

      if (s.reset !== prevReset || s.camera !== prevCamera) {
        if (s.mode === 'exploded') fitExplosion(desired);
        else overview();
        prevReset = s.reset;
        prevCamera = s.camera;
      }

      if (s.zoom !== prevZoom) {
        if (camera instanceof T.OrthographicCamera) {
          camera.zoom *= s.zoom > prevZoom ? 1.22 : 0.82;
          camera.updateProjectionMatrix();
        } else {
          goal = camera.position
            .clone()
            .sub(controls.target)
            .multiplyScalar(s.zoom > prevZoom ? 0.82 : 1.22)
            .add(controls.target);
        }
        prevZoom = s.zoom;
      }

      if (s.isolated !== prevIsolation) {
        if (s.mode === 'exploded') {
          fitExplosion(desired);
        } else if (s.isolated && groups[s.isolated]) {
          const bounds = new T.Box3().setFromObject(groups[s.isolated]);
          const center = bounds.getCenter(new T.Vector3());
          targetGoal = center;
          goal = center.clone().add(new T.Vector3(-4, 3, 6));
        } else {
          overview();
        }
        prevIsolation = s.isolated;
      }

      // Walkthrough step
      const station = s.walkthrough
        ? WALKTHROUGHS[s.engine]?.[s.walkthrough.station]
        : null;
      const stationKey = station
        ? `${s.engine}/${station.id}/${camera.aspect.toFixed(4)}`
        : '';
      if (station && stationKey !== walkthroughKey) {
        const fit = fitWalkthroughCamera(modelBounds, station.camera, camera.aspect);
        goal = fit.position;
        targetGoal = fit.target;
        if (station.mechanismAngle !== undefined) {
          mechanismTime = station.mechanismAngle;
          mechanism?.(mechanismTime);
        }
      }
      walkthroughKey = stationKey;

      if (goal) {
        camera.position.lerp(goal, 0.08);
        if (camera.position.distanceTo(goal) < 0.015) goal = null;
      }
      if (targetGoal) {
        controls.target.lerp(targetGoal, 0.08);
        if (controls.target.distanceTo(targetGoal) < 0.015) targetGoal = null;
      }

      sectionRendering.update(
        modelBounds,
        s.section,
        s.sectionPlane,
        s.mode === 'cutaway'
      );
      sectionGizmo.update(
        clip,
        modelBounds,
        s.mode === 'cutaway' && s.sectionPlane.showGizmo
      );
      floor.position.y = modelBounds.min.y - 0.2;
      grid.position.y = modelBounds.min.y - 0.22;

      for (const p of PARTS) {
        const g = groups[p.id];
        if (g) {
          g.visible =
            !s.hidden.includes(p.id) && (!s.isolated || s.isolated === p.id);
        }
      }

      const selectedParts = s.selectedParts.length
        ? s.selectedParts
        : s.selected
        ? [s.selected]
        : [];
      const selectionKey = selectedParts.join('|');
      if (selectionKey !== prevSelected) {
        root.traverse((o) => {
          if (o instanceof T.Mesh) {
            const m = o.material as T.MeshStandardMaterial;
            if (m.emissive) {
              const isSelected = selectedParts.includes(o.userData.part);
              if (isSelected) {
                m.emissive.setHex(0xd97706);
                m.emissiveIntensity = 0.45;
              } else {
                const baseEmissive = (m.userData.baseEmissive as T.Color) || new T.Color(0);
                m.emissive.copy(baseEmissive);
                m.emissiveIntensity = m.userData.baseEmissiveIntensity ?? 0;
              }
            }
          }
        });
        prevSelected = selectionKey;
      }

      // Afterburner plumes and thrust-vectoring nozzle articulation
      const reheatRig = groups.nozzles?.userData.reheatRig as ReheatRig | undefined;
      if (reheatRig) {
        const pitch = T.MathUtils.degToRad(T.MathUtils.clamp(s.vectoringPitch, -20, 20));
        for (const nozzle of reheatRig.nozzles) nozzle.rotation.z = -pitch;

        const reheat = s.afterburner ? T.MathUtils.clamp(s.throttle / 100, 0, 1) : 0;
        for (const glow of reheatRig.glows) {
          const material = glow.material as T.MeshStandardMaterial;
          if (material && 'emissiveIntensity' in material) {
            material.emissiveIntensity = 0.35 + reheat * 2.4;
          }
        }

        reheatRig.plumes.forEach((plume, index) => {
          const inner = plume.userData.plumeRole === 'inner';
          const visible = reheat > 0.02;
          plume.visible = visible;
          if (!visible) return;
          const flicker = 0.9 + Math.sin(now * 0.03 + index * 1.7) * 0.1;
          const radial = (inner ? 0.78 : 1) * (0.6 + reheat * 0.55) * flicker;
          plume.scale.set(0.75 + reheat * 1.45, radial, radial);
          const material = plume.material as T.MeshBasicMaterial;
          material.opacity = (inner ? 0.52 : 0.28) * reheat;
        });
      }

      // Mechanism rotational physics & animation with a simple spool-up inertia
      const targetSpool =
        s.playing && !s.walkthrough && !inventoryVisible ? Math.max(0.06, s.throttle / 100) : 0;
      spool += (targetSpool - spool) * Math.min(1, dt * (targetSpool > spool ? 2.2 : 5));

      if (s.playing && !s.walkthrough && !inventoryVisible) {
        const speedMultiplier = s.speed * Math.max(0.08, spool);
        mechanismTime += dt * speedMultiplier * 5.5;
        mechanism?.(mechanismTime);
        rotors.forEach((r, i) => {
          r.rotation.x +=
            dt *
            speedMultiplier *
            5.5 *
            (r.userData.rate ?? (i === 0 && s.engine === 'turbofan' ? 0.7 : 1.1));
        });
      }

      controls.autoRotate = s.spin && !s.walkthrough && !inventoryVisible && !reduceMotion;
      controls.autoRotateSpeed = 1.2;
      controls.update();

      // Airflow Simulation
      flow.visible =
        s.flow &&
        ENGINES[s.engine]?.flow &&
        !inventoryVisible &&
        !s.isolated;

      if (flow.visible) {
        flowTime += dt * (s.playing ? Math.max(0.2, spool) * s.speed : 0);
        const fan = s.engine === 'turbofan';
        const power = s.engine === 'turboprop' || s.engine === 'turboshaft';

        for (let i = 0; i < particleCount; i++) {
          const bypass = fan && i < n * 0.45;
          const rate = 0.075 * (1 + flowSeedR[i] * 0.3);
          const p = (flowSeedP[i] + flowTime * rate) % 1;
          flowSample(p, i, bypass, fan, power, flowP, flowC);
          flowSample(Math.max(0, p - 0.011), i, bypass, fan, power, flowQ, flowD);

          flowSeg[i * 6] = flowQ.x;
          flowSeg[i * 6 + 1] = flowQ.y;
          flowSeg[i * 6 + 2] = flowQ.z;
          flowSeg[i * 6 + 3] = flowP.x;
          flowSeg[i * 6 + 4] = flowP.y;
          flowSeg[i * 6 + 5] = flowP.z;

          flowSegColor[i * 6] = flowD.r * 0.12;
          flowSegColor[i * 6 + 1] = flowD.g * 0.12;
          flowSegColor[i * 6 + 2] = flowD.b * 0.12;
          flowSegColor[i * 6 + 3] = flowC.r;
          flowSegColor[i * 6 + 4] = flowC.g;
          flowSegColor[i * 6 + 5] = flowC.b;

          flowHead[i * 3] = flowP.x;
          flowHead[i * 3 + 1] = flowP.y;
          flowHead[i * 3 + 2] = flowP.z;

          flowHeadColor[i * 3] = flowC.r;
          flowHeadColor[i * 3 + 1] = flowC.g;
          flowHeadColor[i * 3 + 2] = flowC.b;
        }

        segGeo.attributes.position.needsUpdate = true;
        segGeo.attributes.color.needsUpdate = true;
        headGeo.attributes.position.needsUpdate = true;
        headGeo.attributes.color.needsUpdate = true;
      }

      // Screen-space callouts with simple collision avoidance and DOM writes only on movement.
      const W = mountEl.clientWidth;
      const H = mountEl.clientHeight;
      const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];

      const placeLabel = (index: number) => {
        const l = labels[index];
        const p = PARTS[index];
        const metric = labelMetrics[index];
        const g = p ? groups[p.id] : null;
        if (!l || !metric || !g) return;

        const anchor = (g.userData.anchor as T.Vector3) || new T.Vector3();
        const pos = anchor.clone().project(camera);
        const isVisible =
          !inventoryVisible &&
          s.labels &&
          g.visible &&
          pos.z <= 1 &&
          pos.x >= -0.95 &&
          pos.x <= 0.95 &&
          pos.y >= -0.9 &&
          pos.y <= 0.9;

        if (!isVisible) {
          if (!metric.hidden) {
            l.hidden = true;
            metric.hidden = true;
          }
          return;
        }

        const halfW = metric.width / 2 + 4;
        const halfH = metric.height / 2 + 4;
        const minX = halfW;
        const maxX = Math.max(halfW, W - halfW);
        const minY = halfH;
        const maxY = Math.max(halfH, H - halfH);
        const baseX = T.MathUtils.clamp((pos.x * 0.5 + 0.5) * W, minX, maxX);
        const baseY = T.MathUtils.clamp((-pos.y * 0.5 + 0.5) * H, minY, maxY);

        let x = baseX;
        let y = baseY;
        let accepted = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          const offset =
            attempt === 0
              ? 0
              : (attempt % 2 === 1 ? 1 : -1) *
                Math.ceil(attempt / 2) *
                (metric.height + 5);
          y = T.MathUtils.clamp(baseY + offset, minY, maxY);
          const rect = {
            x1: x - metric.width / 2,
            y1: y - metric.height / 2,
            x2: x + metric.width / 2,
            y2: y + metric.height / 2,
          };
          const collides = placed.some(
            (other) =>
              rect.x1 < other.x2 &&
              rect.x2 > other.x1 &&
              rect.y1 < other.y2 &&
              rect.y2 > other.y1
          );
          if (!collides) {
            placed.push(rect);
            accepted = true;
            break;
          }
        }

        if (!accepted) {
          if (!metric.hidden) {
            l.hidden = true;
            metric.hidden = true;
          }
          return;
        }

        if (metric.hidden || Math.abs(metric.x - x) > 0.5 || Math.abs(metric.y - y) > 0.5) {
          metric.x = x;
          metric.y = y;
          metric.hidden = false;
          l.hidden = false;
          l.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        }

        const selectedNow = selectedParts.includes(p.id);
        if (metric.selected !== selectedNow) {
          metric.selected = selectedNow;
          l.style.borderColor = selectedNow ? '#d97706' : '#d6d3d1';
          l.style.background = selectedNow ? '#fef3c7' : '#ffffff';
          l.style.color = selectedNow ? '#78350f' : '#1c1917';
        }
      };

      for (const p of PARTS) {
        if (selectedParts.includes(p.id)) placeLabel(PARTS.indexOf(p));
      }
      for (let i = 0; i < PARTS.length; i++) {
        if (!selectedParts.includes(PARTS[i].id)) placeLabel(i);
      }

      renderer.render(scene, camera);
    }

    frameId = requestAnimationFrame(animateLoop);
    setReady(true);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.removeEventListener('start', cancelFlyTo);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerleave', pointerLeave);
      tooltip.remove();
      labels.forEach((l) => l.remove());
      if (explosion) {
        scene.remove(explosion.root);
        explosion.dispose();
      }
      scene.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m.dispose());
        }
      });
      materials.forEach((m) => {
        m.clippingPlanes = [];
        m.dispose();
      });
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[300px] select-none" ref={host}>
      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#f7f4ed] text-stone-800 z-10">
          <div className="w-8 h-8 border-4 border-stone-300 border-t-amber-600 rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-wider">
            Preparing 3D Mechanism Geometry & Kinematics...
          </span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-100 text-stone-800 z-10">
          <p className="text-sm font-bold text-red-600 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black shadow-md"
          >
            Reload Studio
          </button>
        </div>
      )}
    </div>
  );
};

export const MechanismsScene = React.memo(MechanismsSceneComponent);
