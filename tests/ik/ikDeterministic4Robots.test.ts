import { describe, it, expect } from 'vitest';
import { solveIK } from '../../src/robotics/ik/ikPipeline';
import { forwardKinematics } from '../../src/robotics/kinematics/forwardKinematics';
import mtabMiniJson from '../../src/data/robots/MTAB_Mini.json';
import ppprrJson from '../../src/data/robots/skeleton_PPPRR.json';
import prpJson from '../../src/data/robots/skeleton_PRP.json';
import rrpJson from '../../src/data/robots/skeleton_RRP.json';
import type { RobotDefinition } from '../../src/data/schema/robotSchema';

describe('Deterministic IK Convergence for Specific Prismatic & Redundant Architectures', () => {
  const robots = [
    { name: 'MTAB_Mini', def: mtabMiniJson as unknown as RobotDefinition },
    { name: 'skeleton_PPPRR', def: ppprrJson as unknown as RobotDefinition },
    { name: 'skeleton_PRP', def: prpJson as unknown as RobotDefinition },
    { name: 'skeleton_RRP', def: rrpJson as unknown as RobotDefinition },
  ];

  for (const { name, def } of robots) {
    it(`guarantees deterministic reachability on 10 diverse within-limit targets for ${name}`, () => {
      const total = 10;
      for (let s = 0; s < total; s++) {
        // Generate deterministic q_target within limits (avoiding extreme limits)
        const alpha = (s + 1) / (total + 2);
        const q_target = def.joints.map((j, idx) => {
          const frac = ((alpha * (idx + 1) * 1.7) % 0.8) + 0.1;
          return j.min + frac * (j.max - j.min);
        });

        const fk = forwardKinematics(def, q_target);
        const target = fk.endEffectorTransform;

        // Start from a different valid configuration
        const q_init = def.joints.map((j, idx) => {
          const frac = (((1 - alpha) * (idx + 2) * 1.3) % 0.8) + 0.1;
          return j.min + frac * (j.max - j.min);
        });

        const res = solveIK(def, target, {
          initialGuess: q_init,
          maxIterations: 120,
        });

        expect(res.converged).toBe(true);
        expect(res.bestSolution).not.toBeNull();
        expect(res.bestSolution!.converged).toBe(true);
        expect(res.bestSolution!.withinLimits).toBe(true);
        expect(res.bestSolution!.positionError).toBeLessThan(1e-4);
      }
    });
  }
});
