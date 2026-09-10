import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../../src/features/learning/apiClient';
import { useLearningStore } from '../../src/features/learning/useLearningStore';
import { DatabaseService } from '../../src/server/db/database';

describe('Static Hosting & 405 Fallback Suite', () => {
  const db = DatabaseService.getInstance();

  beforeEach(() => {
    db.resetToSeed();
    localStorage.clear();
    ApiClient.setToken(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('automatically falls back to client database when remote server responds with HTTP 405', async () => {
    // Simulate GitHub Pages / static host returning HTTP 405 Method Not Allowed for POST requests
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response('', {
        status: 405,
        statusText: '',
      });
    });

    const regPayload = {
      name: 'Dinesh KUmar',
      username: 'dineshk_test_405',
      role: 'student',
      institution: 'Amrita',
      email: 'dinesh_405@gmail.com',
      password: 'securePassword123!',
    };

    const res = await ApiClient.register(regPayload);

    expect(res.error).toBeUndefined();
    expect(res.status).toBe(201);
    expect(res.data).toBeDefined();
    expect(res.data.user.name).toBe('Dinesh KUmar');
    expect(res.data.user.email).toBe('dinesh_405@gmail.com');
    expect(res.data.user.role).toBe('student');
    expect(res.data.token).toBeTruthy();
  });

  it('completes registration flow through useLearningStore when remote server gives 405', async () => {
    // Simulate remote server returning 405
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response('', { status: 405, statusText: '' });
    });

    const store = useLearningStore.getState();
    const success = await store.register({
      name: 'Dinesh KUmar',
      username: 'dineshk_store_test',
      role: 'student',
      institution: 'Amrita',
      email: 'dineshk_store@gmail.com',
      password: 'password123!',
    });

    expect(success).toBe(true);
    const updatedStore = useLearningStore.getState();
    expect(updatedStore.isAuthenticated).toBe(true);
    expect(updatedStore.user?.email).toBe('dineshk_store@gmail.com');
    expect(updatedStore.user?.institution).toBe('Amrita');
    expect(updatedStore.authError).toBeNull();
  });

  it('supports full lifecycle (register, solve problem, earn badge) in client database', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response('', { status: 405, statusText: '' });
    });

    const reg = await ApiClient.register({
      name: 'Arena Explorer',
      username: 'explorer_405',
      role: 'student',
      email: 'explorer@example.com',
      password: 'password123!',
    });
    expect(reg.status).toBe(201);
    const token = reg.data.token;
    ApiClient.setToken(token);

    // Fetch problem
    const probRes = await ApiClient.getProblem('prob_dh_01');
    expect(probRes.status).toBe(200);
    expect(probRes.data.problem.id).toBe('prob_dh_01');

    // Submit attempt
    const dbProb = db.getProblems().find((p) => p.id === 'prob_dh_01');
    const attRes = await ApiClient.submitProblemAttempt('prob_dh_01', {
      answer: dbProb?.answerSchema.expectedDHTable,
      hintsUsed: 0,
      solveTimeMs: 15000,
    });
    expect(attRes.status).toBe(200);
    expect(attRes.data.isCorrect).toBe(true);
    expect(attRes.data.updatedProfile.stats.problemsSolved).toBe(1);

    // Fetch analytics
    const analyticsRes = await ApiClient.getAnalytics();
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.data.difficultyBreakdown.totalSolved).toBe(1);
    expect(analyticsRes.data.currentStreak).toBe(1);
  });
});
