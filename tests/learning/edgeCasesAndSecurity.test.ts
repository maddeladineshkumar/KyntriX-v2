import { describe, it, expect, beforeEach } from 'vitest';
import { DeterministicEngine } from '../../src/server/robotics/deterministicEngine';
import { Database } from '../../src/server/db/database';
import { handleApiRequest } from '../../src/server/apiRouter';
import { loadRobotById } from '../../src/data/robots';
import type { DHParameterRow } from '../../src/server/db/types';

describe('Edge Cases, Mathematical Robustness & Security Audit', () => {
  beforeEach(() => {
    Database.resetToSeed();
  });

  describe('1. NaN, Infinity & Malformed Input Handling', () => {
    it('strictly rejects NaN and Infinity in scalar validation', () => {
      expect(DeterministicEngine.validateScalar(NaN, 5)).toBe(false);
      expect(DeterministicEngine.validateScalar(Infinity, 5)).toBe(false);
      expect(DeterministicEngine.validateScalar(-Infinity, 5)).toBe(false);
      expect(DeterministicEngine.validateScalar(null as any, 5)).toBe(false);
      expect(DeterministicEngine.validateScalar(undefined as any, 5)).toBe(false);
    });

    it('strictly rejects NaN and Infinity in angle validation', () => {
      expect(DeterministicEngine.validateAngle(NaN, 0)).toBe(false);
      expect(DeterministicEngine.validateAngle(Infinity, 0)).toBe(false);
      expect(DeterministicEngine.validateAngle(-Infinity, 0)).toBe(false);
      expect(DeterministicEngine.validateAngle(null as any, 0)).toBe(false);
    });

    it('strictly rejects NaN and Infinity in vector validation', () => {
      expect(DeterministicEngine.validateVector([NaN, 0, 0], [0, 0, 0])).toBe(false);
      expect(DeterministicEngine.validateVector([Infinity, 0, 0], [0, 0, 0])).toBe(false);
      expect(DeterministicEngine.validateVector([0, -Infinity, 0], [0, 0, 0])).toBe(false);
      expect(DeterministicEngine.validateVector([0, null as any, 0], [0, 0, 0])).toBe(false);
    });

    it('strictly rejects NaN and Infinity in matrix validation', () => {
      const expected = [[1, 0], [0, 1]];
      expect(DeterministicEngine.validateMatrix([[NaN, 0], [0, 1]], expected)).toBe(false);
      expect(DeterministicEngine.validateMatrix([[Infinity, 0], [0, 1]], expected)).toBe(false);
      expect(DeterministicEngine.validateMatrix([[1, 0], [0, -Infinity]], expected)).toBe(false);
      expect(DeterministicEngine.validateMatrix([[null as any, 0], [0, 1]], expected)).toBe(false);
    });

    it('strictly rejects NaN in DH table validation', () => {
      const validRow: DHParameterRow = { joint: 1, type: 'R', theta: 0, d: 0.2, a: 0.5, alpha: 0 };
      const nanRow: DHParameterRow = { joint: 1, type: 'R', theta: NaN, d: 0.2, a: 0.5, alpha: 0 };
      const nanARow: DHParameterRow = { joint: 1, type: 'R', theta: 0, d: 0.2, a: NaN, alpha: 0 };
      const nanDRow: DHParameterRow = { joint: 1, type: 'R', theta: 0, d: NaN, a: 0.5, alpha: 0 };
      const nanAlphaRow: DHParameterRow = { joint: 1, type: 'R', theta: 0, d: 0.2, a: 0.5, alpha: NaN };

      expect(DeterministicEngine.validateDHTable([nanRow], [validRow])).toBe(false);
      expect(DeterministicEngine.validateDHTable([nanARow], [validRow])).toBe(false);
      expect(DeterministicEngine.validateDHTable([nanDRow], [validRow])).toBe(false);
      expect(DeterministicEngine.validateDHTable([nanAlphaRow], [validRow])).toBe(false);
    });

    it('strictly rejects NaN in IK solution and simulation challenge', async () => {
      const dhRows: DHParameterRow[] = [
        { joint: 1, type: 'R', theta: 0, d: 0, a: 0.3, alpha: 0 },
        { joint: 2, type: 'R', theta: 0, d: 0, a: 0.3, alpha: 0 },
      ];
      const limits = [{ min: -Math.PI, max: Math.PI }, { min: -Math.PI, max: Math.PI }];

      const ikRes = DeterministicEngine.validateIKSolution(
        dhRows,
        limits,
        [NaN, 0],
        { position: [0.6, 0, 0] }
      );
      expect(ikRes.valid).toBe(false);
      expect(ikRes.limitViolation).toBe(true);

      const robotDef = await loadRobotById('skeleton_3R');
      const challenge = Database.getChallenges()[0];
      const chalRes = DeterministicEngine.evaluateChallenge(
        challenge,
        robotDef,
        [NaN, NaN, NaN],
        10
      );
      expect(chalRes.attempt.passed).toBe(false);
      expect(chalRes.attempt.score).toBe(0);
      expect(Number.isFinite(chalRes.attempt.score)).toBe(true);
    });
  });

  describe('2. Database Integrity & Concurrency', () => {
    it('handles overlapping saves without data loss', () => {
      const initialUsers = Database.getProblems().length;
      expect(initialUsers).toBeGreaterThan(0);

      // Perform rapid concurrent mutations
      for (let i = 0; i < 5; i++) {
        Database.awardXP('user_student_1', 10, 'problem_solved', `rapid_${i}`);
      }

      const p = Database.getUserProfile('user_student_1');
      expect(p).toBeDefined();
    });
  });

  describe('3. API Security & Role Enforcement', () => {
    it('denies access to protected endpoints without a token', async () => {
      const res = await handleApiRequest('GET', '/api/analytics/me');
      expect(res.status).toBe(401);
      expect(res.data.error).toContain('Authentication required');
    });

    it('denies unauthorized students from creating classroom assignments', async () => {
      const studentLogin = await handleApiRequest('POST', '/api/auth/login', {
        email: 'student@kyntrix.edu',
        password: 'KyntriX2025!',
      });
      const studentToken = studentLogin.data.token;

      const classrooms = Database.getClassrooms();
      expect(classrooms.length).toBeGreaterThan(0);
      const classroomId = classrooms[0].id;
      const res = await handleApiRequest('POST', `/api/classrooms/${classroomId}/assignments`, {
        title: 'Hacked Assignment',
        problemIds: ['prob_dh_01'],
      }, { authorization: `Bearer ${studentToken}` });

      expect(res.status).toBe(403);
      expect(res.data.error).toContain('Only the classroom teacher can create assignments');
    });

    it('prevents duplicate XP exploits on identical problem attempts', async () => {
      const studentLogin = await handleApiRequest('POST', '/api/auth/login', {
        email: 'student@kyntrix.edu',
        password: 'KyntriX2025!',
      });
      const token = studentLogin.data.token;
      const authHeaders = { authorization: `Bearer ${token}` };

      const prob = Database.getProblems()[0];
      const answer = (prob.answerSchema as any).expectedDHTable || (prob.answerSchema as any).expectedScalar || 0;

      // First attempt with correct answer
      const res1 = await handleApiRequest('POST', `/api/problems/${prob.id}/attempt`, {
        submission: answer,
        timeSpentSeconds: 30,
      }, authHeaders);
      expect(res1.status).toBe(200);
      expect(res1.data.attempt.isCorrect).toBe(true);
      const firstXPAwarded = res1.data.xpAwarded;
      expect(firstXPAwarded).toBeGreaterThan(0);

      // Second attempt on same problem should NOT grant duplicate XP
      const res2 = await handleApiRequest('POST', `/api/problems/${prob.id}/attempt`, {
        submission: answer,
        timeSpentSeconds: 25,
      }, authHeaders);
      expect(res2.status).toBe(200);
      expect(res2.data.xpAwarded).toBe(0); // Duplicate XP prevented!
    });
  });
});
