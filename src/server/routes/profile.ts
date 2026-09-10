import { DatabaseService } from '../db/database';

export class ProfileRoutes {
  private db = DatabaseService.getInstance();

  public getProfileByUsername(username: string): { status: number; body: any } {
    const user = this.db.getUserByUsername(username);
    if (!user) {
      return { status: 404, body: { error: 'User not found' } };
    }

    const profile = this.db.getProfile(user.id);
    const userBadges = this.db.getUserBadges(user.id);
    const allBadges = this.db.getAllBadges();
    const unlockedMap = new Map(userBadges.map((ub) => [ub.badgeId, ub.unlockedAt]));

    const enrichedBadges = allBadges
      .filter((b) => unlockedMap.has(b.id))
      .map((b) => ({ ...b, unlockedAt: unlockedMap.get(b.id) }));

    const { passwordHash: _, salt: __, email: ___, ...sanitizedUser } = user;

    return {
      status: 200,
      body: {
        user: sanitizedUser,
        profile,
        badges: enrichedBadges,
      },
    };
  }

  public updateProfile(
    body: { name?: string; institution?: string; avatarUrl?: string },
    userId: string
  ): { status: number; body: any } {
    const user = this.db.getUserById(userId);
    if (!user) {
      return { status: 404, body: { error: 'User not found' } };
    }

    if (body.name) user.name = body.name;
    if (body.institution !== undefined) user.institution = body.institution;
    if (body.avatarUrl) user.avatarUrl = body.avatarUrl;
    user.updatedAt = new Date().toISOString();

    this.db.save();

    const profile = this.db.getProfile(userId);
    const { passwordHash: _, salt: __, ...sanitized } = user;

    return {
      status: 200,
      body: {
        user: sanitized,
        profile,
      },
    };
  }
}
