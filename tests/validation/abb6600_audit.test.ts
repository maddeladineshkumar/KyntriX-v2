import { describe, expect, it } from 'vitest';
import { loadRobotById } from '../../src/data/robots';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import { forwardKinematics, computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import { computeJacobian } from '../../src/robotics/kinematics/jacobian';
import { solveIK } from '../../src/robotics/ik/ikPipeline';
import { solveNumericalIK } from '../../src/robotics/ik/numericalIK';
import { generateJointTrajectory } from '../../src/robotics/trajectories/jointTrajectory';
import { Matrix4 } from '../../src/robotics/math/Matrix4';
import { Vector3 } from '../../src/robotics/math/Vector3';
import { Euler } from '../../src/robotics/math/Euler';
import { hasSphericalWrist, solve6RSpherical } from '../../src/robotics/ik/analytical6R';

describe('Technical Audit: Trajectory, FK, IK, Reachability, and 3D Visualization', () => {
  const robotsToAudit = ['ABBIRB6620', 'ABBIRB6650', 'Puma560'];

  for (const robotId of robotsToAudit) {
    describe(`Audit for robot: ${robotId}`, () => {
      it('Section 3 & 12: Verifies DH parameters, joint limits, and FK formulation', async () => {
        const robot = await loadRobotById(robotId);
        expect(robot.dof).toBe(6);
        expect(robot.dhConvention).toBe('standard');

        for (let i = 0; i < robot.joints.length; i++) {
          const j = robot.joints[i];
          expect(j.min).toBeLessThan(j.max);
          expect(j.home).toBeGreaterThanOrEqual(j.min - 1e-4);
          expect(j.home).toBeLessThanOrEqual(j.max + 1e-4);
          expect(Number.isFinite(j.d)).toBe(true);
          expect(Number.isFinite(j.a)).toBe(true);
          expect(Number.isFinite(j.alpha)).toBe(true);
          expect(Number.isFinite(j.offset)).toBe(true);
        }

        // Test FK at home pose
        const homeQ = robot.joints.map((j) => j.home);
        const fkHome = computeFK(robot, homeQ);
        expect(fkHome.A).toHaveLength(6);
        expect(fkHome.T).toHaveLength(6);
        expect(fkHome.frames).toHaveLength(7); // Base + 6 frames

        // Verify T_0_6 = A_1 * A_2 * ... * A_6
        let accum = Matrix4.identity();
        for (let i = 0; i < 6; i++) {
          accum = accum.multiply(fkHome.A[i]);
          for (let el = 0; el < 16; el++) {
            expect(Math.abs(accum.elements[el] - fkHome.T[i].elements[el])).toBeLessThan(1e-10);
          }
        }
      });

      it('Section 6, 7 & 8: Trajectory blue-line points consistency and FK -> IK -> FK round-trip', async () => {
        const robot = await loadRobotById(robotId);

        // Generate a smooth joint trajectory from home to a valid destination
        const startQ = robot.joints.map((j) => j.home);
        const goalQ = robot.joints.map((j, idx) => {
          const span = j.max - j.min;
          // Displace by 25% of span, ensuring within limits
          const delta = (idx % 2 === 0 ? 1 : -1) * 0.25 * span;
          const target = j.home + delta;
          return Math.max(j.min + 0.05 * span, Math.min(j.max - 0.05 * span, target));
        });

        const traj = generateJointTrajectory(robot, {
          startQ,
          goalQ,
          duration: 3.0,
          profile: 'quintic',
          samples: 50,
        });

        expect(traj.isValid).toBe(true);
        expect(traj.states).toHaveLength(50);
        expect(traj.endEffectorPositions).toHaveLength(50);

        let maxPosErrSeeded = 0;
        let maxOriErrSeeded = 0;
        let maxPosErrCold = 0;
        let maxOriErrCold = 0;
        let coldSuccessCount = 0;
        let seededSuccessCount = 0;

        let rejectedDueToWrongOrientationCount = 0;

        for (let k = 0; k < 50; k++) {
          const q_k = traj.positions[k];
          const fk_k = computeFK(robot, q_k);
          const T_k = fk_k.endEffectorTransform;
          const P_k = T_k.getPosition();

          // Verify that traj.endEffectorPositions[k] is identical to FK position
          expect(traj.endEffectorPositions[k].distanceTo(P_k)).toBeLessThan(1e-10);

          // 1. Full-pose IK seeded with trajectory configuration q_k
          const ikSeeded = solveIK(robot, T_k, {
            currentJoints: q_k,
            initialGuess: q_k,
            maxIterations: 60,
          });

          if (ikSeeded.converged && ikSeeded.bestSolution) {
            seededSuccessCount++;
            const pe = ikSeeded.bestSolution.positionError;
            const oe = ikSeeded.bestSolution.orientationError;
            if (pe > maxPosErrSeeded) maxPosErrSeeded = pe;
            if (oe > maxOriErrSeeded) maxOriErrSeeded = oe;
          } else {
            const spher = solve6RSpherical(robot, T_k, q_k);
            console.log(`[${robotId}] solve6RSpherical on sample ${k} returned ${spher.length} sols:`, spher.map(s => ({
              converged: s.converged,
              withinLimits: s.withinLimits,
              posErr: s.positionError,
              oriErr: s.orientationError,
              q: s.q,
            })));
            const numSol = solveNumericalIK(robot, T_k, { initialGuess: q_k, currentJoints: q_k, maxIterations: 100 });
            console.log(`[${robotId}] solveNumericalIK on sample ${k}:`, {
              converged: numSol.converged,
              withinLimits: numSol.withinLimits,
              posErr: numSol.positionError,
              oriErr: numSol.orientationError,
              iters: numSol.iterations,
              q: numSol.q,
            });
            console.log(`[${robotId}] Seeded failed at sample ${k}:`, {
              converged: ikSeeded.converged,
              bestSol: ikSeeded.bestSolution ? {
                posErr: ikSeeded.bestSolution.positionError,
                oriErr: ikSeeded.bestSolution.orientationError,
                withinLimits: ikSeeded.bestSolution.withinLimits,
                q: ikSeeded.bestSolution.q,
              } : null,
              q_k,
              failureReason: ikSeeded.failureReason,
            });
          }

          // 2. Full-pose IK COLD START (seeded with home pose, simulating user inputting target pose)
          const ikCold = solveIK(robot, T_k, {
            initialGuess: startQ,
            currentJoints: startQ,
            returnAllBranches: true,
            maxIterations: 80,
          });

          if (ikCold.converged && ikCold.bestSolution) {
            coldSuccessCount++;
            const pe = ikCold.bestSolution.positionError;
            const oe = ikCold.bestSolution.orientationError;
            if (pe > maxPosErrCold) maxPosErrCold = pe;
            if (oe > maxOriErrCold) maxOriErrCold = oe;
          }

          // 3. What if target is tested with IDENTITY rotation (Euler 0,0,0) instead of trajectory orientation?
          const T_wrongRot = Matrix4.fromRotationTranslation(
            Matrix4.identity().getRotation(),
            P_k
          );
          const ikWrongRot = solveIK(robot, T_wrongRot, {
            returnAllBranches: true,
          });
          if (ikWrongRot.converged) {
            expect(ikWrongRot.reachabilityStatus).toMatch(/^reachable-/);
          } else {
            rejectedDueToWrongOrientationCount++;
            // Diagnostic check: verify that even when full-pose fails, it identifies that position IS reachable!
            expect(ikWrongRot.isPositionReachable).toBe(true);
            expect(ikWrongRot.isOrientationReachable).toBe(false);
            expect(ikWrongRot.reachabilityStatus).toBe('position-only-reachable');
            expect(ikWrongRot.failureReason).toContain('position is reachable');
          }

          // 4. Test explicit positionOnly reachability on P_k
          const ikPosOnly = solveIK(robot, T_wrongRot, {
            positionOnly: true,
          });
          expect(ikPosOnly.converged).toBe(true);
          expect(ikPosOnly.bestSolution).not.toBeNull();
          if (ikPosOnly.bestSolution) {
            expect(ikPosOnly.bestSolution.positionError).toBeLessThan(1e-3);
            expect(ikPosOnly.bestSolution.withinLimits).toBe(true);
          }
        }

        // 5. Test Outside Workspace Envelope Target
        const farTarget = Matrix4.fromRotationTranslation(
          Matrix4.identity().getRotation(),
          new Vector3(10, 10, 10)
        );
        const ikFar = solveIK(robot, farTarget);
        expect(ikFar.converged).toBe(false);
        expect(ikFar.isPositionReachable).toBe(false);
        expect(ikFar.reachabilityStatus).toBe('outside-workspace');
        expect(ikFar.failureReason).toContain('outside');

        console.log(`[${robotId}] Trajectory consistency:`);
        console.log(`  Seeded IK convergence: ${seededSuccessCount}/50, maxPosErr: ${maxPosErrSeeded.toExponential(3)} m, maxOriErr: ${maxOriErrSeeded.toExponential(3)} rad`);
        console.log(`  Cold Start IK convergence: ${coldSuccessCount}/50, maxPosErr: ${maxPosErrCold.toExponential(3)} m, maxOriErr: ${maxOriErrCold.toExponential(3)} rad`);
        console.log(`  Rejected when tested with Identity orientation: ${rejectedDueToWrongOrientationCount}/50`);

        // Every point along the valid trajectory MUST be reachable when tested with its actual orientation
        expect(seededSuccessCount).toBe(50);
        expect(maxPosErrSeeded).toBeLessThan(1e-3);
      }, 15000);

      it('Section 4 & 14: Checks analytical vs numerical solver dispatch and spherical wrist classification', async () => {
        const robot = await loadRobotById(robotId);
        const isSpherical = hasSphericalWrist(robot);
        console.log(`[${robotId}] hasSphericalWrist: ${isSpherical}`);

        const homeQ = robot.joints.map((j) => j.home);
        const fkHome = computeFK(robot, homeQ);

        if (isSpherical) {
          const solutions = solve6RSpherical(robot, fkHome.endEffectorTransform, homeQ);
          console.log(`[${robotId}] solve6RSpherical returned ${solutions.length} solutions (converged: ${solutions.filter(s => s.converged).length})`);
          expect(solutions.length).toBeGreaterThan(0);
          expect(solutions.some((s) => s.converged && s.withinLimits)).toBe(true);
        }
      });
    });
  }

  it('Section 4 & 5: Verifies positionOnly mode on planar and SCARA robots', async () => {
    const scara = await loadRobotById('skeleton_SCARA');
    const fkHome = computeFK(scara, scara.joints.map((j) => j.home));
    const targetPos = fkHome.endEffectorTransform.getPosition();
    const wrongRot = Matrix4.fromRotationTranslation(
      new Euler(0.5, 0.5, 0.5, 'XYZ').toRotationMatrix(),
      targetPos
    );

    const posOnlySol = solveIK(scara, wrongRot, { positionOnly: true });
    expect(posOnlySol.converged).toBe(true);
    expect(posOnlySol.bestSolution).not.toBeNull();
    expect(posOnlySol.bestSolution!.positionError).toBeLessThan(1e-3);
    expect(posOnlySol.bestSolution!.withinLimits).toBe(true);
  });
});
