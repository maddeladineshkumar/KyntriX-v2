import { forwardKinematics } from '../robotics/kinematics/forwardKinematics';
import type { RobotDefinition } from '../data/schema/robotSchema';

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

/**
 * Core pure function to sample workspace reachable points by forward kinematics grid.
 * Can be called synchronously or inside a Web Worker.
 */
export function sampleWorkspace(
  robot: RobotDefinition,
  requestedResolution: number = 15,
  onProgress?: (percent: number) => void,
  maxPoints: number = MAX_WORKSPACE_POINTS
): WorkspaceSampleResult {
  const startTime = performance.now();
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

  const currentQ: number[] = new Array(n).fill(0);
  let evaluatedCount = 0;
  let lastReportedPercent = 0;

  function recurse(jointIdx: number) {
    if (jointIdx === n) {
      const fk = forwardKinematics(robot, currentQ);
      const pos = fk.endEffectorTransform.getPosition();

      points.push({ x: pos.x, y: pos.y, z: pos.z });

      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
      if (pos.z < minZ) minZ = pos.z;
      if (pos.z > maxZ) maxZ = pos.z;

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

    const steps = jointSteps[jointIdx];
    for (let s = 0; s < steps.length; s++) {
      currentQ[jointIdx] = steps[s];
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
      const result = sampleWorkspace(robot, resolution, (percent) => {
        self.postMessage({ id, type: 'progress', percent } as WorkspaceWorkerProgress);
      });
      self.postMessage({ id, type: 'result', result } as WorkspaceWorkerResponse);
    } catch (err) {
      console.error('Workspace worker computation error:', err);
    }
  };
}
