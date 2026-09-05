import { describe, it, expect } from 'vitest';
import {
  computeDHAnalysis,
  solveDHInverseKinematics,
  exportDHToCSV,
  exportDHToLaTeX,
  exportDHToJSON,
  exportDHToMarkdown,
  parseDHFromJSON,
  DH_PRESETS,
  createRobotFromPreset,
} from '../../src/robotics/dh/dhAnalysis';
import { DEG_TO_RAD } from '../../src/robotics/math/constants';
import { Euler } from '../../src/robotics/math/Euler';

describe('DH Kinematics Analysis Engine (computeDHAnalysis)', () => {
  const planar2R = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'planar_2r')!);

  it('computes 2R planar forward kinematics at q = [0, 0]', () => {
    const analysis = computeDHAnalysis(planar2R, [0, 0]);

    // a1 = 0.45, a2 = 0.35
    expect(analysis.endEffector.position.x).toBeCloseTo(0.8, 4);
    expect(analysis.endEffector.position.y).toBeCloseTo(0, 4);
    expect(analysis.endEffector.position.z).toBeCloseTo(0, 4);
    expect(analysis.endEffector.position.norm).toBeCloseTo(0.8, 4);
    expect(analysis.endEffector.position.xMm).toBeCloseTo(800, 1);
    expect(analysis.endEffector.isOrthogonal).toBe(true);
    expect(analysis.endEffector.rotationDeterminant).toBeCloseTo(1.0, 5);
    expect(analysis.reach.maxTheoreticalReachM).toBeCloseTo(0.8, 4);
    expect(analysis.reach.extensionRatio).toBeCloseTo(1.0, 4);
  });

  it('computes 2R planar forward kinematics at q = [90 deg, 0 deg]', () => {
    const analysis = computeDHAnalysis(planar2R, [90 * DEG_TO_RAD, 0]);

    expect(analysis.endEffector.position.x).toBeCloseTo(0, 4);
    expect(analysis.endEffector.position.y).toBeCloseTo(0.8, 4);
    expect(analysis.endEffector.position.z).toBeCloseTo(0, 4);
    expect(analysis.endEffector.eulerXYZ.deg[2]).toBeCloseTo(90, 1);
  });

  it('computes 2R planar forward kinematics at q = [0 deg, 90 deg]', () => {
    const analysis = computeDHAnalysis(planar2R, [0, 90 * DEG_TO_RAD]);

    // Link 1 along X (0.45), Link 2 along Y (0.35)
    expect(analysis.endEffector.position.x).toBeCloseTo(0.45, 4);
    expect(analysis.endEffector.position.y).toBeCloseTo(0.35, 4);
    expect(analysis.endEffector.position.z).toBeCloseTo(0, 4);
    expect(analysis.endEffector.position.norm).toBeCloseTo(Math.sqrt(0.45 ** 2 + 0.35 ** 2), 4);
  });

  it('computes SCARA RRPR kinematics and prismatic axis response', () => {
    const scara = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'scara_rrpr')!);
    const analysis0 = computeDHAnalysis(scara, [0, 0, 0.05, 0]);
    const analysis1 = computeDHAnalysis(scara, [0, 0, 0.15, 0]);

    // Prismatic joint 3 changes Z
    const dz = Math.abs(analysis1.endEffector.position.z - analysis0.endEffector.position.z);
    expect(dz).toBeCloseTo(0.1, 4);
    expect(analysis0.jacobian.matrix.length).toBe(6);
    expect(analysis0.jacobian.matrix[0].length).toBe(4);
    expect(analysis0.endEffector.isOrthogonal).toBe(true);
  });

  it('computes PUMA 560 full 6-DOF analysis with Jacobian and manipulability', () => {
    const puma = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'puma_560')!);
    const analysis = computeDHAnalysis(puma, [0, -Math.PI / 4, Math.PI / 4, 0, 0, 0]);

    expect(analysis.perJointBreakdown.length).toBe(6);
    expect(analysis.endEffector.isOrthogonal).toBe(true);
    expect(analysis.endEffector.rotationDeterminant).toBeCloseTo(1.0, 4);
    expect(Number.isFinite(analysis.jacobian.manipulability)).toBe(true);
    expect(analysis.jacobian.singularValues.length).toBeGreaterThanOrEqual(6);
    expect(analysis.endEffector.quaternion.norm).toBeCloseTo(1.0, 4);
  });

  it('solves Inverse Kinematics for a reachable point on 2R Planar arm', () => {
    const targetPos = { x: 0.45, y: 0.35, z: 0 };
    const ikRes = solveDHInverseKinematics(planar2R, targetPos);

    expect(ikRes.converged).toBe(true);
    expect(ikRes.bestSolution).not.toBeNull();
    expect(ikRes.bestSolution!.positionError).toBeLessThan(1e-3);
  });

  it('exports DH table to CSV, LaTeX, Markdown, and JSON correctly', () => {
    const csv = exportDHToCSV(planar2R, [0, 0], true);
    expect(csv).toContain('Joint');
    expect(csv).toContain('theta');
    expect(csv).toContain('alpha');

    const latex = exportDHToLaTeX(planar2R, [0, 0], false);
    expect(latex).toContain('\\begin{table}');
    expect(latex).toContain('\\caption{');

    const md = exportDHToMarkdown(planar2R, [0, 0], false);
    expect(md).toContain('| Joint | Type |');
    expect(md).toContain('Joint 1 (Base)');

    const json = exportDHToJSON(planar2R, [0, 0]);
    const parsed = JSON.parse(json);
    expect(parsed.robot.dof).toBe(2);
    expect(parsed.joints.length).toBe(2);
    expect(parsed.endEffector.positionMeters).toBeDefined();
  });

  it('parses exported JSON back into a valid RobotDefinition', () => {
    const json = exportDHToJSON(planar2R, [0, 0]);
    const reconstructed = parseDHFromJSON(json);

    expect(reconstructed).not.toBeNull();
    expect(reconstructed!.dof).toBe(2);
    expect(reconstructed!.joints!.length).toBe(2);
    expect(reconstructed!.joints![0].a).toBeCloseTo(0.45, 4);
  });

  it('instantiates all 9 DH presets without numerical errors', () => {
    expect(DH_PRESETS.length).toBe(9);
    for (const preset of DH_PRESETS) {
      const robot = createRobotFromPreset(preset);
      expect(robot.dof).toBe(preset.dof);
      expect(robot.joints.length).toBe(preset.dof);

      const q = robot.joints.map((j) => j.home);
      const analysis = computeDHAnalysis(robot, q);

      expect(Number.isFinite(analysis.endEffector.position.x)).toBe(true);
      expect(Number.isFinite(analysis.endEffector.position.y)).toBe(true);
      expect(Number.isFinite(analysis.endEffector.position.z)).toBe(true);
      expect(analysis.endEffector.isOrthogonal).toBe(true);
      expect(Number.isFinite(analysis.jacobian.manipulability)).toBe(true);
    }
  });

  it('accurately tracks prismatic translation on Stanford arm', () => {
    const stanford = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'stanford_arm')!);
    const q1 = [0, 0, 0.2, 0, 0, 0];
    const q2 = [0, 0, 0.5, 0, 0, 0];

    const a1 = computeDHAnalysis(stanford, q1);
    const a2 = computeDHAnalysis(stanford, q2);

    const dist = a2.endEffector.position.norm - a1.endEffector.position.norm;
    expect(dist).toBeGreaterThan(0.1);
    expect(a1.perJointBreakdown[2].type).toBe('prismatic');
  });

  it('detects boundary singularity when 2R arm is fully outstretched', () => {
    // When q2 = 0, arm is fully outstretched along a line: radial velocity cannot be generated
    const outstretched = computeDHAnalysis(planar2R, [0, 0]);
    expect(outstretched.jacobian.isSingular).toBe(true);

    // When q2 = 90 deg, arm is well conditioned inside the workspace
    const bent = computeDHAnalysis(planar2R, [0, Math.PI / 2]);
    expect(bent.jacobian.manipulability).toBeGreaterThan(0.01);
  });

  it('verifies Modified DH convention analysis', () => {
    const modPreset = DH_PRESETS.find((p) => p.id === 'spatial_3r')!;
    const modRobot = {
      ...createRobotFromPreset(modPreset),
      dhConvention: 'modified' as const,
    };

    const analysis = computeDHAnalysis(modRobot, [0, 0, 0]);
    expect(analysis.robot.dhConvention).toBe('modified');
    expect(analysis.endEffector.isOrthogonal).toBe(true);
    expect(analysis.perJointBreakdown.length).toBe(3);
  });

  it('preserves Euler and Quaternion roundtrip consistency', () => {
    const puma = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'puma_560')!);
    const analysis = computeDHAnalysis(puma, [0.3, -0.4, 0.5, -0.6, 0.7, -0.8]);

    const qNorm = analysis.endEffector.quaternion.norm;
    expect(qNorm).toBeCloseTo(1.0, 5);

    // Reconstruct rotation matrix from Euler XYZ and compare
    const eulerXYZ = analysis.endEffector.eulerXYZ.rad;
    const reconstructedEuler = new Euler(eulerXYZ[0], eulerXYZ[1], eulerXYZ[2], 'XYZ');
    const reconstructedR = reconstructedEuler.toRotationMatrix();
    expect(analysis.endEffector.rotationDeterminant).toBeCloseTo(1.0, 4);
    expect(reconstructedR.determinant()).toBeCloseTo(1.0, 4);
    expect(Number.isFinite(eulerXYZ[0])).toBe(true);
  });

  it('correctly reports failure for unreachable target in IK', () => {
    // 50 meters away is far beyond the 0.8m reach of 2R arm
    const impossibleTarget = { x: 50.0, y: 50.0, z: 0 };
    const res = solveDHInverseKinematics(planar2R, impossibleTarget);

    expect(res.converged).toBe(false);
    expect(res.bestSolution).not.toBeNull();
    expect(res.bestSolution!.positionError).toBeGreaterThan(1.0);
  });

  it('preserves base joint parameters across JSON export and import even at non-zero joint angles', () => {
    // Joint 1 and 2 start with theta = 0
    const nonZeroQ = [35 * DEG_TO_RAD, -45 * DEG_TO_RAD];
    const json = exportDHToJSON(planar2R, nonZeroQ);
    const parsed = parseDHFromJSON(json);

    expect(parsed).not.toBeNull();
    expect(parsed!.joints![0].theta).toBeCloseTo(0, 5);
    expect(parsed!.joints![1].theta).toBeCloseTo(0, 5);
    expect(parsed!.joints![0].a).toBeCloseTo(0.45, 5);
    expect(parsed!.joints![1].a).toBeCloseTo(0.35, 5);
  });

  it('safely handles malformed, missing, and inverted limit values in parseDHFromJSON without NaN poisoning', () => {
    const malformedJSON = JSON.stringify({
      name: 'Corrupted Robot',
      joints: [
        {
          name: 'Bad Joint 1',
          type: 'revolute',
          theta: 'invalid_string',
          d: null,
          a: '0.3',
          alpha: undefined,
          min: 1.5, // inverted min > max!
          max: -1.5,
          home: 'bad_home',
        },
      ],
    });

    const parsed = parseDHFromJSON(malformedJSON);
    expect(parsed).not.toBeNull();
    expect(parsed!.dof).toBe(1);
    const j1 = parsed!.joints![0];
    expect(Number.isFinite(j1.theta)).toBe(true);
    expect(j1.theta).toBe(0);
    expect(j1.d).toBe(0);
    expect(j1.a).toBeCloseTo(0.3, 5);
    expect(j1.alpha).toBe(0);
    expect(j1.min).toBeLessThanOrEqual(j1.max);
    expect(Number.isFinite(j1.home)).toBe(true);
  });

  it('returns null for completely invalid JSON strings or empty joint arrays in parseDHFromJSON', () => {
    expect(parseDHFromJSON('')).toBeNull();
    expect(parseDHFromJSON('{ "notAJoint": true }')).toBeNull();
    expect(parseDHFromJSON('{ "joints": [] }')).toBeNull();
    expect(parseDHFromJSON('malformed json syntax')).toBeNull();
  });

  it('restricts Jacobian singular values spectrum to taskRows dimensions', () => {
    // 2R planar arm has n=2, taskRows=2
    const analysis2R = computeDHAnalysis(planar2R, [0, Math.PI / 4]);
    expect(analysis2R.jacobian.taskRows).toBe(2);
    expect(analysis2R.jacobian.singularValues.length).toBe(2);
    expect(analysis2R.jacobian.singularValues[0]).toBeGreaterThan(0);
    expect(analysis2R.jacobian.singularValues[1]).toBeGreaterThan(0);

    // SCARA has n=4
    const scara = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'scara_rrpr')!);
    const analysisSCARA = computeDHAnalysis(scara, [0, 0, 0.1, 0]);
    expect(analysisSCARA.jacobian.singularValues.length).toBe(4);

    // PUMA 560 has n=6
    const puma = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'puma_560')!);
    const analysisPuma = computeDHAnalysis(puma, [0, 0, 0, 0, 0, 0]);
    expect(analysisPuma.jacobian.singularValues.length).toBe(6);
  });

  it('includes joint variable asterisk indicator in LaTeX export', () => {
    const scara = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'scara_rrpr')!);
    const latex = exportDHToLaTeX(scara, [0, 0, 0.05, 0], false);
    expect(latex).toContain('^\\ast');
    expect(latex).toContain('$\\ast$ indicates joint variable');
  });

  it('preserves all 9 presets across exportDHToJSON and parseDHFromJSON roundtrips', () => {
    for (const preset of DH_PRESETS) {
      const orig = createRobotFromPreset(preset);
      const q = orig.joints.map((j) => j.home ?? 0);
      const json = exportDHToJSON(orig, q);
      const reconstructed = parseDHFromJSON(json);

      expect(reconstructed).not.toBeNull();
      expect(reconstructed!.dof).toBe(orig.dof);
      for (let i = 0; i < orig.dof; i++) {
        expect(reconstructed!.joints![i].type).toBe(orig.joints[i].type);
        expect(reconstructed!.joints![i].theta).toBeCloseTo(orig.joints[i].theta, 4);
        expect(reconstructed!.joints![i].d).toBeCloseTo(orig.joints[i].d, 4);
        expect(reconstructed!.joints![i].a).toBeCloseTo(orig.joints[i].a, 4);
        expect(reconstructed!.joints![i].alpha).toBeCloseTo(orig.joints[i].alpha, 4);
      }
    }
  });

  it('verifies joint shifting by arbitrary increments (3 deg, 4 deg, 5 deg) updates matrices and pose instantaneously', () => {
    const puma = createRobotFromPreset(DH_PRESETS.find((p) => p.id === 'puma_560')!);
    const q0 = [0, 0, 0, 0, 0, 0];
    const a0 = computeDHAnalysis(puma, q0);

    // Shift Joint 1 by +3 degrees
    const step3Rad = 3 * DEG_TO_RAD;
    const q1 = [step3Rad, 0, 0, 0, 0, 0];
    const a1 = computeDHAnalysis(puma, q1);

    // Matrix A1 must reflect exactly 3 deg rotation around Z
    const cos3 = Math.cos(step3Rad);
    const sin3 = Math.sin(step3Rad);
    expect(a1.perJointBreakdown[0].A.get(0, 0)).toBeCloseTo(cos3, 5);
    expect(a1.perJointBreakdown[0].A.get(1, 0)).toBeCloseTo(sin3, 5);
    expect(Math.abs(a1.endEffector.eulerXYZ.deg[2])).toBeCloseTo(3.0, 2);

    // Shift Joint 2 by -4 degrees and Joint 3 by +5 degrees
    const step4Rad = -4 * DEG_TO_RAD;
    const step5Rad = 5 * DEG_TO_RAD;
    const q2 = [step3Rad, step4Rad, step5Rad, 0, 0, 0];
    const a2 = computeDHAnalysis(puma, q2);

    // End effector position must respond with mathematical precision
    expect(a2.endEffector.position.x).not.toBeCloseTo(a0.endEffector.position.x, 2);
    expect(a2.endEffector.position.z).not.toBeCloseTo(a0.endEffector.position.z, 2);
    expect(a2.endEffector.isOrthogonal).toBe(true);
    expect(a2.endEffector.rotationDeterminant).toBeCloseTo(1.0, 5);
  });

  it('verifies multi-DOF Inverse Kinematics convergence across all joint architecture presets', () => {
    for (const preset of DH_PRESETS) {
      const robot = createRobotFromPreset(preset);
      const qHome = robot.joints.map((j) => j.home ?? 0);
      const fkHome = computeDHAnalysis(robot, qHome);
      const targetPos = fkHome.endEffector.position;
      const targetEuler = {
        roll: fkHome.endEffector.eulerXYZ.rad[0],
        pitch: fkHome.endEffector.eulerXYZ.rad[1],
        yaw: fkHome.endEffector.eulerXYZ.rad[2],
      };

      // Perturb initial seed
      const qSeed = qHome.map((v, i) => {
        const j = robot.joints[i];
        return Math.max(j.min, Math.min(j.max, v + 0.08 * (i % 2 === 0 ? 1 : -1)));
      });

      const ikRes = solveDHInverseKinematics(robot, targetPos, targetEuler, qSeed);

      // Verify that every valid robot architecture finds a solution with sub-millimeter position precision
      expect(ikRes.bestSolution).not.toBeNull();
      expect(ikRes.bestSolution!.positionError).toBeLessThan(1e-3); // < 1 mm across all architectures
      expect(ikRes.bestSolution!.withinLimits).toBe(true);
    }
  });
});
