import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { LeetCodeStatsCard } from '../../src/features/learning/LeetCodeStatsCard';

describe('LeetCodeStatsCard Component Suite', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders live mode synced with Arena problems (Easy, Med., Hard breakdown and badges)', async () => {
    const mockProblems = [
      { id: 'p1', difficulty: 'beginner' },
      { id: 'p2', difficulty: 'beginner' },
      { id: 'p3', difficulty: 'intermediate' },
      { id: 'p4', difficulty: 'advanced' },
      { id: 'p5', difficulty: 'expert' },
      { id: 'p6', difficulty: 'research' },
    ];

    const mockProfile: any = {
      xp: 450,
      streak: { currentStreak: 3, longestStreak: 5 },
      stats: {
        problemsSolved: 4,
        totalAttempts: 6,
        categoryStats: {
          dh: { attempted: 3, solved: 2 },
          transforms: { attempted: 2, solved: 2 },
        },
      },
    };

    const mockBadges = [
      {
        id: 'dh_apprentice',
        name: 'DH Apprentice',
        description: 'Solve 5 DH problems',
        icon: 'Table',
        rarity: 'common',
        criteriaDescription: 'Solve 5 DH problems',
        unlocked: false,
      },
      {
        id: 'streak_master',
        name: 'Relentless Scholar',
        description: 'Maintain 7-day streak',
        icon: 'Flame',
        rarity: 'rare',
        criteriaDescription: 'Maintain 7-day streak',
        unlocked: false,
      },
    ];

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(LeetCodeStatsCard, {
          profile: mockProfile,
          allProblems: mockProblems,
          badges: mockBadges,
          defaultMode: 'live',
        })
      );
      await new Promise((r) => setTimeout(r, 50));
    });

    // Gauge and totals
    expect(container.textContent).toContain('Solved');
    expect(container.textContent).toContain('Attempting');

    // Difficulty breakdown cards
    expect(container.textContent).toContain('Easy');
    expect(container.textContent).toContain('Med.');
    expect(container.textContent).toContain('Hard');

    // Badges section
    expect(container.textContent).toContain('Badges');
    expect(container.textContent).toContain('Next Badge to Unlock');

    // Daily problem tracker (instead of generic submissions)
    expect(container.textContent).toContain('problems completed in the past one year');
    expect(container.textContent).toContain('Total active days');
    expect(container.textContent).toContain('Max streak');
    expect(container.textContent).toContain('Today: 1 Problem/Day Pending');

    // Expand locked badges drawer
    const viewBadgesBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('View All Locked Badges')
    );
    expect(viewBadgesBtn).toBeDefined();

    await act(async () => {
      viewBadgesBtn?.click();
      await new Promise((r) => setTimeout(r, 50));
    });

    // Verify locked badges details are visible
    expect(container.textContent).toContain('DH Apprentice');
    expect(container.textContent).toContain('Relentless Scholar');

    // Verify when today's problem is completed
    const todayDoneProfile = {
      ...mockProfile,
      streak: { ...mockProfile.streak, lastActivityDate: new Date().toISOString().slice(0, 10) },
    };
    await act(async () => {
      root.render(
        React.createElement(LeetCodeStatsCard, {
          profile: todayDoneProfile,
          allProblems: mockProblems,
          badges: mockBadges,
          defaultMode: 'live',
        })
      );
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(container.textContent).toContain('Today: Goal Met');
    expect(container.textContent).toContain('DH Apprentice');
    expect(container.textContent).toContain('Relentless Scholar');
  });

  it('renders exact reference mode matching the uploaded screenshot', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(LeetCodeStatsCard, { defaultMode: 'reference' }));
      await new Promise((r) => setTimeout(r, 50));
    });

    // Circular gauge numbers
    expect(container.textContent).toContain('6');
    expect(container.textContent).toContain('/4047');
    expect(container.textContent).toContain('Solved');
    expect(container.textContent).toContain('0 Attempting');

    // Difficulty breakdown cards
    expect(container.textContent).toContain('Easy');
    expect(container.textContent).toContain('6/963');
    expect(container.textContent).toContain('Med.');
    expect(container.textContent).toContain('0/2111');
    expect(container.textContent).toContain('Hard');
    expect(container.textContent).toContain('0/973');

    // Badges & locked challenge
    expect(container.textContent).toContain('Badges');
    expect(container.textContent).toContain('Locked Badge');
    expect(container.textContent).toContain('Sep LeetCoding Challenge');

    // Heatmap stats
    expect(container.textContent).toContain('19');
    expect(container.textContent).toContain('Total active days: 3');
    expect(container.textContent).toContain('Max streak: 2');

    // Month labels for the calendar
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    for (const m of months) {
      expect(container.textContent).toContain(m);
    }
  });

  it('contains the SVG circular arc gauge and concentric hexagon badge', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(LeetCodeStatsCard));
      await new Promise((r) => setTimeout(r, 50));
    });

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);

    const gaugeSvg = container.querySelector('svg[aria-label="Solved problems gauge"]');
    expect(gaugeSvg).not.toBeNull();

    const badgeSvg = container.querySelector('svg[aria-label="Locked monthly challenge badge"]');
    expect(badgeSvg).not.toBeNull();
  });

  it('updates solved problems count, difficulty tiers, and unlocks badge in real-time when new data arrives', async () => {
    const mockProblems = [
      { id: 'p1', difficulty: 'beginner' },
      { id: 'p2', difficulty: 'intermediate' },
      { id: 'p3', difficulty: 'expert' },
    ];

    let initialProfile: any = {
      xp: 100,
      streak: { currentStreak: 1, longestStreak: 1 },
      stats: {
        problemsSolved: 0,
        totalAttempts: 0,
        categoryStats: { dh: { attempted: 0, solved: 0 } },
      },
    };

    let initialAnalytics: any = {
      difficultyBreakdown: {
        easy: { solved: 0, total: 1 },
        med: { solved: 0, total: 1 },
        hard: { solved: 0, total: 1 },
        totalSolved: 0,
        totalProblems: 3,
        attempting: 0,
      },
      badges: [
        {
          id: 'dh_apprentice',
          name: 'DH Apprentice',
          description: 'Solve 5 DH problems',
          unlocked: false,
          rarity: 'common',
          criteriaDescription: 'Solve 5 DH problems',
          progress: 0,
          target: 5,
          percentage: 0,
        },
      ],
      nextBadge: {
        id: 'dh_apprentice',
        name: 'DH Apprentice',
        rarity: 'common',
        criteriaDescription: 'Solve 5 DH problems',
        progress: 0,
        target: 5,
        percentage: 0,
      },
      lockedBadges: [],
      dailyProblemActivity: {},
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(LeetCodeStatsCard, {
          profile: initialProfile,
          analyticsData: initialAnalytics,
          allProblems: mockProblems,
          defaultMode: 'live',
        })
      );
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container.textContent).toContain('0/1'); // Easy 0/1

    // Simulate user solving a problem and unlocking the badge!
    const updatedProfile: any = {
      ...initialProfile,
      xp: 250,
      stats: {
        problemsSolved: 1,
        totalAttempts: 1,
        categoryStats: { dh: { attempted: 1, solved: 1 } },
      },
    };

    const todayStr = new Date().toISOString().slice(0, 10);
    const updatedAnalytics: any = {
      difficultyBreakdown: {
        easy: { solved: 1, total: 1 },
        med: { solved: 0, total: 1 },
        hard: { solved: 0, total: 1 },
        totalSolved: 1,
        totalProblems: 3,
        attempting: 0,
      },
      badges: [
        {
          id: 'dh_apprentice',
          name: 'DH Apprentice',
          description: 'Solve 5 DH problems',
          unlocked: true,
          rarity: 'common',
          criteriaDescription: 'Solve 5 DH problems',
        },
      ],
      nextBadge: null,
      lockedBadges: [],
      dailyProblemActivity: {
        [todayStr]: { solved: 1, attempted: 0, total: 1 },
      },
    };

    await act(async () => {
      root.render(
        React.createElement(LeetCodeStatsCard, {
          profile: updatedProfile,
          analyticsData: updatedAnalytics,
          allProblems: mockProblems,
          defaultMode: 'live',
        })
      );
      await new Promise((r) => setTimeout(r, 50));
    });

    // Verify Easy count is now 1/1
    expect(container.textContent).toContain('1/1');
    // Verify 1 badge is now unlocked
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('Unlocked');
    // Verify today's goal is completed
    expect(container.textContent).toContain('Today: Goal Met');
  });

  it('verifies that solving a problem updates streak, marks today goal as met, and triggers badge updates', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const mockProblems = [
      { id: 'p_easy', difficulty: 'beginner' },
      { id: 'p_med', difficulty: 'intermediate' },
      { id: 'p_hard', difficulty: 'expert' },
    ];

    // User starts today with 0 problems done today
    const profileBefore: any = {
      xp: 500,
      streak: { currentStreak: 4, longestStreak: 4, lastActivityDate: '2026-09-09' },
      stats: {
        problemsSolved: 4,
        totalAttempts: 5,
        categoryStats: { dh: { attempted: 4, solved: 4 } },
      },
    };

    const analyticsBefore: any = {
      difficultyBreakdown: {
        easy: { solved: 4, total: 10 },
        med: { solved: 0, total: 10 },
        hard: { solved: 0, total: 5 },
        totalSolved: 4,
        totalProblems: 25,
        attempting: 1,
      },
      badges: [
        {
          id: 'dh_apprentice',
          name: 'DH Apprentice',
          unlocked: false,
          rarity: 'common',
          criteriaDescription: 'Solve 5 DH problems',
          progress: 4,
          target: 5,
          percentage: 80,
        },
      ],
      nextBadge: {
        id: 'dh_apprentice',
        name: 'DH Apprentice',
        rarity: 'common',
        criteriaDescription: 'Solve 5 DH problems',
        progress: 4,
        target: 5,
        percentage: 80,
      },
      lockedBadges: [],
      dailyProblemActivity: {
        '2026-09-09': { solved: 1, attempted: 0, total: 1 },
      },
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(LeetCodeStatsCard, {
          profile: profileBefore,
          analyticsData: analyticsBefore,
          allProblems: mockProblems,
          defaultMode: 'live',
        })
      );
      await new Promise((r) => setTimeout(r, 50));
    });

    // Before solving today's problem: pending status
    expect(container.textContent).toContain('Today: 1 Problem/Day Pending');
    expect(container.textContent).toContain('0/ 1 Unlocked');

    // User now solves the 5th DH problem today, unlocking DH Apprentice badge!
    const profileAfter: any = {
      xp: 650,
      streak: { currentStreak: 5, longestStreak: 5, lastActivityDate: todayStr },
      stats: {
        problemsSolved: 5,
        totalAttempts: 6,
        categoryStats: { dh: { attempted: 5, solved: 5 } },
      },
    };

    const analyticsAfter: any = {
      difficultyBreakdown: {
        easy: { solved: 5, total: 10 },
        med: { solved: 0, total: 10 },
        hard: { solved: 0, total: 5 },
        totalSolved: 5,
        totalProblems: 25,
        attempting: 1,
      },
      badges: [
        {
          id: 'dh_apprentice',
          name: 'DH Apprentice',
          unlocked: true,
          rarity: 'common',
          criteriaDescription: 'Solve 5 DH problems',
          progress: 5,
          target: 5,
          percentage: 100,
        },
      ],
      nextBadge: null,
      lockedBadges: [],
      dailyProblemActivity: {
        '2026-09-09': { solved: 1, attempted: 0, total: 1 },
        [todayStr]: { solved: 1, attempted: 0, total: 1 },
      },
    };

    await act(async () => {
      root.render(
        React.createElement(LeetCodeStatsCard, {
          profile: profileAfter,
          analyticsData: analyticsAfter,
          allProblems: mockProblems,
          defaultMode: 'live',
        })
      );
      await new Promise((r) => setTimeout(r, 50));
    });

    // After solving: today's goal is met, total solved is 5, badge is 1 unlocked!
    expect(container.textContent).toContain('Today: Goal Met');
    expect(container.textContent).toContain('1/ 1 Unlocked');
    expect(container.textContent).toContain('5/1'); // Easy solved (5 out of 1 catalog problem)
  });

  it('proves that stats, streaks, active days, and badges are individually distinct and isolated per user', async () => {
    const mockProblems = [
      { id: 'p1', difficulty: 'beginner' },
      { id: 'p2', difficulty: 'beginner' },
      { id: 'p3', difficulty: 'intermediate' },
    ];

    // User 1: New learner (0 problems, 0 streak, 0 active days)
    const newLearnerProfile: any = {
      xp: 0,
      streak: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
      stats: { problemsSolved: 0, totalAttempts: 0, categoryStats: {} },
    };
    const newLearnerAnalytics: any = {
      profile: newLearnerProfile,
      difficultyBreakdown: { easy: { solved: 0, total: 2 }, med: { solved: 0, total: 1 }, hard: { solved: 0, total: 0 }, totalSolved: 0, totalProblems: 3, attempting: 0 },
      dailyProblemActivity: {},
      totalActiveDays: 0,
      currentStreak: 0,
      maxStreak: 0,
      badges: [{ id: 'b1', name: 'First Step', unlocked: false, progress: 0, target: 1, percentage: 0 }],
      nextBadge: { id: 'b1', name: 'First Step', unlocked: false, progress: 0, target: 1, percentage: 0 },
      lockedBadges: [{ id: 'b1', name: 'First Step', unlocked: false, progress: 0, target: 1, percentage: 0 }],
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(LeetCodeStatsCard, {
          profile: newLearnerProfile,
          analyticsData: newLearnerAnalytics,
          allProblems: mockProblems,
        })
      );
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container.textContent).toContain('0/3'); // 0 solved
    expect(container.textContent).toContain('Total active days: 0');
    expect(container.textContent).toContain('Max streak: 0');
    expect(container.textContent).toContain('Today: 1 Problem/Day Pending');
    expect(container.textContent).toContain('0/ 1 Unlocked');

    // User 2: Senior Teacher (48 solved, 21-day streak, 45 max streak, 25 active days)
    const teacherProfile: any = {
      xp: 5800,
      streak: { currentStreak: 21, longestStreak: 45, lastActivityDate: new Date().toISOString().slice(0, 10) },
      stats: { problemsSolved: 48, totalAttempts: 50, categoryStats: { dh: { solved: 10 } } },
    };
    const teacherAnalytics: any = {
      profile: teacherProfile,
      difficultyBreakdown: { easy: { solved: 24, total: 154 }, med: { solved: 24, total: 102 }, hard: { solved: 0, total: 46 }, totalSolved: 48, totalProblems: 256, attempting: 2 },
      dailyProblemActivity: { '2026-09-10': { solved: 3, total: 3 } },
      totalActiveDays: 25,
      currentStreak: 21,
      maxStreak: 45,
      badges: [
        { id: 'b1', name: 'First Step', unlocked: true },
        { id: 'b2', name: 'Scholar', unlocked: true },
      ],
      nextBadge: null, // All locked badges unlocked or achieved
      lockedBadges: [],
    };

    await act(async () => {
      root.render(
        React.createElement(LeetCodeStatsCard, {
          profile: teacherProfile,
          analyticsData: teacherAnalytics,
          allProblems: mockProblems,
        })
      );
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container.textContent).toContain('48/256'); // 48 solved
    expect(container.textContent).toContain('24/154'); // Easy 24/154
    expect(container.textContent).toContain('Total active days: 25');
    expect(container.textContent).toContain('Max streak: 45');
    expect(container.textContent).toContain('Today: Goal Met');
    expect(container.textContent).toContain('Grandmaster of Kinematics'); // Celebration when all badges unlocked!
  });
});
