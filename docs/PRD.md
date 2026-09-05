# RoboAnalyzer Web --- Production Robotics Simulation Platform

## Codex / Anti-Gravity Product Requirements Document (PRD)

**Document status:** Implementation master specification\
**Primary goal:** Build a mathematically rigorous, web-native
successor/extension to RoboAnalyzer 7.5\
**Priority:** Simulation correctness \> mathematical correctness \>
reliability \> UX polish \> visual effects\
**Reference project:** The RoboAnalyzer 7.5 directory supplied with this
task

------------------------------------------------------------------------

# 0. EXECUTIVE DIRECTIVE

You are building a serious robotics engineering and education
application.

This is **not** a landing page, not a visual mockup, not a Three.js toy,
and not a collection of disconnected calculators.

The finished product must be a **real-time, web-native robot kinematics
and simulation laboratory** that preserves the useful functionality
represented by the supplied RoboAnalyzer 7.5 project and substantially
improves it with a modern browser architecture.

The application must be mathematically trustworthy.

If a user changes a DH parameter, the transformation matrices, forward
kinematics, inverse kinematics validation, coordinate readouts, robot
geometry, trajectory, and animation must all remain internally
consistent.

If a robot moves on screen, that movement must be produced by the actual
kinematic state of the robot.

**Never fake a robotics result for visual convenience.**

------------------------------------------------------------------------

# 1. USER-PROVIDED PROJECT LOCATION

The user will provide a directory similar to:

``` text
D:\3rd Semester Btech\Projects\Robotics\
    RoboAnalyzer_7_5_20190623\
```

The exact absolute path must NOT be hard-coded.

At startup/development time:

1.  Locate the supplied RoboAnalyzer directory.
2.  Inspect it recursively.
3.  Identify the archive's actual structure.
4.  Treat the supplied files as reference assets/data.
5.  Preserve the original files unless there is a compelling reason to
    transform/copy them.
6.  Build the web application in a separate clean project structure.

The screenshot supplied by the user shows that the RoboAnalyzer
directory is directly inside the `Robotics` project directory.

Do not assume the screenshot is the complete directory structure;
inspect the actual filesystem.

------------------------------------------------------------------------

# 2. FIRST TASK --- REVERSE-ENGINEER BEFORE IMPLEMENTING

Before substantial implementation, perform an archive/project audit.

Create a short internal engineering report documenting:

-   directory tree
-   executables
-   DLLs/libraries
-   XML files
-   CSV files
-   STL files
-   documentation
-   robot definitions
-   DH data
-   robot metadata
-   joint limits
-   trajectory data
-   known functionality
-   relationships between robot XML files and STL assets

The supplied RoboAnalyzer distribution contains important evidence of
functionality including:

-   robot visualization
-   DH parameter handling
-   homogeneous transformation matrices
-   forward kinematics
-   inverse kinematics
-   3R inverse kinematics
-   6R inverse kinematics
-   virtual robot functionality
-   end-effector tracing
-   animation controls
-   trajectory/sample data
-   graphing
-   robot XML definitions
-   STL 3D models
-   dedicated 6R IK tooling

The archive contains compiled Windows/.NET/OpenGL components. Do **not**
attempt to make the old Windows executables the browser runtime.

Use the old application as a **reference/data/behavior source**.

Reimplement the required functionality natively for the web.

------------------------------------------------------------------------

# 3. CORE PRODUCT VISION

Create:

> **RoboAnalyzer Web --- a professional interactive robotics laboratory
> for DH modeling, transformation analysis, forward/inverse kinematics,
> trajectory planning, and real-time 3D robot simulation.**

The application must support:

### Robot modeling

-   Robot library
-   Built-in robot definitions
-   Custom robots
-   Revolute joints
-   Prismatic joints
-   3-DOF
-   6-DOF
-   Generic DOF architecture where practical
-   Standard DH
-   Modified DH
-   Joint limits
-   Link geometry

### Kinematics

-   DH/H table
-   Individual homogeneous transformation matrices
-   Cumulative transformation matrices
-   Forward kinematics
-   Inverse kinematics
-   Analytical IK where appropriate
-   Numerical IK fallback
-   Multiple IK solutions
-   Position/orientation targets
-   FK/IK round-trip validation
-   Singularity detection
-   Reachability validation

### Simulation

-   Actual 3D STL/model geometry
-   Correct kinematic hierarchy
-   Real-time animation
-   Smooth interpolation
-   Joint-space trajectories
-   Cartesian trajectories
-   Waypoints
-   End-effector trace
-   Coordinate frames
-   Target pose visualization
-   Camera controls

### Analysis

-   Position
-   Orientation
-   Joint position
-   Joint velocity
-   Joint acceleration
-   Trajectory error
-   Solver status
-   Singularity state
-   Workspace/reachability information where implemented

------------------------------------------------------------------------

# 4. NON-NEGOTIABLE: REAL 3D SIMULATION

This requirement overrides convenience.

## DO NOT:

-   animate images
-   animate screenshots
-   swap PNG frames
-   use GIFs
-   pre-render robot positions
-   fake movement with 2D transforms
-   use video as the robot simulator
-   hard-code visual paths

## MUST:

Render the robot as actual 3D geometry.

The simulation pipeline must be:

``` text
Robot Definition
      ↓
DH Parameters
      ↓
Joint State q
      ↓
DH Transform A_i
      ↓
Cumulative Transform T_0_i
      ↓
Forward Kinematics
      ↓
Kinematic Scene Graph
      ↓
Three.js Object3D transforms
      ↓
WebGL Rendering
```

Every frame of motion must correspond to a real robot joint state.

------------------------------------------------------------------------

# 5. SINGLE SOURCE OF TRUTH

There must be one canonical mathematical robot state.

The following must never have independent competing implementations:

-   DH table
-   transformation matrices
-   FK
-   IK validation
-   joint sliders
-   coordinate display
-   3D model
-   trajectory engine
-   trace

All must derive from the same robotics engine.

Example:

``` text
q
 ↓
RobotKinematics.forwardKinematics(q)
 ↓
{
    A: [...],
    T: [...],
    endEffectorPose,
    frames
}
```

The renderer consumes those results.

The UI displays those results.

The IK validator consumes those results.

Do not calculate XYZ in the UI separately.

Do not use approximate renderer-only transforms.

------------------------------------------------------------------------

# 6. TECHNOLOGY

Use a modern, maintainable web stack.

Recommended:

-   React
-   TypeScript
-   Vite
-   Three.js
-   WebGL
-   Zustand or another lightweight state store
-   Vitest
-   React Testing Library
-   ESLint
-   Prettier

Use strict TypeScript.

Avoid unnecessary dependencies.

Do not introduce a backend unless a requirement genuinely needs one.

The core application should work client-side.

------------------------------------------------------------------------

# 7. ARCHITECTURE

Use a layered architecture:

``` text
src/
├── app/
│   ├── routes/
│   ├── providers/
│   └── app-shell/
│
├── robotics/
│   ├── math/
│   ├── dh/
│   ├── kinematics/
│   ├── ik/
│   ├── trajectories/
│   ├── validation/
│   └── models/
│
├── simulation/
│   ├── scene/
│   ├── robot/
│   ├── animation/
│   ├── camera/
│   └── tracing/
│
├── data/
│   ├── robots/
│   ├── loaders/
│   └── converters/
│
├── features/
│   ├── simulation/
│   ├── dh-table/
│   ├── transforms/
│   ├── fk/
│   ├── ik/
│   ├── trajectories/
│   ├── robot-library/
│   └── analysis/
│
├── components/
├── state/
├── hooks/
├── workers/
└── tests/
```

Adapt this structure if there is a better reason, but preserve the
separation of concerns.

------------------------------------------------------------------------

# 8. ROBOT DATA MODEL

Create a canonical robot representation.

Conceptually:

``` ts
type JointType = "revolute" | "prismatic";

interface JointDefinition {
    id: string;
    index: number;
    type: JointType;

    theta: number;
    d: number;
    a: number;
    alpha: number;

    offset?: number;

    min?: number;
    max?: number;

    mesh?: string;
}

interface RobotDefinition {
    id: string;
    name: string;
    manufacturer?: string;
    model?: string;

    dhConvention: "standard" | "modified";

    joints: JointDefinition[];
    links: LinkDefinition[];

    units: {
        length: "m" | "mm" | "cm";
        angle: "rad" | "deg";
    };
}
```

The final schema must be based on the actual supplied data.

Preserve useful source metadata rather than throwing it away.

------------------------------------------------------------------------

# 9. ROBOT IMPORT / DATA CONVERSION

Build a deterministic conversion process:

``` text
RoboAnalyzer XML
       ↓
Parser
       ↓
Schema validation
       ↓
Canonical RobotDefinition
       ↓
Browser-compatible JSON
```

Also inspect CSV files and determine which are:

-   trajectory data
-   examples
-   coordinate data
-   other numerical datasets

Map STL files to the correct links.

Do not manually duplicate robot values into React components.

------------------------------------------------------------------------

# 10. UNITS

Use one internal unit system.

Recommended:

``` text
length = meters
angle = radians
```

Display units may be:

``` text
mm
cm
m
degrees
radians
```

All conversions must happen at explicit input/output boundaries.

Never mix millimeters and meters internally.

Never round values before calculations.

------------------------------------------------------------------------

# 11. DH / H TABLE

Create a dedicated DH/H Table.

Minimum columns:

  Joint   Type     θ   d   a   α   Offset   Min   Max
  ------- ------ --- --- --- --- -------- ----- -----

Requirements:

-   editable
-   keyboard accessible
-   numeric validation
-   live updates
-   reset
-   add/remove joint
-   revolute/prismatic type
-   joint limits
-   degrees/radians display
-   length unit display
-   current joint variable clearly identified

For revolute:

``` text
theta_i = theta_fixed_i + q_i + offset_i
```

For prismatic:

``` text
d_i = d_fixed_i + q_i + offset_i
```

Adapt the exact model after inspecting source conventions.

Never silently reinterpret a parameter.

------------------------------------------------------------------------

# 12. STANDARD AND MODIFIED DH

Explicitly support the selected convention.

For standard DH:

``` text
A_i =
RotZ(theta_i)
· TransZ(d_i)
· TransX(a_i)
· RotX(alpha_i)
```

For modified DH, implement the mathematically correct modified ordering.

Create dedicated unit tests for both.

The UI must clearly state which convention is active.

------------------------------------------------------------------------

# 13. MATRIX ENGINE

Implement a reliable numerical matrix layer.

At minimum:

-   Matrix4
-   Matrix3 where useful
-   vector operations
-   multiplication
-   transpose
-   inverse
-   determinant where required
-   rotation matrices
-   translation matrices
-   homogeneous transforms

Do not rely on rendering-library matrix semantics for the robotics
engine unless their conventions are fully understood and tested.

The robotics engine must have explicit coordinate conventions.

------------------------------------------------------------------------

# 14. HOMOGENEOUS TRANSFORMATION MATRICES

Display:

``` text
A1
A2
...
An
```

and:

``` text
T01
T02
...
T0n
```

The cumulative relation must be:

``` text
T0i = A1 · A2 · ... · Ai
```

for the selected convention and indexing model.

Display:

``` text
┌                 ┐
│ r11 r12 r13 px │
│ r21 r22 r23 py │
│ r31 r32 r33 pz │
│  0   0   0  1  │
└                 ┘
```

Also expose:

-   rotation matrix
-   translation vector
-   position
-   orientation

------------------------------------------------------------------------

# 15. TRANSFORMATION STUDIO

Build an interactive matrix-analysis view.

Features:

-   matrix list
-   matrix selection
-   readable formatting
-   precision control
-   copy matrix
-   coordinate frame visualization
-   step through transformation chain
-   show/hide frames
-   animated frame sequence

The animated matrix sequence must move actual coordinate frames in the
3D scene.

------------------------------------------------------------------------

# 16. FORWARD KINEMATICS

FK input:

``` text
q = [q1, q2, ..., qn]
```

Output:

``` text
A_i
T_0_i
T_0_n
position
orientation
```

Every joint input must immediately update the robot.

FK must support:

-   3 DOF
-   6 DOF
-   revolute
-   prismatic
-   standard DH
-   modified DH
-   generic N-DOF architecture where possible

------------------------------------------------------------------------

# 17. END-EFFECTOR POSE

Represent the pose explicitly.

``` ts
interface Pose {
    position: Vector3;
    rotationMatrix: Matrix3;
    quaternion: Quaternion;
}
```

Conversions may include:

-   Euler angles
-   quaternion
-   rotation matrix
-   axis-angle

The application must never silently switch Euler conventions.

If using Euler angles, explicitly document the order.

------------------------------------------------------------------------

# 18. 3-DOF MODE

Provide a dedicated 3-DOF experience.

Support robot structures including, where applicable:

-   RRR
-   RRP
-   RPR
-   RPP
-   PRR
-   PRP
-   PPR
-   PPP

Do not visually hard-code these configurations.

The robot must be represented by the same generic DH engine.

Features:

-   DH table
-   matrices
-   FK
-   IK
-   joint control
-   coordinate target
-   animation
-   trace
-   coordinate frames

------------------------------------------------------------------------

# 19. 6-DOF MODE

Provide a dedicated 6-DOF experience.

Primary support:

``` text
6R
```

Where robot geometry supports an analytical solution:

-   wrist decomposition
-   position/orientation decoupling
-   multiple branches

Otherwise:

-   robust numerical IK

The application must report which solver produced the solution.

------------------------------------------------------------------------

# 20. IK ARCHITECTURE

Do not implement one universal hard-coded formula.

Use:

``` text
IK Request
    ↓
Validate target
    ↓
Select solver
    ↓
Analytical solver if supported
    ↓
Numerical fallback
    ↓
Joint-limit filtering
    ↓
Singularity checks
    ↓
FK validation
    ↓
Solution ranking
    ↓
Valid solution list
```

------------------------------------------------------------------------

# 21. ANALYTICAL IK

Implement analytical IK for supported robot classes.

Use the supplied RoboAnalyzer behavior and data as reference where
available.

For supported 3R and 6R structures:

-   derive the correct equations
-   preserve branch solutions
-   handle ± square-root branches
-   use `atan2` correctly
-   handle numerical tolerance
-   validate every result using FK

Do not simply paste formulas without checking the robot's DH convention
and frame assignment.

------------------------------------------------------------------------

# 22. NUMERICAL IK

Implement a robust numerical fallback.

Recommended:

**Damped Least Squares / Levenberg-Marquardt-style Jacobian solver**

The solver should support:

-   position-only target
-   position + orientation target
-   configurable tolerances
-   iteration limit
-   damping
-   step size
-   joint limits
-   initial guess
-   convergence status

Near singularities, increase damping rather than allowing unstable
inverse-Jacobian behavior.

------------------------------------------------------------------------

# 23. JACOBIAN

Implement a reusable Jacobian engine.

For each joint, derive the correct contribution from its axis and
origin.

Support:

-   revolute
-   prismatic

Expose:

``` text
Jv
Jw
J
```

where useful.

Use it for:

-   numerical IK
-   singularity detection
-   analysis

------------------------------------------------------------------------

# 24. SINGULARITY DETECTION

Do not merely check for an exact determinant of zero.

Use numerical conditioning/rank logic.

Provide:

-   Jacobian rank
-   singular/near-singular status
-   warning level
-   numerical threshold

The UI should explain that near-singular configurations may cause large
joint changes for small Cartesian movements.

------------------------------------------------------------------------

# 25. IK VALIDATION --- MANDATORY

Never trust a raw IK output.

For every candidate:

``` text
q_solution
   ↓
FK(q_solution)
   ↓
calculated pose
   ↓
compare target
```

Compute:

``` text
positionError
orientationError
```

Reject candidates outside configured tolerances.

Example conceptual acceptance:

``` text
positionError <= positionTolerance
orientationError <= orientationTolerance
all joints within limits
finite numerical values
```

Only then mark a solution as valid.

------------------------------------------------------------------------

# 26. MULTIPLE IK SOLUTIONS

Display every valid solution discovered.

Each solution should show:

``` text
Solution #1

J1 = ...
J2 = ...
...
J6 = ...

Position Error = ...
Orientation Error = ...
Joint Limits = PASS
```

Allow:

-   select
-   preview
-   animate
-   compare

Rank solutions intelligently, for example by:

1.  validity
2.  FK error
3.  distance from current joint state
4.  joint-limit margin
5.  singularity/conditioning quality

Do not hide valid solutions merely because they are inconvenient.

------------------------------------------------------------------------

# 27. UNREACHABLE TARGETS

When no solution exists, distinguish the cause where possible:

-   outside workspace
-   joint limits
-   orientation impossible
-   numerical non-convergence
-   singular/ill-conditioned configuration
-   invalid target

Never move the robot to a random nearby position and call it a
successful IK result.

------------------------------------------------------------------------

# 28. JOINT LIMITS

Every joint may have:

``` text
min
max
```

Validation must occur:

-   during manual input
-   during IK
-   during trajectory generation
-   during animation

If a trajectory crosses a limit, stop or reject it according to the
selected safety behavior.

Clearly identify the offending joint.

------------------------------------------------------------------------

# 29. ROBOT SCENE GRAPH

Build an actual kinematic hierarchy:

``` text
RobotRoot
 └── Base
      └── Joint1
           └── Link1
                └── Joint2
                     └── Link2
                          └── ...
```

Each joint must be a transform node.

Each link mesh must inherit its parent's transform.

Do not calculate each mesh position independently.

------------------------------------------------------------------------

# 30. STL MODEL INTEGRATION

Use the supplied STL models as real 3D geometry.

Requirements:

-   lazy loading
-   caching
-   disposal
-   correct scaling
-   correct orientation
-   correct pivot
-   correct parent-child hierarchy

If the STL coordinate system does not match the DH coordinate system,
create an explicit calibration transform:

``` ts
meshCalibrationTransform
```

Do not bury mysterious translation/rotation constants throughout the
renderer.

------------------------------------------------------------------------

# 31. PIVOT CALIBRATION

This is a critical simulation-quality item.

For each robot:

1.  load link mesh
2.  inspect local bounds
3.  identify the intended joint axis/pivot
4.  establish a local transform
5.  attach mesh to the corresponding joint node
6.  verify against the DH frame
7.  test every joint independently

The visible link must rotate around the correct physical joint axis.

A mathematically perfect FK engine with incorrectly pivoted STL meshes
is still an incorrect simulator.

------------------------------------------------------------------------

# 32. REAL-TIME ANIMATION ENGINE

Use a real animation clock.

Conceptually:

``` ts
const deltaTime = clock.getDelta();
simulationTime += deltaTime * playbackSpeed;
jointState = trajectory.sample(simulationTime);
kinematics = robot.solveFK(jointState);
scene.applyKinematics(kinematics);
renderer.render(scene, camera);
```

Use `requestAnimationFrame`.

Animation must be frame-rate independent.

------------------------------------------------------------------------

# 33. SMOOTH MOTION

Never jump directly between sparse states.

Use interpolation.

At minimum:

-   linear interpolation
-   smooth interpolation

Prefer:

-   trapezoidal velocity profiles
-   S-curve profiles

where appropriate.

The robot must not jitter or snap at waypoint boundaries.

------------------------------------------------------------------------

# 34. JOINT-SPACE TRAJECTORIES

Support:

``` text
q_start
q_end
duration
```

and generate:

``` text
q(t)
qdot(t)
qddot(t)
```

for each joint where appropriate.

Ensure:

-   joint limits
-   continuity
-   deterministic sampling
-   configurable duration
-   configurable playback speed

------------------------------------------------------------------------

# 35. CARTESIAN TRAJECTORIES

Allow:

``` text
P1
P2
P3
...
Pn
```

with optional orientations.

Pipeline:

``` text
Cartesian waypoints
       ↓
Interpolation
       ↓
Pose(t)
       ↓
IK
       ↓
Joint trajectory
       ↓
FK verification
       ↓
3D animation
```

If IK fails at any waypoint, clearly identify the failed waypoint.

Do not silently skip it.

------------------------------------------------------------------------

# 36. COORDINATE-BASED MOTION

The user must be able to specify:

``` text
X
Y
Z
Rx
Ry
Rz
```

or another explicit orientation representation.

Example:

``` text
X = 350 mm
Y = 120 mm
Z = 500 mm
```

The system must:

1.  convert units
2.  construct target pose
3.  solve IK
4.  validate solution
5.  generate motion
6.  animate

Also support direct joint coordinate entry.

Both paths must converge into the same canonical simulation state.

------------------------------------------------------------------------

# 37. TARGET POSE VISUALIZATION

When IK is active, render a target marker.

Show:

``` text
TARGET
   ├── position
   └── orientation axes
```

Separately show:

``` text
ACTUAL END EFFECTOR
```

Display:

``` text
Position Error
Orientation Error
```

This makes IK debugging transparent.

------------------------------------------------------------------------

# 38. END-EFFECTOR TRACE

Implement a real-time 3D trace.

Store actual end-effector positions:

``` text
p0, p1, p2, ...
```

Render them as a Three.js line/curve.

Features:

-   enable/disable
-   clear
-   pause
-   persistence
-   optional maximum length

Never render trace images.

------------------------------------------------------------------------

# 39. COORDINATE FRAMES

Support:

-   world frame
-   base frame
-   joint frames
-   end-effector frame

Each frame must correspond to the actual calculated transform.

Use Three.js axes helpers or an equivalent explicit visualization.

------------------------------------------------------------------------

# 40. CAMERA SYSTEM

Support:

-   orbit
-   pan
-   zoom
-   fit robot
-   reset
-   front
-   back
-   left
-   right
-   top
-   bottom
-   isometric

Camera transitions should be smooth.

Do not reconstruct the robot scene when changing cameras.

------------------------------------------------------------------------

# 41. SIMULATION CONTROLS

Provide:

``` text
Play
Pause
Stop
Reset
Step Forward
Step Backward
```

Speed:

``` text
0.1x
0.25x
0.5x
1x
2x
5x
```

The trajectory must remain mathematically valid at every playback speed.

------------------------------------------------------------------------

# 42. JOINT CONTROL PANEL

Each joint should have:

-   name
-   type
-   current value
-   slider
-   numeric input
-   minimum
-   maximum
-   unit
-   reset

Example:

``` text
J2 — Revolute

[-180° ─────────────── 180°]

Current: 42.50°
```

The control should update the simulation immediately.

------------------------------------------------------------------------

# 43. LIVE ROBOT READOUT

Display:

``` text
End Effector

X: ...
Y: ...
Z: ...

Orientation

Rx: ...
Ry: ...
Rz: ...
```

Optionally:

``` text
Quaternion
Rotation Matrix
Homogeneous Transform
```

The displayed values must come from the same FK result driving the
renderer.

------------------------------------------------------------------------

# 44. ROBOT LIBRARY

Create a searchable robot library.

Use the supplied RoboAnalyzer robot definitions where possible.

Preserve:

-   manufacturer
-   model
-   name
-   DOF
-   joint types
-   DH data
-   joint limits
-   STL geometry
-   colors
-   relevant mass/CG information

Do not lose source metadata unnecessarily.

------------------------------------------------------------------------

# 45. CUSTOM ROBOT CREATOR

Workflow:

``` text
New Robot
 ↓
Choose DOF
 ↓
Choose joint types
 ↓
Choose DH convention
 ↓
Enter DH table
 ↓
Set limits
 ↓
Assign geometry
 ↓
Validate
 ↓
Save
 ↓
Simulate
```

Custom robots must use exactly the same robotics engine.

------------------------------------------------------------------------

# 46. IMPORT / EXPORT

Support a stable JSON robot format.

The exported definition should contain enough information to reproduce:

-   DOF
-   DH convention
-   DH values
-   joint types
-   limits
-   offsets
-   link references
-   relevant metadata

Do not serialize transient renderer state as if it were robot definition
data.

------------------------------------------------------------------------

# 47. ANALYSIS / GRAPHS

Where appropriate, reproduce useful RoboAnalyzer-style analysis.

Possible plots:

-   joint position
-   joint velocity
-   joint acceleration
-   end-effector X
-   end-effector Y
-   end-effector Z

Graphs must use actual generated simulation/trajectory data.

Never fabricate graph values.

------------------------------------------------------------------------

# 48. WORKSPACE / REACHABILITY

Where feasible, implement a workspace analysis tool.

Potential methods:

-   sampled joint-space exploration
-   end-effector point cloud
-   configurable resolution

Clearly label sampled workspace as sampled/estimated.

Do not claim an approximation is an exact workspace boundary.

------------------------------------------------------------------------

# 49. NUMERICAL SAFETY

The application must aggressively protect against invalid numerical
state.

Before renderer consumption, reject:

-   NaN
-   Infinity
-   malformed matrices
-   invalid quaternions
-   non-finite trajectory values

If a calculation fails:

1.  preserve the last valid state
2.  stop the invalid transition
3.  show a clear error
4.  allow recovery

------------------------------------------------------------------------

# 50. PERFORMANCE REQUIREMENTS

Target approximately:

**60 FPS during normal interactive simulation.**

Avoid:

-   unnecessary React rerenders
-   recreating STL geometry every frame
-   recreating materials every frame
-   parsing assets during animation
-   expensive synchronous IK in the render loop
-   rebuilding the complete Three.js scene every frame

The simulation engine and renderer should be decoupled from UI
rendering.

------------------------------------------------------------------------

# 51. WEB WORKERS

Use Web Workers for expensive numerical work when justified.

Good candidates:

-   numerical IK
-   workspace sampling
-   large trajectory generation

Do not use workers for trivial calculations where messaging overhead is
worse.

The render thread must remain responsive.

------------------------------------------------------------------------

# 52. STATE MANAGEMENT

Keep a clear distinction between:

### Persistent robot definition

``` text
DH parameters
links
joint types
limits
metadata
```

### Simulation state

``` text
current q
current time
trajectory
playback state
target pose
solver state
trace
```

### UI state

``` text
selected panel
camera mode
expanded sections
precision display
```

Do not mix all three into one uncontrolled object.

------------------------------------------------------------------------

# 53. UI DESIGN

The UI should feel like a professional engineering tool.

Avoid:

-   generic SaaS dashboard appearance
-   excessive rounded cards
-   decorative gradients everywhere
-   unnecessary animations
-   visual clutter

Prioritize:

-   readable numerical values
-   clear hierarchy
-   dense but understandable engineering controls
-   excellent 3D viewport
-   obvious simulation status
-   clear error messages

------------------------------------------------------------------------

# 54. MAIN LAYOUT

Desktop concept:

``` text
┌──────────────────────────────────────────────────────────────┐
│ RoboAnalyzer Web | Simulation | DH | FK | IK | Transform    │
├──────────────┬──────────────────────────────┬───────────────┤
│ Robot /      │                              │ Analysis /    │
│ Joint        │         3D VIEWPORT          │ Coordinates   │
│ Controls     │                              │               │
│              │          ROBOT               │ X             │
│ J1           │                              │ Y             │
│ J2           │                              │ Z             │
│ J3           │                              │ Orientation   │
│ ...          │                              │               │
├──────────────┴──────────────────────────────┴───────────────┤
│ Play | Pause | Stop | Speed | Timeline | Trace | Status    │
└──────────────────────────────────────────────────────────────┘
```

Adapt responsively for smaller screens.

------------------------------------------------------------------------

# 55. ACCESSIBILITY

Engineering functionality must remain usable without relying exclusively
on color.

Provide:

-   keyboard navigation
-   visible focus
-   labels
-   meaningful status text
-   readable contrast
-   numeric inputs that can be edited precisely

------------------------------------------------------------------------

# 56. ERROR MESSAGES

Error messages should be actionable.

Bad:

``` text
Error.
```

Good:

``` text
Target is outside the reachable workspace for the selected robot.
No valid IK solution was found.
Try a different position or select another IK branch.
```

For numerical failure:

``` text
IK did not converge within 200 iterations.
Final position error: 4.8 mm.
Try a different initial joint configuration.
```

------------------------------------------------------------------------

# 57. TEST STRATEGY

Testing is mandatory.

## Matrix tests

Test:

-   identity
-   rotations
-   translations
-   multiplication
-   inverse
-   homogeneous transforms

## DH tests

Test:

-   standard DH
-   modified DH
-   revolute
-   prismatic
-   zero values
-   nonzero values
-   negative twist angles

## FK tests

Test:

-   1 DOF
-   3 DOF
-   6 DOF
-   known robot configurations
-   zero configuration
-   random valid configurations

## IK tests

Test:

-   reachable targets
-   unreachable targets
-   joint-limit targets
-   singular configurations
-   multiple solutions
-   position-only
-   position + orientation

------------------------------------------------------------------------

# 58. FK → IK → FK ROUND-TRIP TEST

This is one of the most important automated tests.

For a known valid joint state:

``` text
q
 ↓
FK(q)
 ↓
target pose
 ↓
IK(target pose)
 ↓
q_solution
 ↓
FK(q_solution)
 ↓
compare poses
```

The final pose must satisfy configured position/orientation tolerances.

Do this for multiple random valid configurations.

------------------------------------------------------------------------

# 59. IK → FK TEST

For every IK result:

``` text
target
 ↓
IK
 ↓
solution
 ↓
FK
```

Validate:

``` text
position error
orientation error
joint limits
finite values
```

Only validated solutions may be presented as valid.

------------------------------------------------------------------------

# 60. SIMULATION REGRESSION TESTS

Test each robot:

1.  Load.
2.  Render.
3.  Move J1.
4.  Move J2.
5.  Move each joint independently.
6.  Verify downstream links move.
7.  Verify upstream links remain fixed.
8.  Verify joint axes.
9.  Verify end-effector coordinates.
10. Compare visual frame transforms to mathematical transforms.

------------------------------------------------------------------------

# 61. ANIMATION REGRESSION TESTS

Test:

-   0.1x
-   0.5x
-   1x
-   2x
-   5x

Test:

-   play
-   pause
-   resume
-   stop
-   reset
-   step

Verify:

-   no teleporting
-   no jitter
-   no NaN
-   correct start pose
-   correct end pose
-   frame-rate independence

------------------------------------------------------------------------

# 62. ROBOT MESH VALIDATION

For every integrated robot:

-   verify mesh loads
-   verify scale
-   verify orientation
-   verify pivot
-   verify link ordering
-   verify joint axis
-   verify hierarchy

Test all joints independently.

This is mandatory before calling a robot integration complete.

------------------------------------------------------------------------

# 63. ARCHIVE DATA VALIDATION

The importer should produce validation warnings if:

-   XML is malformed
-   joint count disagrees
-   STL reference is missing
-   joint limits are invalid
-   parameters are non-numeric
-   units are ambiguous
-   DH convention is unknown

Do not silently discard bad data.

------------------------------------------------------------------------

# 64. LOGGING / DEBUG MODE

Add a development/debug mode capable of displaying:

``` text
Robot
DOF
Joint state
DH parameters
A_i
T_0_i
End-effector pose
Jacobian
Condition/singularity state
IK iteration count
IK error
Trajectory time
FPS
```

This mode will be extremely useful for validating the simulator.

------------------------------------------------------------------------

# 65. PERFORMANCE DEBUGGING

Expose development-only information such as:

``` text
FPS
frame time
geometry count
draw calls
loaded meshes
IK time
FK time
trajectory time
```

Do not show these by default in production.

------------------------------------------------------------------------

# 66. DATA FLOW EXAMPLE

The application should behave like this:

``` text
User enters:

J2 = 30°

       ↓

Simulation State

       ↓

Canonical Robot State

       ↓

DH Engine

       ↓

A2

       ↓

T02

       ↓

T06

       ↓

End Effector Pose

       ├──────────────→ Numerical UI
       │
       ├──────────────→ Matrix UI
       │
       ├──────────────→ Coordinate UI
       │
       └──────────────→ Three.js Scene
```

There must be no second independent calculation path.

------------------------------------------------------------------------

# 67. IK DATA FLOW

``` text
User enters target pose
        ↓
Validate pose
        ↓
Select solver
        ↓
Analytical / Numerical IK
        ↓
Candidate solutions
        ↓
Joint-limit filtering
        ↓
FK validation
        ↓
Solution ranking
        ↓
User selects solution
        ↓
Trajectory generation
        ↓
Animation
```

------------------------------------------------------------------------

# 68. SIMULATION DATA FLOW

``` text
Animation Clock
      ↓
Trajectory.sample(t)
      ↓
q(t)
      ↓
FK(q)
      ↓
Transforms
      ↓
Scene Graph
      ↓
WebGL Render
```

The render loop must never invent a different q.

------------------------------------------------------------------------

# 69. ROBOT SWITCHING

When switching robots:

1.  stop current animation
2.  dispose/release unnecessary robot assets
3.  load new definition
4.  load geometry
5.  initialize joint state
6.  validate
7.  construct scene graph
8.  fit camera
9.  update UI

Do not retain stale matrices or old joint states.

------------------------------------------------------------------------

# 70. RESOURCE MANAGEMENT

Three.js resources must be properly disposed.

When unloading:

-   geometries
-   materials
-   textures
-   render targets
-   temporary objects

must be cleaned up when no longer needed.

Test repeated robot switching for memory growth.

------------------------------------------------------------------------

# 71. PERSISTENCE

Support local persistence where useful.

Save:

-   custom robot definitions
-   user settings
-   recent robot
-   simulation configuration

Use browser storage/IndexedDB where appropriate.

Do not require a server for basic operation.

------------------------------------------------------------------------

# 72. PWA / WEB-NATIVE BEHAVIOR

The application should be installable as a PWA if practical.

Provide:

-   app manifest
-   appropriate icons
-   offline-capable static assets where feasible
-   graceful loading states

The core simulator should remain a browser-native application.

------------------------------------------------------------------------

# 73. SECURITY

Treat imported files as untrusted data.

Validate:

-   JSON
-   XML-derived data
-   CSV
-   numerical inputs

Do not execute arbitrary content from imported files.

------------------------------------------------------------------------

# 74. DOCUMENTATION

Create project documentation covering:

-   architecture
-   robot schema
-   DH convention
-   coordinate convention
-   FK
-   IK
-   trajectory engine
-   renderer
-   asset pipeline
-   testing
-   development commands

The README should explain how to run the application.

------------------------------------------------------------------------

# 75. CODE QUALITY

Use:

-   strict TypeScript
-   meaningful names
-   small focused modules
-   reusable functions
-   explicit types
-   comments for non-obvious mathematical decisions
-   tests alongside important numerical modules

Avoid:

-   giant components
-   giant files
-   hidden global state
-   magic numbers
-   unexplained transforms
-   duplicated FK implementations

------------------------------------------------------------------------

# 76. MAGIC NUMBERS

Do not scatter values such as:

``` text
0.001
57.2958
1000
1.570796
```

through the code.

Create named constants/configuration:

``` ts
POSITION_TOLERANCE
ORIENTATION_TOLERANCE
DEG_TO_RAD
RAD_TO_DEG
MM_TO_M
```

Where a robot-specific calibration value is required, store it in the
robot asset definition.

------------------------------------------------------------------------

# 77. TOLERANCE SYSTEM

Create explicit numerical tolerances.

Examples:

``` ts
positionTolerance
orientationTolerance
matrixTolerance
jointTolerance
singularityThreshold
ikConvergenceTolerance
```

Make them configurable internally.

Avoid arbitrary inconsistent epsilon values throughout the project.

------------------------------------------------------------------------

# 78. ORIENTATION ERROR

Orientation error must be computed correctly.

Do not compare Euler angles naively when a robust rotational error is
required.

Prefer a rotation-matrix or quaternion-based orientation error for
numerical IK validation.

Euler values may be displayed for the user.

------------------------------------------------------------------------

# 79. QUATERNION SAFETY

Whenever quaternions are used:

-   normalize them
-   reject invalid values
-   use shortest-path interpolation where appropriate
-   avoid discontinuities caused by sign ambiguity

For trajectory interpolation, use appropriate quaternion interpolation
such as SLERP.

------------------------------------------------------------------------

# 80. CARTESIAN INTERPOLATION

For position:

``` text
p(t)
```

interpolate continuously.

For orientation:

``` text
R(t)
```

use a mathematically appropriate rotational interpolation rather than
independently interpolating matrix elements.

------------------------------------------------------------------------

# 81. TRAJECTORY VALIDATION

Before animation:

1.  sample trajectory
2.  verify finite values
3.  verify joint limits
4.  verify IK validity if Cartesian
5.  optionally estimate velocity/acceleration
6.  reject unsafe/invalid trajectory

If a trajectory is invalid, tell the user where it fails.

------------------------------------------------------------------------

# 82. EMERGENCY SIMULATION STOP

Provide a clearly accessible stop control.

When pressed:

-   immediately stop trajectory playback
-   retain current valid robot state
-   do not reset unexpectedly

------------------------------------------------------------------------

# 83. VISUAL FEEDBACK

The simulator should visibly distinguish:

-   valid state
-   selected joint
-   target pose
-   actual pose
-   IK success
-   IK failure
-   singularity warning
-   joint-limit violation
-   simulation running
-   simulation paused

Do not depend solely on color.

------------------------------------------------------------------------

# 84. PROFESSIONAL 3D VIEWPORT

The viewport should support:

-   grid
-   axes
-   robot
-   joint markers
-   end effector
-   target
-   trace
-   coordinate frames
-   camera controls

Use lighting and materials that make geometry readable.

Do not overuse visual effects.

------------------------------------------------------------------------

# 85. ROBOT APPEARANCE

Where source data provides link colors, preserve them where appropriate.

The user should also be able to choose a visualization mode if
practical:

-   source colors
-   engineering neutral
-   selected-link highlight

Visual changes must not alter simulation math.

------------------------------------------------------------------------

# 86. EDUCATIONAL MODE

Because RoboAnalyzer is educational in nature, provide explanations
where useful.

For example, when a user selects `A2`, explain:

``` text
A2 represents the transformation from frame 1 to frame 2 according to the selected DH convention.
```

Keep explanations concise and technically correct.

------------------------------------------------------------------------

# 87. MATRIX STEP MODE

Allow:

``` text
Step 1 → A1
Step 2 → A2
Step 3 → A3
...
```

At each step:

-   highlight the corresponding matrix
-   show the coordinate frame
-   show cumulative transform
-   optionally animate the frame

This is an important educational feature.

------------------------------------------------------------------------

# 88. 3D DEBUG OVERLAY

Provide an optional debug overlay showing:

``` text
Frame 0
Frame 1
...
Frame N
```

and joint axes.

This is useful when validating STL pivots.

------------------------------------------------------------------------

# 89. CUSTOM LINK GEOMETRY

Where practical, allow a custom robot to use:

-   simple primitives
-   imported STL

Primitive geometry can be useful for educational robots where no STL
exists.

------------------------------------------------------------------------

# 90. FALLBACK GEOMETRY

If a robot has no valid STL:

Do not make the robot disappear.

Render an engineering fallback representation using:

-   cylinders
-   boxes
-   axes
-   joint markers

Clearly indicate that fallback geometry is being used.

The mathematics must still work.

------------------------------------------------------------------------

# 91. 3-DOF EDUCATIONAL ROBOTS

Provide convenient presets for simple educational robots.

For example:

``` text
Planar 3R
Cartesian 3P
Cylindrical variants
Spherical variants where applicable
```

These presets must still use the same canonical DH engine.

------------------------------------------------------------------------

# 92. 6-DOF EDUCATIONAL MODE

Provide a clean generic 6R robot preset so users can study:

-   position
-   orientation
-   wrist behavior
-   multiple IK solutions
-   singularities

Again, no separate mathematics implementation.

------------------------------------------------------------------------

# 93. GRAPH DATA CONSISTENCY

If plotting:

``` text
joint position
joint velocity
joint acceleration
```

derive all three from the same trajectory.

Do not approximate velocity/acceleration from unrelated values.

Use consistent differentiation/profile definitions.

------------------------------------------------------------------------

# 94. TIME MODEL

Use seconds internally.

Animation must use:

``` text
simulationTime += deltaTime * playbackSpeed
```

not:

``` text
simulationTime += fixedFrameAmount
```

This prevents different motion speeds on different displays.

------------------------------------------------------------------------

# 95. FRAME-RATE INDEPENDENCE

The same trajectory duration must result in approximately the same
physical motion duration at:

-   30 FPS
-   60 FPS
-   120 FPS
-   variable FPS

------------------------------------------------------------------------

# 96. SIMULATION DETERMINISM

Given:

``` text
robot
initial q
trajectory
duration
```

the generated trajectory should be deterministic.

Do not use uncontrolled random behavior.

Randomized workspace tests may use a seeded generator.

------------------------------------------------------------------------

# 97. LOADING EXPERIENCE

When loading a robot:

``` text
Loading robot...
Loading geometry...
Building kinematic chain...
Validating model...
Ready
```

Do not display an interactive robot before its mathematical/visual state
is valid.

------------------------------------------------------------------------

# 98. FAILED ASSET EXPERIENCE

If one STL fails:

-   report the exact missing asset
-   continue if safe
-   use fallback geometry where possible
-   do not crash the entire simulator

------------------------------------------------------------------------

# 99. BROWSER COMPATIBILITY

Prioritize modern Chromium/Firefox/Safari-class browsers.

Do not use browser APIs without graceful failure where practical.

------------------------------------------------------------------------

# 100. FINAL ACCEPTANCE TEST

Before declaring the application complete, perform this exact scenario:

### Scenario A --- Manual FK

1.  Load a 6R robot.
2.  Show DH table.
3.  Set joint values.
4.  Verify matrices.
5.  Verify end-effector coordinates.
6.  Verify the 3D model matches.

### Scenario B --- IK

1.  Choose a valid pose.
2.  Generate target.
3.  Run IK.
4.  Display all valid solutions.
5.  Select one.
6.  Run FK on it.
7.  Show position/orientation error.
8.  Animate.

### Scenario C --- Trajectory

1.  Create two valid poses.
2.  Generate trajectory.
3.  Play.
4.  Observe smooth movement.
5.  Verify no joint-limit violation.
6.  Verify end-effector trace.
7.  Pause.
8.  Resume.
9.  Stop.
10. Reset.

### Scenario D --- Invalid target

1.  Enter unreachable coordinates.
2.  Run IK.
3.  Show failure.
4.  Keep last valid robot state.
5.  Do not crash.
6.  Explain the failure.

### Scenario E --- Singular configuration

1.  Move to a known problematic configuration.
2.  Detect/report singularity or near-singularity.
3.  Ensure numerical IK remains stable where possible.
4.  Avoid explosive joint updates.

------------------------------------------------------------------------

# 101. DEFINITION OF DONE

The project is NOT done merely because the website opens.

It is done only when:

-   [ ] RoboAnalyzer project has been inspected.
-   [ ] Robot data is mapped.
-   [ ] STL assets are mapped.
-   [ ] XML definitions are parsed/converted.
-   [ ] Canonical robot schema exists.
-   [ ] Standard DH works.
-   [ ] Modified DH works if applicable.
-   [ ] DH/H table works.
-   [ ] A matrices work.
-   [ ] cumulative T matrices work.
-   [ ] coordinate frames match matrices.
-   [ ] FK works.
-   [ ] 3-DOF mode works.
-   [ ] 6-DOF mode works.
-   [ ] analytical IK works where supported.
-   [ ] numerical IK fallback works.
-   [ ] IK results are FK-validated.
-   [ ] multiple IK solutions work where applicable.
-   [ ] joint limits work.
-   [ ] singularity detection works.
-   [ ] unreachable targets are handled.
-   [ ] coordinate-based movement works.
-   [ ] direct joint movement works.
-   [ ] trajectory engine works.
-   [ ] Cartesian trajectories work.
-   [ ] joint trajectories work.
-   [ ] real-time 3D animation works.
-   [ ] animation is not image-based.
-   [ ] STL pivots are correct.
-   [ ] end-effector trace works.
-   [ ] camera controls work.
-   [ ] robot library works.
-   [ ] custom robots work.
-   [ ] import/export works.
-   [ ] numerical tests pass.
-   [ ] FK/IK round-trip tests pass.
-   [ ] animation tests pass.
-   [ ] repeated robot switching does not leak resources.
-   [ ] invalid input does not crash the app.
-   [ ] UI is polished.
-   [ ] documentation exists.

------------------------------------------------------------------------

# 102. IMPLEMENTATION ORDER

Follow this order unless there is a strong engineering reason to change
it.

## Phase 1

Archive inspection and data mapping.

## Phase 2

Robotics math engine.

## Phase 3

Automated mathematical tests.

## Phase 4

Robot schema and imported robot library.

## Phase 5

Three.js scene graph and STL integration.

## Phase 6

Manual joint control + FK + real-time simulation.

## Phase 7

DH/H table + matrix studio.

## Phase 8

3-DOF IK.

## Phase 9

6-DOF IK.

## Phase 10

Numerical IK fallback + Jacobian.

## Phase 11

Trajectory generation.

## Phase 12

Cartesian motion.

## Phase 13

Trace + graphs + analysis.

## Phase 14

Custom robot builder/import/export.

## Phase 15

Performance optimization.

## Phase 16

UI polish.

## Phase 17

Full regression testing.

------------------------------------------------------------------------

# 103. IMPORTANT: DO NOT BUILD THE UI FIRST

Do not spend most of the first implementation phase making attractive
cards and panels.

First prove:

``` text
DH
 ↓
Matrices
 ↓
FK
 ↓
3D transforms
```

Then:

``` text
IK
 ↓
FK validation
```

Then:

``` text
Trajectory
 ↓
Animation
```

Then polish the UI.

A beautiful simulator with incorrect kinematics is a failure.

------------------------------------------------------------------------

# 104. IMPORTANT: DO NOT REIMPLEMENT THE SAME MATH MULTIPLE TIMES

There should be one authoritative:

``` text
forwardKinematics()
```

one authoritative:

``` text
computeDHTransform()
```

one authoritative:

``` text
solveIK()
```

and one authoritative:

``` text
computeJacobian()
```

Everything else calls these.

------------------------------------------------------------------------

# 105. IMPORTANT: VERIFY COORDINATE CONVENTIONS

Before integrating each robot:

-   identify base frame
-   identify joint axes
-   identify link frames
-   identify end-effector frame
-   identify DH convention
-   identify units
-   identify angle direction
-   identify STL local coordinate system

Document any required calibration.

Do not guess.

------------------------------------------------------------------------

# 106. IMPORTANT: VISUAL/MATH VALIDATION

For each robot, create a validation view capable of showing:

``` text
Mathematical frame
       +
STL geometry
       +
Joint axis
```

If they do not line up, fix the model/calibration.

Do not modify the mathematical result just to make a mesh look right.

------------------------------------------------------------------------

# 107. PRODUCT QUALITY BAR

The finished application should feel like:

> **A modern, professional browser-native robotics laboratory and
> simulation environment.**

It should be suitable for:

-   robotics students
-   engineering demonstrations
-   classroom teaching
-   kinematics experimentation
-   project demonstrations
-   robot model exploration

It should look polished enough for a serious technical project
demonstration.

------------------------------------------------------------------------

# 108. FINAL CODING-AGENT DIRECTIVE

**Do not cut corners.**

If a feature is difficult, implement it properly in the correct
architecture rather than creating a visual placeholder.

If an algorithm is mathematically ambiguous, inspect the robot
definition and convention first.

If a robot cannot be solved analytically, use the numerical solver.

If numerical IK fails, report the failure rather than fabricating a
result.

If an STL pivot is wrong, calibrate the mesh rather than changing FK
equations.

If performance becomes a problem, optimize the renderer/worker
architecture rather than reducing simulation correctness.

If the UI and mathematics disagree, the mathematics and canonical state
win.

If the original RoboAnalyzer behavior and the new web architecture
differ, preserve the **correct robotics semantics**, not obsolete
desktop implementation details.

The ultimate invariant is:

``` text
THE ROBOT ON SCREEN
=
THE ROBOT DEFINED MATHEMATICALLY
```

And:

``` text
DH TABLE
=
TRANSFORMATION MATRICES
=
FK
=
IK VALIDATION
=
TRAJECTORY
=
3D SIMULATION
```

There must be no contradiction between them.

Build this as a real robotics product, not a prototype pretending to be
one.
