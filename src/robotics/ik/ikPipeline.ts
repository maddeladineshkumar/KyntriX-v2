import type { RobotDefinition } from '../../data/schema/robotSchema';
import { Matrix4 } from '../math/Matrix4';
import type { IKOptions, IKPipelineResult, IKSingleSolution } from './types';
import { solve3RPlanar } from './analytical3R';
import { hasSphericalWrist, solve6RSpherical } from './analytical6R';
import { isSCARARobot, solveSCARA } from './analyticalSCARA';
import { solveNumericalIK } from './numericalIK';

/**
 * Check if robot is a standard 3R planar manipulator
 */
function is3RPlanar(robot: RobotDefinition): boolean {
  if (robot.dof !== 3) return false;
  return robot.joints.every((j) => Math.abs(j.alpha) < 1e-4 && j.type === 'revolute');
}

/**
 * Check if two joint angle vectors are effectively identical modulo 2pi
 */
function areSolutionsEqual(q1: number[], q2: number[], tol = 1e-2): boolean {
  if (q1.length !== q2.length) return false;
  for (let i = 0; i < q1.length; i++) {
    const diff = Math.abs(Math.atan2(Math.sin(q1[i] - q2[i]), Math.cos(q1[i] - q2[i])));
    if (diff > tol) return false;
  }
  return true;
}

/**
 * Generate heuristic starting seeds for multi-branch exploration
 */
function generateBranchSeeds(robot: RobotDefinition, baseGuess: number[]): number[][] {
  const seeds: number[][] = [baseGuess];
  if (robot.dof >= 3) {
    const j0 = robot.joints[0];
    const j2 = robot.joints[2];

    const alt0 =
      j0.type === 'revolute'
        ? Math.atan2(Math.sin(baseGuess[0] + Math.PI), Math.cos(baseGuess[0] + Math.PI))
        : j0.min + (j0.max - j0.min) * 0.75;

    const alt2 =
      j2.type === 'revolute'
        ? -baseGuess[2]
        : j2.min + (j2.max - j2.min) * 0.25;

    // Shoulder alternate
    const s1 = [...baseGuess];
    s1[0] = alt0;
    seeds.push(s1);

    // Elbow alternate
    const s2 = [...baseGuess];
    s2[2] = alt2;
    seeds.push(s2);

    // Shoulder + Elbow alternate
    const s3 = [...baseGuess];
    s3[0] = alt0;
    s3[2] = alt2;
    seeds.push(s3);
  }

  if (robot.dof >= 6) {
    const j3 = robot.joints[3];
    const j4 = robot.joints[4];
    const j5 = robot.joints[5];

    // Wrist flip: only apply angular flip if joints are revolute
    const baseCount = seeds.length;
    for (let i = 0; i < baseCount; i++) {
      const flipped = [...seeds[i]];
      if (j3.type === 'revolute') {
        flipped[3] = Math.atan2(Math.sin(flipped[3] + Math.PI), Math.cos(flipped[3] + Math.PI));
      }
      if (j4.type === 'revolute') {
        flipped[4] = -flipped[4];
      }
      if (j5.type === 'revolute') {
        flipped[5] = Math.atan2(Math.sin(flipped[5] + Math.PI), Math.cos(flipped[5] + Math.PI));
      }
      seeds.push(flipped);
    }
  }

  // Clamp all seed values to valid joint limits
  for (const seed of seeds) {
    for (let j = 0; j < robot.dof; j++) {
      const joint = robot.joints[j];
      seed[j] = Math.max(joint.min, Math.min(joint.max, seed[j]));
    }
  }

  return seeds;
}


/**
 * Authoritative Inverse Kinematics Pipeline
 * Dispatches to analytical or numerical solvers and validates every solution with FK.
 */
export function solveIK(
  robot: RobotDefinition,
  target: Matrix4,
  options: IKOptions = {}
): IKPipelineResult {
  const elements = target.elements;
  for (let i = 0; i < 16; i++) {
    if (!Number.isFinite(elements[i])) {
      return {
        target,
        solutions: [],
        bestSolution: null,
        converged: false,
        computationTimeMs: 0,
        allTestedBranches: 0,
        failureReason: 'Target matrix contains non-finite values (NaN or Infinity).',
      };
    }
  }

  const startTime = performance.now();
  const allCandidateSolutions: IKSingleSolution[] = [];

  // 1. Try Analytical 3R Planar Solver if applicable
  if (is3RPlanar(robot)) {
    const planarSolutions = solve3RPlanar(robot, target, options.currentJoints);
    for (const sol of planarSolutions) {
      if (sol.converged) {
        allCandidateSolutions.push(sol);
      }
    }
  }

  // 2. Try Analytical SCARA (4-DOF) Solver if applicable
  if (isSCARARobot(robot)) {
    const scaraSolutions = solveSCARA(robot, target, options.currentJoints);
    for (const sol of scaraSolutions) {
      if (sol.converged) {
        allCandidateSolutions.push(sol);
      }
    }
  }

  // 3. Try Analytical 6R Spherical Wrist Solver if applicable
  if (hasSphericalWrist(robot)) {
    const sphericalSolutions = solve6RSpherical(robot, target, options.currentJoints);
    for (const sol of sphericalSolutions) {
      if (sol.converged) {
        allCandidateSolutions.push(sol);
      }
    }
  }

  // 3. Numerical DLS Solver
  // Only run heavy numerical branch exploration if no valid analytical solutions were found
  const hasAnalytical = allCandidateSolutions.some((s) => s.converged);

  const defaultInitial =
    options.initialGuess ??
    options.currentJoints ??
    robot.joints.map((j) => (j.home !== undefined ? j.home : (j.min + j.max) / 2));

  let branchCount = allCandidateSolutions.length;

  if (!hasAnalytical) {
    // Run primary numerical solve
    const primarySol = solveNumericalIK(robot, target, {
      ...options,
      initialGuess: defaultInitial,
    });
    allCandidateSolutions.push(primarySol);
    branchCount = 1;

    // Multi-branch exploration if requested or if primary failed
    const exploreBranches = options.returnAllBranches ?? (!primarySol.converged && robot.dof >= 3);

    if (exploreBranches) {
      const seeds = generateBranchSeeds(robot, defaultInitial);
      branchCount += seeds.length;

      for (const seed of seeds) {
        // Skip seed if already identical to defaultInitial
        if (areSolutionsEqual(seed, defaultInitial, 1e-4)) continue;

        const branchSol = solveNumericalIK(robot, target, {
          ...options,
          maxIterations: options.maxIterations ?? 60,
          initialGuess: seed,
        });

        if (branchSol.converged) {
          // Check uniqueness
          const isDuplicate = allCandidateSolutions.some((existing) =>
            areSolutionsEqual(existing.q, branchSol.q)
          );
          if (!isDuplicate) {
            allCandidateSolutions.push(branchSol);
          }
        }
      }
    }
  }

  // Filter and deduplicate
  const uniqueSolutions: IKSingleSolution[] = [];
  for (const sol of allCandidateSolutions) {
    const exists = uniqueSolutions.some((u) => areSolutionsEqual(u.q, sol.q));
    if (!exists) {
      uniqueSolutions.push(sol);
    }
  }

  // Sort solutions by cost (lowest cost first: converged, within limits, closest to currentJoints)
  uniqueSolutions.sort((a, b) => a.cost - b.cost);

  const bestSolution = uniqueSolutions.find((s) => s.converged && s.withinLimits) ??
    uniqueSolutions.find((s) => s.converged) ??
    uniqueSolutions[0] ??
    null;

  const totalTime = performance.now() - startTime;

  return {
    target,
    solutions: uniqueSolutions,
    bestSolution,
    converged: bestSolution !== null && bestSolution.converged,
    computationTimeMs: totalTime,
    allTestedBranches: branchCount,
  };
}
