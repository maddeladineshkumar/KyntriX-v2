import { solveIK } from '../robotics/ik/ikPipeline';
import type { RobotDefinition } from '../data/schema/robotSchema';
import type { IKOptions, IKSingleSolution } from '../robotics/ik/types';
import { Matrix4 } from '../robotics/math/Matrix4';

export interface IKWorkerRequest {
  id: number;
  robot: RobotDefinition;
  targetElements: number[];
  options?: IKOptions;
}

export interface SerializedIKResult {
  targetElements: number[];
  solutions: IKSingleSolution[];
  bestSolution: IKSingleSolution | null;
  converged: boolean;
  computationTimeMs: number;
  allTestedBranches: number;
  failureReason?: string;
  isPositionReachable?: boolean;
  isOrientationReachable?: boolean;
  reachabilityStatus?: string;
  isSingular?: boolean;
}

export interface IKWorkerResponse {
  id: number;
  result: SerializedIKResult;
}

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

self.onmessage = (e: MessageEvent<IKWorkerRequest>) => {
  const { id, robot, targetElements, options } = e.data;
  try {
    const target = new Matrix4(targetElements);
    const activeRobot = rehydrateRobot(robot);
    const result = solveIK(activeRobot, target, options);

    const response: IKWorkerResponse = {
      id,
      result: {
        targetElements: Array.from(result.target.elements),
        solutions: result.solutions,
        bestSolution: result.bestSolution,
        converged: result.converged,
        computationTimeMs: result.computationTimeMs,
        allTestedBranches: result.allTestedBranches,
        failureReason: result.failureReason,
        isPositionReachable: result.isPositionReachable,
        isOrientationReachable: result.isOrientationReachable,
        reachabilityStatus: result.reachabilityStatus,
        isSingular: result.isSingular,
      },
    };

    self.postMessage(response);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const response: IKWorkerResponse = {
      id,
      result: {
        targetElements: targetElements,
        solutions: [],
        bestSolution: null,
        converged: false,
        computationTimeMs: 0,
        allTestedBranches: 0,
        failureReason: `Internal IK Worker error: ${errorMsg}`,
      },
    };
    self.postMessage(response);
  }
};
