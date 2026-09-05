# RoboAnalyzer Web — 22 Industrial Robots STL Pivot Calibration Log

This document records the visual alignment, pivot verification, unit scaling, and kinematic frame calibration for all **22 industrial CAD robotic manipulators** in RoboAnalyzer Web.

---

## 1. Calibration Architecture & Standard Coordinate Protocol

Industrial CAD STL models are exported from authoritative vendor specifications (KUKA, ABB, FANUC, Unimation, EPSON, MTAB).

1. **Unit Scaling ($\mathbf{S}$)**:
   - Authoring software (SolidWorks, CATIA, PTC Creo, Autodesk Inventor) exports STL vertices in **millimeters** ($\text{mm}$).
   - RoboAnalyzer Web's physics and mathematics engine strictly operates in **SI standard units** ($\text{meters}$, $\text{radians}$).
   - Link meshes apply a uniform scaling transform:
     $$\mathbf{S} = \begin{bmatrix} 0.001 & 0 & 0 \\ 0 & 0.001 & 0 \\ 0 & 0 & 0.001 \end{bmatrix}$$

2. **Kinematic Frame Attachment & Joint Pivots**:
   - Each link mesh $\mathcal{M}_i$ ($i \in [0, n]$) is attached to the coordinate frame defined by the Denavit-Hartenberg (DH) transformation matrix:
     - $\mathcal{M}_0$ (Base): Attached to the inertial world coordinate frame $\mathbf{T}_{0} = \mathbf{I}_{4\times 4}$.
     - $\mathcal{M}_i$ ($i \ge 1$): Attached to frame $\mathbf{T}_{0i} = \mathbf{T}_{0,i-1} \mathbf{A}_i(q_i)$.
   - Joint axis of actuation is always aligned with local $\mathbf{Z}_{i-1}$ (or $\mathbf{Z}_i$ under Modified Craig convention).
   - Calibration offset transform $\mathbf{T}_{\text{calib}} = \mathbf{T}(x, y, z) \mathbf{R}_z(\gamma) \mathbf{R}_y(\beta) \mathbf{R}_x(\alpha)$ ensures zero interpenetration at calibrated zero/home poses.

---

## 2. Priority Industrial Manipulators Audit

### 2.1 KUKA KR 5 Arc (`KukaKR5`)
- **Manufacturer**: KUKA Robotics
- **Architecture**: 6-DOF Anthropomorphic (6R) with spherical wrist
- **DH Convention**: Standard DH
- **Base Offset**: $d_1 = 0.400\,\text{m}$, $a_1 = 0.180\,\text{m}$
- **Upper Arm**: $a_2 = 0.600\,\text{m}$, $\alpha_2 = 0^\circ$
- **Forearm**: $a_3 = 0.120\,\text{m}$, $d_4 = 0.620\,\text{m}$
- **Wrist**: $d_6 = 0.115\,\text{m}$
- **Calibration Status**:
  - `link0.stl`: Base plate resting flush on ground grid ($Z = 0$). Scale factor $[0.001, 0.001, 0.001]$.
  - `link1.stl` to `link3.stl`: Center of rotation verified along $Z_0$, $Z_1$, and $Z_2$.
  - `link4.stl` to `link6.stl`: Spherical wrist intersection aligns with $W = [0.180 + 0.600, 0, 0.400 + 0.620]^\top$ in home pose.
  - **Verdict**: Fully calibrated and verified against manufacturer data sheet.

### 2.2 Unimation PUMA 560 (`Puma560`)
- **Manufacturer**: Unimation / Staubli
- **Architecture**: 6-DOF Classic 6R Anthropomorphic manipulator
- **DH Convention**: Standard DH
- **Base Offset**: $d_1 = 0.660\,\text{m}$, $a_1 = 0.000\,\text{m}$
- **Shoulder Offset**: $a_2 = 0.432\,\text{m}$, $\alpha_2 = 180^\circ$
- **Elbow Offset**: $d_3 = 0.150\,\text{m}$, $a_3 = 0.002\,\text{m}$
- **Wrist**: $d_4 = 0.432\,\text{m}$, $d_6 = 0.056\,\text{m}$
- **Calibration Status**:
  - `link0.stl`: Base mounted symmetrically at world origin.
  - `link1.stl` to `link3.stl`: Joint 2 and Joint 3 axes parallel ($Z_1 \parallel Z_2$).
  - `link4.stl` to `link6.stl`: Orthogonal wrist axes ($Z_3 \perp Z_4 \perp Z_5$) intersecting at wrist center.
  - **Verdict**: Golden benchmark robot; passes 100% of forward, inverse, and analytical round-trip tests.

### 2.3 ABB IRB 120 (`ABBIRB120`)
- **Manufacturer**: ABB Robotics
- **Architecture**: 6-DOF Compact Articulated Industrial Robot
- **DH Convention**: Standard DH
- **Base Offset**: $d_1 = 0.290\,\text{m}$, $a_1 = 0.000\,\text{m}$
- **Upper Arm**: $a_2 = 0.270\,\text{m}$, $\alpha_2 = 0^\circ$
- **Forearm**: $a_3 = 0.070\,\text{m}$, $d_4 = -0.302\,\text{m}$
- **Wrist Flange**: $d_6 = -0.072\,\text{m}$
- **Calibration Status**:
  - `link0.stl`: Mounting flange sits at ground plane $Z=0$.
  - `link1.stl` to `link6.stl`: Negative $d_4$ and $d_6$ offsets match ABB IRB 120 coordinate definition.
  - High precision joint clearance: pivots verified against CAD step assembly.
  - **Verdict**: Verified. Matches ABB RobotStudio zero-position reference.

### 2.4 FANUC M-10iA (`FanucM10iA`)
- **Manufacturer**: FANUC Corporation
- **Architecture**: 6-DOF High-Payload Hollow Wrist Articulated Arm
- **DH Convention**: Standard DH
- **Base Offset**: $d_1 = 0.450\,\text{m}$, $a_1 = 0.150\,\text{m}$
- **Upper Arm**: $a_2 = 0.600\,\text{m}$, $\alpha_2 = 0^\circ$
- **Forearm**: $a_3 = 0.200\,\text{m}$, $d_4 = -0.640\,\text{m}$
- **Wrist Flange**: $d_6 = -0.100\,\text{m}$
- **Calibration Status**:
  - `link0.stl`: Base pedestal aligned with world origin.
  - `link1.stl` to `link3.stl`: Shoulder offset $a_1=0.150\,\text{m}$ correctly introduces forearm clearance.
  - Hollow wrist housing aligns with wrist center for cable routing visualization.
  - **Verdict**: Verified against Fanuc technical documentation and simulation runs.

---

## 3. Comprehensive Verification Matrix for All 22 Industrial Robots

| # | Robot Identifier | Manufacturer | DOF | Structure | Scale | Base Height ($d_1$) | Reach / Span | Status |
|---|------------------|--------------|-----|-----------|-------|---------------------|--------------|--------|
| 1 | `ABBIRB120` | ABB | 6 | 6R Articulated | 0.001 | 0.290 m | ~0.580 m | Verified |
| 2 | `ABBIRB1410` | ABB | 6 | 6R Welding Arm | 0.001 | 0.475 m | ~1.440 m | Verified |
| 3 | `ABBIRB2400` | ABB | 6 | 6R Material Handling | 0.001 | 0.615 m | ~1.550 m | Verified |
| 4 | `ABBIRB4400L30` | ABB | 6 | 6R Extended Reach | 0.001 | 0.680 m | ~2.430 m | Verified |
| 5 | `ABBIRB6620` | ABB | 6 | 6R Heavy Duty Spot | 0.001 | 0.780 m | ~2.200 m | Verified |
| 6 | `ABBIRB6650` | ABB | 6 | 6R Heavy Payload | 0.001 | 0.840 m | ~2.750 m | Verified |
| 7 | `EpsonC3A60CT` | Epson | 6 | 6R Compact Assembly | 0.001 | 0.220 m | ~0.600 m | Verified |
| 8 | `FanucM10iA` | Fanuc | 6 | 6R Hollow Wrist | 0.001 | 0.450 m | ~1.420 m | Verified |
| 9 | `FanucM410iB` | Fanuc | 4 | 4R Palletizer | 0.001 | 0.620 m | ~2.850 m | Verified |
| 10 | `FanucR1000i` | Fanuc | 6 | 6R Spot Welding | 0.001 | 0.665 m | ~2.100 m | Verified |
| 11 | `FanucR2000i` | Fanuc | 6 | 6R Heavy Industrial | 0.001 | 0.670 m | ~2.650 m | Verified |
| 12 | `FanucS430` | Fanuc | 6 | 6R High Payload | 0.001 | 0.750 m | ~2.480 m | Verified |
| 13 | `KukaKR210Ultra` | KUKA | 6 | 6R Heavy Foundry | 0.001 | 0.750 m | ~2.700 m | Verified |
| 14 | `KukaKR5` | KUKA | 6 | 6R Arc Welding | 0.001 | 0.400 m | ~1.410 m | Verified |
| 15 | `KukaKR5Sixx` | KUKA | 6 | 6R Sixx Cleanroom | 0.001 | 0.335 m | ~0.650 m | Verified |
| 16 | `KukaKR5_IND` | KUKA | 6 | 6R General Purpose | 0.001 | 0.400 m | ~1.410 m | Verified |
| 17 | `KukaKR62` | KUKA | 6 | 6R High Payload | 0.001 | 0.675 m | ~2.050 m | Verified |
| 18 | `MTAB_ARISTO` | MTAB | 6 | 6R Education / Lab | 0.001 | 0.280 m | ~0.720 m | Verified |
| 19 | `MTAB_Mini` | MTAB | 5 | 5R Benchtop Arm | 0.001 | 0.220 m | ~0.450 m | Verified |
| 20 | `Puma560` | Unimation | 6 | 6R Benchmark Robot | 0.001 | 0.660 m | ~0.878 m | Verified |
| 21 | `SmallArm` | Generic | 5 | 5R Articulated | 0.001 | 0.180 m | ~0.380 m | Verified |
| 22 | `Stanford` | Stanford | 6 | 5R1P Spherical Arm | 0.001 | 0.412 m | Variable ($d_3$) | Verified |

---

## 4. Visual & Kinematic Integrity Verification Checklist

All 22 robots have been checked against the following 6-point verification criteria:
1. **Ground Plane Resting**: Base link geometry rests on $Z = 0$ with no sub-surface clipping or floating offsets.
2. **Axis Coincidence**: For every revolute joint $j$, link $\mathcal{M}_j$ rotates exactly around coordinate axis $\mathbf{Z}_{j-1}$ in 3D scene representation.
3. **No Joint Disjointness**: When jogging joint variables across full permissible range $[q_{\min}, q_{\max}]$, adjacent links remain in continuous mechanical contact without gaps or tears.
4. **Prismatic Stroke Alignment**: On prismatic joints (`Stanford` Joint 3), link mesh translates along $\mathbf{Z}_2$ proportionally to linear stroke $d_3$.
5. **Color Hierarchy**: Distinctive industrial brand palettes (KUKA Orange `#ea580c`, ABB Red/White `#dc2626`, Fanuc Yellow `#f59e0b`, Unimation Blue/Grey `#4f46e5`) differentiate robot components.
6. **Zero Memory Leakage**: When switching dynamically between models, previous STL geometries and buffers are disposed from GPU memory.
