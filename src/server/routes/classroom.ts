import { DatabaseService } from '../db/database';
import { DeterministicEngine } from '../robotics/deterministicEngine';
import { randomBytesHex } from '../cryptoUtils';
import { sanitizeProblem } from './problems';
import type { Classroom, Assignment, AssignmentSubmission } from '../db/types';

export class ClassroomRoutes {
  private db = DatabaseService.getInstance();

  private isUserAuthorizedForClassroom(classroomId: string, userId: string): boolean {
    const classroom = this.db.getClassroomById(classroomId);
    if (!classroom) return false;
    if (classroom.teacherId === userId) return true;
    const user = this.db.getUserById(userId);
    if (user?.role === 'admin') return true;
    const members = this.db.getClassroomMembers(classroomId);
    return members.some((m) => m.userId === userId);
  }

  public listClassrooms(userId: string): { status: number; body: any } {
    const classrooms = this.db.getClassroomsForUser(userId);
    return { status: 200, body: { classrooms } };
  }

  public createClassroom(
    body: { name: string; description?: string; institution?: string },
    userId: string
  ): { status: number; body: any } {
    const user = this.db.getUserById(userId);
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return { status: 403, body: { error: 'Only teachers or administrators can create classrooms.' } };
    }

    if (!body.name) {
      return { status: 400, body: { error: 'Classroom name is required.' } };
    }

    const classId = `class_${Date.now()}_${randomBytesHex(6)}`;
    let joinCode = '';
    do {
      joinCode = `KX-${randomBytesHex(4).toUpperCase()}-${randomBytesHex(2).toUpperCase()}`;
    } while (this.db.getClassroomByJoinCode(joinCode));

    const classroom: Classroom = {
      id: classId,
      name: body.name,
      description: body.description || '',
      institution: body.institution || user.institution || '',
      teacherId: userId,
      joinCode,
      createdAt: new Date().toISOString(),
    };

    this.db.createClassroom(classroom);
    return { status: 201, body: { classroom } };
  }

  public joinClassroom(body: { joinCode: string }, userId: string): { status: number; body: any } {
    if (!body.joinCode) {
      return { status: 400, body: { error: 'Join code is required.' } };
    }

    const classroom = this.db.getClassroomByJoinCode(body.joinCode);
    if (!classroom) {
      return { status: 404, body: { error: 'No classroom found with that join code. Please check with your instructor.' } };
    }

    const member = this.db.joinClassroom(classroom.id, userId);
    return { status: 200, body: { classroom, member } };
  }

  public getClassroom(id: string, userId: string): { status: number; body: any } {
    const classroom = this.db.getClassroomById(id);
    if (!classroom) {
      return { status: 404, body: { error: 'Classroom not found' } };
    }

    if (!this.isUserAuthorizedForClassroom(id, userId)) {
      return { status: 403, body: { error: 'You are not enrolled in this classroom.' } };
    }

    const members = this.db.getClassroomMembers(id);
    const assignments = this.db.getAssignmentsForClassroom(id);
    return {
      status: 200,
      body: {
        classroom,
        members: members.map((m) => ({
          userId: m.userId,
          name: m.user?.name || 'Student',
          username: m.user?.username || '',
          role: m.role,
          xp: m.profile?.xp || 0,
          rating: m.profile?.rating || 1200,
          joinedAt: m.joinedAt,
        })),
        assignments,
      },
    };
  }

  public createAssignment(
    classroomId: string,
    body: {
      title: string;
      description?: string;
      problemIds: string[];
      startDate?: string;
      dueDate?: string;
      attemptLimit?: number;
      timeLimitMinutes?: number;
      allowHints?: boolean;
      allowAI?: boolean;
      isExamMode?: boolean;
      xpReward?: number;
    },
    userId: string
  ): { status: number; body: any } {
    const classroom = this.db.getClassroomById(classroomId);
    if (!classroom) {
      return { status: 404, body: { error: 'Classroom not found' } };
    }

    if (classroom.teacherId !== userId) {
      const user = this.db.getUserById(userId);
      if (user?.role !== 'admin') {
        return { status: 403, body: { error: 'Only the classroom teacher can create assignments.' } };
      }
    }

    if (!body.title || !body.problemIds || body.problemIds.length === 0) {
      return { status: 400, body: { error: 'Assignment title and at least one problem are required.' } };
    }

    const assignId = `assign_${Date.now()}_${randomBytesHex(6)}`;
    const assignment: Assignment = {
      id: assignId,
      classroomId,
      title: body.title,
      description: body.description || '',
      problemIds: body.problemIds,
      startDate: body.startDate || new Date().toISOString(),
      dueDate: body.dueDate || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      attemptLimit: body.attemptLimit ?? 0,
      timeLimitMinutes: body.timeLimitMinutes ?? 0,
      allowHints: body.allowHints ?? true,
      allowAI: body.allowAI ?? true,
      isExamMode: body.isExamMode ?? false,
      xpReward: body.xpReward ?? 100,
      createdAt: new Date().toISOString(),
    };

    this.db.createAssignment(assignment);
    return { status: 201, body: { assignment } };
  }

  public getAssignment(id: string, userId: string): { status: number; body: any } {
    const assignment = this.db.getAssignmentById(id);
    if (!assignment) {
      return { status: 404, body: { error: 'Assignment not found' } };
    }

    // BOLA verification: verify user is enrolled or teacher/admin
    if (!this.isUserAuthorizedForClassroom(assignment.classroomId, userId)) {
      return { status: 403, body: { error: 'You are not enrolled in this classroom.' } };
    }

    const classroom = this.db.getClassroomById(assignment.classroomId);
    const user = this.db.getUserById(userId);
    const isTeacherOrAdmin = classroom?.teacherId === userId || user?.role === 'admin';

    const submission = this.db.getSubmission(id, userId);
    const isCompleted = submission?.status === 'submitted' || submission?.status === 'graded';
    const allowSolution = isTeacherOrAdmin || isCompleted;

    // VULN-03 fix: Strip solutions and expected answer values from assignment problems
    const problems = assignment.problemIds
      .map((pid) => this.db.getProblemById(pid))
      .filter((p) => Boolean(p))
      .map((p) => sanitizeProblem(p, allowSolution));

    return {
      status: 200,
      body: {
        assignment,
        problems,
        submission,
      },
    };
  }

  public submitAssignment(
    id: string,
    body: {
      problemAttempts?: Record<string, { hintsUsed?: number; answer?: any; submission?: any }>;
      timeSpentSeconds?: number;
    },
    userId: string
  ): { status: number; body: any } {
    const assignment = this.db.getAssignmentById(id);
    if (!assignment) {
      return { status: 404, body: { error: 'Assignment not found' } };
    }

    // BOLA verification: verify caller is enrolled in the classroom
    if (!this.isUserAuthorizedForClassroom(assignment.classroomId, userId)) {
      return { status: 403, body: { error: 'You are not enrolled in this classroom.' } };
    }

    // Enforce Due Date
    if (assignment.dueDate && new Date(assignment.dueDate).getTime() < Date.now()) {
      return { status: 400, body: { error: 'Assignment submission deadline has passed.' } };
    }

    // Enforce Attempt Limit
    const priorSubmissions = this.db.getSubmissionsForAssignment(id).filter((s) => s.studentId === userId);
    if (assignment.attemptLimit > 0 && priorSubmissions.length >= assignment.attemptLimit) {
      return {
        status: 400,
        body: { error: `Maximum attempt limit (${assignment.attemptLimit}) reached for this assignment.` },
      };
    }

    // Authoritative Server-Side Deterministic Grading (VULN-05 Fix)
    let totalScore = 0;
    const maxScore = assignment.problemIds.length * 100;
    let hintsUsedTotal = 0;
    let correctCount = 0;
    const verifiedAttempts: Record<string, any> = {};

    for (const pid of assignment.problemIds) {
      const problem = this.db.getProblemById(pid);
      if (!problem) continue;

      const clientAtt = body.problemAttempts?.[pid];
      const answer = clientAtt?.answer !== undefined ? clientAtt.answer : clientAtt?.submission;
      const hintsUsed = typeof clientAtt?.hintsUsed === 'number' ? Math.max(0, clientAtt.hintsUsed) : 0;
      hintsUsedTotal += hintsUsed;

      let isCorrect = false;
      let feedback = '';
      const schema = problem.answerSchema;

      if (answer !== undefined && answer !== null) {
        switch (schema.type) {
          case 'scalar': {
            const userNum = typeof answer === 'number' ? answer : parseFloat(answer);
            const expected = schema.expectedScalar ?? 0;
            const tol = schema.tolerance ?? 0.01;
            isCorrect = DeterministicEngine.validateScalar(userNum, expected, tol);
            feedback = isCorrect ? 'Correct scalar value.' : 'Incorrect scalar value.';
            break;
          }
          case 'angle': {
            const userRad = typeof answer === 'number' ? answer : parseFloat(answer);
            const expectedRad = schema.expectedAngleRad ?? 0;
            const tolRad = schema.angleToleranceRad ?? 0.02;
            isCorrect = DeterministicEngine.validateAngle(userRad, expectedRad, tolRad);
            feedback = isCorrect ? 'Correct angle.' : 'Incorrect angle.';
            break;
          }
          case 'vector': {
            const userVec = Array.isArray(answer) ? answer.map(Number) : [];
            const expectedVec = schema.expectedVector ?? [];
            const tol = schema.tolerance ?? 0.01;
            isCorrect = DeterministicEngine.validateVector(userVec, expectedVec, tol);
            feedback = isCorrect ? 'Correct vector components.' : 'Incorrect vector components.';
            break;
          }
          case 'matrix': {
            const userMat = Array.isArray(answer)
              ? answer.map((r: any) => (Array.isArray(r) ? r.map(Number) : []))
              : [];
            const expectedMat = schema.expectedMatrix ?? [];
            const tol = schema.matrixTolerance ?? schema.tolerance ?? 0.01;
            isCorrect = DeterministicEngine.validateMatrix(userMat, expectedMat, tol);
            feedback = isCorrect ? 'Correct transformation matrix.' : 'Incorrect transformation matrix.';
            break;
          }
          case 'dh_table': {
            const userRows = Array.isArray(answer) ? answer : [];
            const expectedRows = schema.expectedDHTable ?? [];
            const tol = schema.tolerance ?? 0.01;
            isCorrect = DeterministicEngine.validateDHTable(userRows, expectedRows, tol);
            feedback = isCorrect ? 'Correct DH table parameters.' : 'Incorrect DH table parameters.';
            break;
          }
          case 'joint_config': {
            const userQ = Array.isArray(answer) ? answer.map(Number) : [];
            const expectedQ = schema.expectedJoints ?? [];
            const tol = schema.tolerance ?? 0.02;
            isCorrect = DeterministicEngine.validateVector(userQ, expectedQ, tol);
            feedback = isCorrect ? 'Correct joint configuration.' : 'Incorrect joint configuration.';
            break;
          }
          default: {
            isCorrect = false;
            feedback = 'Unknown answer schema type.';
          }
        }
      }

      const problemScore = isCorrect ? Math.max(50, 100 - hintsUsed * 15) : 0;
      if (isCorrect) correctCount += 1;
      totalScore += problemScore;

      verifiedAttempts[pid] = {
        answer,
        isCorrect,
        score: problemScore,
        hintsUsed,
        feedback,
      };
    }

    const accuracy = assignment.problemIds.length > 0
      ? Math.round((correctCount / assignment.problemIds.length) * 100)
      : 0;

    const subId = `sub_${id}_${userId}_${Date.now()}`;
    const submission: AssignmentSubmission = {
      id: subId,
      assignmentId: id,
      studentId: userId,
      problemAttempts: verifiedAttempts,
      totalScore,
      maxScore,
      accuracy,
      timeSpentSeconds: body.timeSpentSeconds || 0,
      hintsUsedTotal,
      status: 'submitted',
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.db.saveSubmission(submission);

    // Award assignment completion XP based strictly on authoritatively validated score
    const xpReward = Math.round(assignment.xpReward * (totalScore / Math.max(1, maxScore)));
    if (xpReward > 0) {
      this.db.awardXP(userId, xpReward, `Assignment Completed: ${assignment.title}`, 'assignment', id);
    }
    this.db.recordLearningActivity(userId);

    return {
      status: 200,
      body: {
        submission,
        xpAwarded: xpReward,
      },
    };
  }

  public getClassroomAnalytics(classroomId: string, userId: string): { status: number; body: any } {
    const classroom = this.db.getClassroomById(classroomId);
    if (!classroom) {
      return { status: 404, body: { error: 'Classroom not found' } };
    }

    if (classroom.teacherId !== userId) {
      const user = this.db.getUserById(userId);
      if (user?.role !== 'admin') {
        return { status: 403, body: { error: 'Only teachers can view classroom analytics.' } };
      }
    }

    const members = this.db.getClassroomMembers(classroomId).filter((m) => m.role === 'student');
    const assignments = this.db.getAssignmentsForClassroom(classroomId);

    let totalSubmissions = 0;
    let sumScore = 0;
    let sumAccuracy = 0;

    for (const a of assignments) {
      const subs = this.db.getSubmissionsForAssignment(a.id);
      totalSubmissions += subs.length;
      for (const s of subs) {
        sumScore += s.totalScore;
        sumAccuracy += s.accuracy;
      }
    }

    const avgScore = totalSubmissions > 0 ? Math.round(sumScore / totalSubmissions) : 0;
    const avgAccuracy = totalSubmissions > 0 ? Math.round(sumAccuracy / totalSubmissions) : 0;
    const totalPossibleSubs = members.length * assignments.length;
    const completionRate = totalPossibleSubs > 0 ? Math.round((totalSubmissions / totalPossibleSubs) * 100) : 0;

    const studentLeaderboard = members
      .map((m) => ({
        userId: m.userId,
        name: m.user?.name || 'Student',
        username: m.user?.username || '',
        xp: m.profile?.xp || 0,
        rating: m.profile?.rating || 1200,
        problemsSolved: m.profile?.stats.problemsSolved || 0,
      }))
      .sort((a, b) => b.xp - a.xp);

    return {
      status: 200,
      body: {
        classroom,
        studentCount: members.length,
        assignmentCount: assignments.length,
        avgScore,
        avgAccuracy,
        completionRate,
        studentLeaderboard,
        assignments: assignments.map((a) => {
          const subs = this.db.getSubmissionsForAssignment(a.id);
          return {
            id: a.id,
            title: a.title,
            dueDate: a.dueDate,
            submissionCount: subs.length,
            averageScore: subs.length > 0 ? Math.round(subs.reduce((acc, s) => acc + s.totalScore, 0) / subs.length) : 0,
          };
        }),
      },
    };
  }
}
