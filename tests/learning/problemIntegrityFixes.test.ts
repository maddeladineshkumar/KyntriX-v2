import { describe, it, expect } from 'vitest';
import { DeterministicEngine } from '../../src/server/robotics/deterministicEngine';
import { unit2DhFkProblems } from '../../src/server/db/problems/unit2_dh_fk';
import { unit2IkProblems } from '../../src/server/db/problems/unit2_ik';
import { unit1TransformsProblems } from '../../src/server/db/problems/unit1_transforms';
import type { DHParameterRow } from '../../src/server/db/types';

describe('Problem Integrity and Validation Engine Fixes', () => {
  it('strictly validates DH table link twist alpha and rejects sign flips (+pi/2 vs -pi/2)', () => {
    const expected: DHParameterRow[] = [
      { joint: 1, type: 'R', theta: 0, d: 0, a: 0, alpha: -1.5708 },
      { joint: 2, type: 'R', theta: 0, d: 0, a: 0, alpha: 1.5708 },
    ];
    const signFlipped: DHParameterRow[] = [
      { joint: 1, type: 'R', theta: 0, d: 0, a: 0, alpha: 1.5708 }, // should fail (-pi/2 expected)
      { joint: 2, type: 'R', theta: 0, d: 0, a: 0, alpha: 1.5708 },
    ];
    const correct: DHParameterRow[] = [
      { joint: 1, type: 'R', theta: 0, d: 0, a: 0, alpha: -1.5708 },
      { joint: 2, type: 'R', theta: 0, d: 0, a: 0, alpha: 1.5708 },
    ];

    expect(DeterministicEngine.validateDHTable(signFlipped, expected, 0.01)).toBe(false);
    expect(DeterministicEngine.validateDHTable(correct, expected, 0.01)).toBe(true);
  });

  it('validates theta parameter on prismatic joints in DH table', () => {
    const expected: DHParameterRow[] = [
      { joint: 1, type: 'P', theta: 0, d: 0, a: 0, alpha: 0 },
    ];
    const invalidTheta: DHParameterRow[] = [
      { joint: 1, type: 'P', theta: 1.5708, d: 0, a: 0, alpha: 0 },
    ];
    const valid: DHParameterRow[] = [
      { joint: 1, type: 'P', theta: 0, d: 0, a: 0, alpha: 0 },
    ];

    expect(DeterministicEngine.validateDHTable(invalidTheta, expected, 0.01)).toBe(false);
    expect(DeterministicEngine.validateDHTable(valid, expected, 0.01)).toBe(true);
  });

  it('verifies problem descriptions and prompts have matching units without contradiction', () => {
    const probFk05 = unit2DhFkProblems.find(p => p.id === 'prob_fk_05');
    expect(probFk05).toBeDefined();
    expect(probFk05!.description).toContain('in radians relative to the X-axis');
    expect(probFk05!.questionData.prompt).toContain('in radians');

    const probFk16 = unit2DhFkProblems.find(p => p.id === 'prob_fk_16');
    expect(probFk16).toBeDefined();
    expect(probFk16!.description).toContain('in radians');
    expect(probFk16!.questionData.prompt).toContain('in radians');

    const probIk07 = unit2IkProblems.find(p => p.id === 'prob_ik_07');
    expect(probIk07).toBeDefined();
    expect(probIk07!.description).toContain('in radians');
    expect(probIk07!.questionData.prompt).toContain('in radians');

    const probIk14 = unit2IkProblems.find(p => p.id === 'prob_ik_14');
    expect(probIk14).toBeDefined();
    expect(probIk14!.description).toContain('in radians');
    expect(probIk14!.questionData.prompt).toContain('in radians');
  });

  it('verifies prob_trans_15 title accurately reflects 4D unit quaternion', () => {
    const probTrans15 = unit1TransformsProblems.find(p => p.id === 'prob_trans_15');
    expect(probTrans15).toBeDefined();
    expect(probTrans15!.title).toBe('4D Unit Quaternion for 90° Rotation About Z');
  });
});
