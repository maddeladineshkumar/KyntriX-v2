import { DatabaseService } from '../db/database';

export class AnalyticsRoutes {
  private db = DatabaseService.getInstance();

  public getAnalytics(userId: string): { status: number; body: any } {
    // 1. Evaluate and award any earned badges for this user based on profile achievements
    this.db.evaluateBadges(userId);

    const profile = this.db.getProfile(userId);
    if (!profile.stats) {
      profile.stats = {
        problemsSolved: 0,
        totalAttempts: 0,
        correctFirstAttempt: 0,
        totalTimeSpentMs: 0,
        challengesCompleted: 0,
        categoryStats: {},
      };
    }
    if (!profile.stats.categoryStats) {
      profile.stats.categoryStats = {};
    }
    const attempts = this.db.getAttemptsForUser(userId);
    const problems = this.db.getProblems();

    const categories = [
      'transforms',
      'dh',
      'fk',
      'ik',
      'jacobians',
      'dynamics',
      'control',
      'mobile',
      'trajectory',
      'workspace',
    ];
    const categoryBreakdown: Record<
      string,
      {
        attempted: number;
        solved: number;
        accuracy: number;
        hintsUsed: number;
        masteryLevel: string;
      }
    > = {};

    for (const cat of categories) {
      const stats = profile.stats.categoryStats[cat] || { attempted: 0, solved: 0, hintsTotal: 0 };
      const accuracy = stats.attempted > 0 ? Math.round((stats.solved / stats.attempted) * 100) : 0;
      let masteryLevel = 'Novice';
      if (accuracy >= 85 && stats.solved >= 5) masteryLevel = 'Master';
      else if (accuracy >= 70 && stats.solved >= 3) masteryLevel = 'Proficient';
      else if (stats.solved >= 1) masteryLevel = 'Developing';

      categoryBreakdown[cat] = {
        attempted: stats.attempted,
        solved: stats.solved,
        accuracy,
        hintsUsed: stats.hintsTotal,
        masteryLevel,
      };
    }

    // 2. Weakness Detection
    const weakCategories = Object.entries(categoryBreakdown)
      .filter(([, data]) => data.attempted > 0 && data.accuracy < 75)
      .sort((a, b) => a[1].accuracy - b[1].accuracy);

    const detectedWeaknesses: Array<{
      category: string;
      accuracy: number;
      diagnosis: string;
      recommendedTopic: string;
    }> = [];

    for (const [cat, data] of weakCategories) {
      let diagnosis = 'Lower success rate observed.';
      let topic = 'Fundamental Concept Review';
      if (cat === 'ik') {
        diagnosis = 'Challenges with multi-branch reachability, elbow up/down selection, or joint limits.';
        topic = 'Planar & Spherical Wrist Inverse Kinematics';
      } else if (cat === 'dh') {
        diagnosis = 'Frame twist angle alpha signs or right-hand rule conventions.';
        topic = 'Denavit-Hartenberg Standard Coordinate Assignment';
      } else if (cat === 'transforms') {
        diagnosis = 'Matrix multiplication order or rotation block orthogonality.';
        topic = 'Homogeneous Transformation Matrices';
      } else if (cat === 'jacobians') {
        diagnosis = 'Singularity identification or manipulability measure computation.';
        topic = 'Differential Kinematics & Jacobians';
      }
      detectedWeaknesses.push({
        category: cat,
        accuracy: data.accuracy,
        diagnosis,
        recommendedTopic: topic,
      });
    }

    // 3. Deterministic Recommendations
    const solvedProblemIds = new Set(attempts.filter((a) => a.isCorrect).map((a) => a.problemId));
    let recommendedProblems = problems.filter((p) => !solvedProblemIds.has(p.id));

    // Prioritize weak categories if detected
    if (weakCategories.length > 0) {
      const weakestCat = weakCategories[0][0];
      const categorySpecific = recommendedProblems.filter((p) => p.category === weakestCat);
      if (categorySpecific.length > 0) {
        recommendedProblems = [...categorySpecific, ...recommendedProblems.filter((p) => p.category !== weakestCat)];
      }
    }

    const topRecommendations = recommendedProblems.slice(0, 3).map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      difficulty: p.difficulty,
      xpReward: p.xpReward,
      reason: weakCategories.length > 0 && p.category === weakCategories[0][0]
        ? `Targeted practice for ${p.category.toUpperCase()} weakness (${weakCategories[0][1].accuracy}% accuracy)`
        : `Recommended based on your rating (${profile.rating})`,
    }));

    // 4. Overall Accuracy
    const overallAccuracy = profile.stats.totalAttempts > 0
      ? Math.round((profile.stats.problemsSolved / profile.stats.totalAttempts) * 100)
      : 0;

    const firstAttemptAccuracy = profile.stats.problemsSolved > 0
      ? Math.round((profile.stats.correctFirstAttempt / profile.stats.problemsSolved) * 100)
      : 0;

    // 5. Synced Difficulty Breakdown for Arena Problems
    const easyProblems = problems.filter((p) => p.difficulty === 'beginner');
    const medProblems = problems.filter(
      (p) => p.difficulty === 'intermediate' || p.difficulty === 'advanced'
    );
    const hardProblems = problems.filter(
      (p) => p.difficulty === 'expert' || p.difficulty === 'research'
    );

    let easySolved = easyProblems.filter((p) => solvedProblemIds.has(p.id)).length;
    let medSolved = medProblems.filter((p) => solvedProblemIds.has(p.id)).length;
    let hardSolved = hardProblems.filter((p) => solvedProblemIds.has(p.id)).length;

    // Fallback if individual attempt rows are fewer than declared profile.stats.problemsSolved
    if (solvedProblemIds.size === 0 && profile.stats.problemsSolved > 0) {
      const catStats = profile.stats.categoryStats || {};
      const totalSolved = profile.stats.problemsSolved;
      easySolved = Math.min(easyProblems.length || 154, (catStats.dh?.solved || 0) + (catStats.transforms?.solved || 0));
      medSolved = Math.min(medProblems.length || 102, Math.max(0, totalSolved - easySolved));
      hardSolved = Math.max(0, totalSolved - easySolved - medSolved);
    }

    const allAttemptedProblemIds = new Set(attempts.map((a) => a.problemId));
    const attemptingCount = Array.from(allAttemptedProblemIds).filter(
      (id) => !solvedProblemIds.has(id)
    ).length;

    const totalSolved = solvedProblemIds.size > 0
      ? solvedProblemIds.size
      : (profile.stats.problemsSolved || (easySolved + medSolved + hardSolved));

    const difficultyBreakdown = {
      easy: { solved: easySolved, total: easyProblems.length || 154 },
      med: { solved: medSolved, total: medProblems.length || 102 },
      hard: { solved: hardSolved, total: hardProblems.length > 0 ? hardProblems.length : 46 },
      totalSolved,
      totalProblems: problems.length || 256,
      attempting: attemptingCount,
    };

    // 6. Daily Problem Activity (Tracking problem completions / practice per day)
    const dailyProblemActivity: Record<string, { solved: number; attempted: number; total: number }> = {};
    for (const a of attempts) {
      const dateStr = a.createdAt.slice(0, 10);
      if (!dailyProblemActivity[dateStr]) {
        dailyProblemActivity[dateStr] = { solved: 0, attempted: 0, total: 0 };
      }
      dailyProblemActivity[dateStr].total += 1;
      if (a.isCorrect) {
        dailyProblemActivity[dateStr].solved += 1;
      } else {
        dailyProblemActivity[dateStr].attempted += 1;
      }
    }

    // Ensure streak dates are registered if attempts rows are missing for today
    if ((profile.streak.currentStreak || 0) > 0 && profile.streak.lastActivityDate) {
      const lastDate = profile.streak.lastActivityDate;
      if (!dailyProblemActivity[lastDate]) {
        dailyProblemActivity[lastDate] = { solved: 1, attempted: 0, total: 1 };
      }
    }

    // 7. Badges Progress & Next Badge Discovery
    const allBadges = this.db.getAllBadges();
    const userBadges = this.db.getUserBadges(userId);
    const unlockedMap = new Map(userBadges.map((ub) => [ub.badgeId, ub.unlockedAt]));

    const getBadgeProgress = (badgeId: string): { progress: number; target: number } => {
      switch (badgeId) {
        case 'dh_apprentice':
          return { progress: profile.stats.categoryStats.dh?.solved || 0, target: 5 };
        case 'dh_master':
          return { progress: profile.stats.categoryStats.dh?.solved || 0, target: 25 };
        case 'matrix_master':
          return { progress: profile.stats.categoryStats.transforms?.solved || 0, target: 15 };
        case 'fk_specialist':
          return { progress: profile.stats.categoryStats.fk?.solved || 0, target: 10 };
        case 'ik_specialist':
          return { progress: profile.stats.categoryStats.ik?.solved || 0, target: 10 };
        case 'jacobian_explorer':
          return { progress: profile.stats.categoryStats.jacobians?.solved || 0, target: 5 };
        case 'zero_hint':
          return { progress: profile.stats.correctFirstAttempt || 0, target: 10 };
        case 'six_dof':
          return { progress: profile.stats.challengesCompleted || 0, target: 5 };
        case 'kyntrix_master':
          return { progress: profile.xp || 0, target: 2000 };
        case 'streak_master':
          return {
            progress: Math.max(profile.streak.currentStreak || 0, profile.streak.longestStreak || 0),
            target: 7,
          };
        default:
          return { progress: 0, target: 1 };
      }
    };

    const enrichedBadges = allBadges.map((b) => {
      const unlocked = unlockedMap.has(b.id);
      const { progress, target } = getBadgeProgress(b.id);
      const percentage = Math.min(100, Math.round((progress / target) * 100));
      return {
        ...b,
        unlocked,
        unlockedAt: unlockedMap.get(b.id) || null,
        progress,
        target,
        percentage: unlocked ? 100 : percentage,
      };
    });

    const lockedBadges = enrichedBadges
      .filter((b) => !b.unlocked && b.percentage < 100)
      .sort((a, b) => b.percentage - a.percentage);

    const nextBadge = lockedBadges.length > 0 ? lockedBadges[0] : null;

    const totalActiveDays = Object.keys(dailyProblemActivity).length;
    const currentStreak = profile.streak.currentStreak || 0;
    const maxStreak = Math.max(profile.streak.longestStreak || 0, currentStreak);

    return {
      status: 200,
      body: {
        profile,
        overallAccuracy,
        firstAttemptAccuracy,
        categoryBreakdown,
        detectedWeaknesses,
        recommendations: topRecommendations,
        recentAttempts: attempts.slice(0, 10),
        difficultyBreakdown,
        dailyProblemActivity,
        badges: enrichedBadges,
        lockedBadges,
        nextBadge,
        totalUnlockedBadges: userBadges.length,
        totalActiveDays,
        currentStreak,
        maxStreak,
      },
    };
  }
}
