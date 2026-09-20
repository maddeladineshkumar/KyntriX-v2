import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Code2,
  Target,
  CheckCircle2,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import { MathView } from './MathView';

export interface TopicItem {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  mathExpression: string;
  mathExpressionBlock?: string;
  variables: { symbol: string; dimension: string; description: string }[];
  purpose: string;
  kyntrixRelation: string;
}

export const MATH_TOPICS: TopicItem[] = [
  {
    id: 1,
    title: '1. Inverse Kinematics',
    subtitle: 'Mapping desired SE(3) end-effector poses to joint space configuration',
    category: 'Kinematics & Error Manifolds',
    mathExpression: 'T(q) = T_{\\text{target}}, \\quad T(q) \\in \\text{SE}(3), \\; q \\in \\mathcal{Q} \\subset \\mathbb{R}^n',
    mathExpressionBlock: 'q^* = \\arg\\min_{q \\in [q_{\\min}, q_{\\max}]} \\mathcal{D}(T(q), T_{\\text{target}})',
    variables: [
      {
        symbol: 'q = [q_1, q_2, \\dots, q_n]^T',
        dimension: '\\mathbb{R}^n',
        description: 'Joint coordinate vector for an n-DOF serial manipulator (angles in radians for revolute joints, meters for prismatic joints).',
      },
      {
        symbol: 'T_{\\text{target}} = \\begin{bmatrix} R_{\\text{target}} & p_{\\text{target}} \\\\ 0 & 1 \\end{bmatrix}',
        dimension: '\\text{SE}(3) \\subset \\mathbb{R}^{4 \\times 4}',
        description: 'Desired target pose matrix consisting of orientation R_{\\text{target}} \\in \\text{SO}(3) and position p_{\\text{target}} \\in \\mathbb{R}^3.',
      },
      {
        symbol: 'T(q) = \\begin{bmatrix} R(q) & p(q) \\\\ 0 & 1 \\end{bmatrix}',
        dimension: '\\text{SE}(3) \\subset \\mathbb{R}^{4 \\times 4}',
        description: 'Forward kinematics pose of the robot tool end-effector calculated at joint configuration q.',
      },
      {
        symbol: '\\mathcal{D}(T_A, T_B)',
        dimension: '\\mathbb{R}_{\\ge 0}',
        description: 'Task-space metric distance function quantifying translational and rotational displacement on SE(3).',
      },
      {
        symbol: '\\mathcal{Q} = [q_{\\min}, q_{\\max}]',
        dimension: '\\prod_{j=1}^n [q_{\\min, j}, q_{\\max, j}] \\subset \\mathbb{R}^n',
        description: 'Box-constrained feasible joint manifold defined by physical actuator limits.',
      },
    ],
    purpose:
      'Inverse Kinematics (IK) determines actuator joint positions to place the robot end-effector at a desired Cartesian workspace pose. Because serial chains feature non-linear trigonometric couplings, closed-form analytical solutions only exist for decoupled designs (e.g. Pieper-compliant spherical wrists). Numerical optimization solves general serial manipulators of arbitrary DOF, joint offsets, and joint limits.',
    kyntrixRelation:
      'Orchestrated in `src/robotics/ik/smaBfgs/smaBfgsSolver.ts` via solveSMABFGSIK(robot, target, options). It is fully generic over manipulator DOF (tested on 2-DOF planar, 3-DOF PRP/RRP, 6-DOF Puma 560, ABB IRB 120/6620/6650, and Stanford arm).',
  },
  {
    id: 2,
    title: '2. Forward Kinematics',
    subtitle: 'Kinematic chain composition using Denavit-Hartenberg (DH) parameters',
    category: 'Kinematics & Error Manifolds',
    mathExpression: 'T_0^n(q) = T_{\\text{base}} \\cdot A_1(q_1) \\cdot A_2(q_2) \\cdots A_n(q_n) \\cdot T_{\\text{tool}}',
    mathExpressionBlock: 'A_i(q_i) = \\begin{bmatrix} \\cos\\theta_i & -\\sin\\theta_i\\cos\\alpha_i & \\sin\\theta_i\\sin\\alpha_i & a_i\\cos\\theta_i \\\\ \\sin\\theta_i & \\cos\\theta_i\\cos\\alpha_i & -\\cos\\theta_i\\sin\\alpha_i & a_i\\sin\\theta_i \\\\ 0 & \\sin\\alpha_i & \\cos\\alpha_i & d_i \\\\ 0 & 0 & 0 & 1 \\end{bmatrix}',
    variables: [
      {
        symbol: 'T_0^n(q)',
        dimension: '\\text{SE}(3) \\subset \\mathbb{R}^{4 \\times 4}',
        description: 'Total homogeneous transformation matrix mapping the tool tip coordinate frame to the robot world base frame.',
      },
      {
        symbol: 'A_i(q_i)',
        dimension: '\\text{SE}(3) \\subset \\mathbb{R}^{4 \\times 4}',
        description: 'Homogeneous link transformation matrix mapping link coordinate frame i to frame i-1 as a function of joint variable q_i.',
      },
      {
        symbol: '\\theta_i, d_i, a_i, \\alpha_i',
        dimension: '\\text{rad, m, m, rad}',
        description: 'Four classical Denavit-Hartenberg parameters: joint angle, link offset, link length, and link twist.',
      },
      {
        symbol: 'T_{\\text{base}}, T_{\\text{tool}}',
        dimension: '\\text{SE}(3) \\subset \\mathbb{R}^{4 \\times 4}',
        description: 'Fixed mounting pedestal and end-effector tool flange transformation offsets.',
      },
    ],
    purpose:
      'Provide the exact ground-truth mapping from configuration space q to task space SE(3). During optimization, forward kinematics is evaluated at every population candidate and line-search probe to compute real Cartesian positions and orientations.',
    kyntrixRelation:
      'Implemented in `src/robotics/kinematics/forwardKinematics.ts` via forwardKinematics(robot, q). Supports both standard and modified DH conventions, revolute and prismatic joints, home offsets, and base/tool transforms.',
  },
  {
    id: 3,
    title: '3. Objective Function',
    subtitle: 'Decoupled non-linear least-squares with Lie-algebra SO(3) geodesic error',
    category: 'Kinematics & Error Manifolds',
    mathExpression: 'f(q) = w_p \\cdot \\frac{1}{2} \\|e_p(q)\\|^2 + w_o \\cdot \\frac{1}{2} \\|e_o(q)\\|^2 + w_{\\text{limit}} \\cdot f_{\\text{penalty}}(q)',
    mathExpressionBlock: 'e_p(q) = p(q) - p_{\\text{target}} \\in \\mathbb{R}^3, \\quad e_o(q) = \\log\\left(R_{\\text{target}} R(q)^T\\right)^\\vee \\in \\mathfrak{so}(3) \\cong \\mathbb{R}^3',
    variables: [
      {
        symbol: 'e_p(q) \\in \\mathbb{R}^3',
        dimension: '\\mathbb{R}^3 \\text{ (meters)}',
        description: 'Translational Cartesian position error vector between current end-effector position p(q) and target p_{\\text{target}}.',
      },
      {
        symbol: 'e_o(q) \\in \\mathfrak{so}(3)',
        dimension: '\\mathbb{R}^3 \\text{ (radians)}',
        description: 'Exact geodesic rotational error on the SO(3) Lie group calculated via the matrix logarithmic map.',
      },
      {
        symbol: 'w_p, w_o, w_{\\text{limit}}',
        dimension: '\\mathbb{R}_{\\ge 0} \\text{ (dimensionless / scaled)}',
        description: 'Task-space weighting multipliers balancing translational precision (w_p), rotational alignment (w_o), and soft boundary margins (w_{\\text{limit}}).',
      },
      {
        symbol: 'f_{\\text{penalty}}(q)',
        dimension: '\\mathbb{R}_{\\ge 0}',
        description: 'Quadratic boundary barrier penalty active within a 2% margin of lower and upper joint limits.',
      },
      {
        symbol: 'f(q)',
        dimension: '\\mathbb{R}_{\\ge 0}',
        description: 'Scalar objective cost minimized towards zero (f(q^*) \\to 0 at exact convergence).',
      },
    ],
    purpose:
      'Formulate a smooth, differentiable scalar metric without artificial Euler angle gimbal lock or coordinate chart singularities. The Lie-algebra logarithmic map yields the shortest geodesic arc length on the curved SO(3) manifold.',
    kyntrixRelation:
      'Implemented in `src/robotics/ik/smaBfgs/objective.ts` via IKObjectiveEvaluator.evaluate(q) and evaluateBreakdown(q). Position-only mode dynamically zeroes w_o for under-actuated arms (DOF < 6).',
  },
  {
    id: 4,
    title: '4. Slime Mould Algorithm (SMA)',
    subtitle: 'Bio-inspired metaheuristic global exploration (Li et al., 2020)',
    category: 'Global Exploration (SMA)',
    mathExpression: 'X_i^j(t+1) = \\begin{cases} \\text{rand}(LB_j, UB_j), & r_1 < z \\\\ X_b^j(t) + v_b^j \\cdot (W^j \\cdot X_A^j(t) - X_B^j(t)), & r_1 \\ge z, \\; r_2 < p_i \\\\ v_c^j \\cdot X_i^j(t), & r_1 \\ge z, \\; r_2 \\ge p_i \\end{cases}',
    mathExpressionBlock: 'p_i = \\tanh |S(i) - bF|, \\quad W(i, j) = 1 \\pm r \\cdot \\log_{10}\\left(\\frac{bF - S(i)}{bF - wF} + 1\\right)',
    variables: [
      {
        symbol: 'X_i \\in \\mathbb{R}^n',
        dimension: '\\mathbb{R}^n',
        description: 'Joint coordinate candidate vector of agent i in a population of size N.',
      },
      {
        symbol: 'X_b \\in \\mathbb{R}^n, \\; bF, wF',
        dimension: '\\mathbb{R}^n, \\; \\mathbb{R}',
        description: 'Current global best individual and corresponding best (bF) and worst (wF) population fitness values.',
      },
      {
        symbol: 'p_i = \\tanh |S(i) - bF|',
        dimension: '[0, 1)',
        description: 'Bio-nutrient feedback probability balancing exploitation around best food source and venous contraction exploration.',
      },
      {
        symbol: 'X_A(t), X_B(t) \\in \\mathbb{R}^n',
        dimension: '\\mathbb{R}^n',
        description: 'Two distinct candidate individuals randomly sampled from the current swarm population.',
      },
      {
        symbol: 'S(i) = f(X_i)',
        dimension: '\\mathbb{R}',
        description: 'Objective fitness score of individual agent i.',
      },
      {
        symbol: 'W \\in \\mathbb{R}^{N \\times n}',
        dimension: '\\mathbb{R}^{N \\times n}',
        description: 'Adaptive odor concentration weight matrix simulating venous contraction and bio-nutrient feedback.',
      },
      {
        symbol: 'v_b \\in [-a, a]^n, \\; v_c \\in [-b, b]^n',
        dimension: '\\mathbb{R}^n',
        description: 'Random oscillation vectors where a = \\text{arctanh}(1 - t/T_{\\max}) and b = 1 - t/T_{\\max}.',
      },
      {
        symbol: 'z = 0.03, \\; r_1, r_2, r \\sim U(0, 1)',
        dimension: '\\mathbb{R}',
        description: 'Uniform random scaling parameters and canonical exploration jump threshold (z = 0.03).',
      },
    ],
    purpose:
      'Perform stochastic global exploration across the bounded configuration hyper-rectangle. Escapes local kinematic minima, interior singularities, and joint limit walls to identify the global basin of attraction.',
    kyntrixRelation:
      'Implemented in `src/robotics/ik/sma/smaOptimizer.ts` via runCanonicalSMA(problem, params). Adheres strictly to Li et al. (2020) canonical equations and uses SeededRandom for deterministic execution.',
  },
  {
    id: 5,
    title: '5. BFGS Optimization',
    subtitle: 'Broyden-Fletcher-Goldfarb-Shanno Quasi-Newton unconstrained local search',
    category: 'Quasi-Newton & BFGS',
    mathExpression: 'H_{k+1} = (I - \\rho_k s_k y_k^T) H_k (I - \\rho_k y_k s_k^T) + \\rho_k s_k s_k^T, \\quad \\rho_k = \\frac{1}{y_k^T s_k}',
    mathExpressionBlock: 'p_k = - H_k g_k \\in \\mathbb{R}^n, \\quad q_{k+1} = q_k + \\alpha_k p_k, \\quad s_k = q_{k+1} - q_k, \\quad y_k = g_{k+1} - g_k',
    variables: [
      {
        symbol: 'H_k \\in \\mathbb{R}^{n \\times n}',
        dimension: '\\mathbb{R}^{n \\times n}',
        description: 'Symmetric positive-definite inverse Hessian approximation matrix (initialized to H_0 = I_n).',
      },
      {
        symbol: 'g_k = \\nabla f(q_k)',
        dimension: '\\mathbb{R}^n',
        description: 'Objective function gradient column vector at iteration k.',
      },
      {
        symbol: 'p_k \\in \\mathbb{R}^n',
        dimension: '\\mathbb{R}^n',
        description: 'Quasi-Newton descent search direction computed as p_k = -H_k g_k.',
      },
      {
        symbol: '\\alpha_k > 0',
        dimension: '\\mathbb{R}',
        description: 'Step length parameter determined by line search satisfying the Strong Wolfe conditions.',
      },
      {
        symbol: 's_k, y_k \\in \\mathbb{R}^n',
        dimension: '\\mathbb{R}^n',
        description: 'Variable displacement s_k = \\alpha_k p_k and gradient difference y_k = g_{k+1} - g_k.',
      },
      {
        symbol: '\\rho_k = (y_k^T s_k)^{-1}',
        dimension: '\\mathbb{R}',
        description: 'Scalar normalization factor defined by the secant curvature condition.',
      },
    ],
    purpose:
      'Provide superlinear local convergence by updating an inverse Hessian operator using only gradient differences. It drives tracking errors from millimeters down to sub-micrometer precision in tens of iterations without expensive second derivatives.',
    kyntrixRelation:
      'Implemented in `src/robotics/ik/bfgs/bfgsOptimizer.ts` via runStandardBFGS(problem, params). Follows Nocedal & Wright (2006) Eq. 6.17 and provides complete iteration-by-iteration diagnostic telemetry.',
  },
  {
    id: 6,
    title: '6. Quasi-Newton Concept',
    subtitle: 'Secant approximation of second-order curvature from first-order gradient histories',
    category: 'Quasi-Newton & BFGS',
    mathExpression: 'B_{k+1} s_k = y_k \\quad \\iff \\quad H_{k+1} y_k = s_k \\quad \\text{(Secant Equation)}',
    mathExpressionBlock: 'm_k(p) = f(q_k) + \\nabla f(q_k)^T p + \\frac{1}{2} p^T B_k p \\approx f(q_k + p)',
    variables: [
      {
        symbol: 'B_k \\in \\mathbb{R}^{n \\times n}',
        dimension: '\\mathbb{R}^{n \\times n}',
        description: 'Direct Hessian approximation matrix modeling local Riemannian curvature \\nabla^2 f(q_k).',
      },
      {
        symbol: 'H_k = B_k^{-1}',
        dimension: '\\mathbb{R}^{n \\times n}',
        description: 'Inverse Hessian approximation matrix directly mapping gradients to search directions without matrix inversion.',
      },
      {
        symbol: 's_k, y_k \\in \\mathbb{R}^n',
        dimension: '\\mathbb{R}^n',
        description: 'Displacements in variable space and gradient space over the most recent optimization step.',
      },
      {
        symbol: 'm_k(p)',
        dimension: '\\mathbb{R}',
        description: 'Local quadratic model Taylor expansion around configuration q_k.',
      },
    ],
    purpose:
      'Classical Newton optimization requires computing and inverting the true Hessian matrix at every step, requiring O(n^3) floating-point operations. Quasi-Newton algorithms iteratively approximate the inverse curvature using only gradient vectors in O(n^2) operations per step.',
    kyntrixRelation:
      'Serves as the theoretical foundation for `src/robotics/ik/bfgs/bfgsOptimizer.ts`. Enables high-frequency real-time IK solving inside web browsers without external linear algebra solvers.',
  },
  {
    id: 7,
    title: '7. Gradient Computation',
    subtitle: 'Analytical Geometric Jacobian transpose vs Central Finite Differences',
    category: 'Quasi-Newton & BFGS',
    mathExpression: '\\nabla_q f(q) = w_p J_v(q)^T e_p(q) - w_o J_\\omega(q)^T e_o(q) \\in \\mathbb{R}^n',
    mathExpressionBlock: '[\\nabla_q f(q)]_j \\approx \\frac{f(q + h e_j) - f(q - h e_j)}{2h} + \\mathcal{O}(h^2), \\quad h = 10^{-6}',
    variables: [
      {
        symbol: '\\nabla_q f(q)',
        dimension: '\\mathbb{R}^n',
        description: 'First derivative gradient column vector of the scalar kinematic objective f(q).',
      },
      {
        symbol: 'J(q) = \\begin{bmatrix} J_v(q) \\\\ J_\\omega(q) \\end{bmatrix}',
        dimension: '\\mathbb{R}^{6 \\times n}',
        description: 'Geometric manipulator Jacobian matrix decomposed into linear (J_v \\in \\mathbb{R}^{3 \\times n}) and angular (J_\\omega \\in \\mathbb{R}^{3 \\times n}) sub-matrices.',
      },
      {
        symbol: 'e_p(q), e_o(q)',
        dimension: '\\mathbb{R}^3, \\; \\mathbb{R}^3',
        description: 'Cartesian position and Lie-algebra rotational error vectors.',
      },
      {
        symbol: 'e_j \\in \\mathbb{R}^n',
        dimension: '\\mathbb{R}^n',
        description: 'Canonical j-th unit basis column vector used for directional perturbation.',
      },
      {
        symbol: 'h = 10^{-6}',
        dimension: '\\mathbb{R}',
        description: 'Perturbation increment for numerical central difference derivative verification.',
      },
    ],
    purpose:
      'Supply exact directional derivatives to the Quasi-Newton optimizer and line search. The analytical Jacobian transpose formulation computes exact derivatives in O(n) operations, avoiding numerical differentiation truncation errors.',
    kyntrixRelation:
      'Implemented in `src/robotics/ik/smaBfgs/objective.ts` via computeAnalyticalGradient(q) and computeFiniteDifferenceGradient(q). Validated in unit test suite with exact agreement to within 1e-6.',
  },
  {
    id: 8,
    title: '8. Hessian Matrix',
    subtitle: 'Second-order partial derivatives, local Riemannian curvature, and Gauss-Newton approximation',
    category: 'Quasi-Newton & BFGS',
    mathExpression: '\\nabla^2 f(q) = w_p J_v^T J_v + w_o J_\\omega^T J_\\omega + \\sum_{i=1}^3 w_p e_{p, i} \\nabla^2 p_i(q) + \\dots \\in \\mathbb{R}^{n \\times n}',
    mathExpressionBlock: '\\nabla^2 f(q) \\approx w_p J_v^T J_v + w_o J_\\omega^T J_\\omega \\quad \\text{(Gauss-Newton drops } \\sum e_i \\nabla^2 e_i \\approx 0 \\text{)}',
    variables: [
      {
        symbol: '\\nabla^2 f(q)',
        dimension: '\\mathbb{R}^{n \\times n}',
        description: 'Symmetric second-order derivative matrix defining the local curvature tensor of the objective function.',
      },
      {
        symbol: 'J_v^T J_v, \\; J_\\omega^T J_\\omega',
        dimension: '\\mathbb{R}^{n \\times n}',
        description: 'First-order products forming the positive-semidefinite Gauss-Newton Hessian core.',
      },
      {
        symbol: '\\sum_{i=1}^3 e_{p, i} \\nabla^2 p_i',
        dimension: '\\mathbb{R}^{n \\times n}',
        description: 'Second-order residual-Hessian coupling tensor that vanishes near zero tracking error.',
      },
      {
        symbol: '\\lambda_1 \\le \\lambda_2 \\le \\dots \\le \\lambda_n',
        dimension: '\\mathbb{R}',
        description: 'Hessian eigenvalues. Strict positive definiteness (all \\lambda_i > 0) guarantees local strong convexity.',
      },
      {
        symbol: '\\kappa = \\frac{\\lambda_{\\max}}{\\lambda_{\\min}}',
        dimension: '\\mathbb{R}_{\\ge 1}',
        description: 'Hessian condition number. High values characterize ill-conditioned narrow kinematic valleys.',
      },
    ],
    purpose:
      'Characterize the local curvature of the kinematic error surface. Analytical calculation of the exact Hessian requires differentiating the geometric Jacobian with respect to joints (Christoffel symbols), which is computationally intense and error-prone.',
    kyntrixRelation:
      'Because exact Hessian evaluation requires third-order kinematic tensors, KyntriX bypasses direct Hessian assembly by using BFGS to approximate the inverse Hessian H_k directly from first derivatives.',
  },
  {
    id: 9,
    title: '9. Inverse-Hessian Approximation',
    subtitle: 'Direct low-rank rank-2 update maintaining symmetric positive definiteness',
    category: 'Quasi-Newton & BFGS',
    mathExpression: 'H_{k+1} = V_k^T H_k V_k + \\rho_k s_k s_k^T, \\quad V_k = I - \\rho_k y_k s_k^T',
    mathExpressionBlock: 'H_{k+1} = H_k + \\frac{s_k^T y_k + y_k^T H_k y_k}{(s_k^T y_k)^2} s_k s_k^T - \\frac{H_k y_k s_k^T + s_k y_k^T H_k}{s_k^T y_k}',
    variables: [
      {
        symbol: 'H_k \\in \\mathbb{R}^{n \\times n}',
        dimension: '\\mathbb{R}^{n \\times n}',
        description: 'Approximate inverse Hessian matrix at step k, with initial identity H_0 = I_n.',
      },
      {
        symbol: 'V_k = I - \\rho_k y_k s_k^T',
        dimension: '\\mathbb{R}^{n \\times n}',
        description: 'Skew projection operator used in the product representation of the BFGS update.',
      },
      {
        symbol: 's_k = q_{k+1} - q_k, \\; y_k = g_{k+1} - g_k',
        dimension: '\\mathbb{R}^n, \\; \\mathbb{R}^n',
        description: 'Joint coordinate displacement vector and gradient difference vector.',
      },
      {
        symbol: '\\rho_k = (y_k^T s_k)^{-1}',
        dimension: '\\mathbb{R}',
        description: 'Scalar normalization factor defined by the secant curvature condition.',
      },
      {
        symbol: '\\text{tr}(H_k) = \\sum_{i=1}^n H_{k, ii}',
        dimension: '\\mathbb{R}',
        description: 'Trace of the inverse Hessian matrix tracked as a diagnostic invariant in execution telemetry.',
      },
    ],
    purpose:
      'Directly compute Quasi-Newton search directions p_k = -H_k g_k using matrix-vector multiplication in O(n^2) operations without solving a linear system. The BFGS formula exhibits self-correcting numerical behavior against roundoff errors.',
    kyntrixRelation:
      'Implemented in `src/robotics/ik/bfgs/bfgsOptimizer.ts` lines 211–245. Includes real-time trace telemetry (inverseHessianTrace) and diagonal inspection in the Step-by-Step UI.',
  },
  {
    id: 10,
    title: '10. Line Search',
    subtitle: 'Strong Wolfe conditions with bracket zoom search safeguarding step stability',
    category: 'Quasi-Newton & BFGS',
    mathExpression: 'f(q_k + \\alpha_k p_k) \\le f(q_k) + c_1 \\alpha_k \\nabla f(q_k)^T p_k \\quad \\text{(Armijo Sufficient Decrease)}',
    mathExpressionBlock: '|\\nabla f(q_k + \\alpha_k p_k)^T p_k| \\le c_2 |\\nabla f(q_k)^T p_k| \\quad \\text{(Strong Curvature Condition)}',
    variables: [
      {
        symbol: '\\alpha_k > 0',
        dimension: '\\mathbb{R}',
        description: 'Step length parameter scaling search direction p_k.',
      },
      {
        symbol: 'p_k \\in \\mathbb{R}^n',
        dimension: '\\mathbb{R}^n',
        description: 'Descent direction satisfying \\nabla f(q_k)^T p_k < 0.',
      },
      {
        symbol: '\\nabla f(q_k)^T p_k',
        dimension: '\\mathbb{R}',
        description: 'Directional derivative along descent direction p_k (guaranteed negative for valid descent).',
      },
      {
        symbol: 'c_1 = 10^{-4}',
        dimension: '\\mathbb{R}',
        description: 'Armijo parameter enforcing sufficient decrease relative to linear prediction.',
      },
      {
        symbol: 'c_2 = 0.9',
        dimension: '\\mathbb{R}',
        description: 'Curvature parameter enforcing sufficient reduction in directional slope.',
      },
    ],
    purpose:
      'Guarantee global convergence of Quasi-Newton iterations. Uncontrolled unit steps (\\alpha=1) can overshoot non-linear valleys or destabilize in ill-conditioned regions. The Strong Wolfe conditions guarantee that every step achieves sufficient descent and satisfies the curvature condition.',
    kyntrixRelation:
      'Implemented in `src/robotics/ik/bfgs/lineSearch.ts` via performLineSearch(). Employs a bracket expansion phase followed by a bisection zoom search with fallback step safeguards.',
  },
  {
    id: 11,
    title: '11. Curvature Condition',
    subtitle: 'Positivity of inner product s_k^T y_k > 0 guaranteeing positive definiteness',
    category: 'Quasi-Newton & BFGS',
    mathExpression: 's_k^T y_k = (\\alpha_k p_k)^T (g_{k+1} - g_k) > 0',
    mathExpressionBlock: 'H_k \\succ 0 \\; \\land \\; s_k^T y_k > 0 \\implies H_{k+1} \\succ 0',
    variables: [
      {
        symbol: 's_k = q_{k+1} - q_k',
        dimension: '\\mathbb{R}^n',
        description: 'Step coordinate displacement vector.',
      },
      {
        symbol: 'y_k = g_{k+1} - g_k',
        dimension: '\\mathbb{R}^n',
        description: 'Gradient difference vector between successive iterates.',
      },
      {
        symbol: 's_k^T y_k',
        dimension: '\\mathbb{R}',
        description: 'Inner product measuring directional curvature change along the step trajectory.',
      },
      {
        symbol: 'H \\succ 0',
        dimension: '\\text{Property}',
        description: 'Strict matrix positive definiteness: v^T H v > 0, \\; \\forall v \\ne 0.',
      },
    ],
    purpose:
      'Preserve the positive definiteness of the inverse Hessian matrix H_k. If s_k^T y_k \\le 0, updating H_k would introduce negative eigenvalues, causing subsequent Quasi-Newton search directions p_{k+1} = -H_{k+1} g_{k+1} to point uphill.',
    kyntrixRelation:
      'Checked at every iteration in `src/robotics/ik/bfgs/bfgsOptimizer.ts` line 209. If s_k^T y_k \\le 10^{-10}, the BFGS update is safely skipped (updateStatus: Skipped (Curvature <= 0)), preventing matrix breakdown.',
  },
  {
    id: 12,
    title: '12. Joint Limits & Bound Handling',
    subtitle: 'Smooth sigmoid variable transformation vs projected gradient methods',
    category: 'Bound Handling & Robustness',
    mathExpression: 'q_j(u_j) = q_{\\min, j} + \\frac{q_{\\max, j} - q_{\\min, j}}{1 + e^{-u_j}}, \\quad u_j \\in (-\\infty, +\\infty)',
    mathExpressionBlock: '[\\nabla_u f]_j = [\\nabla_q f]_j \\cdot \\frac{dq_j}{du_j}, \\quad \\frac{dq_j}{du_j} = (q_{\\max, j} - q_{\\min, j}) \\sigma(u_j)(1 - \\sigma(u_j))',
    variables: [
      {
        symbol: 'q_j \\in [q_{\\min, j}, q_{\\max, j}]',
        dimension: '\\mathbb{R} \\text{ (rad or m)}',
        description: 'Physical joint coordinate bounded by actuator limits.',
      },
      {
        symbol: 'q_{\\min, j}, q_{\\max, j}',
        dimension: '\\mathbb{R}',
        description: 'Physical lower and upper mechanical travel limits for joint j.',
      },
      {
        symbol: 'u_j \\in \\mathbb{R}',
        dimension: '\\mathbb{R}',
        description: 'Unconstrained optimization variable mapped smoothly across the real line.',
      },
      {
        symbol: '\\sigma(u_j) = \\frac{1}{1 + e^{-u_j}}',
        dimension: '(0, 1)',
        description: 'Standard logistic sigmoid transformation function.',
      },
      {
        symbol: '\\frac{dq_j}{du_j}',
        dimension: '\\mathbb{R}',
        description: 'Coordinate transformation Jacobian diagonal entry scale factor.',
      },
    ],
    purpose:
      'Transform box-constrained optimization into an unconstrained problem. Silently clamping variables after BFGS steps violates the secant equation and invalidates the inverse Hessian approximation. The smooth C^\\infty sigmoid map naturally drives \\nabla_u f \\to 0 near boundaries, strictly preventing joint limit violations.',
    kyntrixRelation:
      'Implemented in `src/robotics/ik/bfgs/boundTransform.ts` via BoxBoundTransform. Also provides projected-armijo boundary projection as an alternate selectable mode in solver settings.',
  },
  {
    id: 13,
    title: '13. Convergence Criteria',
    subtitle: 'Rigorous multi-metric termination and physical workspace validation',
    category: 'Bound Handling & Robustness',
    mathExpression: '\\|\\nabla f(q_k)\\| < \\epsilon_{\\text{grad}} \\quad \\lor \\quad f(q_k) \\le \\epsilon_{\\text{obj}} \\quad \\lor \\quad (\\Delta f < \\epsilon_{\\text{func}} \\land \\|s_k\\| < \\epsilon_{\\text{step}})',
    mathExpressionBlock: '\\text{Validation: } \\|p(q^*) - p_{\\text{target}}\\|_2 \\le \\text{tol}_{\\text{pos}} \\; \\land \\; \\|e_o(q^*)\\|_2 \\le \\text{tol}_{\\text{ori}} \\; \\land \\; q^* \\in [q_{\\min}, q_{\\max}]',
    variables: [
      {
        symbol: '\\epsilon_{\\text{grad}} = 10^{-6}',
        dimension: '\\mathbb{R}',
        description: 'Gradient norm tolerance marking a first-order stationary point (zero slope).',
      },
      {
        symbol: '\\epsilon_{\\text{obj}} = 10^{-8}',
        dimension: '\\mathbb{R}',
        description: 'Scalar objective value threshold indicating negligible kinematics tracking error.',
      },
      {
        symbol: '\\Delta f = |f(q_{k+1}) - f(q_k)|',
        dimension: '\\mathbb{R}',
        description: 'Objective function decrease between consecutive iterations.',
      },
      {
        symbol: '\\epsilon_{\\text{func}} = 10^{-12}, \\; \\epsilon_{\\text{step}} = 10^{-10}',
        dimension: '\\mathbb{R}',
        description: 'Stagnation thresholds detecting flat manifolds and step contraction.',
      },
      {
        symbol: '\\text{tol}_{\\text{pos}}, \\text{tol}_{\\text{ori}}',
        dimension: '\\text{m, rad}',
        description: 'Physical Cartesian workspace tolerances requested by the user (default: 1 mm position, 0.01 rad orientation).',
      },
    ],
    purpose:
      'Prevent infinite iteration loops while guaranteeing that convergence is declared only when genuine stationarity and physical tolerances are achieved. Never report convergence based solely on iteration counts.',
    kyntrixRelation:
      'Evaluated during BFGS execution in `src/robotics/ik/bfgs/bfgsOptimizer.ts` lines 289–310 and independently certified post-flight by IKValidationOracle in `src/robotics/ik/smaBfgs/validation.ts`.',
  },
  {
    id: 14,
    title: '14. Numerical Failure Modes',
    subtitle: 'Defensive handling of non-finite values, singularities, and infeasible targets',
    category: 'Bound Handling & Robustness',
    mathExpression: '\\exists j \\text{ s.t. } \\neg\\text{isFinite}(q_j) \\lor \\neg\\text{isFinite}(f(q)) \\implies \\text{NUMERICAL\\_FAILURE}',
    mathExpressionBlock: '\\|p_{\\text{target}} - p_{\\text{base}}\\| > \\sum_{i=1}^n (a_i + |d_i|) \\implies \\text{INFEASIBLE\\_OR\\_UNREACHABLE\\_TARGET}',
    variables: [
      {
        symbol: '\\text{isFinite}(v)',
        dimension: '\\text{Boolean}',
        description: 'IEEE-754 finite numerical check guarding against NaN, +Infinity, and -Infinity values.',
      },
      {
        symbol: '\\|p_{\\text{target}} - p_{\\text{base}}\\|',
        dimension: '\\mathbb{R} \\text{ (meters)}',
        description: 'Euclidean distance from robot base mounting origin to the target position.',
      },
      {
        symbol: '\\sum_{i=1}^n (a_i + |d_i|)',
        dimension: '\\mathbb{R} \\text{ (meters)}',
        description: 'Theoretical upper bound on kinematic reach calculated from manipulator link lengths and offsets.',
      },
      {
        symbol: '\\text{ValidationStatus}',
        dimension: '\\text{Enum}',
        description: 'Exhaustive outcome enum: CONVERGED, MAXIMUM_ITERATIONS_REACHED, TOLERANCE_NOT_REACHED, NUMERICAL_FAILURE, INFEASIBLE_OR_UNREACHABLE_TARGET, CONSTRAINT_VIOLATION.',
      },
    ],
    purpose:
      'Provide deterministic error diagnostics for robotics applications. Real numerical solvers must never crash silently, return corrupted NaN joint angles, or report false solutions when targets lie outside reachable workspace or in singular configurations.',
    kyntrixRelation:
      'Enforced in `src/robotics/ik/smaBfgs/validation.ts` by validateIKSolution(). Tested against NaN target inputs, antipodal angles, and out-of-reach coordinates in `tests/ik/smaBfgsSolver.test.ts`.',
  },
  {
    id: 15,
    title: '15. Hybrid Optimization Strategy',
    subtitle: 'Two-phase global exploration + local refinement architecture for non-convex IK',
    category: 'Hybrid Architecture',
    mathExpression: 'q^{(0)}_{\\text{BFGS}} = \\arg\\min_{i \\in \\{1,\\dots,N\\}} f(X_i(T_{\\text{SMA}})) \\quad \\xrightarrow{\\text{seed}} \\quad q^* = \\lim_{k \\to K} \\Phi_{\\text{BFGS}}^k(q^{(0)}_{\\text{BFGS}})',
    mathExpressionBlock: '\\text{Phase A: Global SMA Exploration} \\longrightarrow \\text{Phase B: Local BFGS Refinement} \\longrightarrow \\text{Phase C: Independent Validation}',
    variables: [
      {
        symbol: 'X_i(t) \\in \\mathbb{R}^n',
        dimension: '\\mathbb{R}^n',
        description: 'SMA population candidate configurations exploring the global joint space manifold.',
      },
      {
        symbol: 'T_{\\text{SMA}}, \\; K',
        dimension: '\\mathbb{N}, \\; \\mathbb{N}',
        description: 'Allocated iteration budgets for Phase A (global SMA exploration) and Phase B (local BFGS refinement).',
      },
      {
        symbol: 'q^{(0)}_{\\text{BFGS}} \\in \\mathbb{R}^n',
        dimension: '\\mathbb{R}^n',
        description: 'Best candidate seed selected from the final SMA population to initialize BFGS.',
      },
      {
        symbol: '\\Phi_{\\text{BFGS}}',
        dimension: '\\mathbb{R}^n \\to \\mathbb{R}^n',
        description: 'Deterministic Quasi-Newton update mapping generating descent trajectory.',
      },
      {
        symbol: 'q^* \\in \\mathbb{R}^n',
        dimension: '\\mathbb{R}^n',
        description: 'Final optimized joint configuration validated against independent forward kinematics.',
      },
    ],
    purpose:
      'Combine global exploration (escaping local minima, joint limit barriers, and kinematic singularities) with superlinear local refinement (driving residual errors down to sub-micrometers without stochastic jitter).',
    kyntrixRelation:
      'The core orchestrator of KyntriX SMA-BFGS Studio in `src/robotics/ik/smaBfgs/smaBfgsSolver.ts`. Seamlessly sequences Phase A (SMA) -> Phase B (BFGS) -> Phase C (Validation Oracle).',
  },
];

export const MathExplanationSection: React.FC = () => {
  const [activeTopic, setActiveTopic] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter topics if user entered search query
  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return MATH_TOPICS;
    return MATH_TOPICS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q) ||
        t.kyntrixRelation.toLowerCase().includes(q) ||
        t.variables.some(
          (v) =>
            v.symbol.toLowerCase().includes(q) ||
            v.description.toLowerCase().includes(q)
        )
    );
  }, [searchQuery]);

  const current = MATH_TOPICS[activeTopic];

  const handleSelectTopic = (id: number) => {
    const idx = MATH_TOPICS.findIndex((t) => t.id === id);
    if (idx >= 0) {
      setActiveTopic(idx);
    }
  };

  const handlePrev = () => {
    setActiveTopic((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setActiveTopic((prev) => Math.min(MATH_TOPICS.length - 1, prev + 1));
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <span>Mathematical Foundation & Algorithmic Rigor</span>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                Section 19
              </span>
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              15 canonical mathematical formulations, variable definitions, and theoretical proofs implemented in KyntriX
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search theory topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-stone-800 placeholder-stone-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Navigation Sidebar: All 15 Topics */}
        <div className="lg:col-span-4 max-h-[660px] overflow-y-auto space-y-1.5 pr-1">
          {filteredTopics.length === 0 ? (
            <div className="p-4 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
              No matching mathematical topics found.
            </div>
          ) : (
            filteredTopics.map((t) => {
              const isSelected = MATH_TOPICS[activeTopic].id === t.id;
              return (
                <button
                  key={t.id}
                  data-testid="sidebar-topic-btn"
                  type="button"
                  onClick={() => handleSelectTopic(t.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isSelected
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {String(t.id).padStart(2, '0')}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold tracking-wider truncate ${
                          isSelected ? 'text-amber-100' : 'text-stone-400'
                        }`}
                      >
                        {t.category}
                      </span>
                    </div>
                    <span className="text-xs font-black block truncate">{t.title}</span>
                    <span
                      className={`text-[10px] block truncate ${
                        isSelected ? 'text-amber-100' : 'text-stone-400'
                      }`}
                    >
                      {t.subtitle}
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-white' : 'text-stone-400'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Detailed Topic Content Pane */}
        <div className="lg:col-span-8 p-4 sm:p-5 rounded-xl bg-stone-50/60 border border-stone-200 text-xs text-stone-800 space-y-4 max-h-[660px] overflow-y-auto">
          {/* Topic Title and Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                  Topic {current.id} of {MATH_TOPICS.length}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-700 text-[10px] font-bold">
                  {current.category}
                </span>
              </div>
              <h4 className="text-base font-black text-stone-900">{current.title}</h4>
              <span className="text-xs font-bold text-stone-500 block">
                {current.subtitle}
              </span>
            </div>

            {/* Quick Sequential Navigation in Header */}
            <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
              <button
                type="button"
                data-testid="prev-topic-btn"
                onClick={handlePrev}
                disabled={activeTopic === 0}
                className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Previous Topic"
                aria-label="Previous Topic"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-stone-500 font-bold px-1">
                {current.id} / {MATH_TOPICS.length}
              </span>
              <button
                type="button"
                data-testid="next-topic-btn"
                onClick={handleNext}
                disabled={activeTopic === MATH_TOPICS.length - 1}
                className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Next Topic"
                aria-label="Next Topic"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section A: Mathematical Expression */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-stone-900 text-xs">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Exact Mathematical Formulation</span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2 overflow-x-auto">
              <div className="text-center py-1">
                <MathView block math={current.mathExpression} />
              </div>
              {current.mathExpressionBlock && (
                <div className="text-center pt-1 border-t border-stone-200/60">
                  <MathView block math={current.mathExpressionBlock} />
                </div>
              )}
            </div>
          </div>

          {/* Section B: Variable Definitions & Dimensions */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-stone-900 text-xs">
              <Target className="w-3.5 h-3.5 text-purple-600" />
              <span>Variable Definitions & Dimensions</span>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-bold">
                      <th className="py-1 px-2">Symbol</th>
                      <th className="py-1 px-2">Dimension</th>
                      <th className="py-1 px-2">Physical / Mathematical Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {current.variables.map((v, i) => (
                      <tr key={i} className="hover:bg-stone-50/50">
                        <td className="py-1.5 px-2 font-mono font-medium text-stone-900 whitespace-nowrap">
                          <MathView math={v.symbol} />
                        </td>
                        <td className="py-1.5 px-2 font-mono text-purple-800 whitespace-nowrap">
                          <MathView math={v.dimension} />
                        </td>
                        <td className="py-1.5 px-2 text-stone-700 leading-relaxed">
                          {v.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section C: Purpose & Mathematical Rationale */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-stone-900 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Purpose & Theoretical Rationale</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-stone-200 text-stone-700 leading-relaxed text-[11px]">
              {current.purpose}
            </div>
          </div>

          {/* Section D: Direct Relation to KyntriX Implementation */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
              <Code2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Direct Relation to KyntriX Implementation</span>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-stone-800 leading-relaxed text-[11px]">
              {current.kyntrixRelation}
            </div>
          </div>

          {/* Sequential Step Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-xs">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeTopic === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>
                {activeTopic > 0 ? `Prev: Topic ${MATH_TOPICS[activeTopic - 1].id}` : 'At Beginning'}
              </span>
            </button>

            <span className="text-[11px] text-stone-400 font-medium hidden sm:inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Section 19 Theoretical Curriculum</span>
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={activeTopic === MATH_TOPICS.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium cursor-pointer"
            >
              <span>
                {activeTopic < MATH_TOPICS.length - 1
                  ? `Next: Topic ${MATH_TOPICS[activeTopic + 1].id}`
                  : 'Curriculum Complete'}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
