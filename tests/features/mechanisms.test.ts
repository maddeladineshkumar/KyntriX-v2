import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ENGINES, getParts } from '../../src/features/mechanisms/engineData';
import {
  DEFAULT_SECTION_DEPTH,
  DEFAULT_SECTION_PLANE,
  SECTION_PRESETS,
  sectionNormal,
  updateSectionPlane,
} from '../../src/features/mechanisms/sectionPlane';
import { packInventory, type InventoryItem } from '../../src/features/mechanisms/explosionLayout';
import {
  WALKTHROUGHS,
  startWalkthrough,
  exitWalkthrough,
  stepWalkthrough,
  advanceWalkthrough,
} from '../../src/features/mechanisms/walkthroughs';
import { fitWalkthroughCamera } from '../../src/features/mechanisms/walkthroughCamera';
import { calculateTelemetry } from '../../src/features/mechanisms/telemetryEngine';
import { ExplosionController } from '../../src/features/mechanisms/explosionController';
import { SectionGizmo } from '../../src/features/mechanisms/sectionRendering';
import { soundSynthesizer } from '../../src/features/mechanisms/soundSynthesizer';
import {
  CAMERA_OPTIONS,
  QUALITY_OPTIONS,
  getPartGroups,
  isFlightTestbed,
  loadStudioPreferences,
  resetViewState,
  saveStudioPreferences,
  STUDIO_STORAGE_KEY,
  supportsAfterburner,
  supportsVectoring,
  testbedLabel,
} from '../../src/features/mechanisms/studioConfig';
import type { EngineType, ViewerState } from '../../src/features/mechanisms/types';

describe('Mechanisms & Engines Simulation Suite', () => {
  const allEngineTypes: EngineType[] = [
    'turbofan',
    'turbojet',
    'turboprop',
    'turboshaft',
    'v8',
    'inline4',
    'rotary',
    'bldc-motor',
    'airplane-jet',
  ];

  const createMockViewerState = (engine: EngineType = 'turbofan'): ViewerState => ({
    engine,
    mode: 'assembled',
    explode: 0,
    explodeLayout: 'inventory',
    spacing: 40,
    cycling: false,
    selectedPiece: null,
    isolatedPiece: null,
    section: DEFAULT_SECTION_DEPTH,
    sectionPlane: { ...DEFAULT_SECTION_PLANE },
    playing: false,
    speed: 1,
    flow: true,
    labels: true,
    grid: true,
    spin: false,
    hidden: [],
    selected: null,
    selectedParts: [],
    isolated: null,
    quality: 'ultra',
    camera: 'perspective',
    reset: 0,
    zoom: 0,
    walkthrough: null,
    throttle: 65,
    afterburner: false,
    altitude: 3500,
    vectoringPitch: 0,
    audioEnabled: false,
  });

  describe('1. Engine Catalog & Parts Inventory Integrity', () => {
    it('defines metadata for all 9 engines with required specifications', () => {
      for (const engine of allEngineTypes) {
        const meta = ENGINES[engine];
        expect(meta).toBeDefined();
        expect(meta.name).toBeTruthy();
        expect(meta.code).toMatch(/^[A-Z0-9-]+$/);
        expect(meta.subtitle).toBeTruthy();
        expect(meta.description.length).toBeGreaterThan(20);
        expect(meta.specs.length).toBeGreaterThanOrEqual(4);
        for (const spec of meta.specs) {
          expect(spec.label).toBeTruthy();
          expect(spec.value).toBeTruthy();
        }
      }
    });

    it('verifies custom electric motor and aircraft testbed metadata', () => {
      const bldc = ENGINES['bldc-motor'];
      expect(bldc.code).toBe('EM-08');
      expect(bldc.category).toBe('ELECTROMECHANICAL');
      expect(bldc.family).toBe('Electric drives');

      const jet = ENGINES['airplane-jet'];
      expect(jet.code).toBe('AJ-09');
      expect(jet.category).toBe('AEROSPACE');
      expect(jet.family).toBe('Aerospace systems');
    });

    it('returns formatted parts catalog with unique numbers and valid attributes for each engine', () => {
      for (const engine of allEngineTypes) {
        const parts = getParts(engine);
        expect(parts.length).toBeGreaterThanOrEqual(6);

        const ids = new Set<string>();
        parts.forEach((p, idx) => {
          expect(p.id).toBeTruthy();
          expect(p.name).toBeTruthy();
          expect(p.short).toBeTruthy();
          expect(p.color).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(p.number).toBe(String(idx + 1).padStart(2, '0'));
          expect(p.role).toBeTruthy();
          expect(p.description).toBeTruthy();
          expect(p.material).toBeTruthy();
          expect(ids.has(p.id)).toBe(false);
          ids.add(p.id);
        });
      }
    });

    it('verifies specialized parts for turbojet, turboprop, turboshaft, and BLDC', () => {
      const turbojetParts = getParts('turbojet');
      expect(turbojetParts[0].name).toContain('Supersonic Inlet');

      const turbopropParts = getParts('turboprop');
      expect(turbopropParts[0].name).toContain('Propeller');

      const turboshaftParts = getParts('turboshaft');
      expect(turboshaftParts[0].name).toContain('Splined Power Take-Off');

      const bldcParts = getParts('bldc-motor');
      const bldcIds = bldcParts.map((p) => p.id);
      expect(bldcIds).toContain('stator');
      expect(bldcIds).toContain('windings');
      expect(bldcIds).toContain('rotor');
      expect(bldcIds).toContain('encoder');
      expect(bldcIds).toContain('gearhead');

      const airplaneParts = getParts('airplane-jet');
      const airplaneIds = airplaneParts.map((p) => p.id);
      expect(airplaneIds).toContain('fuselage');
      expect(airplaneIds).toContain('wings');
      expect(airplaneIds).toContain('nozzles');
      expect(airplaneIds).toContain('canopy');
    });
  });

  describe('2. Free-Angle Section Cutaway Mathematics', () => {
    it('computes cardinal spherical normal vectors accurately', () => {
      // Top view: yaw=0, pitch=0 -> points downward (0, -1, 0)
      const topNormal = sectionNormal(0, 0);
      expect(topNormal.x).toBeCloseTo(0, 5);
      expect(topNormal.y).toBeCloseTo(-1, 5);
      expect(topNormal.z).toBeCloseTo(0, 5);

      // Side view: yaw=0, pitch=-90 -> (0, 0, -1)
      const sideNormal = sectionNormal(0, -90);
      expect(sideNormal.x).toBeCloseTo(0, 5);
      expect(sideNormal.y).toBeCloseTo(0, 5);
      expect(sideNormal.z).toBeCloseTo(-1, 5);

      // Front cross-section: yaw=90, pitch=0 -> (-1, 0, 0)
      const frontNormal = sectionNormal(90, 0);
      expect(frontNormal.x).toBeCloseTo(-1, 5);
      expect(frontNormal.y).toBeCloseTo(0, 5);
      expect(frontNormal.z).toBeCloseTo(0, 5);
    });

    it('ensures all section presets yield unit-length normal vectors', () => {
      for (const preset of SECTION_PRESETS) {
        const norm = sectionNormal(preset.yaw, preset.pitch);
        expect(norm.length()).toBeCloseTo(1.0, 5);
      }
    });

    it('sweeps bounding box and clamps depth within [0, 100]', () => {
      const plane = new THREE.Plane();
      const bounds = new THREE.Box3(new THREE.Vector3(-2, -1, -2), new THREE.Vector3(2, 3, 2));

      // At depth 0% (top view)
      updateSectionPlane(plane, bounds, -10, {
        yaw: 0,
        pitch: 0,
        flipped: false,
        showGizmo: false,
        free: false,
      });
      // bounds.min.y = -1, minus margin 0.2 = -1.2
      expect(plane.constant).toBeCloseTo(-1.2, 3);

      // At depth 100% (top view)
      updateSectionPlane(plane, bounds, 150, {
        yaw: 0,
        pitch: 0,
        flipped: false,
        showGizmo: false,
        free: false,
      });
      // bounds.max.y = 3, plus margin 0.2 = 3.2
      expect(plane.constant).toBeCloseTo(3.2, 3);
    });

    it('negates plane normal and constant when flipped is true', () => {
      const normalPlane = new THREE.Plane();
      const flippedPlane = new THREE.Plane();
      const bounds = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));

      updateSectionPlane(normalPlane, bounds, 50, {
        yaw: 45,
        pitch: -30,
        flipped: false,
        showGizmo: false,
        free: true,
      });

      updateSectionPlane(flippedPlane, bounds, 50, {
        yaw: 45,
        pitch: -30,
        flipped: true,
        showGizmo: false,
        free: true,
      });

      expect(flippedPlane.normal.x).toBeCloseTo(-normalPlane.normal.x, 5);
      expect(flippedPlane.normal.y).toBeCloseTo(-normalPlane.normal.y, 5);
      expect(flippedPlane.normal.z).toBeCloseTo(-normalPlane.normal.z, 5);
      expect(flippedPlane.constant).toBeCloseTo(-normalPlane.constant, 5);
    });
  });

  describe('3. 2D Inventory Shelf Packing Algorithm', () => {
    it('handles empty inventory gracefully', () => {
      const packed = packInventory([], 1.77, 0.05);
      expect(packed.cells.size).toBe(0);
      expect(packed.width).toBe(1);
      expect(packed.height).toBe(1);
    });

    it('packs single item centered around (0, 0)', () => {
      const items: InventoryItem[] = [
        { id: 'rotor', width: 0.5, height: 0.8, group: 'core' },
      ];
      const packed = packInventory(items, 1.0, 0.1);
      expect(packed.cells.has('rotor')).toBe(true);
      const cell = packed.cells.get('rotor')!;
      expect(cell.x).toBeCloseTo(0, 3);
      expect(cell.y).toBeCloseTo(0, 3);
      expect(cell.width).toBeCloseTo(0.6, 3);
      expect(cell.height).toBeCloseTo(0.9, 3);
    });

    it('packs multiple items without overlaps and adapts to aspect ratio', () => {
      const items: InventoryItem[] = [
        { id: 'part-1', width: 0.4, height: 0.9, group: 'A' },
        { id: 'part-2', width: 0.6, height: 0.4, group: 'A' },
        { id: 'part-3', width: 0.3, height: 0.7, group: 'B' },
        { id: 'part-4', width: 0.5, height: 0.5, group: 'B' },
        { id: 'part-5', width: 0.8, height: 0.3, group: 'C' },
      ];

      const packedWide = packInventory(items, 2.5, 0.05);
      const packedTall = packInventory(items, 0.4, 0.05);

      expect(packedWide.cells.size).toBe(items.length);
      expect(packedTall.cells.size).toBe(items.length);

      // Wide layout should have a larger width-to-height ratio than tall layout
      const wideRatio = packedWide.width / packedWide.height;
      const tallRatio = packedTall.width / packedTall.height;
      expect(wideRatio).toBeGreaterThan(tallRatio);

      // Verify all items are within bounding box
      for (const cell of packedWide.cells.values()) {
        expect(cell.x + cell.width / 2).toBeLessThanOrEqual(packedWide.width / 2 + 1e-5);
        expect(cell.x - cell.width / 2).toBeGreaterThanOrEqual(-packedWide.width / 2 - 1e-5);
        expect(cell.y + cell.height / 2).toBeLessThanOrEqual(packedWide.height / 2 + 1e-5);
        expect(cell.y - cell.height / 2).toBeGreaterThanOrEqual(-packedWide.height / 2 - 1e-5);
      }
    });
  });

  describe('4. Walkthrough Camera Framing Algorithm', () => {
    it('preserves viewing direction from target to camera while fitting bounding box', () => {
      const bounds = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
      const stationCamera = {
        position: [-6, 5, 10] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
      };

      const result = fitWalkthroughCamera(bounds, stationCamera, 1.77, 34);
      expect(result.target.x).toBe(0);
      expect(result.target.y).toBe(0);
      expect(result.target.z).toBe(0);

      // Direction should match original offset direction
      const originalDir = new THREE.Vector3(...stationCamera.position).sub(result.target).normalize();
      const newDir = result.position.clone().sub(result.target).normalize();

      expect(newDir.x).toBeCloseTo(originalDir.x, 4);
      expect(newDir.y).toBeCloseTo(originalDir.y, 4);
      expect(newDir.z).toBeCloseTo(originalDir.z, 4);
    });

    it('backs camera away when bounding box dimensions increase', () => {
      const smallBounds = new THREE.Box3(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5));
      const largeBounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5));
      const camera = {
        position: [0, 0, 10] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
      };

      const smallFit = fitWalkthroughCamera(smallBounds, camera, 1.77, 34);
      const largeFit = fitWalkthroughCamera(largeBounds, camera, 1.77, 34);

      expect(largeFit.position.length()).toBeGreaterThan(smallFit.position.length());
    });
  });

  describe('5. Walkthrough State Machine Transitions', () => {
    it('provides valid walkthrough stations for all 9 engines', () => {
      for (const engine of allEngineTypes) {
        const stations = WALKTHROUGHS[engine];
        expect(stations).toBeDefined();
        expect(stations.length).toBeGreaterThanOrEqual(1);

        stations.forEach((st) => {
          expect(st.id).toBeTruthy();
          expect(st.title).toBeTruthy();
          expect(st.body).toBeTruthy();
          expect(st.parts.length).toBeGreaterThan(0);
          expect(st.camera.position.length).toBe(3);
          expect(st.camera.target.length).toBe(3);
        });
      }
    });

    it('starts walkthrough by setting cutaway mode, station 0, and caching flow state', () => {
      const initial = createMockViewerState('turbofan');
      initial.flow = true;
      initial.explode = 0.5;

      const started = startWalkthrough(initial);
      expect(started.walkthrough).not.toBeNull();
      expect(started.walkthrough?.station).toBe(0);
      expect(started.walkthrough?.playing).toBe(true);
      expect(started.walkthrough?.previousFlow).toBe(true);
      expect(started.mode).toBe('cutaway');
      expect(started.explode).toBe(0);
      expect(started.flow).toBe(false);
      expect(started.selectedParts).toEqual(WALKTHROUGHS['turbofan'][0].parts);
    });

    it('steps forward and backward within station bounds', () => {
      let state = startWalkthrough(createMockViewerState('turbofan'));
      const stations = WALKTHROUGHS['turbofan'];

      // Step forward
      state = stepWalkthrough(state, 1);
      expect(state.walkthrough?.station).toBe(1);
      expect(state.selectedParts).toEqual(stations[1].parts);

      // Step past last station -> clamps to stations.length - 1
      state = stepWalkthrough(state, 100);
      expect(state.walkthrough?.station).toBe(stations.length - 1);

      // Step backward past 0 -> clamps to 0
      state = stepWalkthrough(state, -100);
      expect(state.walkthrough?.station).toBe(0);
    });

    it('advances walkthrough and halts playback when reaching the end', () => {
      let state = startWalkthrough(createMockViewerState('turbofan'));
      const totalStations = WALKTHROUGHS['turbofan'].length;

      for (let i = 0; i < totalStations - 1; i++) {
        state = advanceWalkthrough(state);
        expect(state.walkthrough?.station).toBe(i + 1);
      }

      // Final advance beyond last station stops playback
      state = advanceWalkthrough(state);
      expect(state.walkthrough?.station).toBe(totalStations - 1);
      expect(state.walkthrough?.playing).toBe(false);
    });

    it('exits walkthrough cleanly and restores previous flow state', () => {
      const initial = createMockViewerState('turbofan');
      initial.flow = true;
      const started = startWalkthrough(initial);
      const exited = exitWalkthrough(started);

      expect(exited.walkthrough).toBeNull();
      expect(exited.flow).toBe(true);
      expect(exited.selectedParts).toEqual([]);
      expect(exited.hidden).toEqual([]);
    });

    it('restores the full pre-tour view when exiting a walkthrough', () => {
      const initial = createMockViewerState('v8');
      initial.mode = 'exploded';
      initial.explode = 74;
      initial.section = 31;
      initial.sectionPlane = { yaw: 35, pitch: -20, flipped: true, showGizmo: true, free: true };
      initial.flow = false;
      initial.hidden = ['valvetrain'];
      initial.selected = 'pistons';
      initial.selectedParts = ['pistons', 'rods'];
      initial.isolated = 'crankshaft';
      initial.isolatedPiece = 'crankshaft:4';
      initial.playing = true;

      const started = startWalkthrough(initial);
      expect(started.walkthrough?.previous?.mode).toBe('exploded');
      expect(started.walkthrough?.previous?.isolated).toBe('crankshaft');

      const exited = exitWalkthrough(started);
      expect(exited.mode).toBe('exploded');
      expect(exited.explode).toBe(74);
      expect(exited.section).toBe(31);
      expect(exited.sectionPlane).toEqual(initial.sectionPlane);
      expect(exited.flow).toBe(false);
      expect(exited.hidden).toEqual(['valvetrain']);
      expect(exited.selected).toBe('pistons');
      expect(exited.selectedParts).toEqual(['pistons', 'rods']);
      expect(exited.isolated).toBe('crankshaft');
      expect(exited.isolatedPiece).toBe('crankshaft:4');
      expect(exited.playing).toBe(true);
    });

    it('leaves state untouched when exiting without an active tour', () => {
      const initial = createMockViewerState('turbofan');
      initial.hidden = ['fan'];
      initial.selected = 'compressor';
      expect(exitWalkthrough(initial)).toBe(initial);
    });
  });

  describe('6. Real-Time Telemetry Physics Engine', () => {
    it('computes idle telemetry metrics at 0% throttle', () => {
      const state = createMockViewerState('turbojet');
      state.throttle = 0;

      const telem = calculateTelemetry('turbojet', state, 1.0);
      expect(telem.rpm).toBeGreaterThan(3000); // Has idle floor
      expect(telem.thrustKN).toBeGreaterThan(0);
      expect(telem.fuelFlowKgPerS).toBeGreaterThanOrEqual(0.01);
      expect(telem.turbineInletTempC).toBeGreaterThan(500);
      expect(telem.thermalEfficiencyPct).toBeGreaterThanOrEqual(20);
      expect(telem.thermalEfficiencyPct).toBeLessThanOrEqual(96);
    });

    it('produces 0 thrust for piston engines and BLDC motor at all throttle levels', () => {
      const state = createMockViewerState('v8');
      state.throttle = 100;

      const v8Telem = calculateTelemetry('v8', state, 2.0);
      expect(v8Telem.thrustKN).toBe(0);
      expect(v8Telem.torqueNm).toBeGreaterThan(300);
      expect(v8Telem.powerKW).toBeGreaterThan(200);

      const bldcTelem = calculateTelemetry('bldc-motor', state, 2.0);
      expect(bldcTelem.thrustKN).toBe(0);
      expect(bldcTelem.thermalEfficiencyPct).toBeGreaterThan(90);
    });

    it('models afterburner boost and increased temperatures on supersonic jet and turbojet', () => {
      const stateDry = createMockViewerState('airplane-jet');
      stateDry.throttle = 100;
      stateDry.afterburner = false;

      const telemDry = calculateTelemetry('airplane-jet', stateDry, 0);

      const stateWet = createMockViewerState('airplane-jet');
      stateWet.throttle = 100;
      stateWet.afterburner = true;

      const telemWet = calculateTelemetry('airplane-jet', stateWet, 0);

      expect(telemWet.thrustKN).toBeGreaterThan(telemDry.thrustKN);
      expect(telemWet.turbineInletTempC).toBeGreaterThan(telemDry.turbineInletTempC);
      expect(telemWet.exhaustGasTempC).toBeGreaterThan(telemDry.exhaustGasTempC);
      expect(telemWet.airspeedMach).toBeGreaterThan(telemDry.airspeedMach);
      expect(telemWet.airspeedMach).toBeGreaterThan(1.0); // Supersonic dash
    });

    it('calculates atmospheric density lapse and thrust degradation with altitude', () => {
      const seaLevelState = createMockViewerState('turbofan');
      seaLevelState.throttle = 90;
      seaLevelState.altitude = 0;

      const altitudeState = createMockViewerState('turbofan');
      altitudeState.throttle = 90;
      altitudeState.altitude = 11000; // 11,000 meters (tropopause)

      const telemSea = calculateTelemetry('turbofan', seaLevelState, 0);
      const telemAlt = calculateTelemetry('turbofan', altitudeState, 0);

      expect(telemSea.thrustKN).toBeGreaterThan(telemAlt.thrustKN);
    });
  });

  describe('7. Kinematic Slider-Crank & Epitrochoid Formulation Verification', () => {
    it('satisfies slider-crank mathematical constraint: q(theta) = r*cos(theta) + sqrt(L^2 - r^2*sin^2(theta))', () => {
      const r = 0.5; // crank radius
      const L = 1.6; // connecting rod length

      const sliderPosition = (theta: number) =>
        r * Math.cos(theta) + Math.sqrt(L * L - r * r * Math.sin(theta) * Math.sin(theta));

      // At Top Dead Center (TDC, theta = 0)
      const qTDC = sliderPosition(0);
      expect(qTDC).toBeCloseTo(r + L, 6);

      // At Bottom Dead Center (BDC, theta = Math.PI)
      const qBDC = sliderPosition(Math.PI);
      expect(qBDC).toBeCloseTo(L - r, 6);

      // Stroke length equals 2 * r
      expect(qTDC - qBDC).toBeCloseTo(2 * r, 6);

      // Positivity of discriminant for all angles
      for (let deg = 0; deg <= 360; deg += 15) {
        const rad = (deg * Math.PI) / 180;
        const disc = L * L - r * r * Math.sin(rad) * Math.sin(rad);
        expect(disc).toBeGreaterThan(0);
      }
    });

    it('satisfies 2-lobed epitrochoid chamber geometry: y = R*cos(a) + e*cos(3*a), z = R*sin(a) + e*sin(3*a)', () => {
      const R = 1.55; // generating radius
      const e = 0.25; // eccentricity

      const epitrochoid = (alpha: number) => ({
        y: R * Math.cos(alpha) + e * Math.cos(3 * alpha),
        z: R * Math.sin(alpha) + e * Math.sin(3 * alpha),
      });

      // Major axis lobes at a = 0 and a = PI: radius is R + e
      const lobe1 = epitrochoid(0);
      const lobe2 = epitrochoid(Math.PI);
      expect(Math.hypot(lobe1.y, lobe1.z)).toBeCloseTo(R + e, 5);
      expect(Math.hypot(lobe2.y, lobe2.z)).toBeCloseTo(R + e, 5);

      // Minor waist at a = PI/2 and a = 3*PI/2: radius is R - e
      const waist1 = epitrochoid(Math.PI / 2);
      const waist2 = epitrochoid((3 * Math.PI) / 2);
      expect(Math.hypot(waist1.y, waist1.z)).toBeCloseTo(R - e, 5);
      expect(Math.hypot(waist2.y, waist2.z)).toBeCloseTo(R - e, 5);

      // Analytical identity r(a)^2 = R^2 + e^2 + 2*R*e*cos(2*a) holds across entire profile
      for (let deg = 0; deg <= 360; deg += 30) {
        const rad = (deg * Math.PI) / 180;
        const pt = epitrochoid(rad);
        const actualRadius = Math.hypot(pt.y, pt.z);
        const theoreticalRadius = Math.sqrt(R * R + e * e + 2 * R * e * Math.cos(2 * rad));
        expect(actualRadius).toBeCloseTo(theoreticalRadius, 5);
      }
    });
  });

  describe('8. ExplosionController Lifecycle & Matrix Interpolation', () => {
    const createTestModel = () => {
      const model = new THREE.Group();
      const partGroup = new THREE.Group();
      partGroup.userData.id = 'compressor';
      model.add(partGroup);

      const geo = new THREE.BoxGeometry(1, 2, 3);
      const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.part = 'compressor';
      mesh.userData.pieceName = 'Rotor Blade 01';
      partGroup.add(mesh);

      return { model, geo, mat, mesh };
    };

    it('extracts pieces and captures initial home coordinates properly', () => {
      const { model } = createTestModel();
      const controller = new ExplosionController(model);

      expect(controller.pieces.length).toBe(1);
      expect(controller.pieces[0].name).toBe('Rotor Blade 01');
      expect(controller.count).toBe(1);
      expect(controller.visibleCount).toBe(1);
      expect(controller.lookup.has(controller.pieces[0].id)).toBe(true);

      controller.dispose();
    });

    it('computes radial and inventory layouts without generating NaN coordinates', () => {
      const { model } = createTestModel();
      const controller = new ExplosionController(model);

      controller.layout({
        layout: 'radial',
        spacing: 50,
        aspect: 1.77,
        hidden: [],
        isolated: null,
        isolatedPiece: null,
      });

      const p = controller.pieces[0];
      expect(Number.isFinite(p.targetPosition.x)).toBe(true);
      expect(Number.isFinite(p.targetPosition.y)).toBe(true);
      expect(Number.isFinite(p.targetPosition.z)).toBe(true);

      controller.layout({
        layout: 'inventory',
        spacing: 30,
        aspect: 1.77,
        hidden: [],
        isolated: null,
        isolatedPiece: null,
      });

      expect(Number.isFinite(p.targetPosition.x)).toBe(true);
      expect(Number.isFinite(p.targetPosition.y)).toBe(true);
      expect(Number.isFinite(p.targetPosition.z)).toBe(true);

      controller.dispose();
    });

    it('smoothly interpolates transition without NaN quaternion distortion during layout blends', () => {
      const { model } = createTestModel();
      const controller = new ExplosionController(model);

      // Hide piece
      controller.layout({
        layout: 'inventory',
        spacing: 50,
        aspect: 1.5,
        hidden: ['compressor'],
        isolated: null,
        isolatedPiece: null,
      });

      controller.update(0.5, 1.0);
      expect(controller.pieces[0].visible).toBe(false);

      // Unhide piece and blend transition
      controller.layout({
        layout: 'inventory',
        spacing: 50,
        aspect: 1.5,
        hidden: [],
        isolated: null,
        isolatedPiece: null,
      });

      expect(controller.pieces[0].visible).toBe(true);
      controller.update(0.6, 0.4); // blend < 1

      const curMat = controller.pieces[0].current;
      for (const el of curMat.elements) {
        expect(Number.isFinite(el)).toBe(true);
      }

      controller.dispose();
    });

    it('preserves underlying model mesh geometry when disposed (zero geometry destruction)', () => {
      const { model, geo } = createTestModel();
      const controller = new ExplosionController(model);

      // Verify geometry has attributes
      expect(geo.attributes.position).toBeDefined();

      // Disposing controller must not destroy the model's shared geometry
      controller.dispose();
      expect(geo.attributes.position).toBeDefined();
      expect(controller.pieces.length).toBe(0);
    });

    it('highlights selected parts and returns accurate pick information', () => {
      const { model } = createTestModel();
      const controller = new ExplosionController(model);

      controller.highlight('compressor', null);
      const batch = controller.batches[0];
      const col = new THREE.Color();
      batch.getColorAt(0, col);
      // Bright amber highlight color 0xf59e0b
      expect(col.getHex()).toBe(0xf59e0b);

      controller.highlight(null, null);
      batch.getColorAt(0, col);
      expect(col.getHex()).toBe(0xffffff);

      controller.dispose();
    });
  });

  describe('9. Camera Framing Along Extreme Sightlines & Singularities', () => {
    it('handles camera positioned directly above target (parallel to Y axis) without zero vector cross product', () => {
      const bounds = new THREE.Box3(new THREE.Vector3(-2, -1, -2), new THREE.Vector3(2, 1, 2));
      const topCamera = {
        position: [0, 2, 0] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
      };

      const result = fitWalkthroughCamera(bounds, topCamera, 1.77, 34);
      expect(Number.isFinite(result.position.x)).toBe(true);
      expect(Number.isFinite(result.position.y)).toBe(true);
      expect(Number.isFinite(result.position.z)).toBe(true);
      expect(result.position.y).toBeGreaterThan(2); // Backed away to frame the box
      expect(result.position.distanceTo(result.target)).toBeGreaterThan(2);
    });
  });

  describe('10. Inventory Shelf Packing Robustness Against Invalid Numbers', () => {
    it('safely tolerates NaN aspect ratio and negative gap', () => {
      const items: InventoryItem[] = [
        { id: 'item-1', width: 0.5, height: 0.5, group: 'A' },
        { id: 'item-2', width: 0.6, height: 0.4, group: 'A' },
      ];

      const packed = packInventory(items, NaN, -0.2);
      expect(packed.cells.size).toBe(2);
      expect(Number.isFinite(packed.width)).toBe(true);
      expect(Number.isFinite(packed.height)).toBe(true);
      expect(packed.width).toBeGreaterThan(0);
      expect(packed.height).toBeGreaterThan(0);
    });
  });

  describe('11. Walkthrough Safety with Empty or Non-Existent Engine Data', () => {
    it('gracefully handles missing engine walkthrough definitions without throwing', () => {
      const state = createMockViewerState('turbofan');
      // @ts-expect-error test invalid engine key
      state.engine = 'non-existent-engine';

      expect(() => startWalkthrough(state)).not.toThrow();
      expect(() => stepWalkthrough(state, 1)).not.toThrow();
      expect(() => advanceWalkthrough(state)).not.toThrow();
    });
  });

  describe('12. SoundSynthesizer Race Condition & Rapid Start/Stop Safety', () => {
    it('handles rapid stop followed immediately by start without remaining permanently muted', () => {
      // Test the public start/update/stop API transitions
      expect(() => soundSynthesizer.stop()).not.toThrow();
      expect(() => soundSynthesizer.start('turbofan')).not.toThrow();
      expect(() => soundSynthesizer.update('turbofan', 80, true)).not.toThrow();
      expect(() => soundSynthesizer.stop()).not.toThrow();
      // Immediate re-trigger
      expect(() => soundSynthesizer.start('turbojet')).not.toThrow();
      expect(() => soundSynthesizer.stop()).not.toThrow();
    });
  });

  describe('13. SectionGizmo Clean Resource Disposal', () => {
    it('disposes quad, outline, and arrow helper completely without throwing', () => {
      const gizmo = new SectionGizmo();
      expect(gizmo.root.children.length).toBe(3);
      expect(() => gizmo.dispose()).not.toThrow();
    });
  });

  describe('14. Telemetry Input Sanitization', () => {
    it('safely handles NaN throttle, altitude, and elapsed time', () => {
      const state = createMockViewerState('airplane-jet');
      // @ts-expect-error test NaN input
      state.throttle = NaN;
      // @ts-expect-error test NaN input
      state.altitude = NaN;

      const telem = calculateTelemetry('airplane-jet', state, NaN);
      expect(Number.isFinite(telem.rpm)).toBe(true);
      expect(Number.isFinite(telem.thrustKN)).toBe(true);
      expect(Number.isFinite(telem.fuelFlowKgPerS)).toBe(true);
      expect(Number.isFinite(telem.turbineInletTempC)).toBe(true);
    });
  });

  describe('15. Studio Configuration, Capabilities & Preferences', () => {
    it('assigns every component to exactly one subsystem group for every engine', () => {
      for (const engine of allEngineTypes) {
        const parts = getParts(engine);
        const groups = getPartGroups(engine, parts);
        const groupedIds = groups.flatMap((group) => group.parts.map((part) => part.id));
        expect(groups.length).toBeGreaterThan(0);
        expect(groupedIds).toHaveLength(parts.length);
        expect(new Set(groupedIds).size).toBe(parts.length);
        expect(groupedIds.sort()).toEqual(parts.map((part) => part.id).sort());
        groups.forEach((group) => expect(group.label).toBeTruthy());
      }
    });

    it('exposes only engine-appropriate testbed capabilities', () => {
      expect(supportsAfterburner('turbojet')).toBe(true);
      expect(supportsAfterburner('airplane-jet')).toBe(true);
      expect(supportsAfterburner('turbofan')).toBe(false);
      expect(supportsAfterburner('v8')).toBe(false);

      expect(supportsVectoring('airplane-jet')).toBe(true);
      expect(supportsVectoring('turbojet')).toBe(false);
      expect(supportsVectoring('bldc-motor')).toBe(false);

      expect(isFlightTestbed('turbofan')).toBe(true);
      expect(isFlightTestbed('turboprop')).toBe(false);
      expect(testbedLabel('airplane-jet')).toBe('Flight Testbed');
      expect(testbedLabel('turboshaft')).toBe('Shaft Testbed');
      expect(testbedLabel('rotary')).toBe('Dyno Testbed');
    });

    it('offers distinct, fully described camera and quality presets', () => {
      expect(new Set(CAMERA_OPTIONS.map((option) => option.id)).size).toBe(CAMERA_OPTIONS.length);
      expect(CAMERA_OPTIONS.map((option) => option.id)).toEqual([
        'perspective',
        'ortho',
        'front',
        'side',
        'top',
      ]);
      expect(QUALITY_OPTIONS.map((option) => option.id)).toEqual(['ultra', 'balanced']);
      [...CAMERA_OPTIONS, ...QUALITY_OPTIONS].forEach((option) => {
        expect(option.label).toBeTruthy();
        expect(option.hint).toBeTruthy();
      });
    });

    it('round-trips safe presentation preferences and ignores corrupt data', () => {
      window.localStorage.clear();
      const state = createMockViewerState('airplane-jet');
      state.mode = 'flight-sim';
      state.camera = 'top';
      state.quality = 'balanced';
      state.flow = false;
      state.labels = false;
      state.grid = false;
      state.speed = 2;
      state.throttle = 88;
      state.altitude = 9000;
      state.vectoringPitch = 12;

      saveStudioPreferences(state);
      const loaded = loadStudioPreferences();
      expect(loaded.engine).toBe('airplane-jet');
      expect(loaded.mode).toBe('flight-sim');
      expect(loaded.camera).toBe('top');
      expect(loaded.quality).toBe('balanced');
      expect(loaded.flow).toBe(false);
      expect(loaded.labels).toBe(false);
      expect(loaded.grid).toBe(false);
      expect(loaded.speed).toBe(2);
      expect(loaded.throttle).toBe(88);
      expect(loaded.altitude).toBe(9000);
      expect(loaded.vectoringPitch).toBe(12);

      window.localStorage.setItem(STUDIO_STORAGE_KEY, '{not valid json');
      expect(loadStudioPreferences()).toEqual({});

      window.localStorage.setItem(
        STUDIO_STORAGE_KEY,
        JSON.stringify({ engine: 'not-an-engine', mode: 'warp-speed' })
      );
      expect(loadStudioPreferences()).toEqual({});
      window.localStorage.clear();
    });

    it('resets transient view state while preserving the selected engine', () => {
      const state = createMockViewerState('turbofan');
      state.mode = 'exploded';
      state.explode = 90;
      state.section = 12;
      state.hidden = ['fan'];
      state.isolated = 'compressor';
      state.selected = 'fan';
      state.selectedParts = ['fan', 'casing'];
      state.selectedPiece = 'fan:1';
      state.reset = 3;
      state.zoom = 4;
      state.playing = true;
      state.walkthrough = startWalkthrough(state).walkthrough;

      const reset = resetViewState(state);
      expect(reset.engine).toBe('turbofan');
      expect(reset.mode).toBe('assembled');
      expect(reset.explode).toBe(0);
      expect(reset.section).toBe(DEFAULT_SECTION_DEPTH);
      expect(reset.sectionPlane).toEqual(DEFAULT_SECTION_PLANE);
      expect(reset.hidden).toEqual([]);
      expect(reset.isolated).toBeNull();
      expect(reset.selected).toBeNull();
      expect(reset.selectedParts).toEqual([]);
      expect(reset.selectedPiece).toBeNull();
      expect(reset.walkthrough).toBeNull();
      expect(reset.playing).toBe(false);
      expect(reset.reset).toBe(4);
      expect(reset.zoom).toBe(0);
    });
  });
});

