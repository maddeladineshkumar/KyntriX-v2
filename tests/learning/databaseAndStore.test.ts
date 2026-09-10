import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../src/server/db/database';

describe('Database & Gamification Logic', () => {
  beforeEach(() => {
    // Reset database to seed state before each test
    Database.resetToSeed();
  });

  it('authenticates seed user and handles registration properly', () => {
    // Seed student login
    const auth = Database.login('student@kyntrix.edu', 'KyntriX2025!');
    expect(auth).not.toBeNull();
    expect(auth?.user.role).toBe('student');
    expect(auth?.token).toBeDefined();

    // Invalid password
    const failedAuth = Database.login('student@kyntrix.edu', 'WrongPass');
    expect(failedAuth).toBeNull();

    // Registration of new user
    const newUser = Database.createUser({
      email: 'alex.engineer@stanford.edu',
      name: 'Alex Engineer',
      role: 'student',
      institution: 'Stanford Robotics',
      password: 'StrongPassword123!',
    });
    expect(newUser).toBeDefined();
    expect(newUser.email).toBe('alex.engineer@stanford.edu');

    // Profile auto-initialization
    const profile = Database.getUserProfile(newUser.id);
    expect(profile).toBeDefined();
    expect(profile?.rating).toBe(1200);
    expect(profile?.xp).toBe(0);
  });

  it('updates Elo ratings and awards XP idempotently', () => {
    const user = Database.getUserByEmail('student@kyntrix.edu');
    expect(user).toBeDefined();
    if (!user) return;

    const initialProfile = Database.getUserProfile(user.id)!;
    const initialXP = initialProfile.xp;
    const initialRating = initialProfile.rating;

    // Successful attempt at a 1300-rated problem
    const newRating = Database.updateUserRating(user.id, 1300, 1.0, 32);
    expect(newRating).toBeGreaterThan(initialRating);

    // Award XP
    const awarded = Database.awardXP(user.id, 50, 'problem_solved', 'dh-01');
    expect(awarded).toBe(true);

    const updatedProfile = Database.getUserProfile(user.id)!;
    expect(updatedProfile.xp).toBe(initialXP + 50);

    // Re-awarding same problem should be prevented/idempotent
    const duplicateAward = Database.awardXP(user.id, 50, 'problem_solved', 'dh-01');
    expect(duplicateAward).toBe(false);
    expect(Database.getUserProfile(user.id)!.xp).toBe(initialXP + 50);
  });

  it('handles learning streak updates without phantom increments', () => {
    const user = Database.getUserByEmail('student@kyntrix.edu')!;
    const streak1 = Database.updateStreak(user.id);
    expect(streak1.currentStreak).toBeGreaterThanOrEqual(1);

    // Second action today should maintain streak without double incrementing
    const streak2 = Database.updateStreak(user.id);
    expect(streak2.currentStreak).toBe(streak1.currentStreak);
  });

  it('evaluates and awards badges on condition triggers', () => {
    const user = Database.getUserByEmail('student@kyntrix.edu')!;
    const awardedBadges = Database.checkAndAwardBadges(user.id);
    expect(Array.isArray(awardedBadges)).toBe(true);
  });

  it('supports progressive hint deductions', () => {
    const user = Database.getUserByEmail('student@kyntrix.edu')!;
    const problems = Database.getProblems();
    expect(problems.length).toBeGreaterThan(0);
    const prob = problems[0];

    const hint1 = Database.getHint(user.id, prob.id, 1);
    expect(hint1).toBeDefined();
    expect(hint1?.level).toBe(1);
    expect(hint1?.xpPenalty).toBeGreaterThan(0);
  });

  it('manages classrooms, joins with secure codes, and sets assignments', () => {
    const teacher = Database.getUserByEmail('teacher@kyntrix.edu')!;
    const student = Database.getUserByEmail('student@kyntrix.edu')!;

    // Create classroom
    const classroom = Database.createClassroom({
      name: 'Advanced Robotics ENGR-405',
      description: 'Graduate kinematics course',
      teacherId: teacher.id,
      institution: 'MIT',
    });
    expect(classroom).toBeDefined();
    expect(classroom.joinCode).toHaveLength(6);

    // Student joins classroom
    const joined = Database.joinClassroom(student.id, classroom.joinCode);
    expect(joined.success).toBe(true);

    // Teacher creates an assignment
    const assignment = Database.createAssignment(classroom.id, teacher.id, {
      title: 'Lab 1: DH Transformation Chains',
      description: 'Compute FK and DH for SCARA',
      problemIds: ['dh-01', 'trans-01'],
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      isExamMode: false,
      xpReward: 150,
    });
    expect(assignment).toBeDefined();
    expect(assignment?.problemIds).toHaveLength(2);
  });
});
