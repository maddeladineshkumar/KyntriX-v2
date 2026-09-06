import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ROBOTS_CATALOG, loadRobotById } from '../../src/data/robots';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import { forwardKinematics } from '../../src/robotics/kinematics/forwardKinematics';
import { computeGeometricJacobian } from '../../src/robotics/kinematics/jacobian';
import { solveIK } from '../../src/robotics/ik/ikPipeline';
import { Matrix4 } from '../../src/robotics/math/Matrix4';

// Reference Standard DH implementation for independent double-check
function refStandardDH(theta: number, d: number, a: number, alpha: number): number[] {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  return [
    ct, -st * ca,  st * sa, a * ct,
    st,  ct * ca, -ct * sa, a * st,
    0,   sa,       ca,      d,
    0,   0,        0,       1,
  ];
}

function refMultiply4(a: number[], b: number[]): number[] {
  const out = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      for (let k = 0; k < 4; k++) {
        out[r * 4 + c] += a[r * 4 + k] * b[k * 4 + c];
      }
    }
  }
  return out;
}

function computeRefFK(robot: RobotDefinition, q: number[]): number[] {
  let t = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (let i = 0; i < robot.joints.length; i++) {
    const j = robot.joints[i];
    const qi = q[i] ?? 0;
    const theta = j.type === 'revolute' ? j.theta + qi + j.offset : j.theta;
    const d = j.type === 'revolute' ? j.d : j.d + qi + j.offset;
    const A = refStandardDH(theta, d, j.a, j.alpha);
    t = refMultiply4(t, A);
  }
  return t;
}

describe('Authoritative 42-Robot Kinematic & Asset Verification', () => {
  it('contains exactly 42 distinct models in the catalog', () => {
    expect(ROBOTS_CATALOG).toHaveLength(42);
    const idSet = new Set(ROBOTS_CATALOG.map((r) => r.id));
    expect(idSet.size).toBe(42);
  });

  it('verifies all 152 binary STL mesh files exist on disk with non-zero size', () => {
    let totalMeshes = 0;
    for (const entry of ROBOTS_CATALOG) {
      const filePath = path.resolve(__dirname, '../../src/data/robots', `${entry.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
      const robot: RobotDefinition = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (robot.links) {
        for (const link of robot.links) {
          if (link.meshFile) {
            totalMeshes++;
            const cleanPath = link.meshFile.startsWith('/') ? link.meshFile.slice(1) : link.meshFile;
            const absMeshPath = path.resolve(__dirname, '../../public', cleanPath);
            expect(fs.existsSync(absMeshPath)).toBe(true);
            const stat = fs.statSync(absMeshPath);
            expect(stat.size).toBeGreaterThan(0);
          }
        }
      }
    }
    // 22 industrial robots: 20 have 7 links, 2 have 6 links = 152 total binary STL meshes
    expect(totalMeshes).toBe(152);
  });

  it('verifies DH parameter table validity across all 42 robots', async () => {
    for (const entry of ROBOTS_CATALOG) {
      const robot = await loadRobotById(entry.id);
      expect(robot.dof).toBe(robot.joints.length);
      expect(robot.dhConvention).toBe('standard');

      robot.joints.forEach((joint, idx) => {
        expect(joint.index).toBe(idx);
        expect(['revolute', 'prismatic']).toContain(joint.type);
        expect(joint.min).toBeLessThan(joint.max);
        expect(joint.home).toBeGreaterThanOrEqual(joint.min - 1e-5);
        expect(joint.home).toBeLessThanOrEqual(joint.max + 1e-5);
        expect(Number.isFinite(joint.theta)).toBe(true);
        expect(Number.isFinite(joint.d)).toBe(true);
        expect(Number.isFinite(joint.a)).toBe(true);
        expect(Number.isFinite(joint.alpha)).toBe(true);
        expect(Number.isFinite(joint.offset)).toBe(true);
      });
    }
  });

  it('validates Standard DH Forward Kinematics against independent reference for all 42 robots', async () => {
    for (const entry of ROBOTS_CATALOG) {
      const robot = await loadRobotById(entry.id);
      const homeQ = robot.joints.map((j) => j.home);
      const zeroQ = robot.joints.map(() => 0);

      for (const q of [homeQ, zeroQ]) {
        const fk = forwardKinematics(robot, q);
        const refT = computeRefFK(robot, q);
        const engineT = fk.endEffectorTransform.elements;

        // Matrix elements match bitwise with Standard DH formulation
        for (let k = 0; k < 16; k++) {
          expect(Math.abs(engineT[k] - refT[k])).toBeLessThan(1e-12);
        }

        // Rotation matrix orthonormality: R * R^T = I
        const R = fk.endEffectorPose.rotation;
        const det = R.determinant();
        expect(Math.abs(det - 1.0)).toBeLessThan(1e-12);

        const Rt = R.transpose();
        const RRt = R.multiply(Rt);
        const I = Matrix4.identity().getRotation();
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            expect(Math.abs(RRt.get(r, c) - I.get(r, c))).toBeLessThan(1e-12);
          }
        }

        // Position is finite
        const pos = fk.endEffectorPose.position;
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isFinite(pos.z)).toBe(true);
      }
    }
  });

  it('verifies Geometric Jacobian and dexterity metrics for all 42 robots', async () => {
    for (const entry of ROBOTS_CATALOG) {
      const robot = await loadRobotById(entry.id);
      const homeQ = robot.joints.map((j) => j.home);
      const jac = computeGeometricJacobian(robot, homeQ);

      expect(jac.J).toHaveLength(6);
      expect(jac.J[0]).toHaveLength(robot.dof);
      expect(jac.rank).toBeGreaterThanOrEqual(1);
      expect(jac.rank).toBeLessThanOrEqual(robot.dof);
      expect(Number.isFinite(jac.manipulability)).toBe(true);
      expect(jac.manipulability).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(jac.conditionNumber) || jac.conditionNumber === Infinity).toBe(true);
    }
  });

  it('validates Inverse Kinematics reachability at Home pose for all 42 robots', async () => {
    for (const entry of ROBOTS_CATALOG) {
      const robot = await loadRobotById(entry.id);
      const homeQ = robot.joints.map((j) => j.home);
      const fk = forwardKinematics(robot, homeQ);
      const target = fk.endEffectorTransform;

      const ik = solveIK(robot, target, {
        maxIterations: 100,
        positionTolerance: 1e-3,
        orientationTolerance: 1e-2,
      });

      expect(ik.converged).toBe(true);
      expect(ik.bestSolution).not.toBeNull();
      if (ik.bestSolution) {
        expect(ik.bestSolution.positionError).toBeLessThan(1e-3);
        expect(ik.bestSolution.withinLimits).toBe(true);
      }
    }
  });

  it('validates profile-wide Inverse Kinematics round-trip convergence from perturbed seeds across all 42 robots', async () => {
    for (const entry of ROBOTS_CATALOG) {
      const robot = await loadRobotById(entry.id);
      // Valid target configuration comfortably inside joint limits
      const q_target = robot.joints.map((j) => {
        const span = j.max - j.min;
        return j.min + 0.45 * span;
      });
      const fk = forwardKinematics(robot, q_target);
      const target = fk.endEffectorTransform;

      // Start from a different valid initial configuration
      const q_seed = robot.joints.map((j, idx) => {
        const span = j.max - j.min;
        const pert = j.type === 'revolute' ? 0.08 : 0.03;
        const candidate = q_target[idx] + (idx % 2 === 0 ? pert : -pert);
        return Math.max(j.min + 0.05 * span, Math.min(j.max - 0.05 * span, candidate));
      });

      const ik = solveIK(robot, target, {
        initialGuess: q_seed,
        maxIterations: 100,
        positionTolerance: 1e-3,
        orientationTolerance: 1e-2,
      });

      expect(ik.converged).toBe(true);
      expect(ik.bestSolution).not.toBeNull();
      if (ik.bestSolution) {
        expect(ik.bestSolution.withinLimits).toBe(true);
        expect(ik.bestSolution.positionError).toBeLessThan(1e-3);
      }
    }
  }, 30000);
});
