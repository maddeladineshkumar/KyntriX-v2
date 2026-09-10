import type { RobotDefinition } from '../../data/schema/robotSchema';
import { Matrix4 } from '../math/Matrix4';
import type { IKOptions, IKPipelineResult, IKSingleSolution, ReachabilityStatus } from './types';
import { solve3RPlanar } from './analytical3R';
import { hasSphericalWrist, solve6RSpherical } from './analytical6R';
import { isSCARARobot, solveSCARA } from './analyticalSCARA';
import { solveNumericalIK } from './numericalIK';
import { forwardKinematics } from '../kinematics/forwardKinematics';

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
  const seeds: number[][] = [[...baseGuess]];

  // 1. Robot home pose
  const homeSeed = robot.joints.map((j) => (j.home !== undefined ? j.home : (j.min + j.max) / 2));
  seeds.push(homeSeed);

  // 2. Robot midpoint pose
  const midSeed = robot.joints.map((j) => (j.min + j.max) / 2);
  seeds.push(midSeed);

  // 3. Alternate configurations along individual degrees of freedom (up to 6)
  const maxDofToVary = Math.min(robot.dof, 6);
  for (let i = 0; i < maxDofToVary; i++) {
    const joint = robot.joints[i];
    const sPlus = [...baseGuess];
    const sMinus = [...baseGuess];
    const sQuarter = [...baseGuess];
    const sThreeQuarter = [...baseGuess];

    if (joint.type === 'revolute') {
      sPlus[i] = Math.atan2(Math.sin(baseGuess[i] + Math.PI), Math.cos(baseGuess[i] + Math.PI));
      sMinus[i] = -baseGuess[i];
      sQuarter[i] = joint.min + (joint.max - joint.min) * 0.25;
      sThreeQuarter[i] = joint.min + (joint.max - joint.min) * 0.75;
      seeds.push(sPlus, sMinus, sQuarter, sThreeQuarter);
    } else {
      sQuarter[i] = joint.min + (joint.max - joint.min) * 0.25;
      sThreeQuarter[i] = joint.min + (joint.max - joint.min) * 0.75;
      seeds.push(sQuarter, sThreeQuarter);
    }
  }

  // 4. Combined primary arm variations (joints 0, 1, 2 if available)
  if (robot.dof >= 2) {
    const sComb1 = [...baseGuess];
    const sComb2 = [...baseGuess];
    for (let i = 0; i < Math.min(robot.dof, 3); i++) {
      const joint = robot.joints[i];
      if (joint.type === 'revolute') {
        sComb1[i] = i % 2 === 0 ? baseGuess[i] + Math.PI : -baseGuess[i];
        sComb2[i] = i % 2 === 0 ? -baseGuess[i] : baseGuess[i] + Math.PI;
      } else {
        sComb1[i] = joint.min + (joint.max - joint.min) * 0.25;
        sComb2[i] = joint.min + (joint.max - joint.min) * 0.75;
      }
    }
    seeds.push(sComb1, sComb2);
  }

  // 5. Wrist flips for spherical/orientational joints (joints >= 3)
  if (robot.dof >= 5) {
    const flipWrist1 = [...baseGuess];
    const flipWrist2 = [...homeSeed];
    for (let i = 3; i < robot.dof; i++) {
      const joint = robot.joints[i];
      if (joint.type === 'revolute') {
        flipWrist1[i] = Math.atan2(Math.sin(baseGuess[i] + Math.PI), Math.cos(baseGuess[i] + Math.PI));
        flipWrist2[i] = -homeSeed[i];
      }
    }
    seeds.push(flipWrist1, flipWrist2);
  }

  // 6. Systematic quarter and three-quarter grids across all joints
  seeds.push(robot.joints.map((j) => j.min + (j.max - j.min) * 0.25));
  seeds.push(robot.joints.map((j) => j.min + (j.max - j.min) * 0.75));
  seeds.push(robot.joints.map((j, idx) => (idx % 2 === 0 ? j.min + (j.max - j.min) * 0.3 : j.min + (j.max - j.min) * 0.7)));
  seeds.push(robot.joints.map((j, idx) => (idx % 2 === 0 ? j.min + (j.max - j.min) * 0.7 : j.min + (j.max - j.min) * 0.3)));

  // Clamp all seeds to joint limits and deduplicate
  const validSeeds: number[][] = [];
  for (const s of seeds) {
    const clamped = s.map((val, j) => {
      const joint = robot.joints[j];
      return Math.max(joint.min, Math.min(joint.max, val));
    });
    if (!validSeeds.some((existing) => areSolutionsEqual(existing, clamped, 1e-3))) {
      validSeeds.push(clamped);
    }
  }

  return validSeeds;
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
        isPositionReachable: false,
        isOrientationReachable: false,
        reachabilityStatus: 'outside-workspace',
        isSingular: false,
      };
    }
  }

  const startTime = performance.now();

  // Early geometric check: target outside maximum theoretical kinematic reach
  let maxTheoreticalReach = 0;
  for (const j of robot.joints) {
    maxTheoreticalReach += Math.abs(j.a);
    if (j.type === 'prismatic') {
      maxTheoreticalReach += Math.abs(j.d) + Math.max(Math.abs(j.min), Math.abs(j.max)) + Math.abs(j.offset ?? 0);
    } else {
      maxTheoreticalReach += Math.abs(j.d);
    }
  }
  if (robot.endEffectorOffset) {
    maxTheoreticalReach += robot.endEffectorOffset.getPosition().norm();
  }

  let targetPos = target.getPosition();
  if (robot.baseTransform) {
    targetPos = robot.baseTransform.rigidInverse().multiply(target).getPosition();
  }

  if (targetPos.norm() > maxTheoreticalReach + 0.05) {
    const defaultInitial =
      options.initialGuess ??
      options.currentJoints ??
      robot.joints.map((j) => (j.home !== undefined ? j.home : (j.min + j.max) / 2));
    const fkAtInitial = forwardKinematics(robot, defaultInitial);
    const posErr = fkAtInitial.endEffectorTransform.getPosition().subtract(target.getPosition()).norm();
    const unconvSol: IKSingleSolution = {
      q: [...defaultInitial],
      converged: false,
      iterations: 0,
      positionError: posErr,
      orientationError: Math.PI,
      withinLimits: true,
      manipulability: 0,
      conditionNumber: Infinity,
      rank: 0,
      isSingular: false,
      cost: Infinity,
      solverType: 'numerical-dls',
    };

    return {
      target,
      solutions: [unconvSol],
      bestSolution: null,
      converged: false,
      computationTimeMs: performance.now() - startTime,
      allTestedBranches: 0,
      failureReason: 'Target unreachable: outside maximum physical workspace reach.',
      isPositionReachable: false,
      isOrientationReachable: false,
      reachabilityStatus: 'outside-workspace',
      isSingular: false,
    };
  }

  const allCandidateSolutions: IKSingleSolution[] = [];
  let analyticalFound = false;

  // Analytical solvers enforce strict orientation matching. When positionOnly is requested,
  // we bypass orientation-locked analytical solvers and solve position reachability via numerical DLS.
  if (!options.positionOnly) {
    // 1. Try Analytical 3R Planar Solver if applicable
    if (is3RPlanar(robot)) {
      const planarSolutions = solve3RPlanar(robot, target, options.currentJoints);
      if (planarSolutions.length > 0) {
        analyticalFound = true;
        for (const sol of planarSolutions) {
          allCandidateSolutions.push(sol);
        }
      }
    }

    // 2. Try Analytical SCARA (4-DOF) Solver if applicable
    if (isSCARARobot(robot)) {
      const scaraSolutions = solveSCARA(robot, target, options.currentJoints);
      if (scaraSolutions.length > 0) {
        analyticalFound = true;
        for (const sol of scaraSolutions) {
          allCandidateSolutions.push(sol);
        }
      }
    }

    // 3. Try Analytical 6R Spherical Wrist Solver if applicable
    if (hasSphericalWrist(robot)) {
      const sphericalSolutions = solve6RSpherical(robot, target, options.currentJoints);
      for (const sol of sphericalSolutions) {
        allCandidateSolutions.push(sol);
      }
      // Only suppress numerical DLS fallback if at least one analytical spherical solution is converged and within limits
      if (sphericalSolutions.some((s) => s.converged && s.withinLimits)) {
        analyticalFound = true;
      }
    }
  }

  // Numerical DLS Solver
  // Runs if no analytical solver was applicable, or if analytical 6R failed to find a valid solution within limits
  const hasAnalytical = analyticalFound;

  const defaultInitial =
    options.initialGuess ??
    options.currentJoints ??
    robot.joints.map((j) => (j.home !== undefined ? j.home : (j.min + j.max) / 2));

  let branchCount = allCandidateSolutions.length;

  if (!hasAnalytical) {
    // Run primary numerical solve (auto-enable null-space joint limit avoidance for redundant manipulators)
    const primarySol = solveNumericalIK(robot, target, {
      ...options,
      initialGuess: defaultInitial,
      enableNullSpace: options.enableNullSpace ?? (robot.dof > 6),
    });
    allCandidateSolutions.push(primarySol);
    branchCount = 1;

    // Multi-branch exploration if requested or if primary failed
    const exploreBranches = options.returnAllBranches ?? (!primarySol.converged && robot.dof >= 1);

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
          enableNullSpace: options.enableNullSpace ?? (robot.dof > 6),
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

  // Filter and deduplicate: preserve the highest quality solution when configurations are equivalent
  const uniqueSolutions: IKSingleSolution[] = [];
  const isPosOnly = options.positionOnly === true;

  for (const sol of allCandidateSolutions) {
    const existingIdx = uniqueSolutions.findIndex((u) => areSolutionsEqual(u.q, sol.q));
    if (existingIdx === -1) {
      uniqueSolutions.push(sol);
    } else {
      const existing = uniqueSolutions[existingIdx];
      if (sol.converged && !existing.converged) {
        uniqueSolutions[existingIdx] = sol;
      } else if (sol.converged && existing.converged) {
        if (sol.withinLimits && !existing.withinLimits) {
          uniqueSolutions[existingIdx] = sol;
        } else if (sol.withinLimits === existing.withinLimits) {
          const errSol = isPosOnly ? sol.positionError : sol.positionError + sol.orientationError;
          const errExisting = isPosOnly ? existing.positionError : existing.positionError + existing.orientationError;
          if (errSol < errExisting) {
            uniqueSolutions[existingIdx] = sol;
          }
        }
      } else if (!sol.converged && !existing.converged) {
        const errSol = isPosOnly ? sol.positionError : sol.positionError + sol.orientationError;
        const errExisting = isPosOnly ? existing.positionError : existing.positionError + existing.orientationError;
        if (errSol < errExisting) {
          uniqueSolutions[existingIdx] = sol;
        }
      }
    }
  }

  // Sort solutions by cost (lowest cost first: converged, within limits, closest to currentJoints)
  uniqueSolutions.sort((a, b) => a.cost - b.cost);

  const bestSolution = uniqueSolutions.find((s) => s.converged && s.withinLimits) ?? null;
  const isConverged = bestSolution !== null && bestSolution.converged;

  let isPositionReachable = isConverged;
  let isOrientationReachable = isConverged;
  let failureReason: string | undefined = undefined;

  if (isConverged) {
    isPositionReachable = true;
    isOrientationReachable = true;
  } else {
    // If not converged for full pose, test position-only reachability to provide exact diagnostic
    const posTol = options.positionTolerance ?? 1e-4;
    const reachedPosition = uniqueSolutions.some(
      (s) => s.withinLimits && s.positionError <= posTol
    );

    if (reachedPosition) {
      isPositionReachable = true;
      isOrientationReachable = false;
      failureReason =
        'Target position is reachable, but requested orientation cannot be achieved within joint limits.';
    } else if (!options.positionOnly) {
      // Multi-seed position check across diverse configurations (avoids false negative from bad initial guess)
      const testSeeds = [
        defaultInitial,
        robot.joints.map((j) => (j.home !== undefined ? j.home : (j.min + j.max) / 2)),
      ];
      const extraSeeds = generateBranchSeeds(robot, defaultInitial);
      for (let i = 0; i < Math.min(extraSeeds.length, 6); i++) {
        testSeeds.push(extraSeeds[i]);
      }

      let foundPosSol: IKSingleSolution | null = null;
      for (const seed of testSeeds) {
        const quickPosSol = solveNumericalIK(robot, target, {
          ...options,
          positionOnly: true,
          maxIterations: 45,
          initialGuess: seed,
        });
        if (quickPosSol.converged && quickPosSol.withinLimits) {
          foundPosSol = quickPosSol;
          break;
        }
      }

      if (foundPosSol) {
        isPositionReachable = true;
        isOrientationReachable = false;
        failureReason =
          'Target position is reachable, but requested orientation cannot be achieved within joint limits.';
      } else {
        isPositionReachable = false;
        isOrientationReachable = false;
        failureReason =
          targetPos.norm() > maxTheoreticalReach
            ? 'Target position is outside maximum physical reach envelope.'
            : 'Target is kinematically unreachable within joint limits.';
      }
    } else {
      isPositionReachable = false;
      isOrientationReachable = false;
      failureReason =
        targetPos.norm() > maxTheoreticalReach
          ? 'Target position is outside maximum physical reach envelope.'
          : 'Target position is kinematically unreachable within joint limits.';
    }
  }

  const isSingular = bestSolution ? !!bestSolution.isSingular : false;
  let reachabilityStatus: ReachabilityStatus;

  if (isConverged) {
    reachabilityStatus = isSingular ? 'reachable-singular' : 'reachable-dexterous';
  } else if (isPositionReachable) {
    reachabilityStatus = 'position-only-reachable';
  } else if (targetPos.norm() > maxTheoreticalReach) {
    reachabilityStatus = 'outside-workspace';
  } else {
    reachabilityStatus = 'unreachable-joint-limits';
  }

  const totalTime = performance.now() - startTime;

  return {
    target,
    solutions: uniqueSolutions,
    bestSolution,
    converged: isConverged,
    computationTimeMs: totalTime,
    allTestedBranches: branchCount,
    failureReason,
    isPositionReachable,
    isOrientationReachable,
    reachabilityStatus,
    isSingular,
  };
}
