import { describe, it, expect, beforeEach } from 'vitest';
import { handleApiRequest } from '../../src/server/apiRouter';
import { DatabaseService } from '../../src/server/db/database';

describe('Per-User Statistics & Badge Isolation Suite', () => {
  const db = DatabaseService.getInstance();

  beforeEach(() => {
    db.resetToSeed();
  });

  it('guarantees that Student, Teacher, and newly registered users have completely distinct and isolated analytics', async () => {
    // 1. Verify Student stats
    const studentLogin = await handleApiRequest('POST', '/api/auth/login', {
      email: 'student@kyntrix.edu',
      password: 'KyntriX2025!',
    });
    expect(studentLogin.status).toBe(200);
    const studentToken = studentLogin.data.token;

    const studentAnalytics = await handleApiRequest('GET', '/api/analytics', null, {
      authorization: `Bearer ${studentToken}`,
    });
    expect(studentAnalytics.status).toBe(200);
    expect(studentAnalytics.data.difficultyBreakdown.totalSolved).toBe(18);
    expect(studentAnalytics.data.currentStreak).toBe(5);
    expect(studentAnalytics.data.maxStreak).toBe(12);
    expect(studentAnalytics.data.totalActiveDays).toBe(8);
    // Student has badges unlocked: dh_apprentice, zero_hint (14 >= 10), streak_master (longest 12 >= 7)
    expect(studentAnalytics.data.totalUnlockedBadges).toBeGreaterThanOrEqual(2);
    // Zero hint maestro must NOT be in lockedBadges since it has been achieved!
    const studentLocked = studentAnalytics.data.lockedBadges.map((b: any) => b.id);
    expect(studentLocked).not.toContain('zero_hint');

    // 2. Verify Teacher stats
    const teacherLogin = await handleApiRequest('POST', '/api/auth/login', {
      email: 'teacher@kyntrix.edu',
      password: 'KyntriX2025!',
    });
    expect(teacherLogin.status).toBe(200);
    const teacherToken = teacherLogin.data.token;

    const teacherAnalytics = await handleApiRequest('GET', '/api/analytics', null, {
      authorization: `Bearer ${teacherToken}`,
    });
    expect(teacherAnalytics.status).toBe(200);
    expect(teacherAnalytics.data.difficultyBreakdown.totalSolved).toBe(48);
    expect(teacherAnalytics.data.currentStreak).toBe(21);
    expect(teacherAnalytics.data.maxStreak).toBe(45);
    expect(teacherAnalytics.data.totalActiveDays).toBeGreaterThanOrEqual(20);
    expect(teacherAnalytics.data.totalUnlockedBadges).toBeGreaterThanOrEqual(6);

    // 3. Register a Brand New User (Alice)
    const uniqueEmail = `alice_${Date.now()}@domain.edu`;
    const aliceRegister = await handleApiRequest('POST', '/api/auth/register', {
      name: 'Alice Wonder',
      username: `alice_${Date.now()}`,
      email: uniqueEmail,
      password: 'SecurePass2025!',
      role: 'student',
      institution: 'MIT',
    });
    expect(aliceRegister.status).toBe(201);
    const aliceToken = aliceRegister.data.token;

    // Alice should start with pristine zero stats
    const aliceAnalytics = await handleApiRequest('GET', '/api/analytics', null, {
      authorization: `Bearer ${aliceToken}`,
    });
    expect(aliceAnalytics.status).toBe(200);
    expect(aliceAnalytics.data.difficultyBreakdown.totalSolved).toBe(0);
    expect(aliceAnalytics.data.difficultyBreakdown.easy.solved).toBe(0);
    expect(aliceAnalytics.data.difficultyBreakdown.med.solved).toBe(0);
    expect(aliceAnalytics.data.currentStreak).toBe(0);
    expect(aliceAnalytics.data.maxStreak).toBe(0);
    expect(aliceAnalytics.data.totalActiveDays).toBe(0);
    expect(aliceAnalytics.data.totalUnlockedBadges).toBe(0);
    expect(aliceAnalytics.data.nextBadge).toBeDefined();
    expect(aliceAnalytics.data.nextBadge.percentage).toBe(0);

    // 4. Alice solves a beginner problem in the Arena (prob_trans_01 expected 0.48)
    const solveRes = await handleApiRequest('POST', '/api/problems/prob_trans_01/attempt', {
      submission: 0.48, // Correct answer
      hintsUsed: 0,
      solveTimeMs: 30000,
    }, {
      authorization: `Bearer ${aliceToken}`,
    });
    expect(solveRes.status).toBe(200);
    expect(solveRes.data.isCorrect).toBe(true);

    // 5. Alice's analytics must immediately update, while Student & Teacher stay unchanged
    const aliceUpdated = await handleApiRequest('GET', '/api/analytics', null, {
      authorization: `Bearer ${aliceToken}`,
    });
    expect(aliceUpdated.status).toBe(200);
    expect(aliceUpdated.data.difficultyBreakdown.totalSolved).toBe(1);
    expect(aliceUpdated.data.difficultyBreakdown.easy.solved).toBe(1);
    expect(aliceUpdated.data.currentStreak).toBe(1);
    expect(aliceUpdated.data.maxStreak).toBe(1);
    expect(aliceUpdated.data.totalActiveDays).toBe(1);

    // Re-verify Student analytics is completely untouched
    const studentVerify = await handleApiRequest('GET', '/api/analytics', null, {
      authorization: `Bearer ${studentToken}`,
    });
    expect(studentVerify.data.difficultyBreakdown.totalSolved).toBe(18);
    expect(studentVerify.data.currentStreak).toBe(5);
  });
});
