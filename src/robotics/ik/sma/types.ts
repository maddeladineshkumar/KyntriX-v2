/**
 * Canonical Slime Mould Algorithm (SMA) Type Definitions
 * Based on: Li, Chen, Wang, Heidari, Mirjalili (2020)
 * "Slime mould algorithm: A new method for stochastic optimization"
 * Future Generation Computer Systems, 111, 300-323.
 */

export interface SMAParameters {
  /** Population size N (typically 20 - 50) */
  populationSize: number;
  /** Maximum number of SMA iterations */
  maxIterations: number;
  /** Random exploration probability parameter z (canonical default: 0.03) */
  z?: number;
  /** PRNG seed for bit-exact deterministic reproducibility */
  seed?: number;
  /** Objective value tolerance for early termination */
  tolerance?: number;
}

export interface SMAIterationRecord {
  iteration: number;
  bestFitness: number;
  worstFitness: number;
  bestPosition: number[];
  parameterA: number;
  parameterB: number;
  /** Average fitness of the population */
  averageFitness: number;
  /** Standard deviation of fitness */
  fitnessStdDev: number;
  /** Sample weight from best candidate */
  sampleWeight: number;
  /** Description of update formula triggered */
  updateRuleTriggered: string;
}

export interface SMAResult {
  bestPosition: number[];
  bestFitness: number;
  iterationsCompleted: number;
  functionEvaluations: number;
  history: SMAIterationRecord[];
  initialBestFitness: number;
  finalBestFitness: number;
  initialPopulation: { position: number[]; fitness: number }[];
  finalPopulation: { position: number[]; fitness: number }[];
  converged: boolean;
  seed: number;
}
