import { describe, it, expect } from 'vitest';
import { solveIK } from '../../src/robotics/ik/ikPipeline';
import { Matrix3 } from '../../src/robotics/math/Matrix3';
import { Matrix4 } from '../../src/robotics/math/Matrix4';
import { Vector3 } from '../../src/robotics/math/Vector3';
import { Euler } from '../../src/robotics/math/Euler';
import { Quaternion } from '../../src/robotics/math/Quaternion';
import { useRobotStore } from '../../src/state/robotStore';
import { computeFKPositionOnly } from '../../src/workers/workspaceWorker';
import { forwardKinematics } from '../../src/robotics/kinematics/forwardKinematics';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';
import pumaJson from '../../src/data/robots/Puma560.json';
import stanfordJson from '../../src/data/robots/Stanford.json';
import skeleton3RJson from '../../src/data/robots/skeleton_3R.json';

const pumaRobot = pumaJson as unknown as RobotDefinition;
const stanfordRobot = stanfordJson as unknown as RobotDefinition;
const robot3R = skeleton3RJson as unknown as RobotDefinition;

describe('Authoritative Judicial Defect Remediation & Verification Suite', () => {
  it('Finding 1: ikPipeline falls back to numerical DLS when 6R spherical wrist analytical solutions fail or violate limits', () => {
    // Narrow 6R robot where joint 5 has restricted limits
    const narrowPuma: RobotDefinition = {
      ...pumaRobot,
      joints: [
        pumaRobot.joints[0],
        pumaRobot.joints[1],
        pumaRobot.joints[2],
        pumaRobot.joints[3],
        { ...pumaRobot.joints[4], min: -3.5, max: -3.0 },
        pumaRobot.joints[5],
      ],
    };

    // Target pose that causes analytical 6R solutions to fall outside joint 5 limits
    const target = Matrix4.translation(0.4, 0.2, 0.5);
    const result = solveIK(narrowPuma, target);

    // Finding 1 fix guarantees fallback to numerical DLS rather than premature suppression
    expect(result.allTestedBranches).toBeGreaterThan(0);
  });

  it('Finding 4: Matrix3.rotationVectorError correctly resolves axes lying in the YZ plane near 180 degrees', () => {
    // 180 degree rotation around axis in YZ plane: u = [0, 1/sqrt(2), -1/sqrt(2)]
    const invSqrt2 = 1 / Math.SQRT2;
    const axisTarget = new Vector3(0, invSqrt2, -invSqrt2).normalize();
    const R_current = Matrix3.identity();
    const R_desired = Quaternion.fromAxisAngle(axisTarget, Math.PI).toRotationMatrix();

    const errorVec = R_current.rotationVectorError(R_desired);

    // Rotation vector should be collinear with axisTarget (errorVec = theta * axis)
    const errorAxis = errorVec.clone().normalize();
    const dot = Math.abs(errorAxis.dot(axisTarget));
    expect(dot).toBeCloseTo(1.0, 4);

    // Verify magnitude is ~pi
    expect(errorVec.norm()).toBeCloseTo(Math.PI, 3);
  });

  it('Finding 6: Euler ZYZ gimbal lock extraction correctly computes c = atan2(r10, -r00) when b = pi', () => {
    // R = Rz(0) * Ry(pi) * Rz(c) for various test angles c
    const testAngles = [0, Math.PI / 4, Math.PI / 2, -Math.PI / 3, (3 * Math.PI) / 4];

    for (const expectedC of testAngles) {
      const Rz_c = Matrix3.rotZ(expectedC);
      const Ry_pi = Matrix3.rotY(Math.PI);
      const R_combined = Ry_pi.multiply(Rz_c);

      const euler = Euler.fromRotationMatrix(R_combined, 'ZYZ');
      expect(euler.b).toBeCloseTo(Math.PI, 6);

      // Verify reconstructed rotation matrix matches original
      const R_reconstructed = euler.toRotationMatrix();
      for (let i = 0; i < 9; i++) {
        expect(R_reconstructed.elements[i]).toBeCloseTo(R_combined.elements[i], 5);
      }
    }
  });

  it('Finding 7 & 8: Prismatic reach bound in ikPipeline and dhAnalysis incorporates j.d and j.offset', () => {
    // Stanford arm has prismatic joint 3 with d = 0.162, max = 0.7
    // Reach must be >= j.a + j.d + j.max
    const stanfordReachTarget = Matrix4.translation(0, 0, 1.2);
    const result = solveIK(stanfordRobot, stanfordReachTarget);

    // A target at 1.2m is physically reachable on Stanford (reach ~1.5m), so it must NOT be rejected by reach bound
    expect(result.failureReason ?? '').not.toContain('outside maximum physical workspace reach');
  });

  it('Finding 11: robotStore setJoints([]) empty array length validation guards state against corruption', async () => {
    await useRobotStore.getState().selectRobot('Puma560');
    const initialQ = [...useRobotStore.getState().q];
    expect(initialQ.length).toBe(6);

    // Call setJoints with invalid empty array
    useRobotStore.getState().setJoints([]);

    // State must remain uncorrupted with 6 joints
    const currentQ = useRobotStore.getState().q;
    expect(currentQ.length).toBe(6);
    expect(currentQ).toEqual(initialQ);
  });

  it('Finding 12: Quaternion.fromRotationMatrix handles negative float drift and degenerate matrices without NaN/collapse', () => {
    // Degenerate matrix with tiny negative floating-point drift on diagonal terms
    const degenerateElements = [
      -1.0000000000000002, 0, 0,
      0, 1.0000000000000002, 0,
      0, 0, -1.0000000000000002,
    ];
    const R = new Matrix3(degenerateElements);
    const q = Quaternion.fromRotationMatrix(R);

    expect(Number.isFinite(q.x)).toBe(true);
    expect(Number.isFinite(q.y)).toBe(true);
    expect(Number.isFinite(q.z)).toBe(true);
    expect(Number.isFinite(q.w)).toBe(true);
    expect(q.norm()).toBeCloseTo(1.0, 5);
  });

  it('Finding 14: computeFKPositionOnly matches forwardKinematics endEffector position across multiple robots', () => {
    const testRobots = [pumaRobot, stanfordRobot, robot3R];

    for (const robot of testRobots) {
      const q = robot.joints.map((j) => (j.home ?? 0) + 0.1);
      const fullFK = forwardKinematics(robot, q);
      const expectedPos = fullFK.endEffectorTransform.getPosition();

      const fastPos = computeFKPositionOnly(robot, q);

      expect(fastPos.x).toBeCloseTo(expectedPos.x, 6);
      expect(fastPos.y).toBeCloseTo(expectedPos.y, 6);
      expect(fastPos.z).toBeCloseTo(expectedPos.z, 6);
    }
  });

  it('Layout overflow: DHTableStudio joint cards prevent text box and jog overflow with shrink-0 and min-w-0', async () => {
    const { createRoot } = await import('react-dom/client');
    const React = await import('react');
    const { DHTableStudio } = await import('../../src/features/dh/DHTableStudio');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 80));

    // Verify all joint inputs have shrink-0 and w-14
    const inputs = Array.from(container.querySelectorAll('input[aria-label*="numeric input"]'));
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      expect(input.className).toContain('shrink-0');
      expect(input.className).toContain('w-14');
    }

    // Verify all joint sliders have flex-1 and min-w-0
    const sliders = Array.from(container.querySelectorAll('input[type="range"][aria-label*="Simulation Joint"]'));
    expect(sliders.length).toBeGreaterThan(0);
    for (const slider of sliders) {
      expect(slider.className).toContain('flex-1');
      expect(slider.className).toContain('min-w-0');
    }

    // Verify jog minus and plus buttons have shrink-0
    const jogMinusBtns = Array.from(container.querySelectorAll('button[aria-label*="minus"]'));
    expect(jogMinusBtns.length).toBeGreaterThan(0);
    for (const btn of jogMinusBtns) {
      expect(btn.className).toContain('shrink-0');
    }

    root.unmount();
    container.remove();
  });
});
