/**
 * Standard Numerical Optimization Benchmark Functions
 * Used to independently verify and validate SMA and BFGS optimization algorithms.
 */

export interface BenchmarkFunction {
  name: string;
  dimension: number;
  lowerBounds: number[];
  upperBounds: number[];
  optimalPoint: number[];
  optimalValue: number;
  evaluate: (x: number[]) => number;
  gradient?: (x: number[]) => number[];
}

/**
 * 1. Sphere Function (Smooth, strictly convex, unimodal)
 * f(x) = sum(x_i^2)
 * Minimum at x* = [0, ..., 0], f(x*) = 0
 */
export function createSphereBenchmark(dim: number = 3): BenchmarkFunction {
  return {
    name: 'Sphere',
    dimension: dim,
    lowerBounds: new Array(dim).fill(-5.12),
    upperBounds: new Array(dim).fill(5.12),
    optimalPoint: new Array(dim).fill(0),
    optimalValue: 0,
    evaluate: (x: number[]) => {
      let sum = 0;
      for (let i = 0; i < x.length; i++) sum += x[i] * x[i];
      return sum;
    },
    gradient: (x: number[]) => {
      return x.map((xi) => 2 * xi);
    },
  };
}

/**
 * 2. Rosenbrock Function (Valley-shaped, non-convex, tests Quasi-Newton curvature tracking)
 * f(x, y) = 100 * (y - x^2)^2 + (1 - x)^2
 * Global minimum at (1, 1), f(x*) = 0
 */
export function createRosenbrock2DBenchmark(): BenchmarkFunction {
  return {
    name: 'Rosenbrock 2D',
    dimension: 2,
    lowerBounds: [-5, -5],
    upperBounds: [5, 5],
    optimalPoint: [1, 1],
    optimalValue: 0,
    evaluate: (x: number[]) => {
      const x0 = x[0];
      const x1 = x[1];
      return 100 * Math.pow(x1 - x0 * x0, 2) + Math.pow(1 - x0, 2);
    },
    gradient: (x: number[]) => {
      const x0 = x[0];
      const x1 = x[1];
      const dfdx0 = -400 * x0 * (x1 - x0 * x0) - 2 * (1 - x0);
      const dfdx1 = 200 * (x1 - x0 * x0);
      return [dfdx0, dfdx1];
    },
  };
}

/**
 * 3. Rastrigin Function (Highly multimodal with many local minima, tests SMA global exploration)
 * f(x) = 10 * d + sum(x_i^2 - 10 * cos(2 * pi * x_i))
 * Global minimum at x* = [0, ..., 0], f(x*) = 0
 */
export function createRastriginBenchmark(dim: number = 3): BenchmarkFunction {
  return {
    name: 'Rastrigin',
    dimension: dim,
    lowerBounds: new Array(dim).fill(-5.12),
    upperBounds: new Array(dim).fill(5.12),
    optimalPoint: new Array(dim).fill(0),
    optimalValue: 0,
    evaluate: (x: number[]) => {
      let sum = 10 * x.length;
      for (let i = 0; i < x.length; i++) {
        sum += x[i] * x[i] - 10 * Math.cos(2 * Math.PI * x[i]);
      }
      return sum;
    },
    gradient: (x: number[]) => {
      return x.map((xi) => 2 * xi + 20 * Math.PI * Math.sin(2 * Math.PI * xi));
    },
  };
}

/**
 * 4. Strictly Convex Quadratic Function
 * f(x) = 0.5 * x^T * A * x - b^T * x
 * grad f(x) = A * x - b
 */
export function createQuadraticBenchmark(): BenchmarkFunction {
  // A = [[4, 1], [1, 3]], b = [1, 2]
  // A is symmetric positive definite (eigenvalues > 0)
  // Inverse A = 1/11 * [[3, -1], [-1, 4]]
  // x* = A^{-1} b = 1/11 * [3*1 - 1*2, -1*1 + 4*2] = [1/11, 7/11]
  const optX = [1 / 11, 7 / 11];
  const optVal = -0.5 * (1 * optX[0] + 2 * optX[1]);

  return {
    name: 'Convex Quadratic',
    dimension: 2,
    lowerBounds: [-10, -10],
    upperBounds: [10, 10],
    optimalPoint: optX,
    optimalValue: optVal,
    evaluate: (x: number[]) => {
      const qPart = 0.5 * (4 * x[0] * x[0] + 2 * 1 * x[0] * x[1] + 3 * x[1] * x[1]);
      const lPart = 1 * x[0] + 2 * x[1];
      return qPart - lPart;
    },
    gradient: (x: number[]) => {
      return [4 * x[0] + 1 * x[1] - 1, 1 * x[0] + 3 * x[1] - 2];
    },
  };
}
