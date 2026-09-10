import { DatabaseService } from '../db/database';
import { DeterministicEngine } from '../robotics/deterministicEngine';
import type { ProblemAttempt, DHParameterRow } from '../db/types';

export class ProblemRoutes {
  private db = DatabaseService.getInstance();

  public listProblems(query: { category?: string; difficulty?: string; search?: string }): { status: number; body: any } {
    const problems = this.db.getProblems(query);
    // Sanitize problems list: omit full solution derivation until attempt
    const sanitized = problems.map((p) => {
      const { solution: _, ...rest } = p;
      return rest;
    });
    const list: any = [...sanitized];
    list.problems = sanitized;
    return { status: 200, body: list };
  }

  public getProblem(id: string, userId?: string): { status: number; body: any } {
    const problem = this.db.getProblemById(id);
    if (!problem) {
      return { status: 404, body: { error: 'Problem not found' } };
    }

    let userAttempts: ProblemAttempt[] = [];
    if (userId) {
      userAttempts = this.db.getAttemptsForUser(userId, id);
    }

    const hasSolved = userAttempts.some((a) => a.isCorrect);
    const { solution: _solution, ...rest } = problem;

    return {
      status: 200,
      body: {
        problem: hasSolved ? problem : rest,
        attempts: userAttempts,
      },
    };
  }

  public getHint(
    id: string,
    body: { hintIndex?: number; level?: number },
    _userId: string
  ): { status: number; body: any } {
    const problem = this.db.getProblemById(id);
    if (!problem) {
      return { status: 404, body: { error: 'Problem not found' } };
    }

    const requestedIndex = body.level !== undefined ? Math.max(0, body.level - 1) : (body.hintIndex ?? 0);
    if (requestedIndex < 0 || requestedIndex >= problem.hints.length) {
      return { status: 400, body: { error: 'Invalid hint index' } };
    }

    const hint = problem.hints[requestedIndex];
    return {
      status: 200,
      body: {
        hintIndex: requestedIndex,
        level: requestedIndex + 1,
        totalHints: problem.hints.length,
        hint,
      },
    };
  }

  public submitAttempt(
    id: string,
    body: {
      answer?: any;
      submission?: any;
      hintsUsed?: number;
      solveTimeMs?: number;
      timeSpentSeconds?: number;
      assignmentId?: string;
    },
    userId: string
  ): { status: number; body: any } {
    const problem = this.db.getProblemById(id);
    if (!problem) {
      return { status: 404, body: { error: 'Problem not found' } };
    }

    const answer = body.answer !== undefined ? body.answer : body.submission;
    const solveTimeMs = body.solveTimeMs ?? (body.timeSpentSeconds !== undefined ? body.timeSpentSeconds * 1000 : 0);

    const userAttempts = this.db.getAttemptsForUser(userId, id);
    const attemptNumber = userAttempts.length + 1;

    // 1. Authoritative Deterministic Validation
    const schema = problem.answerSchema;
    let isCorrect = false;
    let feedback = '';
    let validationDetails: Record<string, any> = {};

    switch (schema.type) {
      case 'scalar': {
        const userNum = typeof answer === 'number' ? answer : parseFloat(answer);
        const expected = schema.expectedScalar ?? 0;
        const tol = schema.tolerance ?? 0.01;
        isCorrect = DeterministicEngine.validateScalar(userNum, expected, tol);
        feedback = isCorrect
          ? `Correct! Value ${userNum} matches target within tolerance ${tol}.`
          : `Incorrect value. Check formula substitutions and calculation steps.`;
        validationDetails = { userValue: userNum, expected, difference: Math.abs(userNum - expected) };
        break;
      }

      case 'angle': {
        const userRad = typeof answer === 'number' ? answer : parseFloat(answer);
        const expectedRad = schema.expectedAngleRad ?? 0;
        const tolRad = schema.angleToleranceRad ?? 0.02;
        isCorrect = DeterministicEngine.validateAngle(userRad, expectedRad, tolRad);
        feedback = isCorrect
          ? `Correct angle! Result matches expected geometric axis.`
          : `Angle deviation exceeds allowable tolerance. Verify angle sign and right-hand orientation.`;
        validationDetails = { userAngleRad: userRad, expectedRad };
        break;
      }

      case 'vector': {
        const userVec = Array.isArray(answer) ? answer : [];
        const expectedVec = schema.expectedVector ?? [];
        const tol = schema.tolerance ?? 0.01;
        isCorrect = DeterministicEngine.validateVector(userVec, expectedVec, tol);
        feedback = isCorrect
          ? `Vector matches target coordinates!`
          : `Vector components mismatch. Expected length ${expectedVec.length}.`;
        validationDetails = { userVec, expectedVec };
        break;
      }

      case 'matrix': {
        const userMat = Array.isArray(answer) ? answer : [];
        const expectedMat = schema.expectedMatrix ?? [];
        const tol = schema.matrixTolerance ?? 0.01;
        isCorrect = DeterministicEngine.validateMatrix(userMat, expectedMat, tol);
        feedback = isCorrect
          ? `Matrix correctly derived! All transform elements match.`
          : `Matrix mismatch. Check rotation block or frame multiplication order.`;
        validationDetails = { match: isCorrect };
        break;
      }

      case 'dh_table': {
        const userRows: DHParameterRow[] = Array.isArray(answer) ? answer : [];
        const expectedRows = schema.expectedDHTable ?? [];
        const tol = schema.tolerance ?? 0.01;
        isCorrect = DeterministicEngine.validateDHTable(userRows, expectedRows, tol);
        feedback = isCorrect
          ? `DH parameters match perfectly! Frame orientation and offsets verified.`
          : `DH table mismatch. Inspect link lengths (a), offsets (d), and twist angles (alpha).`;
        validationDetails = { match: isCorrect };
        break;
      }

      case 'joint_config': {
        const userQ: number[] = Array.isArray(answer) ? answer : [];
        if (schema.expectedJoints && schema.expectedJoints.length > 0) {
          const tol = schema.tolerance ?? 0.02;
          isCorrect = DeterministicEngine.validateVector(userQ, schema.expectedJoints, tol);
          feedback = isCorrect
            ? 'Correct joint configuration!'
            : `Joint angles do not match expected values within tolerance ${tol}.`;
          validationDetails = { userQ, expectedJoints: schema.expectedJoints };
        } else {
          const dhRows = schema.expectedDHTable || [
            { joint: 1, type: 'R', theta: 0, d: 0, a: 0.5, alpha: 0 },
            { joint: 2, type: 'R', theta: 0, d: 0, a: 0.3, alpha: 0 },
          ];
          const limits = [
            { min: -Math.PI, max: Math.PI },
            { min: -Math.PI, max: Math.PI },
          ];
          const targetPose = schema.expectedPose || { position: [0.6, 0.2, 0] as [number, number, number] };
          const ikRes = DeterministicEngine.validateIKSolution(
            dhRows,
            limits,
            userQ,
            targetPose,
            schema.tolerance ?? 0.01
          );
          isCorrect = ikRes.valid;
          feedback = ikRes.message;
          validationDetails = ikRes;
        }
        break;
      }

      default:
        isCorrect = false;
        feedback = 'Unknown question schema type.';
    }

    const hintsUsed = body.hintsUsed ?? 0;
    const score = isCorrect ? Math.max(50, 100 - hintsUsed * 15) : 0;

    // 2. Transactional updates
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const attempt: ProblemAttempt = {
      id: attemptId,
      userId,
      problemId: id,
      assignmentId: body.assignmentId,
      submittedAnswer: answer,
      isCorrect,
      score,
      hintsUsed,
      solveTimeMs,
      feedback,
      validationDetails,
      attemptNumber,
      createdAt: new Date().toISOString(),
    };

    this.db.createProblemAttempt(attempt);

    let xpAwarded = 0;
    let ratingDelta = 0;
    let newRating = 0;
    let unlockedBadges: any[] = [];

    if (isCorrect) {
      // Calculate XP with bonuses
      let xp = problem.xpReward;
      if (attemptNumber === 1) xp = Math.round(xp * 1.2); // +20% first attempt bonus
      if (hintsUsed === 0) xp = Math.round(xp * 1.25); // +25% zero hint bonus

      const xpResult = this.db.awardXP(
        userId,
        xp,
        `Solved Problem: ${problem.title}`,
        'problem',
        problem.id
      );
      if (xpResult.awarded) {
        xpAwarded = xp;
      }

      // Competitive rating update
      const ratingRes = this.db.updateRating(
        userId,
        problem.ratingValue,
        true,
        `Solved ${problem.title} (${problem.difficulty})`
      );
      ratingDelta = ratingRes.delta;
      newRating = ratingRes.newRating;

      // Meaningful learning streak
      this.db.recordLearningActivity(userId);

      // Server-side badge evaluation
      unlockedBadges = this.db.evaluateBadges(userId);
    } else {
      // Mild rating penalty on failure if not an assignment
      const ratingRes = this.db.updateRating(
        userId,
        problem.ratingValue,
        false,
        `Attempted ${problem.title}`
      );
      ratingDelta = ratingRes.delta;
      newRating = ratingRes.newRating;
    }

    const updatedProfile = this.db.getProfile(userId);

    return {
      status: 200,
      body: {
        attempt,
        isCorrect,
        score,
        feedback,
        validationDetails,
        xpAwarded,
        ratingDelta,
        newRating,
        unlockedBadges,
        updatedProfile,
        solution: isCorrect || attemptNumber >= (problem.allowedAttempts || 5) ? problem.solution : undefined,
      },
    };
  }
}
