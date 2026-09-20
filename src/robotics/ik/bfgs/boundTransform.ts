/**
 * Bounded-Variable Transformation for Box-Constrained Optimization
 *
 * Mathematical Reference:
 * Transforming a box-constrained problem:
 *   min f(x) subject to LB_i <= x_i <= UB_i
 * into an unconstrained problem in variable u in R^n:
 *   x_i(u_i) = LB_i + (UB_i - LB_i) / (1 + exp(-u_i))
 *
 * Inverse Transformation (logit):
 *   u_i = ln((x_i - LB_i) / (UB_i - x_i))
 *
 * Jacobian / Gradient Transformation by Chain Rule:
 *   dx_i / du_i = (UB_i - LB_i) * sigmoid(u_i) * (1 - sigmoid(u_i))
 *               = (x_i - LB_i) * (UB_i - x_i) / (UB_i - LB_i)
 *   [grad_u f(x(u))]_i = [grad_x f(x)]_i * (dx_i / du_i)
 */

export class BoxBoundTransform {
  readonly lowerBounds: number[];
  readonly upperBounds: number[];
  readonly dimension: number;

  constructor(lowerBounds: number[], upperBounds: number[]) {
    this.lowerBounds = [...lowerBounds];
    this.upperBounds = [...upperBounds];
    this.dimension = lowerBounds.length;
  }

  /**
   * Forward map: transforms unconstrained u in R^n to bounded x in (LB, UB)
   */
  toBounded(u: number[]): number[] {
    const x = new Array(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      const lb = this.lowerBounds[i];
      const ub = this.upperBounds[i];
      const range = ub - lb;
      if (range <= 1e-12) {
        x[i] = lb;
        continue;
      }
      const ui = u[i];
      // Numerically stable sigmoid:
      // If ui >= 0: 1 / (1 + exp(-ui))
      // If ui < 0:  exp(ui) / (1 + exp(ui))
      let sig: number;
      if (ui >= 0) {
        sig = 1 / (1 + Math.exp(-ui));
      } else {
        const expU = Math.exp(ui);
        sig = expU / (1 + expU);
      }
      x[i] = lb + range * sig;
    }
    return x;
  }

  /**
   * Inverse map: transforms bounded x in [LB, UB] to unconstrained u in R^n
   */
  toUnconstrained(x: number[]): number[] {
    const u = new Array(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      const lb = this.lowerBounds[i];
      const ub = this.upperBounds[i];
      const range = ub - lb;
      if (range <= 1e-12) {
        u[i] = 0;
        continue;
      }
      // Strict interior projection with safety margin epsilon = 1e-5
      const eps = Math.min(1e-5, range * 1e-4);
      const xi = Math.max(lb + eps, Math.min(ub - eps, x[i]));
      const ratio = (xi - lb) / (ub - xi);
      u[i] = Math.log(Math.max(1e-15, ratio));
    }
    return u;
  }

  /**
   * Computes the diagonal elements of the Jacobian dx/du
   */
  computeJacobianDiagonal(u: number[]): number[] {
    const diag = new Array(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      const lb = this.lowerBounds[i];
      const ub = this.upperBounds[i];
      const range = ub - lb;
      if (range <= 1e-12) {
        diag[i] = 0;
        continue;
      }
      const ui = u[i];
      let sig: number;
      if (ui >= 0) {
        sig = 1 / (1 + Math.exp(-ui));
      } else {
        const expU = Math.exp(ui);
        sig = expU / (1 + expU);
      }
      // dx_i / du_i = range * sig * (1 - sig)
      diag[i] = range * sig * (1 - sig);
    }
    return diag;
  }

  /**
   * Applies chain rule to map gradient in x-space to gradient in u-space:
   * grad_u = grad_x .* (dx/du)
   */
  transformGradient(gradX: number[], jacDiag: number[]): number[] {
    const gradU = new Array(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      gradU[i] = gradX[i] * jacDiag[i];
    }
    return gradU;
  }

  /**
   * Direct projection of x onto [LB, UB]
   */
  project(x: number[]): number[] {
    const proj = new Array(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      proj[i] = Math.max(this.lowerBounds[i], Math.min(this.upperBounds[i], x[i]));
    }
    return proj;
  }
}
