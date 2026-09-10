import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useLearningStore } from '../../src/features/learning/useLearningStore';
import { ApiClient } from '../../src/features/learning/apiClient';
import { handleApiRequest } from '../../src/server/apiRouter';
import { Database } from '../../src/server/db/database';

describe('Frontend Data Binding & Safe Transitions', () => {
  beforeEach(async () => {
    Database.resetToSeed();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init?: any) => {
      const urlStr = typeof input === 'string' ? input : input.url;
      const url = new URL(urlStr, 'http://localhost');
      const pathname = url.pathname;
      const method = init?.method || 'GET';
      let body = null;
      if (init?.body) {
        try {
          body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
        } catch {
          body = init.body;
        }
      }
      const headers = init?.headers || {};
      const res = await handleApiRequest(method, pathname, body, headers);
      return new Response(JSON.stringify(res.data), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Authenticate demo student
    const loginRes = await ApiClient.login({
      email: 'student@kyntrix.edu',
      password: 'KyntriX2025!',
    });
    if (loginRes.data && loginRes.data.token) {
      ApiClient.setToken(loginRes.data.token);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('populates problems in useLearningStore from /api/problems', async () => {
    const store = useLearningStore.getState();
    await store.fetchProblems();
    const problems = useLearningStore.getState().problems;
    expect(problems.length).toBeGreaterThanOrEqual(250);
    expect(problems[0].id).toBeTruthy();
    expect(problems[0].category).toBeTruthy();
  });

  it('populates simulation challenges in useLearningStore from /api/challenges', async () => {
    const store = useLearningStore.getState();
    await store.fetchChallenges();
    const challenges = useLearningStore.getState().challenges;
    expect(challenges.length).toBeGreaterThanOrEqual(20);
    expect(challenges[0].id).toBeTruthy();
    expect(challenges[0].robotId).toBeTruthy();
    expect(challenges[0].constraints).toBeDefined();
  });

  it('safely switches between active learning subtabs (dashboard, arena, challenges, analytics, profile)', () => {
    const store = useLearningStore.getState();
    expect(store.activeSubtab).toBe('dashboard');

    store.setActiveSubtab('arena');
    expect(useLearningStore.getState().activeSubtab).toBe('arena');

    store.setActiveSubtab('challenges');
    expect(useLearningStore.getState().activeSubtab).toBe('challenges');

    store.setActiveSubtab('analytics');
    expect(useLearningStore.getState().activeSubtab).toBe('analytics');

    store.setActiveSubtab('profile');
    expect(useLearningStore.getState().activeSubtab).toBe('profile');

    store.setActiveSubtab('dashboard');
    expect(useLearningStore.getState().activeSubtab).toBe('dashboard');
  });
});
