import type { RobotDefinition } from '../data/schema/robotSchema';
import { Matrix4 } from '../robotics/math/Matrix4';

export interface WorkspaceSampleResult {
  points: { x: number; y: number; z: number }[];
  totalPoints: number;
  effectiveResolution: number;
  bbox: {
    min: [number, number, number];
    max: [number, number, number];
    dimensions: [number, number, number];
  };
  durationMs: number;
}

export interface WorkspaceWorkerRequest {
  id: number;
  robot: RobotDefinition;
  resolution: number;
}

export interface WorkspaceWorkerProgress {
  id: number;
  type: 'progress';
  percent: number;
}

export interface WorkspaceWorkerResponse {
  id: number;
  type: 'result';
  result: WorkspaceSampleResult;
}

export const MAX_WORKSPACE_POINTS = 500000;

function rehydrateRobot(robot: RobotDefinition): RobotDefinition {
  if (!robot) return robot;
  const rehydrated = { ...robot };
  if (rehydrated.baseTransform && !(rehydrated.baseTransform instanceof Matrix4)) {
    const elems = (rehydrated.baseTransform as any).elements ?? rehydrated.baseTransform;
    rehydrated.baseTransform = Matrix4.fromArray(Array.isArray(elems) ? elems : Array.from(elems));
  }
  if (rehydrated.endEffectorOffset && !(rehydrated.endEffectorOffset instanceof Matrix4)) {
    const elems = (rehydrated.endEffectorOffset as any).elements ?? rehydrated.endEffectorOffset;
    rehydrated.endEffectorOffset = Matrix4.fromArray(Array.isArray(elems) ? elems : Array.from(elems));
  }
  return rehydrated;
}

function multiplyInPlace(out: Float64Array, a: Float64Array, b: Float64Array): void {
  for (let r = 0; r < 4; r++) {
    const rIdx = r * 4;
    for (let c = 0; c < 4; c++) {
      out[rIdx + c] =
        a[rIdx + 0] * b[0 + c] +
        a[rIdx + 1] * b[4 + c] +
        a[rIdx + 2] * b[8 + c] +
        a[rIdx + 3] * b[12 + c];
    }
  }
}

function fillStandardDH(out: Float64Array, theta: number, d: number, a: number, alpha: number): void {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  out[0] = ct;      out[1] = -st * ca;  out[2] = st * sa;   out[3] = a * ct;
  out[4] = st;      out[5] = ct * ca;   out[6] = -ct * sa;  out[7] = a * st;
  out[8] = 0;       out[9] = sa;        out[10] = ca;       out[11] = d;
  out[12] = 0;      out[13] = 0;        out[14] = 0;        out[15] = 1;
}

function fillModifiedDH(out: Float64Array, theta: number, d: number, a: number, alpha: number): void {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  out[0] = ct;      out[1] = -st;       out[2] = 0;         out[3] = a;
  out[4] = st * ca; out[5] = ct * ca;   out[6] = -sa;       out[7] = -d * sa;
  out[8] = st * sa; out[9] = ct * sa;   out[10] = ca;       out[11] = d * ca;
  out[12] = 0;      out[13] = 0;        out[14] = 0;        out[15] = 1;
}

/**
 * Lightweight Forward Kinematics translation helper computing only EE position without full frame allocations.
 */
export function computeFKPositionOnly(
  robot: RobotDefinition,
  q: number[]
): { x: number; y: number; z: number } {
  const activeRobot = rehydrateRobot(robot);
  const isStandard = activeRobot.dhConvention === 'standard';
  let curT = activeRobot.baseTransform
    ? new Float64Array(activeRobot.baseTransform.elements)
    : new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  const aBuf = new Float64Array(16);
  const nextT = new Float64Array(16);

  for (let i = 0; i < activeRobot.joints.length; i++) {
    const j = activeRobot.joints[i];
    const qi = q[i] ?? 0;
    const theta = j.type === 'revolute' ? j.theta + qi + j.offset : j.theta;
    const d = j.type === 'prismatic' ? j.d + qi + j.offset : j.d;

    if (isStandard) {
      fillStandardDH(aBuf, theta, d, j.a, j.alpha);
    } else {
      fillModifiedDH(aBuf, theta, d, j.a, j.alpha);
    }

    multiplyInPlace(nextT, curT, aBuf);
    curT.set(nextT);
  }

  if (activeRobot.endEffectorOffset) {
    const eeOffsetBuf = new Float64Array(activeRobot.endEffectorOffset.elements);
    multiplyInPlace(nextT, curT, eeOffsetBuf);
    return { x: nextT[3], y: nextT[7], z: nextT[11] };
  }

  return { x: curT[3], y: curT[7], z: curT[11] };
}

/**
 * Core pure function to sample workspace reachable points by forward kinematics grid.
 * Can be called synchronously or inside a Web Worker.
 * Uses stack-based matrix evaluation to eliminate transient object allocations in inner loop.
 */
export function sampleWorkspace(
  rawRobot: RobotDefinition,
  requestedResolution: number = 15,
  onProgress?: (percent: number) => void,
  maxPoints: number = MAX_WORKSPACE_POINTS
): WorkspaceSampleResult {
  const startTime = performance.now();
  const robot = rehydrateRobot(rawRobot);
  const n = robot.joints.length;

  if (n === 0) {
    return {
      points: [],
      totalPoints: 0,
      effectiveResolution: requestedResolution,
      bbox: { min: [0, 0, 0], max: [0, 0, 0], dimensions: [0, 0, 0] },
      durationMs: 0,
    };
  }

  // PRD §48: Limit sampling to a maximum of 500,000 points to prevent browser freeze.
  // If resolution would produce more, auto-reduce it.
  let effectiveResolution = requestedResolution;
  if (Math.pow(requestedResolution, n) > maxPoints) {
    effectiveResolution = Math.max(2, Math.floor(Math.pow(maxPoints, 1 / n)));
  }

  // Pre-generate steps for each joint
  const jointSteps: number[][] = robot.joints.map((joint) => {
    const steps: number[] = [];
    const min = joint.min;
    const max = joint.max;
    if (effectiveResolution <= 1 || Math.abs(max - min) < 1e-9) {
      steps.push((min + max) / 2);
    } else {
      const stepSize = (max - min) / (effectiveResolution - 1);
      for (let k = 0; k < effectiveResolution; k++) {
        steps.push(min + k * stepSize);
      }
    }
    return steps;
  });

  const totalPoints = jointSteps.reduce((acc, s) => acc * s.length, 1);
  const points: { x: number; y: number; z: number }[] = [];

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  let evaluatedCount = 0;
  let lastReportedPercent = 0;

  const isStandard = robot.dhConvention === 'standard';

  // Pre-allocate stack matrices for zero GC pressure during traversal
  // stack[k] represents accumulated transform from base up to joint k
  const stack: Float64Array[] = new Array(n + 1);
  for (let k = 0; k <= n; k++) {
    stack[k] = new Float64Array(16);
  }

  if (robot.baseTransform) {
    stack[0].set(robot.baseTransform.elements);
  } else {
    stack[0].set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  const aBuf = new Float64Array(16);
  const eeBuf = new Float64Array(16);
  const hasEeOffset = Boolean(robot.endEffectorOffset);
  const eeOffsetBuf = hasEeOffset ? new Float64Array(robot.endEffectorOffset!.elements) : null;

  function recurse(jointIdx: number) {
    if (jointIdx === n) {
      let px: number;
      let py: number;
      let pz: number;

      if (hasEeOffset && eeOffsetBuf) {
        multiplyInPlace(eeBuf, stack[n], eeOffsetBuf);
        px = eeBuf[3];
        py = eeBuf[7];
        pz = eeBuf[11];
      } else {
        px = stack[n][3];
        py = stack[n][7];
        pz = stack[n][11];
      }

      points.push({ x: px, y: py, z: pz });

      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      if (pz < minZ) minZ = pz;
      if (pz > maxZ) maxZ = pz;

      evaluatedCount++;
      if (onProgress && evaluatedCount % 500 === 0) {
        const pct = Math.floor((evaluatedCount / totalPoints) * 100);
        if (pct > lastReportedPercent) {
          lastReportedPercent = pct;
          onProgress(pct);
        }
      }
      return;
    }

    const joint = robot.joints[jointIdx];
    const steps = jointSteps[jointIdx];
    const isRevolute = joint.type === 'revolute';

    for (let s = 0; s < steps.length; s++) {
      const qVal = steps[s];
      const theta = isRevolute ? joint.theta + qVal + joint.offset : joint.theta;
      const d = !isRevolute ? joint.d + qVal + joint.offset : joint.d;

      if (isStandard) {
        fillStandardDH(aBuf, theta, d, joint.a, joint.alpha);
      } else {
        fillModifiedDH(aBuf, theta, d, joint.a, joint.alpha);
      }

      multiplyInPlace(stack[jointIdx + 1], stack[jointIdx], aBuf);
      recurse(jointIdx + 1);
    }
  }

  recurse(0);

  if (onProgress) {
    onProgress(100);
  }

  const durationMs = performance.now() - startTime;

  if (points.length === 0) {
    minX = minY = minZ = maxX = maxY = maxZ = 0;
  }

  return {
    points,
    totalPoints: points.length,
    effectiveResolution,
    bbox: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
      dimensions: [maxX - minX, maxY - minY, maxZ - minZ],
    },
    durationMs,
  };
}

// Web Worker message listener for browser multithreading
if (typeof self !== 'undefined' && 'onmessage' in self) {
  self.onmessage = (e: MessageEvent<WorkspaceWorkerRequest>) => {
    const { id, robot, resolution } = e.data;
    try {
      const activeRobot = rehydrateRobot(robot);
      const result = sampleWorkspace(activeRobot, resolution, (percent) => {
        self.postMessage({ id, type: 'progress', percent } as WorkspaceWorkerProgress);
      });
      self.postMessage({ id, type: 'result', result } as WorkspaceWorkerResponse);
    } catch (err) {
      console.error('Workspace worker computation error:', err);
    }
  };
}
