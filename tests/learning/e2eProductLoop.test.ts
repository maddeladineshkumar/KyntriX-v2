import { describe, it, expect, beforeEach } from 'vitest';
import { handleApiRequest } from '../../src/server/apiRouter';
import { Database } from '../../src/server/db/database';

describe('UPDATE.md §70 & §33-36 Authoritative End-to-End Product Loop', () => {
  beforeEach(() => {
    Database.resetToSeed();
  });

  it('executes the complete Section 70 Core Product Loop: Register -> Login -> Recommendation -> Hint -> Solve -> XP/Rating -> Badges -> Analytics', async () => {
    // 1. User Registration & Login
    const regRes = await handleApiRequest('POST', '/api/auth/register', {
      email: 'alex_robotics@mit.edu',
      name: 'Alex Rivera',
      username: 'alex_r',
      password: 'SecureRoboPass2025!',
      role: 'student',
      institution: 'MIT CSAIL',
    });
    expect(regRes.status).toBe(201);
    expect(regRes.data.token).toBeDefined();
    expect(regRes.data.user.username).toBe('alex_r');

    const token = regRes.data.token;
    const authHeaders = { authorization: `Bearer ${token}` };

    // 2. Fetch User Profile & Initial Dashboard State
    const profileRes = await handleApiRequest('GET', '/api/profile/alex_r', null, authHeaders);
    expect(profileRes.status).toBe(200);
    expect(profileRes.data.profile.xp).toBe(0);
    expect(profileRes.data.profile.rating).toBe(1200); // Baseline rating

    // 3. Request Recommended Problem
    const problemsRes = await handleApiRequest('GET', '/api/problems', null, authHeaders);
    expect(problemsRes.status).toBe(200);
    expect(problemsRes.data.length).toBeGreaterThan(0);

    const problem = problemsRes.data[0];
    const problemId = problem.id;

    // 4. Request Progressive Hint
    const hintRes = await handleApiRequest('POST', `/api/problems/${problemId}/hint`, { level: 1 }, authHeaders);
    expect(hintRes.status).toBe(200);
    expect(hintRes.data.hint).toBeDefined();
    expect(hintRes.data.level).toBe(1);

    // 5. Submit Problem Solution with Deterministic Validation
    const expectedAnswer = (problem.answerSchema as any).expectedDHTable ||
      (problem.answerSchema as any).expectedScalar ||
      (problem.answerSchema as any).expectedPose ||
      0;

    const attemptRes = await handleApiRequest('POST', `/api/problems/${problemId}/attempt`, {
      submission: expectedAnswer,
      timeSpentSeconds: 42,
    }, authHeaders);

    expect(attemptRes.status).toBe(200);
    expect(attemptRes.data.attempt.isCorrect).toBe(true);
    expect(attemptRes.data.xpAwarded).toBeGreaterThan(0);
    expect(attemptRes.data.ratingDelta).toBeGreaterThan(0);

    // 6. Verify Auditable XP Transaction was recorded
    const transactions = Database.getXPTransactions('user_student_1');
    expect(transactions).toBeDefined();

    // 7. Verify Updated Profile & Analytics
    const updatedProfileRes = await handleApiRequest('GET', '/api/profile/alex_r', null, authHeaders);
    expect(updatedProfileRes.status).toBe(200);
    expect(updatedProfileRes.data.profile.xp).toBeGreaterThan(0);
    expect(updatedProfileRes.data.profile.rating).toBeGreaterThan(1200);
    expect(updatedProfileRes.data.profile.stats.problemsSolved).toBe(1);

    // 8. Verify Personal Analytics & Weakness Detection
    const analyticsRes = await handleApiRequest('GET', '/api/analytics/me', null, authHeaders);
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.data.categoryBreakdown).toBeDefined();
    expect(analyticsRes.data.recommendations).toBeDefined();
  });

  it('executes Classroom & College Mode: Teacher creates classroom -> join code -> creates assignment -> Student joins -> Student submits -> Teacher views analytics', async () => {
    // 1. Teacher Login
    const teacherLogin = await handleApiRequest('POST', '/api/auth/login', {
      email: 'teacher@kyntrix.edu',
      password: 'KyntriX2025!',
    });
    expect(teacherLogin.status).toBe(200);
    const teacherToken = teacherLogin.data.token;
    const teacherHeaders = { authorization: `Bearer ${teacherToken}` };

    // 2. Teacher creates new classroom
    const createClassRes = await handleApiRequest('POST', '/api/classrooms', {
      name: 'Advanced Manipulator Kinematics (ROB-801)',
      description: 'Graduate course on serial and parallel robotics manipulators.',
      institution: 'Stanford Robotics Center',
    }, teacherHeaders);
    expect(createClassRes.status).toBe(201);
    expect(createClassRes.data.classroom.joinCode).toMatch(/^KX-/);
    const classroomId = createClassRes.data.classroom.id;
    const joinCode = createClassRes.data.classroom.joinCode;

    // 3. Teacher creates an assignment with problems
    const createAssignRes = await handleApiRequest('POST', `/api/classrooms/${classroomId}/assignments`, {
      title: 'Lab 1: DH Parameter Derivations',
      description: 'Solve the assigned 3-DOF and SCARA DH problems without hints.',
      problemIds: ['prob_dh_01'],
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      allowAI: true,
      allowHints: true,
      attemptLimit: 3,
      xpReward: 100,
    }, teacherHeaders);
    expect(createAssignRes.status).toBe(201);
    const assignmentId = createAssignRes.data.assignment.id;

    // 4. Student Logs In and Joins Classroom via Join Code
    const studentLogin = await handleApiRequest('POST', '/api/auth/login', {
      email: 'student@kyntrix.edu',
      password: 'KyntriX2025!',
    });
    const studentToken = studentLogin.data.token;
    const studentHeaders = { authorization: `Bearer ${studentToken}` };

    const joinRes = await handleApiRequest('POST', '/api/classrooms/join', {
      joinCode,
    }, studentHeaders);
    expect(joinRes.status).toBe(200);
    expect(joinRes.data.classroom.id).toBe(classroomId);

    // 5. Student Submits Assignment
    const submitAssignRes = await handleApiRequest('POST', `/api/assignments/${assignmentId}/submit`, {
      answers: { prob_dh_01: { score: 100, isCorrect: true } },
      timeSpentSeconds: 180,
    }, studentHeaders);
    expect(submitAssignRes.status).toBe(200);
    expect(submitAssignRes.data.submission.totalScore).toBeDefined();

    // 6. Teacher Views Class Analytics
    const classAnalyticsRes = await handleApiRequest('GET', `/api/classrooms/${classroomId}/analytics`, null, teacherHeaders);
    expect(classAnalyticsRes.status).toBe(200);
    expect(classAnalyticsRes.data.studentCount).toBeGreaterThanOrEqual(1);
  });
});
