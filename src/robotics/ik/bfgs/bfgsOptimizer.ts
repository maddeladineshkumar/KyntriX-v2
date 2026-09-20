/**
 * Standard BFGS Quasi-Newton Optimizer
 *
 * Mathematical Reference:
 * Jorge Nocedal & Stephen J. Wright, "Numerical Optimization", 2nd ed.,
 * Springer, 2006. Chapter 6 (Quasi-Newton Methods), Eq. 6.17.
 *
 * Inverse Hessian Update Formula:
 * H_{k+1} = (I - rho_k * s_k * y_k^T) * H_k * (I - rho_k * y_k * s_k^T) + rho_k * s_k * s_k^T
 * where rho_k = 1 / (y_k^T * s_k)
 *
 * Subject to curvature condition: s_k^T * y_k > 0
 */

import type { BFGSParameters, BFGSResult, BFGSIterationRecord } from './types';
import { performLineSearch } from './lineSearch';
import { BoxBoundTransform } from './boundTransform';

export interface BFGSProblem {
  dimension: number;
  initialPoint: number[];
  objectiveGrad: (x: number[]) => { objective: number; gradient: number[] };
  lowerBounds?: number[];
  upperBounds?: number[];
}

export function runStandardBFGS(problem: BFGSProblem, params: BFGSParameters): BFGSResult {
  const { dimension: n, initialPoint, objectiveGrad, lowerBounds, upperBounds } = problem;
  const maxIter = Math.max(1, params.maxIterations);
  const gradTol = params.gradientTolerance ?? 1e-6;
  const funcTol = params.functionTolerance ?? 1e-9;
  const stepTol = params.stepTolerance ?? 1e-9;
  const c1 = params.c1 ?? 1e-4;
  const c2 = params.c2 ?? 0.9;
  const strategy = params.boundStrategy ?? 'sigmoid-transform';

  const hasBounds = lowerBounds && upperBounds && lowerBounds.length === n && upperBounds.length === n;
  const boxTransform = hasBounds ? new BoxBoundTransform(lowerBounds, upperBounds) : null;

  // Decide whether to optimize in u-space (unconstrained sigmoid variable) or directly in x-space
  const useTransform = strategy === 'sigmoid-transform' && boxTransform !== null;

  // Define problem evaluations depending on variable representation
  let evaluate: (v: number[]) => { objective: number; gradient: number[] };
  let currentVar: number[];

  if (useTransform && boxTransform) {
    currentVar = boxTransform.toUnconstrained(initialPoint);
    evaluate = (u: number[]) => {
      const x = boxTransform.toBounded(u);
      const { objective, gradient: gradX } = objectiveGrad(x);
      const jacDiag = boxTransform.computeJacobianDiagonal(u);
      const gradU = boxTransform.transformGradient(gradX, jacDiag);
      return { objective, gradient: gradU };
    };
  } else {
    currentVar = [...initialPoint];
    if (hasBounds && boxTransform) {
      currentVar = boxTransform.project(currentVar);
    }
    evaluate = (x: number[]) => {
      const { objective, gradient } = objectiveGrad(x);
      return { objective, gradient };
    };
  }

  let funcEvals = 0;
  let gradEvals = 0;

  // Initial evaluation
  const { objective: f0, gradient: g0 } = evaluate(currentVar);
  funcEvals++;
  gradEvals++;

  let currF = f0;
  let currG = [...g0];
  let currX = useTransform && boxTransform ? boxTransform.toBounded(currentVar) : [...currentVar];

  // Initialize inverse Hessian approximation H_0 = I_n
  let H: number[][] = Array.from({ length: n }, (_, i) => {
    const row = new Array(n).fill(0);
    row[i] = 1.0;
    return row;
  });

  const history: BFGSIterationRecord[] = [];
  let converged = false;
  let terminationReason: BFGSResult['terminationReason'] = 'MAXIMUM_ITERATIONS_REACHED';

  // Initial iteration record
  const initialGradNorm = norm(currG);
  history.push({
    iteration: 0,
    q: [...currX],
    objective: currF,
    gradient: [...currG],
    gradientNorm: initialGradNorm,
    searchDirection: currG.map((g) => -g),
    stepSize: 0,
    sVector: new Array(n).fill(0),
    yVector: new Array(n).fill(0),
    curvature: 0,
    curvatureSatisfied: true,
    updateStatus: 'Initial',
    inverseHessianTrace: n,
    inverseHessianDiag: H.map((row, i) => row[i]),
  });

  if (initialGradNorm < gradTol) {
    return {
      solution: [...currX],
      objective: currF,
      gradient: [...currG],
      gradientNorm: initialGradNorm,
      iterationsCompleted: 0,
      functionEvaluations: funcEvals,
      gradientEvaluations: gradEvals,
      history,
      converged: true,
      terminationReason: 'CONVERGED_GRADIENT_NORM',
    };
  }

  // BFGS Main Iteration Loop
  for (let k = 0; k < maxIter; k++) {
    // 1. Compute Quasi-Newton search direction: p_k = - H_k * g_k
    const p = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += H[i][j] * currG[j];
      }
      p[i] = -sum;
    }

    // Check descent direction condition: g_k^T * p_k < 0
    let gDotP = 0;
    for (let i = 0; i < n; i++) {
      gDotP += currG[i] * p[i];
    }

    let updateStatus: BFGSIterationRecord['updateStatus'] = 'Updated';

    // Safeguard: if not a descent direction, reset H to Identity (steepest descent)
    if (gDotP >= -1e-12 || !Number.isFinite(gDotP)) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          H[i][j] = i === j ? 1.0 : 0.0;
        }
        p[i] = -currG[i];
      }
      gDotP = 0;
      for (let i = 0; i < n; i++) {
        gDotP += currG[i] * p[i];
      }
      updateStatus = 'Reset to Steepest Descent';
    }

    // 2. Line Search
    const lsResult = performLineSearch(
      evaluate,
      currentVar,
      currF,
      currG,
      p,
      {
        c1,
        c2,
        initialAlpha: 1.0,
        project:
          !useTransform && strategy === 'projected-armijo' && hasBounds && boxTransform
            ? (v) => boxTransform.project(v)
            : undefined,
      }
    );

    funcEvals += lsResult.functionEvaluations;
    gradEvals += lsResult.gradientEvaluations;

    if (!lsResult.success || lsResult.stepSize <= 1e-16) {
      // Line search failed to make sufficient progress
      terminationReason = 'LINE_SEARCH_FAILED';
      break;
    }

    const nextVar = lsResult.newX;
    const nextF = lsResult.newObjective;
    const nextG = lsResult.newGradient;
    const alpha = lsResult.stepSize;

    // 3. Compute step vector s_k = nextVar - currentVar
    const s = new Array(n);
    for (let i = 0; i < n; i++) {
      s[i] = nextVar[i] - currentVar[i];
    }

    // 4. Compute gradient difference y_k = nextG - currG
    const y = new Array(n);
    for (let i = 0; i < n; i++) {
      y[i] = nextG[i] - currG[i];
    }

    // 5. Curvature condition: s_k^T * y_k > 0
    let sDotY = 0;
    for (let i = 0; i < n; i++) {
      sDotY += s[i] * y[i];
    }

    const curvatureSatisfied = sDotY > 1e-10;

    if (curvatureSatisfied) {
      // 6. Inverse Hessian Update (Nocedal & Wright Eq. 6.17)
      // H_{k+1} = (I - rho * s * y^T) * H_k * (I - rho * y * s^T) + rho * s * s^T
      const rho = 1.0 / sDotY;

      // Hy = H * y
      const Hy = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          sum += H[i][j] * y[j];
        }
        Hy[i] = sum;
      }

      // y^T * H * y
      let yHy = 0;
      for (let i = 0; i < n; i++) {
        yHy += y[i] * Hy[i];
      }

      // Compute H_{next} = H + ((sDotY + yHy) * rho^2) * (s * s^T) - rho * (Hy * s^T + s * Hy^T)
      const term1Factor = (sDotY + yHy) * rho * rho;
      const nextH: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const val =
            H[i][j] +
            term1Factor * s[i] * s[j] -
            rho * (Hy[i] * s[j] + s[i] * Hy[j]);
          nextH[i][j] = Number.isFinite(val) ? val : (i === j ? 1 : 0);
        }
      }

      H = nextH;
      if (updateStatus !== 'Reset to Steepest Descent') {
        updateStatus = 'Updated';
      }
    } else {
      // Non-positive curvature: skip update to maintain positive definiteness
      updateStatus = 'Skipped (Curvature <= 0)';
    }

    // Update state
    const prevF = currF;
    currF = nextF;
    currG = nextG;
    currentVar = nextVar;
    currX = useTransform && boxTransform ? boxTransform.toBounded(currentVar) : [...currentVar];

    const gradNorm = norm(currG);
    const sNorm = norm(s);
    const dF = Math.abs(currF - prevF);

    // Compute H trace
    let hTrace = 0;
    for (let i = 0; i < n; i++) {
      hTrace += H[i][i];
    }

    history.push({
      iteration: k + 1,
      q: [...currX],
      objective: currF,
      gradient: [...currG],
      gradientNorm: gradNorm,
      searchDirection: [...p],
      stepSize: alpha,
      sVector: [...s],
      yVector: [...y],
      curvature: sDotY,
      curvatureSatisfied,
      updateStatus,
      inverseHessianTrace: hTrace,
      inverseHessianDiag: H.map((row, i) => row[i]),
    });

    // Convergence checks
    if (params.objectiveTolerance !== undefined && currF <= params.objectiveTolerance) {
      converged = true;
      terminationReason = 'CONVERGED_OBJECTIVE_TOLERANCE';
      break;
    }
    if (gradNorm < gradTol) {
      converged = true;
      terminationReason = 'CONVERGED_GRADIENT_NORM';
      break;
    }
    if (dF < funcTol && gradNorm < gradTol * 10 && k >= 3) {
      converged = true;
      terminationReason = 'CONVERGED_OBJECTIVE_TOLERANCE';
      break;
    }
    if (sNorm < stepTol && gradNorm < gradTol * 10 && k >= 3) {
      converged = true;
      terminationReason = 'CONVERGED_STEP_TOLERANCE';
      break;
    }
  }

  // Ensure solution strictly respects bounds
  let finalSolution = [...currX];
  if (hasBounds && boxTransform) {
    finalSolution = boxTransform.project(finalSolution);
  }

  return {
    solution: finalSolution,
    objective: currF,
    gradient: currG,
    gradientNorm: norm(currG),
    iterationsCompleted: history.length - 1,
    functionEvaluations: funcEvals,
    gradientEvaluations: gradEvals,
    history,
    converged,
    terminationReason,
  };
}

function norm(vec: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}
