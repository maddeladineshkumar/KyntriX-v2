/**
 * Canonical Slime Mould Algorithm (SMA) Optimizer
 *
 * Mathematical Reference:
 * Shimin Li, Huiling Chen, Mingjing Wang, Ali Asghar Heidari, Seyedali Mirjalili,
 * "Slime mould algorithm: A new method for stochastic optimization",
 * Future Generation Computer Systems, Vol. 111, 2020, pp. 300-323.
 *
 * Canonical Equations:
 * 1. Weight Matrix W:
 *    For individual i in ranked order (minimization):
 *    W(i, d) = 1 + r * log((bF - S(i)) / (bF - wF) + 1),  for i <= N/2
 *    W(i, d) = 1 - r * log((bF - S(i)) / (bF - wF) + 1),  for i > N/2
 *    where bF = best fitness, wF = worst fitness, r in U(0,1).
 *
 * 2. Adaptive Parameters:
 *    a = arctanh(-(t / Max_iter) + 1)
 *    b = 1 - (t / Max_iter)
 *    p_i = tanh|S(i) - bF|
 *
 * 3. Search Vectors:
 *    v_b in U(-a, a)
 *    v_c in U(-b, b)
 *
 * 4. Position Update:
 *    If r_1 < z:
 *       X_i(t+1) = LB + rand * (UB - LB)
 *    Else:
 *       If r_2 < p_i:
 *          X_i(t+1) = X_b(t) + v_b * (W * X_A(t) - X_B(t))
 *       Else:
 *          X_i(t+1) = v_c * X_i(t)
 */

import { SeededRandom } from './seededRandom';
import type { SMAParameters, SMAResult, SMAIterationRecord } from './types';

export interface SMAProblem {
  /** Dimension of the decision vector */
  dimension: number;
  /** Lower bounds for each dimension */
  lowerBounds: number[];
  /** Upper bounds for each dimension */
  upperBounds: number[];
  /** Objective function to minimize */
  objective: (x: number[]) => number;
  /** Optional initial point to include in population */
  initialGuess?: number[];
}

export function runCanonicalSMA(problem: SMAProblem, params: SMAParameters): SMAResult {
  const { dimension, lowerBounds, upperBounds, objective, initialGuess } = problem;
  const N = Math.max(4, params.populationSize);
  const maxIter = Math.max(1, params.maxIterations);
  const z = params.z ?? 0.03;
  const tolerance = params.tolerance ?? 1e-8;
  const seed = params.seed ?? 42;

  const rng = new SeededRandom(seed);
  let functionEvaluations = 0;

  // 1. Population Initialization
  const population: number[][] = [];
  const fitness: number[] = [];

  for (let i = 0; i < N; i++) {
    const individual = new Array(dimension);
    if (i === 0 && initialGuess && initialGuess.length === dimension) {
      // Seed first individual with initialGuess clamped to bounds
      for (let d = 0; d < dimension; d++) {
        individual[d] = Math.max(lowerBounds[d], Math.min(upperBounds[d], initialGuess[d]));
      }
    } else {
      // Uniform random initialization in [LB, UB]
      for (let d = 0; d < dimension; d++) {
        individual[d] = rng.uniform(lowerBounds[d], upperBounds[d]);
      }
    }
    population.push(individual);
    const fit = objective(individual);
    functionEvaluations++;
    fitness.push(fit);
  }

  // Track initial best
  let bestIdx = 0;
  for (let i = 1; i < N; i++) {
    if (fitness[i] < fitness[bestIdx]) {
      bestIdx = i;
    }
  }

  let globalBestPos = [...population[bestIdx]];
  let globalBestFitness = fitness[bestIdx];
  const initialBestFitness = globalBestFitness;

  const initialPopulationSnap = population.map((p, idx) => ({
    position: [...p],
    fitness: fitness[idx],
  }));

  const history: SMAIterationRecord[] = [];

  // Main SMA Iteration Loop
  for (let t = 1; t <= maxIter; t++) {
    // 2. Sort population by fitness (ascending order for minimization)
    const sortedIndices = Array.from({ length: N }, (_, idx) => idx).sort(
      (a, b) => fitness[a] - fitness[b]
    );

    const bestFit = fitness[sortedIndices[0]];
    const worstFit = fitness[sortedIndices[N - 1]];

    // 3. Compute Adaptive Parameter a
    // Formula: a = arctanh(-(t / Max_iter) + 1)
    // Safeguard: clamp argument within (-1 + 1e-7, 1 - 1e-7) to prevent NaN/Infinity
    const argA = Math.max(-1 + 1e-7, Math.min(1 - 1e-7, -(t / maxIter) + 1));
    const a = Math.atanh(argA);

    // Adaptive Parameter b: b = 1 - (t / Max_iter)
    const b = 1 - t / maxIter;

    // 4. Calculate Weight Matrix W
    // For individual i (ranked from 0 to N-1):
    // If i <= N/2: W = 1 + r * log((bF - S(i)) / (bF - wF) + 1)
    // Else:        W = 1 - r * log((bF - S(i)) / (bF - wF) + 1)
    const fitDenom = Math.abs(bestFit - worstFit);
    const weights: number[][] = Array.from({ length: N }, () => new Array(dimension));

    for (let rank = 0; rank < N; rank++) {
      const origIdx = sortedIndices[rank];
      const indFit = fitness[origIdx];

      // Safeguard against zero denominator when population converges
      const normalizedRatio = fitDenom > 1e-14 ? (bestFit - indFit) / (bestFit - worstFit) : 0;
      const logTerm = Math.log10(Math.max(1e-14, normalizedRatio + 1));

      for (let d = 0; d < dimension; d++) {
        const r = rng.next();
        if (rank <= Math.floor(N / 2)) {
          weights[origIdx][d] = 1 + r * logTerm;
        } else {
          weights[origIdx][d] = 1 - r * logTerm;
        }
      }
    }

    // Record dominant update rule for this iteration
    let explorationCount = 0;
    let attractionCount = 0;
    let shrinkageCount = 0;

    // 5. Position Updates for each individual
    const newPopulation: number[][] = [];

    for (let i = 0; i < N; i++) {
      // In canonical SMA (Li et al. Eq 2.2), p_i = tanh|S(i) - DF| where DF is global best fitness
      const p_i = Math.tanh(Math.abs(fitness[i] - globalBestFitness));
      const r1 = rng.next();
      const r2 = rng.next();

      const newPos = new Array(dimension);

      if (r1 < z) {
        // Random exploration update (canonical rule 1)
        explorationCount++;
        for (let d = 0; d < dimension; d++) {
          newPos[d] = rng.uniform(lowerBounds[d], upperBounds[d]);
        }
      } else {
        // In canonical SMA (Li et al., 2020), v_b and v_c are vectors of size [1, dim]
        // generated via unifrnd(-a, a, 1, dim) and unifrnd(-b, b, 1, dim)
        const vb = new Array(dimension);
        const vc = new Array(dimension);
        for (let d = 0; d < dimension; d++) {
          vb[d] = rng.uniform(-a, a);
          vc[d] = rng.uniform(-b, b);
        }

        if (r2 < p_i) {
          // Food attraction update with odor weight (canonical rule 2)
          attractionCount++;
          // Select two random distinct individuals A and B
          let idxA = rng.int(0, N - 1);
          let idxB = rng.int(0, N - 1);
          if (idxA === idxB) {
            idxB = (idxA + 1) % N;
          }

          const posA = population[idxA];
          const posB = population[idxB];
          const indWeights = weights[i];

          for (let d = 0; d < dimension; d++) {
            newPos[d] = globalBestPos[d] + vb[d] * (indWeights[d] * posA[d] - posB[d]);
          }
        } else {
          // Search shrinkage / condensation update (canonical rule 3)
          shrinkageCount++;
          for (let d = 0; d < dimension; d++) {
            newPos[d] = vc[d] * population[i][d];
          }
        }
      }

      // 6. Boundary Handling: clamp strictly to [LB, UB]
      for (let d = 0; d < dimension; d++) {
        newPos[d] = Math.max(lowerBounds[d], Math.min(upperBounds[d], newPos[d]));
      }

      newPopulation.push(newPos);
    }

    // 7. Evaluate New Population & Update Fitness
    for (let i = 0; i < N; i++) {
      population[i] = newPopulation[i];
      const fit = objective(population[i]);
      functionEvaluations++;
      fitness[i] = fit;

      if (fit < globalBestFitness) {
        globalBestFitness = fit;
        globalBestPos = [...population[i]];
      }
    }

    // 8. Statistics & History Tracking
    let fitSum = 0;
    for (let i = 0; i < N; i++) {
      fitSum += fitness[i];
    }
    const avgFit = fitSum / N;

    let varSum = 0;
    for (let i = 0; i < N; i++) {
      varSum += (fitness[i] - avgFit) * (fitness[i] - avgFit);
    }
    const stdDev = Math.sqrt(varSum / N);

    const dominantRule =
      attractionCount >= explorationCount && attractionCount >= shrinkageCount
        ? `Food Odor Attraction (v_b * (W * X_A - X_B)) [${attractionCount}/${N}]`
        : shrinkageCount >= explorationCount
        ? `Search Shrinkage (v_c * X) [${shrinkageCount}/${N}]`
        : `Exploration Jump (z = ${z}) [${explorationCount}/${N}]`;

    history.push({
      iteration: t,
      bestFitness: globalBestFitness,
      worstFitness: worstFit,
      bestPosition: [...globalBestPos],
      parameterA: a,
      parameterB: b,
      averageFitness: avgFit,
      fitnessStdDev: stdDev,
      sampleWeight: weights[sortedIndices[0]][0],
      updateRuleTriggered: dominantRule,
    });

    // 9. Stopping Criteria
    if (globalBestFitness <= tolerance) {
      break;
    }
  }

  const finalPopulationSnap = population.map((p, idx) => ({
    position: [...p],
    fitness: fitness[idx],
  }));

  return {
    bestPosition: globalBestPos,
    bestFitness: globalBestFitness,
    iterationsCompleted: history.length,
    functionEvaluations,
    history,
    initialBestFitness,
    finalBestFitness: globalBestFitness,
    initialPopulation: initialPopulationSnap,
    finalPopulation: finalPopulationSnap,
    converged: globalBestFitness <= tolerance,
    seed,
  };
}
