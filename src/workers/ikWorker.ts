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
}

export interface IKWorkerResponse {
  id: number;
  result: SerializedIKResult;
}

self.onmessage = (e: MessageEvent<IKWorkerRequest>) => {
  const { id, robot, targetElements, options } = e.data;
  try {
    const target = new Matrix4(targetElements);
    const result = solveIK(robot, target, options);

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
