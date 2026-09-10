export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: UserRole;
  institution?: string;
  avatarUrl?: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string; // auth token
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserStats {
  problemsSolved: number;
  totalAttempts: number;
  correctFirstAttempt: number;
  totalTimeSpentMs: number;
  challengesCompleted: number;
  categoryStats: Record<string, { attempted: number; solved: number; hintsTotal: number }>;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null; // 'YYYY-MM-DD'
}

export interface UserProfile {
  userId: string;
  xp: number;
  rating: number;
  rank: number;
  streak: StreakInfo;
  stats: UserStats;
}

export type ProblemCategory =
  | 'dh'
  | 'transforms'
  | 'fk'
  | 'ik'
  | 'jacobians'
  | 'dynamics'
  | 'control'
  | 'mobile'
  | 'trajectory'
  | 'workspace';

export type ProblemDifficulty =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'research';

export type AnswerType =
  | 'scalar'
  | 'angle'
  | 'vector'
  | 'matrix'
  | 'dh_table'
  | 'joint_config'
  | 'pose'
  | 'trajectory';

export interface DHParameterRow {
  joint: number;
  type: 'R' | 'P';
  theta: number; // deg or rad
  d: number;     // m or mm
  a: number;     // m or mm
  alpha: number; // deg or rad
}

export interface ProblemAnswerSchema {
  type: AnswerType;
  unit?: string;
  expectedScalar?: number;
  expectedAngleRad?: number;
  expectedVector?: number[];
  expectedMatrix?: number[][]; // 4x4 or 3x3
  expectedDHTable?: DHParameterRow[];
  expectedPose?: {
    position: [number, number, number];
    orientationEuler?: [number, number, number]; // [rx, ry, rz] rad
  };
  expectedJoints?: number[];
  tolerance?: number; // relative or absolute
  angleToleranceRad?: number;
  matrixTolerance?: number;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  category: ProblemCategory;
  subcategory: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  xpReward: number;
  ratingValue: number;
  timeLimitSeconds?: number;
  allowedAttempts?: number;
  hints: string[]; // progressive hints: [Hint 1, Hint 2, Hint 3]
  questionData: {
    prompt: string;
    diagramUrl?: string;
    givenValues?: Record<string, any>;
    robotModel?: string;
    dof?: number;
    convention?: 'standard' | 'modified';
  };
  answerSchema: ProblemAnswerSchema;
  solution: {
    derivationSteps: string[];
    finalAnswerDescription: string;
  };
  explanation: string;
  robotConfiguration?: {
    robotId?: string;
    dof?: number;
    dhTable?: DHParameterRow[];
    targetPose?: number[]; // 16 elements
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProblemAttempt {
  id: string;
  userId: string;
  problemId: string;
  assignmentId?: string;
  submittedAnswer: any;
  isCorrect: boolean;
  score: number; // 0 to 100
  hintsUsed: number;
  solveTimeMs: number;
  feedback: string;
  validationDetails?: Record<string, any>;
  attemptNumber: number;
  createdAt: string;
}

export interface SimulationChallenge {
  id: string;
  title: string;
  description: string;
  robotId: string;
  difficulty: ProblemDifficulty;
  targetPose: {
    position: [number, number, number]; // [x, y, z] in meters
    orientationEuler: [number, number, number]; // [rx, ry, rz] in radians
  };
  initialJoints?: number[];
  constraints: {
    maxPositionErrorMm: number;
    maxOrientationErrorDeg: number;
    requireJointLimits: boolean;
    maxCompletionTimeSeconds?: number;
  };
  waypoints?: Array<{
    position: [number, number, number];
    orientationEuler?: [number, number, number];
  }>;
  xpReward: number;
  ratingValue: number;
  tags: string[];
  createdAt: string;
}

export interface ChallengeAttempt {
  id: string;
  userId: string;
  challengeId: string;
  finalJoints: number[];
  positionErrorMm: number;
  orientationErrorDeg: number;
  jointLimitsPassed: boolean;
  trajectoryValid: boolean;
  completionTimeSeconds: number;
  score: number; // 0 to 1000
  xpAwarded: number;
  passed: boolean;
  createdAt: string;
}

export interface XPTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  referenceType: 'problem' | 'challenge' | 'assignment' | 'badge' | 'bonus';
  referenceId: string;
  createdAt: string;
}

export interface RatingHistoryEntry {
  id: string;
  userId: string;
  rating: number;
  delta: number;
  reason: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  criteriaDescription: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  unlockedAt: string;
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  institution: string;
  teacherId: string;
  joinCode: string; // e.g. "KX-ROB-73A9"
  createdAt: string;
}

export interface ClassroomMember {
  id: string;
  classroomId: string;
  userId: string;
  role: 'teacher' | 'student';
  joinedAt: string;
}

export interface Assignment {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  problemIds: string[];
  startDate: string;
  dueDate: string;
  attemptLimit: number; // 0 = unlimited
  timeLimitMinutes: number; // 0 = unlimited
  allowHints: boolean;
  allowAI: boolean;
  isExamMode: boolean;
  xpReward: number;
  createdAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  problemAttempts: Record<string, { isCorrect: boolean; score: number; hintsUsed: number; answer: any }>;
  totalScore: number;
  maxScore: number;
  accuracy: number;
  timeSpentSeconds: number;
  hintsUsedTotal: number;
  status: 'in_progress' | 'submitted' | 'graded';
  completedAt?: string;
  createdAt: string;
}
