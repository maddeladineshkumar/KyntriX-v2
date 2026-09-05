# RoboAnalyzer 6-DOF FK / IK / DH Verification Report

**Audit date:** 2026-09-05  
**Repository:** `maddeladineshkumar/Robo`  
**Audited model:** `skeleton_6R` / Skeleton 6R  
**Robot type:** six revolute joints, six degrees of freedom  
**DH convention:** Standard Denavit-Hartenberg  
**Units in the mathematical engine:** metres and radians

---

## Executive result

The six-DOF Skeleton 6R model was checked with 15 fixed, manually selected joint configurations. FK and IK were validated independently, with no answer-dependent IK seed.

| Audit | Cases | Passed | Failed | Error rate |
|---|---:|---:|---:|---:|
| Independent FK matrix comparison | 15 | 15 | 0 | **0.00%** |
| IK position and orientation residual | 15 | 15 | 0 | **0.00%** |
| IK joint-limit validation | 15 | 15 | 0 | **0.00%** |

Worst measured residuals:

- Maximum FK matrix-element error: **0.000e+0**
- Maximum IK position error: **1.759e-6 m** = **0.001759 mm**
- Maximum IK orientation error: **2.107e-8 rad**
- Mean IK position error: **2.000e-7 m**
- Mean IK orientation error: **5.619e-9 rad**

All cases passed the strict acceptance limits:

- Position: `< 1.0e-4 m` (0.1 mm)
- Orientation: `< 1.0e-3 rad` (approximately 0.057°)
- All returned joint values finite and within declared limits

The model and solver are working correctly for this 15-case audit. This result is evidence-based and reproducible; it is not a mathematical guarantee for every possible pose, especially arbitrary unreachable or singular targets.

---

## 1. Model and DH table

The audited source is `src/data/robots/skeleton_6R.json`. Its six joints are revolute, its convention is `standard`, and every joint has limits of -180° to +180°.

### Canonical SI table

| Joint | Type | θ constant | d (m) | a (m) | α (rad) | Offset | Min (rad) | Max (rad) | Home (rad) |
|---:|:---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | R | 0 | 0.400 | 0.180 | +π/2 | 0 | -π | +π | 0 |
| 2 | R | 0 | 0.135 | 0.600 | +π | 0 | -π | +π | 0 |
| 3 | R | 0 | 0.135 | 0.120 | -π/2 | 0 | -π | +π | 0 |
| 4 | R | 0 | 0.620 | 0.000 | +π/2 | 0 | -π | +π | 0 |
| 5 | R | 0 | 0.000 | 0.000 | -π/2 | 0 | -π | +π | 0 |
| 6 | R | 0 | 0.000 | 0.000 | 0 | 0 | -π | +π | 0 |

### Default UI table

| Joint | Type | θ (°) | d (mm) | a (mm) | α (°) | Offset | Min (°) | Max (°) |
|---:|:---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | R | 0 | 400 | 180 | +90 | 0 | -180 | +180 |
| 2 | R | 0 | 135 | 600 | +180 | 0 | -180 | +180 |
| 3 | R | 0 | 135 | 120 | -90 | 0 | -180 | +180 |
| 4 | R | 0 | 620 | 0 | +90 | 0 | -180 | +180 |
| 5 | R | 0 | 0 | 0 | -90 | 0 | -180 | +180 |
| 6 | R | 0 | 0 | 0 | 0 | 0 | -180 | +180 |

### Active DH variables

For each revolute joint:

\[
\theta_i = \theta_{i,0} + q_i + \mathrm{offset}_i
\]

For each prismatic joint, if present:

\[
d_i = d_{i,0} + q_i + \mathrm{offset}_i
\]

The Skeleton 6R robot has no prismatic joints and all offsets are zero.

### DH table verdict

The numeric table was not changed because its values matched the independent Standard-DH reference exactly. The DH editor was corrected so that CSV and LaTeX exports use the evaluated active θ and d values, including constants and offsets, instead of exporting only the raw generalized coordinate.

---

## 2. FK formulation

The application uses:

\[
A_i = R_z(\theta_i)T_z(d_i)T_x(a_i)R_x(\alpha_i)
\]

with matrix:

\[
A_i =
\begin{bmatrix}
c_\theta & -s_\theta c_\alpha & s_\theta s_\alpha & a c_\theta\\
s_\theta & c_\theta c_\alpha & -c_\theta s_\alpha & a s_\theta\\
0 & s_\alpha & c_\alpha & d\\
0 & 0 & 0 & 1
\end{bmatrix}
\]

The complete forward transform is:

\[
T_{06}=A_1A_2A_3A_4A_5A_6
\]

The independent FK implementation used the same published Standard-DH equation but separate matrix multiplication code. It did not call the application’s DH transform or FK routines when creating reference targets.

---

## 3. IK formulation and acceptance method

The application identifies this robot as a six-revolute spherical-wrist chain and dispatches to the analytical 6R solver. The audit procedure was:

1. Select a fixed joint vector manually.
2. Compute its target pose with the independent FK implementation.
3. Pass that target to `solveIK` without `initialGuess` and without `currentJoints`.
4. Require convergence and valid joint limits.
5. Run application FK on the returned solution.
6. Independently calculate the returned pose’s position and orientation residual against the independent target.

The returned joint vector does not need to equal the input vector because a six-DOF robot can have multiple valid IK branches. A solution is accepted by pose accuracy, finite values, and joint limits.

---

## 4. Fifteen manually selected cases

All input values and returned values below are in degrees. FK matrix error is the maximum absolute difference across all 16 homogeneous-matrix elements. IK position error is in metres, and IK orientation error is in radians.

| # | Input q₁…q₆ (°) | FK matrix error | Returned IK q₁…q₆ (°) | IK position error (m) | IK orientation error (rad) | Valid branches |
|---:|---|---:|---|---:|---:|---:|
| 1 | 0, 0, 0, 0, 0, 0 | 0.000e+0 | 0, 0, 0, 0, 0, 0 | 8.327e-17 | 0.000e+0 | 1 |
| 2 | 30, -20, 15, 40, -35, 25 | 0.000e+0 | 170, 10, -20, -140, 35, -155 | 2.797e-8 | 0.000e+0 | 4 |
| 3 | -45, 25, -30, -60, 40, -20 | 0.000e+0 | -45, 25, -30, 120, -40, 160 | 3.782e-8 | 2.107e-8 | 2 |
| 4 | 90, -30, 45, 0, 60, -90 | 0.000e+0 | 90, -30, 45, 0, 60, -90 | 1.499e-10 | 0.000e+0 | 4 |
| 5 | -90, 45, 20, 120, -50, 80 | 0.000e+0 | 90, -155.306, -39.325, 133.798, 113.202, -170.406 | 7.434e-7 | 0.000e+0 | 4 |
| 6 | 15, 70, -55, -130, 25, -75 | 0.000e+0 | 15, 70, -55, 50, -25, 105 | 1.855e-9 | 0.000e+0 | 2 |
| 7 | -120, -40, 35, 75, -70, 140 | 0.000e+0 | -120, -40, 35, 75, -70, 140 | 1.160e-10 | 2.107e-8 | 4 |
| 8 | 170, 10, -20, -170, 80, -160 | 0.000e+0 | 170, 10, -20, -170, 80, -160 | 3.303e-9 | 0.000e+0 | 2 |
| 9 | -170, -15, -45, 160, -80, 155 | 0.000e+0 | -170, -15, -45, 160, -80, 155 | 3.402e-7 | 0.000e+0 | 2 |
| 10 | 0, 0, 0, 45, 0, -45 | 0.000e+0 | 0, 0, 0, 0, 0, 0 | 8.327e-17 | 0.000e+0 | 1 |
| 11 | 60, -60, 60, 30, 30, -30 | 0.000e+0 | -120, -20.894, 70.990, 163.144, -120.441, -12.162 | 5.226e-10 | 2.107e-8 | 4 |
| 12 | -30, 80, -70, -45, -25, 110 | 0.000e+0 | -30, 80.001, -69.998, -44.998, -25.001, 109.998 | 1.759e-6 | 0.000e+0 | 2 |
| 13 | 135, -10, 10, 90, 50, -120 | 0.000e+0 | -45, -114.261, -29.946, 50.887, -99.145, 161.060 | 6.130e-10 | 0.000e+0 | 4 |
| 14 | -135, 30, -15, -100, 65, 70 | 0.000e+0 | -135, 30, -15, -100, 65, 70 | 3.164e-10 | 2.107e-8 | 2 |
| 15 | 20, -75, 75, 15, -85, -15 | 0.000e+0 | -160, -38.682, 87.823, -127.186, -161.117, 37.615 | 8.529e-8 | 0.000e+0 | 4 |

### Aggregate error analysis

| Metric | Value |
|---|---:|
| FK cases tested | 15 |
| FK failures | 0 |
| FK failure rate | 0.00% |
| Maximum FK matrix error | 0.000e+0 |
| IK cases tested | 15 |
| IK failures | 0 |
| IK failure rate | 0.00% |
| Maximum IK position error | 1.759e-6 m |
| Mean IK position error | 2.000e-7 m |
| Median IK position error | 1.855e-9 m |
| Maximum IK orientation error | 2.107e-8 rad |
| Mean IK orientation error | 5.619e-9 rad |
| Joint-limit failures | 0 / 15 |
| Non-finite results | 0 / 15 |

### Singularity note

Cases 1 and 10 deliberately use q₅ = 0°, a wrist-singular configuration. Position and orientation remain correct, but individual wrist angles are not unique at a wrist singularity. The solver returning a different equivalent wrist configuration is expected and is not an error.

---

## 5. DH editor correction

File changed: `src/features/dh/DHTableStudio.tsx`

The export handlers previously treated the active revolute θ as only `q` and the active prismatic d as only `q`. That loses the DH constant and offset whenever those fields are nonzero. Both CSV and LaTeX export paths now call the shared `evaluateJointDH(joint, q)` function used by FK.

The correction ensures:

- Revolute exports use `theta + q + offset`.
- Prismatic exports use `d + q + offset`.
- `a` and `alpha` remain the configured DH values.
- SI and deg/mm conversions happen after evaluation.
- Exported values agree with the values consumed by FK.

The visible editable table already stored and displayed the correct raw DH constants, so no correct geometry values were replaced.

---

## 6. Automated validation artifacts

The independently calculated audit is implemented in:

`tests/validation/manual6DOF.audit.test.ts`

That test contains:

- The 15 fixed input configurations.
- A separate Standard-DH matrix implementation.
- Independent target generation.
- IK calls without answer-based seeds.
- Strict position, orientation, finite-value, and joint-limit assertions.
- Independent FK verification of every returned IK solution.

The supporting technical report is:

`docs/6DOF_DH_FK_IK_VALIDATION.md`

---

## 7. Verification commands and results

Commands executed from the repository root:

```text
npm ci
npm test
npx vitest run tests/validation/manual6DOF.audit.test.ts --reporter=verbose
npm run lint
npm run build
git diff --check
```

Results:

- Full test suite: **21 test files passed, 75 tests passed**.
- Focused 15-case audit: **passed**.
- Lint: **passed**.
- Production build: **passed**.
- Diff whitespace check: **passed**.

The production build emitted only existing Vite warnings about ineffective dynamic imports and large chunks; these were warnings, not build failures, and are unrelated to the DH/FK/IK correction.

---

## Final verdict

For the `skeleton_6R` robot and the 15 manually selected reachable configurations, the Standard-DH table, authoritative FK, analytical 6R IK pipeline, FK round-trip verification, joint-limit handling, and corrected DH exports are all functioning within the strict limits defined in this report.

