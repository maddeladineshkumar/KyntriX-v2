import { describe, it, expect } from 'vitest';
import { runCanonicalSMA } from '../../src/robotics/ik/sma/smaOptimizer';
import {
  createSphereBenchmark,
  createRastriginBenchmark,
  createRosenbrock2DBenchmark,
} from '../../src/robotics/ik/benchmarkFunctions';

describe('Canonical Slime Mould Algorithm (SMA) Optimizer Suite', () => {
  it('minimizes Sphere benchmark function to near-zero within bounds', () => {
    const sphere = createSphereBenchmark(3);
    const result = runCanonicalSMA(
      {
        dimension: sphere.dimension,
        lowerBounds: sphere.lowerBounds,
        upperBounds: sphere.upperBounds,
        objective: sphere.evaluate,
      },
      {
        populationSize: 30,
        maxIterations: 60,
        seed: 12345,
      }
    );

    expect(result.iterationsCompleted).toBeGreaterThan(0);
    expect(result.finalBestFitness).toBeLessThan(result.initialBestFitness);
    expect(result.finalBestFitness).toBeLessThan(0.05);

    // All dimensions within bounds
    for (let d = 0; d < sphere.dimension; d++) {
      expect(result.bestPosition[d]).toBeGreaterThanOrEqual(sphere.lowerBounds[d]);
      expect(result.bestPosition[d]).toBeLessThanOrEqual(sphere.upperBounds[d]);
    }
  });

  it('guarantees 100% deterministic bit-exact reproducibility for identical random seeds', () => {
    const sphere = createSphereBenchmark(3);
    const seed = 98765;

    const run1 = runCanonicalSMA(
      {
        dimension: sphere.dimension,
        lowerBounds: sphere.lowerBounds,
        upperBounds: sphere.upperBounds,
        objective: sphere.evaluate,
      },
      {
        populationSize: 25,
        maxIterations: 30,
        seed,
      }
    );

    const run2 = runCanonicalSMA(
      {
        dimension: sphere.dimension,
        lowerBounds: sphere.lowerBounds,
        upperBounds: sphere.upperBounds,
        objective: sphere.evaluate,
      },
      {
        populationSize: 25,
        maxIterations: 30,
        seed,
      }
    );

    expect(run1.finalBestFitness).toBe(run2.finalBestFitness);
    expect(run1.bestPosition).toEqual(run2.bestPosition);
    expect(run1.history.length).toBe(run2.history.length);
    for (let i = 0; i < run1.history.length; i++) {
      expect(run1.history[i].bestFitness).toBe(run2.history[i].bestFitness);
      expect(run1.history[i].parameterA).toBe(run2.history[i].parameterA);
    }
  });

  it('strictly enforces all population candidates to remain within [LB, UB] bounds', () => {
    const rosenbrock = createRosenbrock2DBenchmark();
    const result = runCanonicalSMA(
      {
        dimension: 2,
        lowerBounds: rosenbrock.lowerBounds,
        upperBounds: rosenbrock.upperBounds,
        objective: rosenbrock.evaluate,
      },
      {
        populationSize: 20,
        maxIterations: 25,
        seed: 42,
      }
    );

    for (const member of result.finalPopulation) {
      for (let d = 0; d < 2; d++) {
        expect(member.position[d]).toBeGreaterThanOrEqual(rosenbrock.lowerBounds[d]);
        expect(member.position[d]).toBeLessThanOrEqual(rosenbrock.upperBounds[d]);
      }
    }
  });

  it('handles multimodal Rastrigin function and explores without exploding', () => {
    const rastrigin = createRastriginBenchmark(3);
    const result = runCanonicalSMA(
      {
        dimension: rastrigin.dimension,
        lowerBounds: rastrigin.lowerBounds,
        upperBounds: rastrigin.upperBounds,
        objective: rastrigin.evaluate,
      },
      {
        populationSize: 35,
        maxIterations: 50,
        seed: 777,
      }
    );

    console.log('Rastrigin iterations:', result.iterationsCompleted, 'finalFitness:', result.finalBestFitness, 'converged:', result.converged);
    expect(Number.isFinite(result.finalBestFitness)).toBe(true);
    expect(result.finalBestFitness).toBeLessThan(result.initialBestFitness);
    expect(result.iterationsCompleted).toBeGreaterThan(0);
  });
});
