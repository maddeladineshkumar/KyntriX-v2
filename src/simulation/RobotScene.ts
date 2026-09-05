import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { RobotDefinition, FKResult } from '../data/schema/robotSchema';
import { Matrix4 } from '../robotics/math/Matrix4';
import { meshLoader } from './MeshLoader';
import { CoordinateFramesManager } from './CoordinateFrames';
import { EndEffectorTrace } from './EndEffectorTrace';
import { TargetGizmo } from './TargetGizmo';
import { ProceduralSkeleton } from './ProceduralSkeleton';

export interface SceneRenderOptions {
  showFrames?: boolean;
  showMeshes?: boolean;
  showTrace?: boolean;
  showTarget?: boolean;
  frameScale?: number;
}

export class RobotScene {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private orbitControls: OrbitControls;
  private transformControls: TransformControls;

  // Visual components
  private robotGroup: THREE.Group;
  private linkNodes: (THREE.Group | null)[] = [];
  private linkMeshes: (THREE.Mesh | null)[] = [];
  private proceduralSkeleton: ProceduralSkeleton;
  private framesManager: CoordinateFramesManager;
  private trace: EndEffectorTrace;
  private targetGizmo: TargetGizmo;
  private gridHelper: THREE.GridHelper;

  private currentRobot: RobotDefinition | null = null;
  private currentFK: FKResult | null = null;
  private isDisposed = false;
  private animationFrameId: number | null = null;
  private targetChangeCallback: ((target: Matrix4) => void) | null = null;
  private colMajorBuffer = new Float64Array(16);
  private isDraggingTarget = false;
  private loadGeneration = 0;

  constructor() {
    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf7f4ed); // warm luxury light beige studio

    // Robotics convention: Z is UP!
    // Three.js default camera up is (0, 1, 0). We set it to (0, 0, 1).
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 50);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(1.5, -2.0, 1.2);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Controls
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.target.set(0, 0, 0.4);

    // TransformControls for IK target manipulation
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.size = 0.75;
    this.transformControls.space = 'world';
    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
      this.isDraggingTarget = !!event.value;
    });
    this.transformControls.addEventListener('objectChange', () => {
      if (this.targetChangeCallback) {
        const pose = this.targetGizmo.getPose();
        this.targetChangeCallback(pose);
      }
    });

    // 2. Lighting - calibrated for warm studio CAD light beige mode
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0xf5eedc, 0.95);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight1.position.set(3, -4, 5);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xe8dcc4, 0.5); // warm subtle fill
    dirLight2.position.set(-3, 3, 2);
    this.scene.add(dirLight2);

    // 3. Grid Floor (XY plane in Z-up system)
    // Three.js GridHelper lies on XZ plane by default. We rotate it to lie on XY.
    this.gridHelper = new THREE.GridHelper(4, 40, 0x8c8270, 0xdcd4c4);
    this.gridHelper.rotation.x = Math.PI / 2;
    this.gridHelper.position.z = 0;
    this.scene.add(this.gridHelper);

    // 4. Visual Components
    this.robotGroup = new THREE.Group();
    this.scene.add(this.robotGroup);

    this.proceduralSkeleton = new ProceduralSkeleton();
    this.scene.add(this.proceduralSkeleton);

    this.framesManager = new CoordinateFramesManager();
    this.scene.add(this.framesManager);

    this.trace = new EndEffectorTrace();
    this.scene.add(this.trace);

    this.targetGizmo = new TargetGizmo();
    this.scene.add(this.targetGizmo);
    this.transformControls.attach(this.targetGizmo);
    this.scene.add(this.transformControls.getHelper());

    // Start render loop
    this.renderLoop = this.renderLoop.bind(this);
    this.renderLoop();
  }

  private frameTimes: number[] = [];
  private lastFrameTimestamp: number = performance.now();
  private currentFPS: number = 60;
  private isPaused: boolean = false;
  private workspacePointCloud: THREE.Points | null = null;

  attach(container: HTMLElement): void {
    this.container = container;
    this.container.appendChild(this.renderer.domElement);
    this.resize(container.clientWidth, container.clientHeight);
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  pause(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume(): void {
    if (!this.isPaused || this.isDisposed) return;
    this.isPaused = false;
    this.lastFrameTimestamp = performance.now();
    this.renderLoop();
  }

  private renderLoop(): void {
    if (this.isDisposed || this.isPaused) return;
    this.animationFrameId = requestAnimationFrame(this.renderLoop);

    const now = performance.now();
    const delta = now - this.lastFrameTimestamp;
    this.lastFrameTimestamp = now;
    if (delta > 0) {
      this.frameTimes.push(delta);
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.currentFPS = Math.round(1000 / avg);
    }

    this.orbitControls.update();
    this.renderer.render(this.scene, this.camera);
  }

  getFPS(): number {
    return this.currentFPS;
  }

  setWorkspacePointCloud(points: { x: number; y: number; z: number }[] | Float32Array): void {
    this.clearWorkspacePointCloud();

    const geometry = new THREE.BufferGeometry();
    let posArray: Float32Array;

    if (points instanceof Float32Array) {
      posArray = points;
    } else {
      posArray = new Float32Array(points.length * 3);
      for (let i = 0; i < points.length; i++) {
        posArray[i * 3] = points[i].x;
        posArray[i * 3 + 1] = points[i].y;
        posArray[i * 3 + 2] = points[i].z;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const material = new THREE.PointsMaterial({
      color: 0xf59e0b, // amber
      size: 0.012,
      transparent: true,
      opacity: 0.4,
    });

    this.workspacePointCloud = new THREE.Points(geometry, material);
    this.scene.add(this.workspacePointCloud);
  }

  clearWorkspacePointCloud(): void {
    if (this.workspacePointCloud) {
      this.scene.remove(this.workspacePointCloud);
      this.workspacePointCloud.geometry.dispose();
      if (Array.isArray(this.workspacePointCloud.material)) {
        this.workspacePointCloud.material.forEach((m) => m.dispose());
      } else {
        this.workspacePointCloud.material.dispose();
      }
      this.workspacePointCloud = null;
    }
  }

  private clearLinkNodesAndMeshes(): void {
    for (const node of this.linkNodes) {
      if (node) {
        this.robotGroup.remove(node);
      }
    }
    this.linkNodes = [];

    for (const m of this.linkMeshes) {
      if (m) {
        m.geometry.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material.dispose();
        }
      }
    }
    this.linkMeshes = [];
  }

  private disposeStaged(meshes: (THREE.Mesh | null)[]): void {
    for (const m of meshes) {
      if (m) {
        m.geometry.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material.dispose();
        }
      }
    }
  }

  /**
   * Load robot and initialize link meshes with calibration transforms.
   * Hardened against race conditions when user rapidly switches models.
   */
  async loadRobot(robot: RobotDefinition): Promise<void> {
    const gen = ++this.loadGeneration;
    const hasSTLs = robot.links.some((l) => !!l.meshFile);

    if (!hasSTLs) {
      if (gen !== this.loadGeneration || this.isDisposed) return;
      this.clearLinkNodesAndMeshes();
      this.currentRobot = robot;
      this.robotGroup.visible = false;
      this.proceduralSkeleton.visible = true;
      this.trace.resetTrail();
      return;
    }

    // Load all link meshes into a local staging array first (atomic load)
    const stagedNodes: (THREE.Group | null)[] = [];
    const stagedMeshes: (THREE.Mesh | null)[] = [];

    try {
      for (let i = 0; i < robot.links.length; i++) {
        const link = robot.links[i];
        if (link.meshFile) {
          const geom = await meshLoader.loadSTL(link.meshFile);

          // Check generation after each async load step
          if (gen !== this.loadGeneration || this.isDisposed) {
            if (geom) geom.dispose();
            this.disposeStaged(stagedMeshes);
            return;
          }

          if (geom) {
            const hexColor = parseInt((link.color || '#71717a').replace('#', ''), 16);
            const material = new THREE.MeshStandardMaterial({
              color: hexColor,
              roughness: 0.35,
              metalness: 0.65,
            });
            const mesh = new THREE.Mesh(geom, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Apply meshCalibrationTransform (PRD §30-31)
            const cal = link.calibration;
            if (cal) {
              mesh.scale.set(...cal.scale);
              mesh.rotation.set(...cal.rotation);
              mesh.position.set(...cal.translation);
            }
            mesh.updateMatrix();

            // Link parent node strictly driven by authoritative FK
            const linkNode = new THREE.Group();
            linkNode.matrixAutoUpdate = false;
            linkNode.add(mesh);

            stagedNodes.push(linkNode);
            stagedMeshes.push(mesh);
            continue;
          } else {
            throw new Error(`Failed to load STL mesh asset: "${link.meshFile}" for link "${link.name}"`);
          }
        }
        stagedNodes.push(null);
        stagedMeshes.push(null);
      }
    } catch (err) {
      this.disposeStaged(stagedMeshes);
      if (gen === this.loadGeneration) {
        throw err;
      }
      return;
    }

    // Final generation check before committing to scene
    if (gen !== this.loadGeneration || this.isDisposed) {
      this.disposeStaged(stagedMeshes);
      return;
    }

    // Atomically swap old meshes with new meshes
    this.clearLinkNodesAndMeshes();
    this.currentRobot = robot;
    this.proceduralSkeleton.visible = false;
    this.robotGroup.visible = true;

    for (const node of stagedNodes) {
      if (node) {
        this.robotGroup.add(node);
      }
    }
    this.linkNodes = stagedNodes;
    this.linkMeshes = stagedMeshes;
    this.trace.resetTrail();
  }

  /**
   * Update visual scene from authoritative Forward Kinematics result.
   */
  updatePose(fk: FKResult, robot?: RobotDefinition): void {
    if (robot) {
      this.currentRobot = robot;
    }
    if (!this.currentRobot) return;
    this.currentFK = fk;

    // 1. Update link nodes with exact cumulative matrices T_{0i}
    const hasSTLs = this.currentRobot.links.some((l) => !!l.meshFile);

    if (hasSTLs) {
      for (let i = 0; i < this.linkNodes.length; i++) {
        const node = this.linkNodes[i];
        if (!node) continue;

        if (i === 0) {
          // Base link
          const baseT = this.currentRobot.baseTransform ?? Matrix4.identity();
          baseT.toColumnMajor(this.colMajorBuffer);
          node.matrix.fromArray(this.colMajorBuffer);
        } else {
          // Link i corresponds to transform T_{0, i-1}
          const tIdx = i - 1;
          if (tIdx < fk.T.length) {
            fk.T[tIdx].toColumnMajor(this.colMajorBuffer);
            node.matrix.fromArray(this.colMajorBuffer);
          }
        }
      }
    } else {
      // Update procedural skeleton
      this.proceduralSkeleton.updateSkeleton(fk);
    }

    // 2. Update coordinate frames
    this.framesManager.updateFrames(fk.frames);

    // 3. Add point to end-effector trace
    const eePos = fk.endEffectorTransform.getPosition();
    this.trace.addPoint(eePos);
  }

  setCameraView(
    view:
      | 'home'
      | 'top'
      | 'front'
      | 'back'
      | 'left'
      | 'right'
      | 'bottom'
      | 'isometric'
      | 'side'
      | 'fit-robot'
  ): void {
    const target = this.orbitControls.target;
    const dist = 2.0;

    switch (view) {
      case 'top':
        this.camera.position.set(target.x, target.y, target.z + dist);
        this.camera.up.set(0, 1, 0);
        break;
      case 'bottom':
        this.camera.position.set(target.x, target.y, target.z - dist);
        this.camera.up.set(0, 1, 0);
        break;
      case 'front':
        this.camera.position.set(target.x, target.y - dist, target.z);
        this.camera.up.set(0, 0, 1);
        break;
      case 'back':
        this.camera.position.set(target.x, target.y + dist, target.z);
        this.camera.up.set(0, 0, 1);
        break;
      case 'left':
        this.camera.position.set(target.x - dist, target.y, target.z);
        this.camera.up.set(0, 0, 1);
        break;
      case 'right':
      case 'side':
        this.camera.position.set(target.x + dist, target.y, target.z);
        this.camera.up.set(0, 0, 1);
        break;
      case 'isometric':
        this.camera.position.set(
          target.x + dist * 0.7,
          target.y - dist * 0.7,
          target.z + dist * 0.7
        );
        this.camera.up.set(0, 0, 1);
        break;
      case 'fit-robot': {
        if (this.currentFK && this.currentFK.origins.length > 0) {
          const box = new THREE.Box3();
          for (const orig of this.currentFK.origins) {
            box.expandByPoint(new THREE.Vector3(orig.x, orig.y, orig.z));
          }
          const eePos = this.currentFK.endEffectorTransform.getPosition();
          box.expandByPoint(new THREE.Vector3(eePos.x, eePos.y, eePos.z));
          box.expandByPoint(new THREE.Vector3(0, 0, 0)); // base origin

          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z, 0.4);
          const fitDist = maxDim * 2.2;

          this.orbitControls.target.copy(center);
          this.camera.position.set(
            center.x + fitDist * 0.7,
            center.y - fitDist * 0.7,
            center.z + fitDist * 0.6
          );
          this.camera.up.set(0, 0, 1);
        } else {
          this.camera.position.set(target.x + 1.5, target.y - 2.0, target.z + 1.2);
          this.camera.up.set(0, 0, 1);
        }
        break;
      }
      case 'home':
      default:
        this.camera.position.set(target.x + 1.5, target.y - 2.0, target.z + 1.2);
        this.camera.up.set(0, 0, 1);
        break;
    }
    this.camera.lookAt(this.orbitControls.target);
    this.orbitControls.update();
  }

  showFramesUpTo(maxIndex: number): void {
    this.framesManager.showFramesUpTo(maxIndex);
  }

  setFrameVisibility(visible: boolean): void {
    this.framesManager.setFrameVisibility(visible);
  }

  setMeshVisibility(visible: boolean): void {
    this.robotGroup.visible = visible;
  }

  setTraceVisibility(visible: boolean): void {
    this.trace.visible = visible;
  }

  clearTrace(): void {
    this.trace.resetTrail();
  }

  setTargetPose(pose: Matrix4): void {
    if (this.isDraggingTarget) return;
    this.targetGizmo.setPose(pose);
  }

  setTargetVisibility(visible: boolean): void {
    this.targetGizmo.visible = visible;
    this.transformControls.enabled = visible;
    try {
      const helper = this.transformControls.getHelper();
      if (helper) {
        helper.visible = visible;
      }
    } catch {}
  }

  setTargetTransformMode(mode: 'translate' | 'rotate'): void {
    this.transformControls.setMode(mode);
  }

  onTargetChanged(callback: (target: Matrix4) => void): void {
    this.targetChangeCallback = callback;
  }

  dispose(): void {
    this.isDisposed = true;
    this.loadGeneration++;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.clearWorkspacePointCloud();
    this.orbitControls.dispose();
    this.transformControls.dispose();
    this.framesManager.dispose();
    this.trace.dispose();
    this.targetGizmo.dispose();
    this.proceduralSkeleton.dispose();

    this.clearLinkNodesAndMeshes();

    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
