import { describe, it, expect } from 'vitest';
import { runStandardBFGS } from '../../src/robotics/ik/bfgs/bfgsOptimizer';
import {
  createQuadraticBenchmark,
  createRosenbrock2DBenchmark,
  createSphereBenchmark,
} from '../../src/robotics/ik/benchmarkFunctions';
import { BoxBoundTransform } from '../../src/robotics/ik/bfgs/boundTransform';

describe('Standard BFGS Quasi-Newton Optimizer Suite', () => {
  it('solves strictly convex quadratic benchmark to high analytical precision', () => {
    const quad = createQuadraticBenchmark();
    const result = runStandardBFGS(
      {
        dimension: 2,
        initialPoint: [5.0, -3.0],
        objectiveGrad: (x) => ({
          objective: quad.evaluate(x),
          gradient: quad.gradient!(x),
        }),
      },
      {
        maxIterations: 20,
        gradientTolerance: 1e-8,
        boundStrategy: 'unconstrained',
      }
    );

    expect(result.converged).toBe(true);
    expect(result.gradientNorm).toBeLessThan(1e-6);
    expect(result.solution[0]).toBeCloseTo(quad.optimalPoint[0], 5);
    expect(result.solution[1]).toBeCloseTo(quad.optimalPoint[1], 5);
    expect(result.objective).toBeCloseTo(quad.optimalValue, 5);
  });

  it('navigates the curved Rosenbrock valley to global optimum (1, 1)', () => {
    const rosen = createRosenbrock2DBenchmark();
    const result = runStandardBFGS(
      {
        dimension: 2,
        initialPoint: [-1.2, 1.0], // Classic Rosenbrock test starting point
        objectiveGrad: (x) => ({
          objective: rosen.evaluate(x),
          gradient: rosen.gradient!(x),
        }),
      },
      {
        maxIterations: 100,
        gradientTolerance: 1e-5,
        functionTolerance: 1e-9,
        boundStrategy: 'unconstrained',
      }
    );

    expect(result.objective).toBeLessThan(1e-4);
    expect(result.solution[0]).toBeCloseTo(1.0, 2);
    expect(result.solution[1]).toBeCloseTo(1.0, 2);
  });

  it('guarantees box constraints are strictly respected via Sigmoid transformation', () => {
    const sphere = createSphereBenchmark(3);
    // Unconstrained minimum is at [0, 0, 0].
    // If we constrain x_i in [2.0, 5.0], the constrained minimum is [2.0, 2.0, 2.0].
    const lowerBounds = [2.0, 2.0, 2.0];
    const upperBounds = [5.0, 5.0, 5.0];

    const result = runStandardBFGS(
      {
        dimension: 3,
        initialPoint: [4.0, 4.0, 4.0],
        lowerBounds,
        upperBounds,
        objectiveGrad: (x) => ({
          objective: sphere.evaluate(x),
          gradient: sphere.gradient!(x),
        }),
      },
      {
        maxIterations: 40,
        boundStrategy: 'sigmoid-transform',
      }
    );

    for (let i = 0; i < 3; i++) {
      expect(result.solution[i]).toBeGreaterThanOrEqual(lowerBounds[i] - 1e-6);
      expect(result.solution[i]).toBeLessThanOrEqual(upperBounds[i] + 1e-6);
      // Bound-constrained optimum is on boundary 2.0
      expect(result.solution[i]).toBeCloseTo(2.0, 2);
    }
  });

  it('verifies BoxBoundTransform roundtrip mapping and Jacobian derivative', () => {
    const lb = [-3, 0];
    const ub = [3, 10];
    const transform = new BoxBoundTransform(lb, ub);

    const xOrig = [-1.5, 4.5];
    const u = transform.toUnconstrained(xOrig);
    const xRound = transform.toBounded(u);

    expect(xRound[0]).toBeCloseTo(xOrig[0], 5);
    expect(xRound[1]).toBeCloseTo(xOrig[1], 5);

    // Verify analytical Jacobian dx/du against numerical finite difference
    const jacDiag = transform.computeJacobianDiagonal(u);
    const h = 1e-6;
    for (let i = 0; i < 2; i++) {
      const uPlus = [...u];
      const uMinus = [...u];
      uPlus[i] += h;
      uMinus[i] -= h;
      const xPlus = transform.toBounded(uPlus)[i];
      const xMinus = transform.toBounded(uMinus)[i];
      const numDeriv = (xPlus - xMinus) / (2 * h);
      expect(jacDiag[i]).toBeCloseTo(numDeriv, 4);
    }
  });

  it('maintains positive curvature and inverse-Hessian trace tracking', () => {
    const rosen = createRosenbrock2DBenchmark();
    const result = runStandardBFGS(
      {
        dimension: 2,
        initialPoint: [0.0, 0.0],
        objectiveGrad: (x) => ({
          objective: rosen.evaluate(x),
          gradient: rosen.gradient!(x),
        }),
      },
      {
        maxIterations: 15,
        boundStrategy: 'unconstrained',
      }
    );

    expect(result.history.length).toBeGreaterThan(1);
    for (let i = 1; i < result.history.length; i++) {
      const rec = result.history[i];
      if (rec.updateStatus === 'Updated') {
        expect(rec.curvature).toBeGreaterThan(0);
      }
      expect(Number.isFinite(rec.inverseHessianTrace)).toBe(true);
    }
  });
});
