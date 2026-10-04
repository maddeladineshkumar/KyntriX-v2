# KyntriX — Next-Generation Robotics Simulation Platform

**KyntriX** is an interactive, browser-based 3D robotics simulation platform designed for learning, analyzing, and designing serial robotic manipulators. It provides physics-grounded kinematic analysis, dynamic trajectory planning, and 3D CAD visualization matching industrial robotic standards.

---

## 🚀 Key Features & Capabilities

### 1. 3D WebGL Visualization Engine
- **Three.js Simulation Scene**: High-performance WebGL renderer operating in an authoritative **Z-up right-handed coordinate system** (matching standard robotics conventions).
- **22 Real Industrial Robots**: High-fidelity binary STL meshes with calibrated link offsets and pivot alignment matrices (ABB IRB 120, ABB IRB 1410, ABB IRB 2400, ABB IRB 4400, ABB IRB 6620, ABB IRB 6650, KUKA KR5, KUKA KR5 Sixx, KUKA KR62, KUKA KR210, Fanuc M-10iA, Fanuc M-410iB, Fanuc R-1000i, Fanuc R-2000i, Fanuc S-430, Puma 560, Epson C3, MTAB Aristo/Mini, Stanford Arm, SmallArm).
- **20 Skeleton Primitives**: Abstract 1-DOF to 7-DOF kinematic chains for educational analysis (1R, 1P, 2R, 2P, 3R, 3P, SCARA, 6R, SRS, etc., bringing the library total to 42 robots).
- **Camera Presets**: Instant camera snapping to Home, Top, Front, Back, Left, Right, Bottom, Isometric, and Auto-Fit Robot.
- **Coordinate Frames & Link Tracing**: Real-time coordinate triads (X=Red, Y=Green, Z=Blue) at each joint frame and live dynamic end-effector path tracing.
- **Interactive IK Target Gizmo**: Direct 3D Cartesian dragging for intuitive inverse kinematics target manipulation.
- **Loading Experience Overlay (PRD §97)**: Animated step-by-step model parsing and mesh initialization indicator.
- **Simulation Debug Mode HUD (PRD §64–65)**: Development overlay exposing live joint vectors, EE pose, Jacobian condition numbers, manipulability, and solver diagnostics.

---

### 2. Authoritative Kinematics Engine
- **Strict SI Units**: All internal computations strictly utilize **meters (m)** and **radians (rad)**. Conversions to millimeters and degrees occur solely at the user interface boundary.
- **Unified Forward Kinematics**: Single authoritative implementation of Denavit-Hartenberg (DH) forward kinematics supporting both **Standard DH** and **Modified DH (Craig)** conventions.
- **Geometric Jacobian & Dexterity Metrics**:
  - $6 \times N$ spatial Jacobian matrix $J = \begin{bmatrix} J_v \\ J_\omega \end{bmatrix}$
  - Yoshikawa Manipulability Index: $w = \sqrt{\det(J J^T)}$
  - Matrix Condition Number: $\kappa(J) = \|J\| \cdot \|J^+\|$
  - Automated Singularity Warning detection with rank analysis.

---

### 3. Inverse Kinematics (IK) Multi-Strategy Pipeline
- **Analytical 3R Planar Solver**: Geometric closed-form solver for 3-DOF planar manipulators.
- **Analytical 6R Spherical Wrist Solver**: Closed-form Pieper decoupling method for 6-DOF manipulators with spherical wrists ($p_w = p - d_6 R [0, 0, 1]^T$), evaluating up to 8 distinct branches (Shoulder Left/Right $\times$ Elbow Up/Down $\times$ Wrist Normal/Flip).
- **Numerical Damped Least Squares (DLS / Levenberg-Marquardt)**: Multi-branch gradient descent with adaptive damping $\lambda$ and null-space secondary projection to prevent joint limits and singular explosion.
- **Off-Thread Web Worker**: Asynchronous solving via Web Workers prevents UI freezing during complex multi-seed IK searches, with automatic synchronous fallback.
- **Mandatory Forward Kinematics Validation**: Every solution returned by any solver is strictly verified through the authoritative forward kinematics function before presentation ($E_{pos} \le 1\text{ mm}$, $E_{rot} \le 0.01\text{ rad}$).

---

### 4. Trajectory Generation & Dynamic Analysis
- **Interpolation Profiles**: Trapezoidal velocity profiles, Cubic polynomials, and minimum-jerk Quintic polynomials.
- **Continuous Scrubbing**: Continuous linear interpolation (LERP) across trajectory states enables smooth frame-by-frame seeking and playback at variable speeds ($0.1\times$ to $5.0\times$).
- **Dynamic Time-Series Plotting**:
  - Joint Positions $q(t)$
  - Joint Velocities $\dot{q}(t)$
  - Joint Accelerations $\ddot{q}(t)$
  - End-Effector Cartesian Position $[X(t), Y(t), Z(t)]$ (Rose, Emerald, Sky)
  - Dexterity Metrics ($w(t)$ and $\kappa(t)$)
- **Thanks Trajectory Demo**: Pre-computed 280-step signature Cartesian trajectory demonstrating coordinated 6-DOF motion.
- **Emergency Stop Button**: High-visibility header control to immediately halt and reset any active simulation playback.

---

### 5. Educational Studios & Customization
- **DH Parameter Table Studio**: Live inspection and editing of joint DH parameters with instant unit switching (rad/m $\leftrightarrow$ deg/mm).
- **Transformation Matrix Studio**: Step-by-step frame inspection mode with 3D coordinate frame isolation, full 4x4 $A_i$ and $T_{0i}$ matrix visualization, copy-to-clipboard functionality, and Euler / Quaternion pose decomposition.
- **Custom Robot Creator**: Design custom serial manipulators up to 8 DOF with arbitrary DH parameters. Includes full **JSON Export** and **Schema-Validated JSON Import**.

---

### 6. AI & Learning System (Robotics Arena & Challenges)
- **Robotics Arena**: 256 curriculum-aligned problems spanning 10 canonical robotics disciplines:
  1. *Spatial Transforms* — $SO(3)$ / $SE(3)$ rotation matrices, Euler angles, unit quaternions.
  2. *Denavit-Hartenberg* — Standard & Modified DH link parameter derivation.
  3. *Forward Kinematics* — Serial chain pose calculation and homogeneous product chains.
  4. *Inverse Kinematics* — Planar, Pieper spherical wrist, and numerical Jacobian inversion.
  5. *Differential Kinematics & Jacobians* — Singularity analysis, manipulability, and joint velocities.
  6. *Robot Dynamics* — Euler-Lagrange equations, mass inertia matrices, Coriolis, and gravity vectors.
  7. *Motion & Trajectory Control* — Computed torque, PD/PID feedback, and tracking error stabilization.
  8. *Mobile Robotics* — Unicycle kinematics, differential drive odometry, and non-holonomic constraints.
  9. *Trajectory Planning* — Cubic/Quintic splines, trapezoidal velocity profiling, and jerk bounds.
  10. *Workspace Analysis* — Reachable vs. dexterous workspace volume, dexterity indices, and ISO 9283 metrics.
- **Progressive Hint System**: Multi-stage hints with mathematical formulations, step derivations, and local fallback caching.
- **Authoritative Simulation Challenges**: 25 industrial and skeleton robotics pose targets scored in real-time on position error ($\Delta p$) and orientation tolerance ($\Delta \phi$).
- **Performance Analytics & Category Mastery**: Live radar charts, category breakdown cards, rating progression, streak tracking, and LeetCode-style difficulty distributions.
- **Universal Deployment Architecture**: Native client-side API router and local database fallback guarantee complete offline functionality and zero-backend static deployment compatibility.

---

## 🛠 Project Architecture

```text
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions CI/CD for automated hosting
├── docs/
│   └── PRD.md                # Comprehensive Product Requirements Document
├── public/
│   ├── assets/               # Branding and preview assets
│   ├── icons/                # PWA icons (192x192, 512x512)
│   ├── models/               # Binary STL 3D geometry for all 22 industrial robots
│   ├── favicon.svg           # Scalable SVG favicon
│   └── manifest.json         # Web app manifest
├── src/
│   ├── data/
│   │   ├── robots/           # Standard robot definitions (JSON) & catalog
│   │   └── schema/           # TypeScript schema & data validation
│   ├── features/
│   │   ├── analysis/         # Time-series ZedGraph-style SVG plots
│   │   ├── catalog/          # Robot selection modal & thumbnail catalog
│   │   ├── control/          # Joint slider control panel
│   │   ├── custom/           # Custom robot builder with JSON export/import
│   │   ├── dh/               # Interactive DH table
│   │   ├── ik/               # Inverse kinematics studio & target controls
│   │   ├── learning/         # Arena, Challenges, Analytics, Leaderboard & Classroom views
│   │   ├── trajectory/       # Trajectory studio & speed controls
│   │   ├── transform/        # SE(3) transformation matrix studio & step mode
│   │   └── viewport/         # 3D Three.js viewport, camera controls, HUD
│   ├── robotics/
│   │   ├── dh/               # Standard and Modified DH matrix calculations
│   │   ├── ik/               # 3R/6R analytical and DLS numerical IK solvers
│   │   ├── kinematics/       # Authoritative FK and Geometric Jacobian
│   │   ├── math/             # Core linear algebra (Matrix3, Matrix4, Vector3, Euler, Quaternion)
│   │   └── trajectories/     # Trapezoidal, Cubic, Quintic trajectory engines
│   ├── server/
│   │   ├── db/               # Browser/Node dual-mode persistent JSON database & seed data
│   │   ├── routes/           # API routes (problems, challenges, analytics, leaderboard, auth)
│   │   ├── apiRouter.ts      # Universal API router & fallback dispatcher
│   │   └── cryptoUtils.ts    # Secure token generation and JWT claim extraction
│   ├── simulation/           # Three.js scene graph, meshes, frames, gizmos
│   ├── state/                # Zustand store, Web Worker dispatch, persistence
│   └── workers/              # Off-thread Web Worker IK and workspace solvers
├── tests/                    # Vitest unit & integration test suites (55 suites, 348 tests)
├── index.html                # Entry HTML
├── package.json              # Dependencies and build scripts
└── vite.config.ts            # Vite + PWA configuration with universal base path 
```

---

## 🌐 Web Hosting & Deployment Guide

The repository is structured for **zero-configuration deployment** on modern web hosting services:

### 1. Vercel
1. Import repository `maddeladineshkumar/Robo` into [Vercel](https://vercel.com).
2. Framework Preset is automatically detected as **Vite**.
3. Click **Deploy**.

### 2. Netlify
1. Connect repository in [Netlify](https://netlify.com).
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Click **Deploy Site**.

### 3. GitHub Pages
An automated GitHub Actions workflow is included at `.github/workflows/deploy.yml`.
1. Go to repository **Settings** -> **Pages**.
2. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
3. Push to `main` branch to trigger immediate build and deployment.

---

## 🧪 Testing & Verification

The comprehensive test suite contains **348 tests across 55 test suites**, verifying numerical accuracy, DH conventions, kinematics roundtrips, trajectory stability, analytical/numerical IK solvers, and AI/Learning workflows:

```bash
# Run full Vitest test suite (348 tests)
npm test

# Run production TypeScript check & Vite build
npm run build
```

---

## 📐 DH Conventions Reference

### Standard DH (Denavit & Hartenberg, 1955)
$$A_i = \text{Rot}_Z(\theta_i) \cdot \text{Trans}_Z(d_i) \cdot \text{Trans}_X(a_i) \cdot \text{Rot}_X(\alpha_i)$$

### Modified DH (Craig, 1986)
$$A_i = \text{Rot}_X(\alpha_{i-1}) \cdot \text{Trans}_X(a_{i-1}) \cdot \text{Rot}_Z(\theta_i) \cdot \text{Trans}_Z(d_i)$$

---

## 📜 License & Acknowledgments

Inspired by and built as the modern web implementation of the desktop **RoboAnalyzer** software developed at IIT Delhi.
Designed for modern robotics education and research.
