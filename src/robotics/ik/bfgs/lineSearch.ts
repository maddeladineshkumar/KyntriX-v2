/**
 * Line Search Algorithms for Quasi-Newton Optimization
 *
 * Mathematical Reference:
 * Jorge Nocedal & Stephen J. Wright, "Numerical Optimization", 2nd ed.,
 * Springer, 2006. Chapter 3 (Line Search Methods), Algorithm 3.5 & 3.6.
 *
 * Conditions:
 * 1. Sufficient Decrease (Armijo Condition):
 *    f(x_k + alpha * p_k) <= f(x_k) + c1 * alpha * (grad_k^T * p_k)
 *
 * 2. Curvature Condition (Strong Wolfe):
 *    |grad(x_k + alpha * p_k)^T * p_k| <= c2 * |grad_k^T * p_k|
 */

export interface LineSearchResult {
  stepSize: number;
  newX: number[];
  newObjective: number;
  newGradient: number[];
  functionEvaluations: number;
  gradientEvaluations: number;
  success: boolean;
  message: string;
}

export interface LineSearchOptions {
  c1?: number; // Armijo parameter (default: 1e-4)
  c2?: number; // Curvature parameter (default: 0.9)
  initialAlpha?: number; // Initial trial step (default: 1.0)
  maxAlpha?: number;
  maxIterations?: number;
  project?: (x: number[]) => number[]; // Optional projection operator onto feasible bounds
}

export function performLineSearch(
  objectiveGrad: (x: number[]) => { objective: number; gradient: number[] },
  x0: number[],
  f0: number,
  grad0: number[],
  p: number[],
  options: LineSearchOptions = {}
): LineSearchResult {
  const c1 = options.c1 ?? 1e-4;
  const c2 = options.c2 ?? 0.9;
  const initialAlpha = options.initialAlpha ?? 1.0;
  const maxIterations = options.maxIterations ?? 25;
  const n = x0.length;

  let funcEvals = 0;
  let gradEvals = 0;

  // Compute directional derivative dphi(0) = grad0^T * p
  let dphi0 = 0;
  for (let i = 0; i < n; i++) {
    dphi0 += grad0[i] * p[i];
  }

  // Verification: search direction MUST be a descent direction
  if (dphi0 >= 0 || !Number.isFinite(dphi0)) {
    return {
      stepSize: 0,
      newX: [...x0],
      newObjective: f0,
      newGradient: [...grad0],
      functionEvaluations: 0,
      gradientEvaluations: 0,
      success: false,
      message: `Invalid search direction: directional derivative dphi(0) = ${dphi0} is non-negative or non-finite.`,
    };
  }

  // 1. First attempt Strong Wolfe line search
  const project = options.project;
  let alphaPrev = 0;
  let fPrev = f0;
  let alpha = initialAlpha;

  for (let iter = 1; iter <= maxIterations; iter++) {
    let xTry = new Array(n);
    for (let i = 0; i < n; i++) {
      xTry[i] = x0[i] + alpha * p[i];
    }
    if (project) {
      xTry = project(xTry);
    }

    const { objective: fTry, gradient: gTry } = objectiveGrad(xTry);
    funcEvals++;
    gradEvals++;

    // Check numerical validity
    if (!Number.isFinite(fTry)) {
      // Non-finite objective: immediately shrink step size
      alpha *= 0.5;
      continue;
    }

    // Armijo sufficient decrease check: f(alpha) <= f(0) + c1 * alpha * dphi(0)
    // For projected search, decrease is tested along actual displacement (xTry - x0)
    let dDecrease = 0;
    if (project) {
      for (let i = 0; i < n; i++) {
        dDecrease += grad0[i] * (xTry[i] - x0[i]);
      }
    } else {
      dDecrease = alpha * dphi0;
    }

    const armijoThreshold = f0 + c1 * dDecrease;
    if (fTry > armijoThreshold || (iter > 1 && fTry >= fPrev)) {
      // Step too large or objective increased: zoom/bracket between alphaPrev and alpha
      return zoom(
        objectiveGrad,
        x0,
        f0,
        grad0,
        p,
        dphi0,
        alphaPrev,
        alpha,
        c1,
        c2,
        funcEvals,
        gradEvals,
        project
      );
    }

    // Compute directional derivative at trial point: dphi(alpha) = gTry^T * p
    let dphiTry = 0;
    for (let i = 0; i < n; i++) {
      dphiTry += gTry[i] * p[i];
    }

    // Strong Wolfe curvature condition: |dphi(alpha)| <= c2 * |dphi(0)|
    if (Math.abs(dphiTry) <= c2 * Math.abs(dphi0)) {
      // Strong Wolfe satisfied!
      return {
        stepSize: alpha,
        newX: xTry,
        newObjective: fTry,
        newGradient: gTry,
        functionEvaluations: funcEvals,
        gradientEvaluations: gradEvals,
        success: true,
        message: `Strong Wolfe conditions satisfied at iteration ${iter}.`,
      };
    }

    if (dphiTry >= 0) {
      // Positive slope: minimum lies between alpha and alphaPrev
      return zoom(
        objectiveGrad,
        x0,
        f0,
        grad0,
        p,
        dphi0,
        alpha,
        alphaPrev,
        c1,
        c2,
        funcEvals,
        gradEvals,
        project
      );
    }

    alphaPrev = alpha;
    fPrev = fTry;
    alpha = Math.min(alpha * 2.0, 100.0);
  }

  // 2. Fallback: Armijo Backtracking Line Search if Strong Wolfe bracket exceeded
  let backtrackAlpha = initialAlpha;
  const rhoBacktrack = 0.5;

  for (let bIter = 0; bIter < 20; bIter++) {
    let xTry = new Array(n);
    for (let i = 0; i < n; i++) {
      xTry[i] = x0[i] + backtrackAlpha * p[i];
    }
    if (project) {
      xTry = project(xTry);
    }

    const { objective: fTry, gradient: gTry } = objectiveGrad(xTry);
    funcEvals++;
    gradEvals++;

    let dBacktrack = 0;
    if (project) {
      for (let i = 0; i < n; i++) {
        dBacktrack += grad0[i] * (xTry[i] - x0[i]);
      }
    } else {
      dBacktrack = backtrackAlpha * dphi0;
    }

    if (Number.isFinite(fTry) && fTry <= f0 + c1 * dBacktrack) {
      return {
        stepSize: backtrackAlpha,
        newX: xTry,
        newObjective: fTry,
        newGradient: gTry,
        functionEvaluations: funcEvals,
        gradientEvaluations: gradEvals,
        success: true,
        message: `Armijo sufficient decrease satisfied via backtracking (step=${backtrackAlpha.toExponential(4)}).`,
      };
    }

    backtrackAlpha *= rhoBacktrack;
  }

  return {
    stepSize: 0,
    newX: [...x0],
    newObjective: f0,
    newGradient: [...grad0],
    functionEvaluations: funcEvals,
    gradientEvaluations: gradEvals,
    success: false,
    message: `Line search failed: unable to find acceptable step satisfying Armijo conditions.`,
  };
}

/**
 * Nocedal & Wright Algorithm 3.6 (Zoom function for Strong Wolfe)
 */
function zoom(
  objectiveGrad: (x: number[]) => { objective: number; gradient: number[] },
  x0: number[],
  f0: number,
  _grad0: number[],
  p: number[],
  dphi0: number,
  alphaLo: number,
  alphaHi: number,
  c1: number,
  c2: number,
  initialFuncEvals: number,
  initialGradEvals: number,
  project?: (x: number[]) => number[]
): LineSearchResult {
  let aLo = alphaLo;
  let aHi = alphaHi;
  const n = x0.length;
  let funcEvals = initialFuncEvals;
  let gradEvals = initialGradEvals;

  for (let iter = 0; iter < 15; iter++) {
    // Bisection / Quadratic interpolation
    const aMid = 0.5 * (aLo + aHi);
    let xTry = new Array(n);
    for (let i = 0; i < n; i++) {
      xTry[i] = x0[i] + aMid * p[i];
    }
    if (project) {
      xTry = project(xTry);
    }

    const { objective: fTry, gradient: gTry } = objectiveGrad(xTry);
    funcEvals++;
    gradEvals++;

    let dDecrease = 0;
    if (project) {
      for (let i = 0; i < n; i++) {
        dDecrease += _grad0[i] * (xTry[i] - x0[i]);
      }
    } else {
      dDecrease = aMid * dphi0;
    }

    if (!Number.isFinite(fTry) || fTry > f0 + c1 * dDecrease) {
      aHi = aMid;
    } else {
      let dphiTry = 0;
      for (let i = 0; i < n; i++) {
        dphiTry += gTry[i] * p[i];
      }

      if (Math.abs(dphiTry) <= c2 * Math.abs(dphi0)) {
        return {
          stepSize: aMid,
          newX: xTry,
          newObjective: fTry,
          newGradient: gTry,
          functionEvaluations: funcEvals,
          gradientEvaluations: gradEvals,
          success: true,
          message: `Strong Wolfe conditions satisfied via Zoom bracket.`,
        };
      }

      if (dphiTry * (aHi - aLo) >= 0) {
        aHi = aLo;
      }
      aLo = aMid;
    }

    if (Math.abs(aHi - aLo) < 1e-12) {
      break;
    }
  }

  // Fallback to evaluating at aLo
  let xFinal = new Array(n);
  for (let i = 0; i < n; i++) {
    xFinal[i] = x0[i] + aLo * p[i];
  }
  if (project) {
    xFinal = project(xFinal);
  }
  const { objective: fFinal, gradient: gFinal } = objectiveGrad(xFinal);
  funcEvals++;
  gradEvals++;

  let dFinalDecrease = 0;
  if (project) {
    for (let i = 0; i < n; i++) {
      dFinalDecrease += _grad0[i] * (xFinal[i] - x0[i]);
    }
  } else {
    dFinalDecrease = aLo * dphi0;
  }

  const isDecrease = Number.isFinite(fFinal) && fFinal <= f0 + c1 * dFinalDecrease;
  return {
    stepSize: aLo,
    newX: xFinal,
    newObjective: fFinal,
    newGradient: gFinal,
    functionEvaluations: funcEvals,
    gradientEvaluations: gradEvals,
    success: isDecrease,
    message: isDecrease
      ? `Armijo decrease accepted at zoom bound (step=${aLo.toExponential(4)}).`
      : `Zoom failed to find Wolfe point.`,
  };
}
