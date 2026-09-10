import { DatabaseService } from '../db/database';

export class LeaderboardRoutes {
  private db = DatabaseService.getInstance();

  public getLeaderboard(query: {
    scope?: 'global' | 'institution' | 'weekly' | 'all_time';
    metric?: 'xp' | 'rating' | 'problems_solved';
    institution?: string;
  }): { status: number; body: any } {
    const scope = query.scope || 'global';
    const metric = query.metric || 'xp';
    const leaderboard = this.db.getLeaderboard(scope, metric, query.institution);

    return {
      status: 200,
      body: {
        scope,
        metric,
        entries: leaderboard,
        leaderboard,
      },
    };
  }
}

export class BadgeRoutes {
  private db = DatabaseService.getInstance();

  public listBadges(userId?: string): { status: number; body: any } {
    if (userId) {
      this.db.evaluateBadges(userId);
    }
    const badges = this.db.getAllBadges();
    const userBadges = userId ? this.db.getUserBadges(userId) : [];
    const unlockedMap = new Map(userBadges.map((ub) => [ub.badgeId, ub.unlockedAt]));

    const enriched = badges.map((b) => ({
      ...b,
      unlocked: unlockedMap.has(b.id),
      unlockedAt: unlockedMap.get(b.id) || null,
    }));

    return {
      status: 200,
      body: {
        badges: enriched,
        totalUnlocked: userBadges.length,
      },
    };
  }
}
