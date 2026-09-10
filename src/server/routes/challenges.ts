import { DatabaseService } from '../db/database';
import { DeterministicEngine } from '../robotics/deterministicEngine';
import { loadRobotById } from '../../data/robots';
import type { ChallengeAttempt } from '../db/types';

export class ChallengeRoutes {
  private db = DatabaseService.getInstance();

  public listChallenges(): { status: number; body: any } {
    const challenges = this.db.getChallenges();
    const list: any = [...challenges];
    list.challenges = challenges;
    return { status: 200, body: list };
  }

  public getChallenge(id: string): { status: number; body: any } {
    const challenge = this.db.getChallengeById(id);
    if (!challenge) {
      return { status: 404, body: { error: 'Challenge not found' } };
    }
    return { status: 200, body: { challenge } };
  }

  public async submitChallenge(
    id: string,
    body: {
      finalJoints?: number[];
      jointValues?: number[];
      completionTimeSeconds?: number;
      timeSpentSeconds?: number;
    },
    userId: string
  ): Promise<{ status: number; body: any }> {
    const challenge = this.db.getChallengeById(id);
    if (!challenge) {
      return { status: 404, body: { error: 'Challenge not found' } };
    }

    let robotDef;
    try {
      robotDef = await loadRobotById(challenge.robotId);
    } catch {
      // Fallback: try Puma560 or ABBIRB120
      robotDef = await loadRobotById('Puma560');
    }

    const joints = body.finalJoints || body.jointValues || [];
    const timeSpent = body.completionTimeSeconds || body.timeSpentSeconds || 10;

    const { attempt, scoreDetails } = DeterministicEngine.evaluateSimulationChallenge(
      challenge,
      robotDef,
      joints,
      timeSpent
    );

    const attemptId = `ch_att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullAttempt: ChallengeAttempt = {
      id: attemptId,
      userId,
      ...attempt,
      createdAt: new Date().toISOString(),
    };

    this.db.createChallengeAttempt(fullAttempt);

    let xpAwarded = 0;
    let ratingDelta = 0;
    let unlockedBadges: any[] = [];

    if (attempt.passed) {
      const xpResult = this.db.awardXP(
        userId,
        attempt.xpAwarded,
        `Simulation Challenge: ${challenge.title}`,
        'challenge',
        challenge.id
      );
      if (xpResult.awarded) {
        xpAwarded = attempt.xpAwarded;
      }

      const ratingRes = this.db.updateRating(
        userId,
        challenge.ratingValue,
        true,
        `Challenge Completed: ${challenge.title}`
      );
      ratingDelta = ratingRes.delta;

      this.db.recordLearningActivity(userId);
      unlockedBadges = this.db.evaluateBadges(userId);
    }

    const updatedProfile = this.db.getProfile(userId);

    return {
      status: 200,
      body: {
        attempt: fullAttempt,
        score: fullAttempt.score,
        scoreDetails,
        xpAwarded,
        ratingDelta,
        unlockedBadges,
        updatedProfile,
      },
    };
  }
}
