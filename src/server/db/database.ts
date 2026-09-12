import fs from 'fs';
import path from 'path';
import type {
  User,
  Session,
  UserProfile,
  Problem,
  ProblemAttempt,
  SimulationChallenge,
  ChallengeAttempt,
  XPTransaction,
  RatingHistoryEntry,
  Badge,
  UserBadge,
  Classroom,
  ClassroomMember,
  Assignment,
  AssignmentSubmission,
  StreakInfo,
} from './types';
import {
  seedUsers,
  seedProfiles,
  seedBadges,
  seedProblems,
  seedChallenges,
  seedClassrooms,
  seedClassroomMembers,
  seedAssignments,
  hashPassword,
} from './seedData';
import { randomBytesHex } from '../cryptoUtils';

export interface DatabaseSchema {
  users: Record<string, User>;
  sessions: Record<string, Session>;
  profiles: Record<string, UserProfile>;
  problems: Record<string, Problem>;
  problemAttempts: Record<string, ProblemAttempt>;
  challenges: Record<string, SimulationChallenge>;
  challengeAttempts: Record<string, ChallengeAttempt>;
  xpTransactions: Record<string, XPTransaction>;
  ratingHistory: Record<string, RatingHistoryEntry>;
  badges: Record<string, Badge>;
  userBadges: Record<string, UserBadge>;
  classrooms: Record<string, Classroom>;
  classroomMembers: Record<string, ClassroomMember>;
  assignments: Record<string, Assignment>;
  assignmentSubmissions: Record<string, AssignmentSubmission>;
  aiUsage?: Record<string, any>;
}

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private dbPath: string;
  private data: DatabaseSchema;
  private isSaving = false;
  private hasPendingSave = false;

  private constructor() {
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined') {
      this.dbPath = 'kyntrix_browser_db';
    } else {
      try {
        const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '.';
        const dataDir = path?.resolve ? path.resolve(cwd, 'data') : 'data';
        if (fs?.existsSync && !fs.existsSync(dataDir)) {
          try {
            fs.mkdirSync(dataDir, { recursive: true });
          } catch {}
        }
        this.dbPath = path?.join ? path.join(dataDir, 'kyntrix_db.json') : 'data/kyntrix_db.json';
      } catch {
        this.dbPath = 'data/kyntrix_db.json';
      }
    }
    this.data = this.loadOrInitialize();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private loadOrInitialize(): DatabaseSchema {
    const isBrowser = typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined';
    const storage = isBrowser ? (globalThis as any).localStorage : null;
    if (storage) {
      try {
        const raw = storage.getItem('kyntrix_browser_db');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.users && parsed.problems && parsed.badges) {
            for (const p of seedProblems) {
              parsed.problems[p.id] = { ...p };
            }
            if (!parsed.challenges) parsed.challenges = {};
            for (const c of seedChallenges) {
              parsed.challenges[c.id] = { ...c };
            }
            return parsed;
          }
        }
      } catch {
        // fallback
      }
      const initial = this.createSeedSchema();
      try {
        storage.setItem('kyntrix_browser_db', JSON.stringify(initial));
      } catch {}
      return initial;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (fs?.existsSync && fs.existsSync(this.dbPath)) {
          const raw = fs.readFileSync(this.dbPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed.users && parsed.problems && parsed.badges) {
            for (const p of seedProblems) {
              parsed.problems[p.id] = { ...p };
            }
            if (!parsed.challenges) parsed.challenges = {};
            for (const c of seedChallenges) {
              parsed.challenges[c.id] = { ...c };
            }
            if (parsed.problemAttempts && Object.values(parsed.problemAttempts).every((a: any) => a.userId !== 'user_teacher_1')) {
              const freshSeed = this.createSeedSchema();
              for (const [k, v] of Object.entries(freshSeed.problemAttempts)) {
                if (!parsed.problemAttempts[k]) {
                  parsed.problemAttempts[k] = v;
                }
              }
            }
            return parsed;
          }
        }
        break;
      } catch (err) {
        if (attempt < 2) {
          const end = Date.now() + 15;
          while (Date.now() < end) {}
        } else if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
          console.warn('Could not read existing kyntrix_db.json, re-initializing with seed data:', err);
        }
      }
    }

    return this.createSeedSchema();
  }

  public createSeedSchema(): DatabaseSchema {
    const initial: DatabaseSchema = {
      users: {},
      sessions: {},
      profiles: { ...seedProfiles },
      problems: {},
      problemAttempts: {},
      challenges: {},
      challengeAttempts: {},
      xpTransactions: {},
      ratingHistory: {},
      badges: {},
      userBadges: {},
      classrooms: {},
      classroomMembers: {},
      assignments: {},
      assignmentSubmissions: {},
      aiUsage: {},
    };

    for (const u of seedUsers) initial.users[u.id] = { ...u };
    for (const b of seedBadges) initial.badges[b.id] = { ...b };
    for (const p of seedProblems) initial.problems[p.id] = { ...p };
    for (const c of seedChallenges) initial.challenges[c.id] = { ...c };
    for (const cr of seedClassrooms) initial.classrooms[cr.id] = { ...cr };
    for (const cm of seedClassroomMembers) initial.classroomMembers[cm.id] = { ...cm };
    for (const a of seedAssignments) initial.assignments[a.id] = { ...a };

    // Add initial badge for student demo
    const ubId = 'ub_student_dh_init';
    initial.userBadges[ubId] = {
      id: ubId,
      userId: 'user_student_1',
      badgeId: 'dh_apprentice',
      unlockedAt: '2025-08-20T10:00:00.000Z',
    };

    // Seed problem attempts for user_student_1 matching profile.stats (18 solved, 24 attempts, 5-day streak)
    const solvedProblemList = [
      'prob_dh_01', 'prob_dh_02', 'prob_dh_03', 'prob_dh_04', 'prob_dh_05', 'prob_dh_06', 'prob_dh_07',
      'prob_trans_01', 'prob_trans_02', 'prob_trans_03', 'prob_trans_04', 'prob_trans_05',
      'prob_fk_01', 'prob_fk_02', 'prob_fk_03', 'prob_fk_04', 'prob_fk_05',
      'prob_ik_01',
    ];

    const todayMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const dayOffsets = [0, 0, 1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 10, 10, 11, 11, 15, 15];

    solvedProblemList.forEach((pid, idx) => {
      const offsetDays = dayOffsets[idx] || 0;
      const attDate = new Date(todayMs - offsetDays * dayMs).toISOString();
      const attId = `att_seed_${idx + 1}`;
      initial.problemAttempts[attId] = {
        id: attId,
        userId: 'user_student_1',
        problemId: pid,
        submittedAnswer: 1,
        isCorrect: true,
        score: 100,
        hintsUsed: 0,
        solveTimeMs: 45000,
        feedback: 'Verified correct answer.',
        attemptNumber: 1,
        createdAt: attDate,
      };
    });

    const attemptedPids = ['prob_ik_02', 'prob_jac_01', 'prob_jac_02', 'prob_dh_01', 'prob_fk_01', 'prob_trans_02'];
    attemptedPids.forEach((pid, idx) => {
      const attId = `att_seed_inc_${idx + 1}`;
      initial.problemAttempts[attId] = {
        id: attId,
        userId: 'user_student_1',
        problemId: pid,
        submittedAnswer: 0,
        isCorrect: false,
        score: 0,
        hintsUsed: 1,
        solveTimeMs: 60000,
        feedback: 'Value mismatch.',
        attemptNumber: 1,
        createdAt: new Date(todayMs - (idx % 5) * dayMs).toISOString(),
      };
    });

    // Seed problem attempts for user_teacher_1 (48 solved, 50 attempts, 21-day streak)
    const teacherSolved = [
      'prob_dh_01', 'prob_dh_02', 'prob_dh_03', 'prob_dh_04', 'prob_dh_05', 'prob_dh_06', 'prob_dh_07', 'prob_dh_08', 'prob_dh_09', 'prob_dh_10',
      'prob_trans_01', 'prob_trans_02', 'prob_trans_03', 'prob_trans_04', 'prob_trans_05', 'prob_trans_06', 'prob_trans_07', 'prob_trans_08', 'prob_trans_09', 'prob_trans_10',
      'prob_fk_01', 'prob_fk_02', 'prob_fk_03', 'prob_fk_04', 'prob_fk_05', 'prob_fk_06', 'prob_fk_07', 'prob_fk_08', 'prob_fk_09', 'prob_fk_10',
      'prob_ik_01', 'prob_ik_02', 'prob_ik_03', 'prob_ik_04', 'prob_ik_05', 'prob_ik_06', 'prob_ik_07', 'prob_ik_08', 'prob_ik_09', 'prob_ik_10',
      'prob_jac_01', 'prob_jac_02', 'prob_jac_03', 'prob_jac_04',
      'prob_traj_01', 'prob_traj_02',
      'prob_work_01', 'prob_work_02',
    ];

    teacherSolved.forEach((pid, idx) => {
      // 0 to 20 days offset covers active 21-day streak; remainder cover prior study sessions
      const offsetDays = idx < 21 ? idx : 20 + (idx % 10);
      const attDate = new Date(todayMs - offsetDays * dayMs).toISOString();
      const attId = `att_teacher_${idx + 1}`;
      initial.problemAttempts[attId] = {
        id: attId,
        userId: 'user_teacher_1',
        problemId: pid,
        submittedAnswer: 1,
        isCorrect: true,
        score: 100,
        hintsUsed: 0,
        solveTimeMs: 30000,
        feedback: 'Verified correct answer.',
        attemptNumber: 1,
        createdAt: attDate,
      };
    });

    ['prob_jac_05', 'prob_work_03'].forEach((pid, idx) => {
      const attId = `att_teacher_inc_${idx + 1}`;
      initial.problemAttempts[attId] = {
        id: attId,
        userId: 'user_teacher_1',
        problemId: pid,
        submittedAnswer: 0,
        isCorrect: false,
        score: 0,
        hintsUsed: 0,
        solveTimeMs: 40000,
        feedback: 'Value mismatch.',
        attemptNumber: 1,
        createdAt: new Date(todayMs - (idx + 1) * dayMs).toISOString(),
      };
    });

    // Seed problem attempts for user_admin_1 (80 solved across 60 days)
    const adminSolved = teacherSolved.concat([
      'prob_dh_11', 'prob_dh_12', 'prob_dh_13', 'prob_dh_14', 'prob_dh_15', 'prob_dh_16',
      'prob_trans_11', 'prob_trans_12', 'prob_trans_13', 'prob_trans_14', 'prob_trans_15', 'prob_trans_16',
      'prob_fk_11', 'prob_fk_12', 'prob_fk_13', 'prob_fk_14', 'prob_fk_15', 'prob_fk_16',
      'prob_ik_11', 'prob_ik_12', 'prob_ik_13', 'prob_ik_14', 'prob_ik_15',
      'prob_jac_05', 'prob_jac_06', 'prob_jac_07', 'prob_jac_08',
      'prob_traj_03', 'prob_traj_04', 'prob_traj_05',
      'prob_work_03', 'prob_work_04',
    ]);

    adminSolved.forEach((pid, idx) => {
      const offsetDays = Math.min(99, idx);
      const attDate = new Date(todayMs - offsetDays * dayMs).toISOString();
      const attId = `att_admin_${idx + 1}`;
      initial.problemAttempts[attId] = {
        id: attId,
        userId: 'user_admin_1',
        problemId: pid,
        submittedAnswer: 1,
        isCorrect: true,
        score: 100,
        hintsUsed: 0,
        solveTimeMs: 25000,
        feedback: 'Verified correct answer.',
        attemptNumber: 1,
        createdAt: attDate,
      };
    });

    return initial;
  }

  public resetToSeed(): void {
    this.data = this.createSeedSchema();
    this.save();
  }

  public save(): void {
    const isBrowser = typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined';
    const storage = isBrowser ? (globalThis as any).localStorage : null;
    if (storage) {
      try {
        storage.setItem('kyntrix_browser_db', JSON.stringify(this.data));
      } catch (err) {
        console.warn('Failed to save to localStorage:', err);
      }
      return;
    }

    if (this.isSaving) {
      this.hasPendingSave = true;
      return;
    }
    this.isSaving = true;
    try {
      const dataDir = path?.dirname ? path.dirname(this.dbPath) : 'data';
      if (fs?.existsSync && !fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch {}
      }
      const serialized = JSON.stringify(this.data, null, 2);
      const pid = typeof process !== 'undefined' && process.pid ? process.pid : '1';
      const tmpPath = `${this.dbPath}.tmp.${pid}.${Date.now()}.${randomBytesHex(6)}`;
      try {
        if (fs?.writeFileSync) fs.writeFileSync(tmpPath, serialized, 'utf8');
      } catch {
        // Fallback directly to dbPath
      }

      let attempts = 0;
      while (attempts < 5) {
        try {
          if (fs?.existsSync && fs.existsSync(tmpPath)) {
            fs.renameSync(tmpPath, this.dbPath);
            break;
          } else if (fs?.writeFileSync) {
            fs.writeFileSync(this.dbPath, serialized, 'utf8');
            break;
          } else {
            break;
          }
        } catch {
          attempts++;
          if (attempts >= 5) {
            try {
              if (fs?.writeFileSync) fs.writeFileSync(this.dbPath, serialized, 'utf8');
            } catch (writeErr) {
              if (process.env?.NODE_ENV !== 'test' && !process.env?.VITEST) {
                console.warn('Failed to save kyntrix_db.json after retries:', writeErr);
              }
            }
          } else {
            const end = Date.now() + 20;
            while (Date.now() < end) {}
          }
        }
      }
      try {
        if (fs?.existsSync && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {}
    } catch (err) {
      if (process.env?.NODE_ENV !== 'test' && !process.env?.VITEST) {
        console.warn('Failed to save kyntrix_db.json:', err);
      }
    } finally {
      this.isSaving = false;
      if (this.hasPendingSave) {
        this.hasPendingSave = false;
        this.save();
      }
    }
  }

  // --- Users & Auth ---
  public getUserById(id: string): User | undefined {
    return this.data.users[id];
  }

  public getUserByEmail(email: string): User | undefined {
    return Object.values(this.data.users).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
  }

  public getUserByUsername(username: string): User | undefined {
    return Object.values(this.data.users).find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
  }

  public login(
    email: string,
    password: string
  ): { user: User; token: string; profile: UserProfile } | null {
    const user = this.getUserByEmail(email);
    if (!user) return null;
    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) return null;
    const token = `tok_${randomBytesHex(32)}`;
    this.createSession(user.id, token);
    const profile = this.getProfile(user.id);
    return { user, token, profile };
  }

  public createUser(
    userOrData: User | (Partial<User> & { password?: string; email: string; name: string })
  ): User {
    let user: User;
    if ('passwordHash' in userOrData && 'salt' in userOrData && 'id' in userOrData) {
      user = userOrData as User;
    } else {
      const salt = `salt_${randomBytesHex(16)}`;
      const pass = (userOrData as any).password || 'KyntriX2025!';
      const hash = hashPassword(pass, salt);
      const id = (userOrData as any).id || `user_${randomBytesHex(12)}`;
      const username = (userOrData as any).username || (userOrData as any).email.split('@')[0];
      user = {
        id,
        email: (userOrData as any).email,
        name: (userOrData as any).name,
        username,
        role: (userOrData as any).role || 'student',
        institution: (userOrData as any).institution,
        passwordHash: hash,
        salt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    this.data.users[user.id] = user;
    this.data.profiles[user.id] = {
      userId: user.id,
      xp: 0,
      rating: 1200,
      rank: Object.keys(this.data.users).length,
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      },
      stats: {
        problemsSolved: 0,
        totalAttempts: 0,
        correctFirstAttempt: 0,
        totalTimeSpentMs: 0,
        challengesCompleted: 0,
        categoryStats: {},
      },
    };
    this.save();
    return user;
  }

  public createSession(userId: string, token: string, expiresInDays = 7): Session {
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    const session: Session = {
      id: token,
      userId,
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    this.data.sessions[token] = session;
    this.save();
    return session;
  }

  public getSession(token: string): Session | undefined {
    const s = this.data.sessions[token];
    if (!s) return undefined;
    if (new Date(s.expiresAt) < new Date()) {
      delete this.data.sessions[token];
      this.save();
      return undefined;
    }
    return s;
  }

  public deleteSession(token: string): void {
    if (this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.save();
    }
  }

  // --- Profile & Gamification ---
  public getProfile(userId: string): UserProfile {
    let p = this.data.profiles[userId];
    if (!p) {
      p = {
        userId,
        xp: 0,
        rating: 1200,
        rank: 999,
        streak: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
        stats: {
          problemsSolved: 0,
          totalAttempts: 0,
          correctFirstAttempt: 0,
          totalTimeSpentMs: 0,
          challengesCompleted: 0,
          categoryStats: {},
        },
      };
      this.data.profiles[userId] = p;
      this.save();
    }
    return p;
  }

  public getUserProfile(userId: string): UserProfile | undefined {
    return this.getProfile(userId);
  }

  public updateProfile(userId: string, updates: Partial<UserProfile>): UserProfile {
    const p = this.getProfile(userId);
    Object.assign(p, updates);
    this.save();
    return p;
  }

  /**
   * Idempotent XP transaction award
   */
  public awardXP(
    userId: string,
    amount: number,
    reason: string,
    referenceId: string
  ): boolean;
  public awardXP(
    userId: string,
    amount: number,
    reason: string,
    referenceType: 'problem' | 'challenge' | 'assignment' | 'badge' | 'bonus',
    referenceId: string
  ): { awarded: boolean; transaction?: XPTransaction; newTotalXP: number };
  public awardXP(
    userId: string,
    amount: number,
    reason: string,
    refTypeOrRefId: string,
    refId?: string
  ): boolean | { awarded: boolean; transaction?: XPTransaction; newTotalXP: number } {
    const isFourArgs = refId === undefined;
    const referenceType: 'problem' | 'challenge' | 'assignment' | 'badge' | 'bonus' = isFourArgs
      ? 'problem'
      : (refTypeOrRefId as any);
    const referenceId: string = isFourArgs ? refTypeOrRefId : refId!;

    const p = this.getProfile(userId);

    // Duplicate transaction check
    const exists = Object.values(this.data.xpTransactions).some(
      (tx) =>
        tx.userId === userId &&
        (tx.referenceId === referenceId || (tx.reason === reason && tx.referenceId === referenceId))
    );

    if (exists) {
      return isFourArgs ? false : { awarded: false, newTotalXP: p.xp };
    }

    const txId = `tx_${Date.now()}_${randomBytesHex(6)}`;
    const tx: XPTransaction = {
      id: txId,
      userId,
      amount,
      reason,
      referenceType,
      referenceId,
      createdAt: new Date().toISOString(),
    };

    this.data.xpTransactions[txId] = tx;
    p.xp += amount;
    this.save();

    return isFourArgs ? true : { awarded: true, transaction: tx, newTotalXP: p.xp };
  }

  public getXPTransactions(userId: string): XPTransaction[] {
    return Object.values(this.data.xpTransactions)
      .filter((tx) => tx.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getRatingHistory(userId: string): RatingHistoryEntry[] {
    return Object.values(this.data.ratingHistory)
      .filter((rh) => rh.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public updateUserRating(
    userId: string,
    opponentRating: number,
    score: number | boolean,
    kFactor = 32
  ): number {
    const p = this.getProfile(userId);
    const oldRating = p.rating;
    const expected = 1 / (1 + Math.pow(10, (opponentRating - oldRating) / 400));
    const actual = typeof score === 'boolean' ? (score ? 1.0 : 0.0) : score;
    const K = kFactor || (p.stats.totalAttempts < 30 ? 32 : 16);
    let delta = Math.round(K * (actual - expected));

    if (actual > 0.5 && delta < 5) delta = 5;
    if (actual < 0.5 && delta < -25) delta = -25;

    const newRating = Math.max(100, oldRating + delta);
    p.rating = newRating;

    const rhId = `rh_${Date.now()}_${randomBytesHex(6)}`;
    this.data.ratingHistory[rhId] = {
      id: rhId,
      userId,
      rating: newRating,
      delta,
      reason: `Rating adjustment (target ${opponentRating})`,
      createdAt: new Date().toISOString(),
    };

    this.save();
    return newRating;
  }

  /**
   * Elo-inspired rating calculation and history entry
   */
  public updateRating(
    userId: string,
    opponentRating: number,
    isCorrect: boolean,
    reason: string
  ): { oldRating: number; newRating: number; delta: number } {
    const p = this.getProfile(userId);
    const oldRating = p.rating;

    // Expected outcome formula
    const expected = 1 / (1 + Math.pow(10, (opponentRating - oldRating) / 400));
    const actual = isCorrect ? 1.0 : 0.0;
    const K = p.stats.totalAttempts < 30 ? 32 : 16;
    let delta = Math.round(K * (actual - expected));

    // Never lose more than 20 points or gain less than 5 on success
    if (isCorrect && delta < 5) delta = 5;
    if (!isCorrect && delta < -25) delta = -25;

    const newRating = Math.max(100, oldRating + delta);
    p.rating = newRating;

    const rhId = `rh_${Date.now()}_${randomBytesHex(6)}`;
    this.data.ratingHistory[rhId] = {
      id: rhId,
      userId,
      rating: newRating,
      delta,
      reason,
      createdAt: new Date().toISOString(),
    };

    this.save();
    return { oldRating, newRating, delta };
  }

  /**
   * Update meaningful learning streak
   */
  public recordLearningActivity(userId: string, timezoneOffsetMinutes = 0): StreakInfo {
    const p = this.getProfile(userId);
    // User local date 'YYYY-MM-DD'
    const now = new Date(Date.now() - timezoneOffsetMinutes * 60 * 1000);
    const todayStr = now.toISOString().slice(0, 10);

    const last = p.streak.lastActivityDate;
    if (!last) {
      p.streak.currentStreak = 1;
      p.streak.longestStreak = Math.max(1, p.streak.longestStreak);
      p.streak.lastActivityDate = todayStr;
    } else if (last === todayStr) {
      // already recorded today
    } else {
      const lastDate = new Date(last);
      const currentDate = new Date(todayStr);
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        p.streak.currentStreak += 1;
        p.streak.longestStreak = Math.max(p.streak.currentStreak, p.streak.longestStreak);
      } else if (diffDays > 1) {
        p.streak.currentStreak = 1;
      }
      p.streak.lastActivityDate = todayStr;
    }

    this.save();
    return p.streak;
  }

  /**
   * Server-side badge condition evaluation
   */
  public evaluateBadges(userId: string): Badge[] {
    const p = this.getProfile(userId);
    const unlockedNow: Badge[] = [];
    const userBadgeIds = new Set(
      Object.values(this.data.userBadges)
        .filter((ub) => ub.userId === userId)
        .map((ub) => ub.badgeId)
    );

    const checkAndAward = (badgeId: string, conditionMet: boolean) => {
      if (conditionMet && !userBadgeIds.has(badgeId)) {
        const badge = this.data.badges[badgeId];
        if (badge) {
          const ubId = `ub_${userId}_${badgeId}`;
          this.data.userBadges[ubId] = {
            id: ubId,
            userId,
            badgeId,
            unlockedAt: new Date().toISOString(),
          };
          this.awardXP(userId, badge.xpReward, `Badge Unlocked: ${badge.name}`, 'badge', badgeId);
          unlockedNow.push(badge);
          userBadgeIds.add(badgeId);
        }
      }
    };

    const dhSolved = p.stats.categoryStats['dh']?.solved || 0;
    const transSolved = p.stats.categoryStats['transforms']?.solved || 0;
    const fkSolved = p.stats.categoryStats['fk']?.solved || 0;
    const ikSolved = p.stats.categoryStats['ik']?.solved || 0;
    const jacSolved = p.stats.categoryStats['jacobians']?.solved || 0;

    checkAndAward('dh_apprentice', dhSolved >= 5);
    checkAndAward('dh_master', dhSolved >= 25);
    checkAndAward('matrix_master', transSolved >= 15);
    checkAndAward('fk_specialist', fkSolved >= 10);
    checkAndAward('ik_specialist', ikSolved >= 10);
    checkAndAward('jacobian_explorer', jacSolved >= 5);
    checkAndAward('zero_hint', p.stats.correctFirstAttempt >= 10);
    checkAndAward('six_dof', p.stats.challengesCompleted >= 5);
    checkAndAward('kyntrix_master', p.xp >= 2000);
    checkAndAward('streak_master', (p.streak.currentStreak || 0) >= 7 || (p.streak.longestStreak || 0) >= 7);

    if (unlockedNow.length > 0) {
      this.save();
    }

    return unlockedNow;
  }

  public updateStreak(userId: string, timezoneOffsetMinutes = 0): StreakInfo {
    return this.recordLearningActivity(userId, timezoneOffsetMinutes);
  }

  public checkAndAwardBadges(userId: string): Badge[] {
    return this.evaluateBadges(userId);
  }

  public getHint(
    _userId: string,
    problemId: string,
    level: number
  ): { level: number; text: string; xpPenalty: number } | undefined {
    const prob = this.getProblemById(problemId);
    if (!prob || !prob.hints || prob.hints.length === 0) return undefined;
    const idx = Math.max(0, Math.min(level - 1, prob.hints.length - 1));
    const text = prob.hints[idx];
    const xpPenalty = Math.max(5, Math.round(prob.xpReward * 0.15 * level));
    return {
      level,
      text,
      xpPenalty,
    };
  }

  // --- Problems ---
  public getProblems(filter?: { category?: string; difficulty?: string; search?: string }): Problem[] {
    let list = Object.values(this.data.problems);
    if (filter?.category) {
      list = list.filter((p) => p.category === filter.category);
    }
    if (filter?.difficulty) {
      list = list.filter((p) => p.difficulty === filter.difficulty);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }

  public getProblemById(id: string): Problem | undefined {
    return this.data.problems[id];
  }

  public createProblemAttempt(attempt: ProblemAttempt): void {
    this.data.problemAttempts[attempt.id] = attempt;

    // Update user stats
    const p = this.getProfile(attempt.userId);
    p.stats.totalAttempts += 1;
    p.stats.totalTimeSpentMs += attempt.solveTimeMs;

    const problem = this.getProblemById(attempt.problemId);
    const cat = problem?.category || 'general';
    if (!p.stats.categoryStats[cat]) {
      p.stats.categoryStats[cat] = { attempted: 0, solved: 0, hintsTotal: 0 };
    }
    p.stats.categoryStats[cat].attempted += 1;
    p.stats.categoryStats[cat].hintsTotal += attempt.hintsUsed;

    if (attempt.isCorrect) {
      p.stats.problemsSolved += 1;
      p.stats.categoryStats[cat].solved += 1;
      if (attempt.attemptNumber === 1) {
        p.stats.correctFirstAttempt += 1;
      }
    }

    this.save();
  }

  public getAttemptsForUser(userId: string, problemId?: string): ProblemAttempt[] {
    let list = Object.values(this.data.problemAttempts).filter((a) => a.userId === userId);
    if (problemId) {
      list = list.filter((a) => a.problemId === problemId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- Challenges ---
  public getChallenges(): SimulationChallenge[] {
    return Object.values(this.data.challenges);
  }

  public getChallengeById(id: string): SimulationChallenge | undefined {
    return this.data.challenges[id];
  }

  public createChallengeAttempt(attempt: ChallengeAttempt): void {
    this.data.challengeAttempts[attempt.id] = attempt;
    if (attempt.passed) {
      const p = this.getProfile(attempt.userId);
      p.stats.challengesCompleted += 1;
    }
    this.save();
  }

  // --- Leaderboards ---
  public getLeaderboard(
    scope: 'global' | 'institution' | 'weekly' | 'all_time' = 'global',
    metric: 'xp' | 'rating' | 'problems_solved' = 'xp',
    institution?: string
  ): Array<{ rank: number; userId: string; name: string; username: string; institution?: string; xp: number; rating: number; problemsSolved: number }> {
    let users = Object.values(this.data.users);
    if (scope === 'institution' && institution) {
      users = users.filter((u) => u.institution?.toLowerCase() === institution.toLowerCase());
    }

    const rows = users.map((u) => {
      const prof = this.getProfile(u.id);
      return {
        userId: u.id,
        name: u.name,
        username: u.username,
        institution: u.institution,
        xp: prof.xp,
        rating: prof.rating,
        problemsSolved: prof.stats.problemsSolved,
      };
    });

    if (metric === 'rating') {
      rows.sort((a, b) => b.rating - a.rating);
    } else if (metric === 'problems_solved') {
      rows.sort((a, b) => b.problemsSolved - a.problemsSolved);
    } else {
      rows.sort((a, b) => b.xp - a.xp);
    }

    return rows.map((r, i) => ({ rank: i + 1, ...r }));
  }

  // --- Classrooms & Assignments ---
  public getAllClassrooms(): Classroom[] {
    return Object.values(this.data.classrooms);
  }

  public getClassrooms(): Classroom[] {
    return Object.values(this.data.classrooms);
  }

  public getClassroomsForUser(userId: string): Classroom[] {
    const memberRooms = Object.values(this.data.classroomMembers)
      .filter((m) => m.userId === userId)
      .map((m) => m.classroomId);

    return Object.values(this.data.classrooms).filter(
      (c) => c.teacherId === userId || memberRooms.includes(c.id)
    );
  }

  public getClassroomByJoinCode(code: string): Classroom | undefined {
    return Object.values(this.data.classrooms).find(
      (c) => c.joinCode.toUpperCase() === code.trim().toUpperCase()
    );
  }

  public getClassroomById(id: string): Classroom | undefined {
    return this.data.classrooms[id];
  }

  public createClassroom(
    classroomOrData: Classroom | (Partial<Classroom> & { name: string; teacherId: string })
  ): Classroom {
    let classroom: Classroom;
    if ('id' in classroomOrData && 'joinCode' in classroomOrData && classroomOrData.joinCode) {
      classroom = classroomOrData as Classroom;
    } else {
      const randChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const randBytes = new Uint8Array(6);
      crypto.getRandomValues(randBytes);
      let joinCode = '';
      for (let i = 0; i < 6; i++) {
        joinCode += randChars.charAt(randBytes[i] % randChars.length);
      }
      classroom = {
        id: (classroomOrData as any).id || `cr_${Date.now()}_${randomBytesHex(6)}`,
        name: classroomOrData.name,
        description: classroomOrData.description || '',
        teacherId: classroomOrData.teacherId,
        institution: classroomOrData.institution || '',
        joinCode: classroomOrData.joinCode || joinCode,
        createdAt: classroomOrData.createdAt || new Date().toISOString(),
      };
    }
    this.data.classrooms[classroom.id] = classroom;
    const memberId = `mem_${classroom.id}_${classroom.teacherId}`;
    this.data.classroomMembers[memberId] = {
      id: memberId,
      classroomId: classroom.id,
      userId: classroom.teacherId,
      role: 'teacher',
      joinedAt: new Date().toISOString(),
    };
    this.save();
    return classroom;
  }

  public joinClassroom(
    classroomIdOrStudentId: string,
    userIdOrJoinCode: string
  ): ClassroomMember & { success: boolean; message?: string } {
    let classroomId = classroomIdOrStudentId;
    let userId = userIdOrJoinCode;

    // Check if second argument is a join code (or classroom by join code exists)
    const classroomByCode = this.getClassroomByJoinCode(userIdOrJoinCode);
    if (classroomByCode) {
      classroomId = classroomByCode.id;
      userId = classroomIdOrStudentId;
    } else {
      const classroomById = this.getClassroomById(classroomIdOrStudentId);
      if (classroomById) {
        classroomId = classroomIdOrStudentId;
        userId = userIdOrJoinCode;
      }
    }

    const existing = Object.values(this.data.classroomMembers).find(
      (m) => m.classroomId === classroomId && m.userId === userId
    );
    if (existing) return { ...existing, success: true };

    const memId = `mem_${classroomId}_${userId}`;
    const mem: ClassroomMember = {
      id: memId,
      classroomId,
      userId,
      role: 'student',
      joinedAt: new Date().toISOString(),
    };
    this.data.classroomMembers[memId] = mem;
    this.save();
    return { ...mem, success: true };
  }

  public getClassroomMembers(classroomId: string): Array<ClassroomMember & { user?: User; profile?: UserProfile }> {
    const members = Object.values(this.data.classroomMembers).filter(
      (m) => m.classroomId === classroomId
    );
    return members.map((m) => ({
      ...m,
      user: this.getUserById(m.userId),
      profile: this.getProfile(m.userId),
    }));
  }

  public getAssignmentsForClassroom(classroomId: string): Assignment[] {
    return Object.values(this.data.assignments).filter((a) => a.classroomId === classroomId);
  }

  public getAssignmentById(id: string): Assignment | undefined {
    return this.data.assignments[id];
  }

  public createAssignment(
    classroomIdOrAssignment: string | Assignment,
    _teacherId?: string,
    data?: Partial<Assignment>
  ): Assignment {
    let assignment: Assignment;
    if (typeof classroomIdOrAssignment === 'object') {
      assignment = classroomIdOrAssignment;
    } else {
      const classroomId = classroomIdOrAssignment;
      const assignId = data?.id || `assign_${Date.now()}_${randomBytesHex(6)}`;
      assignment = {
        id: assignId,
        classroomId,
        title: data?.title || 'Assignment',
        description: data?.description || '',
        problemIds: data?.problemIds || [],
        startDate: data?.startDate || new Date().toISOString(),
        dueDate: data?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
        attemptLimit: data?.attemptLimit ?? 0,
        timeLimitMinutes: data?.timeLimitMinutes ?? 0,
        allowHints: data?.allowHints ?? true,
        allowAI: data?.allowAI ?? true,
        isExamMode: data?.isExamMode ?? false,
        xpReward: data?.xpReward ?? 100,
        createdAt: data?.createdAt || new Date().toISOString(),
      };
    }
    this.data.assignments[assignment.id] = assignment;
    this.save();
    return assignment;
  }

  public getSubmissionsForAssignment(assignmentId: string): AssignmentSubmission[] {
    return Object.values(this.data.assignmentSubmissions).filter(
      (s) => s.assignmentId === assignmentId
    );
  }

  public getSubmission(assignmentId: string, studentId: string): AssignmentSubmission | undefined {
    return Object.values(this.data.assignmentSubmissions).find(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId
    );
  }

  public saveSubmission(submission: AssignmentSubmission): AssignmentSubmission {
    this.data.assignmentSubmissions[submission.id] = submission;
    this.save();
    return submission;
  }

  // --- Badges ---
  public getAllBadges(): Badge[] {
    return Object.values(this.data.badges);
  }

  public getUserBadges(userId: string): UserBadge[] {
    return Object.values(this.data.userBadges).filter((ub) => ub.userId === userId);
  }
}

export const Database = DatabaseService.getInstance();
