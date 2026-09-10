import { describe, it, expect, beforeEach } from 'vitest';
import { handleApiRequest } from '../../src/server/apiRouter';
import { Database } from '../../src/server/db/database';

describe('Server API Dispatcher (/api/*)', () => {
  beforeEach(() => {
    Database.resetToSeed();
  });

  it('handles auth login and me endpoints', async () => {
    // Login
    const loginReq = await handleApiRequest('POST', '/api/auth/login', {
      email: 'student@kyntrix.edu',
      password: 'KyntriX2025!',
    });
    expect(loginReq.status).toBe(200);
    expect(loginReq.data.token).toBeDefined();
    expect(loginReq.data.user.email).toBe('student@kyntrix.edu');

    // Authenticated me
    const meReq = await handleApiRequest('GET', '/api/auth/me', null, {
      authorization: `Bearer ${loginReq.data.token}`,
    });
    expect(meReq.status).toBe(200);
    expect(meReq.data.user.id).toBe(loginReq.data.user.id);
  });

  it('lists problems and supports deterministic attempt submission', async () => {
    const loginRes = await handleApiRequest('POST', '/api/auth/login', {
      email: 'student@kyntrix.edu',
      password: 'KyntriX2025!',
    });
    const token = loginRes.data.token;
    const authHeaders = { authorization: `Bearer ${token}` };

    // Get problems
    const problemsRes = await handleApiRequest('GET', '/api/problems', null, authHeaders);
    expect(problemsRes.status).toBe(200);
    expect(problemsRes.data.length).toBeGreaterThan(0);

    const probId = problemsRes.data[0].id;
    const probDetailRes = await handleApiRequest('GET', `/api/problems/${probId}`, null, authHeaders);
    expect(probDetailRes.status).toBe(200);
    expect(probDetailRes.data.problem.id).toBe(probId);

    // Request hint
    const hintRes = await handleApiRequest('POST', `/api/problems/${probId}/hint`, { level: 1 }, authHeaders);
    expect(hintRes.status).toBe(200);
    expect(hintRes.data.hint).toBeDefined();

    // Submit attempt
    const attemptRes = await handleApiRequest('POST', `/api/problems/${probId}/attempt`, {
      submission: 0,
      timeSpentSeconds: 45,
    }, authHeaders);
    expect(attemptRes.status).toBe(200);
    expect(attemptRes.data.attempt).toBeDefined();
  });

  it('returns leaderboards and personal analytics', async () => {
    const loginRes = await handleApiRequest('POST', '/api/auth/login', {
      email: 'student@kyntrix.edu',
      password: 'KyntriX2025!',
    });
    const token = loginRes.data.token;
    const authHeaders = { authorization: `Bearer ${token}` };

    // Leaderboard
    const lbRes = await handleApiRequest('GET', '/api/leaderboard?scope=global&metric=xp', null, authHeaders);
    expect(lbRes.status).toBe(200);
    expect(Array.isArray(lbRes.data.leaderboard)).toBe(true);

    // Personal Analytics
    const analyticsRes = await handleApiRequest('GET', '/api/analytics/me', null, authHeaders);
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.data.categoryBreakdown).toBeDefined();
    expect(analyticsRes.data.detectedWeaknesses).toBeDefined();
  });

  it('handles simulation challenge attempts', async () => {
    const loginRes = await handleApiRequest('POST', '/api/auth/login', {
      email: 'student@kyntrix.edu',
      password: 'KyntriX2025!',
    });
    const token = loginRes.data.token;
    const authHeaders = { authorization: `Bearer ${token}` };

    const challengesRes = await handleApiRequest('GET', '/api/challenges', null, authHeaders);
    expect(challengesRes.status).toBe(200);
    expect(challengesRes.data.length).toBeGreaterThan(0);

    const chalId = challengesRes.data[0].id;
    const submitRes = await handleApiRequest('POST', `/api/challenges/${chalId}/attempt`, {
      jointValues: [0, 0, 0, 0, 0, 0],
      timeSpentSeconds: 30,
    }, authHeaders);
    expect(submitRes.status).toBe(200);
    expect(submitRes.data.score).toBeDefined();
  });
});
