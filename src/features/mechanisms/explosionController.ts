import * as T from 'three';
import { packInventory } from './explosionLayout';
import type { ExplosionOptions, PieceInfo } from './types';

type Piece = PieceInfo & {
  source: T.Mesh;
  sourceIndex: number;
  batch: T.InstancedMesh;
  index: number;
  home: T.Matrix4;
  homePosition: T.Vector3;
  homeQuaternion: T.Quaternion;
  homeScale: T.Vector3;
  targetPosition: T.Vector3;
  targetQuaternion: T.Quaternion;
  spreadPosition: T.Vector3;
  localCenter: T.Vector3;
  localBox: T.Box3;
  displayBox: T.Box3;
  visible: boolean;
  attachment?: Piece;
  current: T.Matrix4;
  transitionFrom: T.Matrix4;
};

export class ExplosionController {
  readonly root = new T.Group();
  readonly pieces: Piece[] = [];
  readonly batches: T.InstancedMesh[] = [];
  readonly lookup = new Map<string, Piece>();
  private materials: T.MeshStandardMaterial[] = [];
  private partOrder: string[] = [];
  private options: ExplosionOptions = {
    layout: 'inventory',
    spacing: 40,
    aspect: 1,
    hidden: [],
    isolated: null,
    isolatedPiece: null,
  };
  private temporary = new T.Matrix4();
  private position = new T.Vector3();
  private quaternion = new T.Quaternion();
  private transitionPos = new T.Vector3();
  private transitionQuat = new T.Quaternion();
  private transitionScale = new T.Vector3();
  private blendPos = new T.Vector3();
  private blendQuat = new T.Quaternion();
  private zero = new T.Vector3(0, 0, 0);
  private frameBox = new T.Box3();
  private selectedKey = '';
  private decorationSource = new Map<string, Piece>();
  private model: T.Group;

  constructor(model: T.Group) {
    this.model = model;
    this.root.name = 'KyntriX Mechanism Hardware Breakdown';
    this.partOrder = model.children.map((g) => String(g.userData.id));
    model.updateWorldMatrix(true, true);

    const sources: T.Mesh[] = [];
    model.traverse((o) => {
      if (o instanceof T.Mesh && !o.userData.excludeFromExplosion) sources.push(o);
    });

    let serial = 0;
    const labelCounts = new Map<string, number>();

    for (const source of sources) {
      const mat = (source.material as T.MeshStandardMaterial).clone();
      mat.clippingPlanes = [];
      mat.emissive.setHex(0);
      mat.emissiveIntensity = 0;
      this.materials.push(mat);

      const count = source instanceof T.InstancedMesh ? source.count : 1;
      const labelKey = source.userData.part + ':' + (source.userData.pieceName ?? 'Part');
      const row = (labelCounts.get(labelKey) ?? 0) + 1;
      labelCounts.set(labelKey, row);

      const batch = new T.InstancedMesh(source.geometry, mat, count);
      batch.frustumCulled = false;
      batch.castShadow = false;
      batch.receiveShadow = false;
      batch.instanceMatrix.setUsage(T.DynamicDrawUsage);
      batch.userData.pieceIds = [];
      this.root.add(batch);
      this.batches.push(batch);

      source.geometry.computeBoundingBox();
      const box = source.geometry.boundingBox?.clone() ?? new T.Box3();

      for (let i = 0; i < count; i++) {
        const part = String(source.userData.part);
        const name = String(source.userData.pieceName ?? 'Component');
        const p: Piece = {
          id: `${part}:${serial++}`,
          part,
          name:
            count > 1
              ? `${name} ${String(i + 1).padStart(2, '0')}`
              : name,
          source,
          sourceIndex: i,
          batch,
          index: i,
          home: new T.Matrix4(),
          homePosition: new T.Vector3(),
          homeQuaternion: new T.Quaternion(),
          homeScale: new T.Vector3(),
          targetPosition: new T.Vector3(),
          spreadPosition: new T.Vector3(),
          targetQuaternion: new T.Quaternion(),
          localCenter: box.getCenter(new T.Vector3()),
          localBox: box.clone(),
          displayBox: new T.Box3(),
          visible: true,
          current: new T.Matrix4(),
          transitionFrom: new T.Matrix4(),
        };
        batch.userData.pieceIds.push(p.id);
        batch.setColorAt(i, new T.Color(0xffffff));
        this.pieces.push(p);
        this.lookup.set(p.id, p);
        if (!(source instanceof T.InstancedMesh)) {
          this.decorationSource.set(source.uuid, p);
        }
      }
    }

    for (const p of this.pieces) {
      const attached = p.source.userData.attachTo;
      if (attached) {
        p.attachment = this.decorationSource.get(attached);
      }
    }

    this.captureHome();
    this.root.visible = false;
  }

  get count() {
    return this.pieces.filter((p) => !p.attachment).length;
  }

  get visibleCount() {
    return this.pieces.filter((p) => !p.attachment && p.visible).length;
  }

  captureHome() {
    this.model.updateWorldMatrix(true, true);
    for (const p of this.pieces) {
      if (p.source instanceof T.InstancedMesh) {
        p.source.getMatrixAt(p.sourceIndex, this.temporary);
        p.home.multiplyMatrices(p.source.matrixWorld, this.temporary);
      } else {
        p.home.copy(p.source.matrixWorld);
      }
      p.home.decompose(p.homePosition, p.homeQuaternion, p.homeScale);

      const center = p.localCenter.clone().applyMatrix4(p.home);
      const group = this.partOrder.indexOf(p.part);
      const angle = (group / Math.max(1, this.partOrder.length)) * Math.PI * 2;
      const amount = 0.85;

      p.spreadPosition
        .copy(p.homePosition)
        .add(
          new T.Vector3(
            (center.x - 0.25) * 0.38,
            center.y * 0.3 + Math.sin(angle) * amount,
            center.z * 0.3 + Math.cos(angle) * amount
          )
        );
      p.current.copy(p.home);
      p.transitionFrom.copy(p.home);
    }
  }

  layout(options: ExplosionOptions) {
    for (const p of this.pieces) {
      if (!p.visible) {
        p.transitionFrom.copy(p.home);
      } else {
        p.transitionFrom.copy(p.current);
      }
    }
    this.options = options;
    const hidden = new Set(options.hidden);
    const selected = options.isolatedPiece ? this.lookup.get(options.isolatedPiece) : null;

    for (const p of this.pieces) {
      p.visible =
        !hidden.has(p.part) &&
        (!options.isolated || p.part === options.isolated) &&
        (!selected || p === selected || p.attachment === selected);
    }

    const independent = this.pieces.filter((p) => !p.attachment && p.visible);
    const gap = 0.1 + (options.spacing / 100) * 0.55;

    if (options.layout === 'inventory') {
      const faceX = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 2);
      const faceZ = new T.Quaternion();
      const faceY = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);

      for (const p of independent) {
        if (p.source.userData.inventoryFlat) {
          p.targetQuaternion.copy(faceZ);
        } else {
          const e = p.localBox.getSize(new T.Vector3()).multiply(p.homeScale);
          e.set(Math.abs(e.x), Math.abs(e.y), Math.abs(e.z));
          p.targetQuaternion.copy(
            e.x <= e.z && e.x <= e.y ? faceX : e.z <= e.y ? faceZ : faceY
          );
        }
        p.displayBox
          .copy(p.localBox)
          .applyMatrix4(new T.Matrix4().compose(this.zero, p.targetQuaternion, p.homeScale));
      }

      const layout = packInventory(
        independent.map((p) => {
          const size = p.displayBox.getSize(new T.Vector3());
          return { id: p.id, group: p.part, width: size.x, height: size.y };
        }),
        options.aspect,
        gap
      );

      for (const p of independent) {
        const cell = layout.cells.get(p.id)!;
        const center = p.localCenter
          .clone()
          .multiply(p.homeScale)
          .applyQuaternion(p.targetQuaternion);
        p.targetPosition.set(cell.x, cell.y, 0).sub(center);
      }
    } else {
      // Radial explosion layout
      const groups = new Map<string, Piece[]>();
      for (const p of independent) {
        const list = groups.get(p.part) ?? [];
        list.push(p);
        groups.set(p.part, list);
      }

      const order = this.partOrder;
      const spread = 1 + (options.spacing / 100) * 1.6;

      for (const [part, parts] of groups) {
        const axial = (order.indexOf(part) - (order.length - 1) / 2) * 1.5;
        const rows = new Map<string, Piece[]>();
        for (const p of parts) {
          const center = p.localCenter.clone().applyMatrix4(p.home);
          const key = (Math.round(center.x * 12) / 12).toFixed(2);
          const row = rows.get(key) ?? [];
          row.push(p);
          rows.set(key, row);
        }

        for (const rowParts of rows.values()) {
          const count = rowParts.length;
          rowParts.forEach((p, idx) => {
            const angle = (idx / count) * Math.PI * 2;
            const radius = (1.8 + (order.indexOf(part) % 3) * 0.4) * spread;
            p.targetQuaternion.copy(p.homeQuaternion);
            p.targetPosition
              .copy(p.homePosition)
              .add(
                new T.Vector3(
                  axial * spread,
                  Math.sin(angle) * radius,
                  Math.cos(angle) * radius
                )
              );
          });
        }
      }
    }
  }

  update(amount: number, blend = 1) {
    const fraction = T.MathUtils.clamp(amount, 0, 1);

    for (const p of this.pieces) {
      if (p.attachment) {
        if (p.visible && p.attachment.visible) {
          p.current.multiplyMatrices(p.attachment.current, p.home);
        } else {
          p.current.makeScale(0, 0, 0);
        }
        p.batch.setMatrixAt(p.index, p.current);
        continue;
      }

      if (!p.visible) {
        p.current.makeScale(0, 0, 0);
        p.batch.setMatrixAt(p.index, p.current);
        continue;
      }

      // 0 to 0.45: loosening assembly
      // 0.45 to 1.0: spreading into final layout
      if (fraction <= 0.45) {
        const t = fraction / 0.45;
        this.position.lerpVectors(p.homePosition, p.spreadPosition, t);
        this.quaternion.copy(p.homeQuaternion);
      } else {
        const t = (fraction - 0.45) / 0.55;
        this.position.lerpVectors(p.spreadPosition, p.targetPosition, t);
        this.quaternion.slerpQuaternions(p.homeQuaternion, p.targetQuaternion, t);
      }

      this.temporary.compose(this.position, this.quaternion, p.homeScale);
      if (blend < 1) {
        p.transitionFrom.decompose(this.transitionPos, this.transitionQuat, this.transitionScale);
        this.blendPos.lerpVectors(this.transitionPos, this.position, blend);
        this.blendQuat.slerpQuaternions(this.transitionQuat, this.quaternion, blend);
        p.current.compose(this.blendPos, this.blendQuat, p.homeScale);
      } else {
        p.current.copy(this.temporary);
      }

      p.batch.setMatrixAt(p.index, p.current);
    }

    for (const batch of this.batches) {
      batch.instanceMatrix.needsUpdate = true;
    }
  }

  highlight(selectedPart: string | null, selectedPiece: string | null) {
    const key = `${selectedPart ?? ''}:${selectedPiece ?? ''}`;
    if (key === this.selectedKey) return;
    this.selectedKey = key;

    for (const p of this.pieces) {
      const isSelected =
        (selectedPiece && p.id === selectedPiece) ||
        (!selectedPiece && selectedPart && p.part === selectedPart);

      p.batch.setColorAt(
        p.index,
        isSelected
          ? new T.Color(0xf59e0b) // Bright amber highlight
          : new T.Color(0xffffff)
      );
    }

    for (const batch of this.batches) {
      if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
    }
  }

  pick(raycaster: T.Raycaster): PieceInfo | null {
    const hits = raycaster.intersectObjects(this.batches, false);
    for (const hit of hits) {
      const batch = hit.object as T.InstancedMesh;
      if (hit.instanceId !== undefined) {
        const pieceId = batch.userData.pieceIds?.[hit.instanceId];
        const piece = this.lookup.get(pieceId);
        if (piece && piece.visible) {
          return {
            id: piece.id,
            part: piece.part,
            name: piece.name,
          };
        }
      }
    }
    return null;
  }

  get currentOptions(): ExplosionOptions {
    return this.options;
  }

  fit(_amount: number, aspect: number) {
    this.frameBox.makeEmpty();
    const point = new T.Vector3();

    for (const p of this.pieces) {
      if (!p.visible || p.attachment) continue;
      point.setFromMatrixPosition(p.current);
      this.frameBox.expandByPoint(point);
    }

    const center = this.frameBox.getCenter(new T.Vector3());
    const size = this.frameBox.getSize(new T.Vector3());
    const distance =
      Math.max(
        12,
        Math.max(size.y, size.x / Math.max(0.4, aspect)) * 1.8 + size.z * 1.2
      );

    return {
      bounds: this.frameBox,
      center,
      distance,
    };
  }

  dispose() {
    for (const mat of this.materials) {
      mat.dispose();
    }
    for (const batch of this.batches) {
      this.root.remove(batch);
    }
    this.pieces.length = 0;
    this.lookup.clear();
  }
}
