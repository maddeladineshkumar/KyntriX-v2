import { describe, it, expect } from 'vitest';
import pumaJson from '../../src/data/robots/Puma560.json';
import { RobotDefinition } from '../../src/data/schema/robotSchema';
import { computeFK } from '../../src/robotics/kinematics/forwardKinematics';
import { hasSphericalWrist, solve6RSpherical } from '../../src/robotics/ik/analytical6R';
import { Matrix4, Vector3 } from '../../src/robotics/math';

describe('6R Analytical Inverse Kinematics (Spherical Wrist)', () => {
  const pumaRobot = pumaJson as unknown as RobotDefinition;

  it('correctly detects spherical wrist topology on Puma560', () => {
    expect(hasSphericalWrist(pumaRobot)).toBe(true);
  });

  it('rejects non-6R or non-spherical wrist robots', () => {
    const nonSpherical: RobotDefinition = {
      ...pumaRobot,
      dof: 3,
      joints: pumaRobot.joints.slice(0, 3),
    };
    expect(hasSphericalWrist(nonSpherical)).toBe(false);
  });

  it('solves 6R IK roundtrip analytically and verifies all solutions with FK', () => {
    // Known joint configuration in reachable interior workspace
    const qKnown = [0.2, 0.4, -0.3, 0.5, -0.6, 0.3];
    const fkTarget = computeFK(pumaRobot, qKnown);
    const targetPose = fkTarget.endEffectorTransform;

    const solutions = solve6RSpherical(pumaRobot, targetPose, qKnown);

    expect(solutions.length).toBeGreaterThan(0);

    for (const sol of solutions) {
      expect(sol.converged).toBe(true);
      expect(sol.solverType).toBe('analytical-6r');
      expect(sol.positionError).toBeLessThan(2e-3);
      expect(sol.orientationError).toBeLessThan(2e-2);

      // Verify FK on returned joint values independently
      const verifyFK = computeFK(pumaRobot, sol.q);
      const posDist = verifyFK.endEffectorTransform.getPosition().distanceTo(targetPose.getPosition());
      expect(posDist).toBeLessThan(2e-3);
    }
  });

  it('handles out-of-reach target gracefully without throwing or NaN', () => {
    const unreachableTarget = Matrix4.fromRotationTranslation(
      Matrix4.identity().getRotation(),
      new Vector3(50.0, 50.0, 50.0) // 50 meters away
    );

    const solutions = solve6RSpherical(pumaRobot, unreachableTarget);
    expect(Array.isArray(solutions)).toBe(true);
    for (const sol of solutions) {
      for (const val of sol.q) {
        expect(Number.isFinite(val)).toBe(true);
      }
    }
  });
});
