import type {
  User,
  UserProfile,
  Badge,
  Problem,
  SimulationChallenge,
  Classroom,
  ClassroomMember,
  Assignment,
} from './types';
import { hashPassword } from '../cryptoUtils';
export { hashPassword };
import { allArenaProblems } from './problems';
import { simulationChallenges } from './challenges/seedChallenges';

const STUDENT_SALT = 'salt_student_f93a7c1b52e0486d';
const TEACHER_SALT = 'salt_teacher_3d8b1e4c92a7f055';
const ADMIN_SALT = 'salt_admin_a62f50d189c4e73b';

export const seedUsers: User[] = [
  {
    id: 'user_student_1',
    email: 'student@kyntrix.edu',
    name: 'Dinesh Kumar',
    username: 'dinesh_k',
    role: 'student',
    institution: 'Indian Institute of Technology Madras',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    passwordHash: hashPassword('KyntriX2025!', STUDENT_SALT),
    salt: STUDENT_SALT,
    createdAt: '2025-08-15T08:00:00.000Z',
    updatedAt: '2025-08-15T08:00:00.000Z',
  },
  {
    id: 'user_teacher_1',
    email: 'teacher@kyntrix.edu',
    name: 'Dr. Sarah Chen',
    username: 'prof_chen',
    role: 'teacher',
    institution: 'Stanford Robotics Center',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    passwordHash: hashPassword('KyntriX2025!', TEACHER_SALT),
    salt: TEACHER_SALT,
    createdAt: '2025-08-01T08:00:00.000Z',
    updatedAt: '2025-08-01T08:00:00.000Z',
  },
  {
    id: 'user_admin_1',
    email: 'admin@kyntrix.edu',
    name: 'KyntriX Administrator',
    username: 'admin',
    role: 'admin',
    institution: 'KyntriX Core Engineering',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    passwordHash: hashPassword('AdminPass2025!', ADMIN_SALT),
    salt: ADMIN_SALT,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

export const seedProfiles: Record<string, UserProfile> = {
  user_student_1: {
    userId: 'user_student_1',
    xp: 1420,
    rating: 1540,
    rank: 4,
    streak: {
      currentStreak: 5,
      longestStreak: 12,
      lastActivityDate: new Date().toISOString().slice(0, 10),
    },
    stats: {
      problemsSolved: 18,
      totalAttempts: 24,
      correctFirstAttempt: 14,
      totalTimeSpentMs: 4280000,
      challengesCompleted: 3,
      categoryStats: {
        dh: { attempted: 8, solved: 7, hintsTotal: 3 },
        transforms: { attempted: 5, solved: 5, hintsTotal: 1 },
        fk: { attempted: 6, solved: 5, hintsTotal: 2 },
        ik: { attempted: 3, solved: 1, hintsTotal: 4 },
        jacobians: { attempted: 2, solved: 0, hintsTotal: 3 },
        trajectory: { attempted: 0, solved: 0, hintsTotal: 0 },
        workspace: { attempted: 0, solved: 0, hintsTotal: 0 },
      },
    },
  },
  user_teacher_1: {
    userId: 'user_teacher_1',
    xp: 5800,
    rating: 2280,
    rank: 1,
    streak: {
      currentStreak: 21,
      longestStreak: 45,
      lastActivityDate: new Date().toISOString().slice(0, 10),
    },
    stats: {
      problemsSolved: 48,
      totalAttempts: 50,
      correctFirstAttempt: 46,
      totalTimeSpentMs: 12400000,
      challengesCompleted: 10,
      categoryStats: {
        dh: { attempted: 10, solved: 10, hintsTotal: 0 },
        transforms: { attempted: 10, solved: 10, hintsTotal: 0 },
        fk: { attempted: 10, solved: 10, hintsTotal: 0 },
        ik: { attempted: 10, solved: 10, hintsTotal: 0 },
        jacobians: { attempted: 4, solved: 4, hintsTotal: 0 },
        trajectory: { attempted: 2, solved: 2, hintsTotal: 0 },
        workspace: { attempted: 2, solved: 2, hintsTotal: 0 },
      },
    },
  },
  user_admin_1: {
    userId: 'user_admin_1',
    xp: 9999,
    rating: 2500,
    rank: 0,
    streak: {
      currentStreak: 100,
      longestStreak: 100,
      lastActivityDate: new Date().toISOString().slice(0, 10),
    },
    stats: {
      problemsSolved: 80,
      totalAttempts: 80,
      correctFirstAttempt: 80,
      totalTimeSpentMs: 25000000,
      challengesCompleted: 20,
      categoryStats: {},
    },
  },
};

export const seedBadges: Badge[] = [
  {
    id: 'dh_apprentice',
    name: 'DH Apprentice',
    description: 'Successfully complete 5 Denavit-Hartenberg parameter assignments.',
    icon: 'Table',
    category: 'Kinematics',
    rarity: 'common',
    xpReward: 50,
    criteriaDescription: 'Solve 5 DH problems',
  },
  {
    id: 'dh_master',
    name: 'DH Master',
    description: 'Master 25 complex DH parameter derivations across multi-axis manipulators.',
    icon: 'Award',
    category: 'Kinematics',
    rarity: 'rare',
    xpReward: 200,
    criteriaDescription: 'Solve 25 DH problems',
  },
  {
    id: 'matrix_master',
    name: 'Matrix Master',
    description: 'Accurately derive 15 homogeneous transformation matrices and compound frames.',
    icon: 'Layers',
    category: 'Transformations',
    rarity: 'rare',
    xpReward: 150,
    criteriaDescription: 'Solve 15 transformation matrix problems',
  },
  {
    id: 'fk_specialist',
    name: 'FK Specialist',
    description: 'Demonstrate superior accuracy (>85%) on forward kinematics computations.',
    icon: 'Sliders',
    category: 'Kinematics',
    rarity: 'rare',
    xpReward: 120,
    criteriaDescription: 'Solve 10 FK problems with >= 85% accuracy',
  },
  {
    id: 'ik_specialist',
    name: 'IK Specialist',
    description: 'Solve multi-branch analytical and numerical inverse kinematics challenges.',
    icon: 'Crosshair',
    category: 'Kinematics',
    rarity: 'epic',
    xpReward: 250,
    criteriaDescription: 'Solve 10 IK problems',
  },
  {
    id: 'jacobian_explorer',
    name: 'Jacobian Explorer',
    description: 'Calculate robot geometric Jacobians, pinpoint singularities, and analyze manipulability.',
    icon: 'Activity',
    category: 'Differential Kinematics',
    rarity: 'epic',
    xpReward: 300,
    criteriaDescription: 'Complete 5 Jacobian problems/challenges',
  },
  {
    id: 'zero_hint',
    name: 'Zero Hint Maestro',
    description: 'Solve 10 robotics problems completely independently with zero hint usage.',
    icon: 'Zap',
    category: 'Mastery',
    rarity: 'rare',
    xpReward: 180,
    criteriaDescription: 'Solve 10 problems with 0 hints used',
  },
  {
    id: 'six_dof',
    name: 'Six DOF Virtuoso',
    description: 'Conquer full 6-degree-of-freedom spatial manipulators with spherical wrists.',
    icon: 'Cpu',
    category: 'Robots',
    rarity: 'epic',
    xpReward: 350,
    criteriaDescription: 'Complete 5 6-DOF problems or challenges',
  },
  {
    id: 'kyntrix_master',
    name: 'KyntriX Master',
    description: 'Achieve 2,000+ total XP across simulation, problem arena, and AI tutoring.',
    icon: 'Crown',
    category: 'Legendary',
    rarity: 'legendary',
    xpReward: 500,
    criteriaDescription: 'Earn 2,000 XP',
  },
  {
    id: 'streak_master',
    name: 'Relentless Scholar',
    description: 'Maintain an unbroken 7-day meaningful learning streak in KyntriX.',
    icon: 'Flame',
    category: 'Consistency',
    rarity: 'rare',
    xpReward: 100,
    criteriaDescription: 'Maintain 7-day learning streak',
  },
];

export const seedProblems: Problem[] = allArenaProblems;

export const seedChallenges: SimulationChallenge[] = simulationChallenges;

export const seedClassrooms: Classroom[] = [
  {
    id: 'class_rob_301',
    name: 'Introduction to Robotics Kinematics & Dynamics (ROB 301)',
    description: 'Fall Semester undergraduate robotics laboratory course focusing on DH parameters, FK/IK transformations, and trajectory planning.',
    institution: 'Stanford Robotics Center',
    teacherId: 'user_teacher_1',
    joinCode: 'KX-ROB-73A9',
    createdAt: '2025-08-20T00:00:00.000Z',
  },
];

export const seedClassroomMembers: ClassroomMember[] = [
  {
    id: 'member_1',
    classroomId: 'class_rob_301',
    userId: 'user_teacher_1',
    role: 'teacher',
    joinedAt: '2025-08-20T00:00:00.000Z',
  },
  {
    id: 'member_2',
    classroomId: 'class_rob_301',
    userId: 'user_student_1',
    role: 'student',
    joinedAt: '2025-08-21T00:00:00.000Z',
  },
];

export const seedAssignments: Assignment[] = [
  {
    id: 'assign_midterm_01',
    classroomId: 'class_rob_301',
    title: 'Midterm Kinematics Practical Exam',
    description: 'Complete these DH, FK, and IK problems under exam conditions. Hints and AI assistant are disabled during this assessment.',
    problemIds: ['prob_dh_01', 'prob_trans_01', 'prob_fk_01', 'prob_ik_01'],
    startDate: '2025-09-01T00:00:00.000Z',
    dueDate: '2026-12-31T23:59:59.000Z',
    attemptLimit: 3,
    timeLimitMinutes: 45,
    allowHints: false,
    allowAI: false,
    isExamMode: true,
    xpReward: 200,
    createdAt: '2025-08-25T00:00:00.000Z',
  },
  {
    id: 'assign_lab_02',
    classroomId: 'class_rob_301',
    title: 'Lab 2: Spatial Manipulators & Jacobians',
    description: 'Practice spatial DH table formulation and singularity detection with full AI tutor and hint support.',
    problemIds: ['prob_dh_02', 'prob_jac_01', 'prob_traj_01', 'prob_work_01'],
    startDate: '2025-09-05T00:00:00.000Z',
    dueDate: '2026-12-31T23:59:59.000Z',
    attemptLimit: 0,
    timeLimitMinutes: 0,
    allowHints: true,
    allowAI: true,
    isExamMode: false,
    xpReward: 150,
    createdAt: '2025-08-28T00:00:00.000Z',
  },
];
