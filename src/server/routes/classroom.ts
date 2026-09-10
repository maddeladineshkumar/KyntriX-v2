import { DatabaseService } from '../db/database';
import type { Classroom, Assignment, AssignmentSubmission } from '../db/types';

export class ClassroomRoutes {
  private db = DatabaseService.getInstance();

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

    const classId = `class_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    let joinCode = '';
    do {
      joinCode = `KX-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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

    const members = this.db.getClassroomMembers(id);
    const isMember = members.some((m) => m.userId === userId) || classroom.teacherId === userId;
    if (!isMember) {
      return { status: 403, body: { error: 'You are not enrolled in this classroom.' } };
    }

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

    const assignId = `assign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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

    const problems = assignment.problemIds
      .map((pid) => this.db.getProblemById(pid))
      .filter((p) => Boolean(p));

    const submission = this.db.getSubmission(id, userId);

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
      problemAttempts: Record<string, { isCorrect: boolean; score: number; hintsUsed: number; answer: any }>;
      timeSpentSeconds: number;
    },
    userId: string
  ): { status: number; body: any } {
    const assignment = this.db.getAssignmentById(id);
    if (!assignment) {
      return { status: 404, body: { error: 'Assignment not found' } };
    }

    let totalScore = 0;
    const maxScore = assignment.problemIds.length * 100;
    let hintsUsedTotal = 0;
    let correctCount = 0;

    for (const pid of assignment.problemIds) {
      const att = body.problemAttempts?.[pid];
      if (att) {
        totalScore += att.score || 0;
        hintsUsedTotal += att.hintsUsed || 0;
        if (att.isCorrect) correctCount += 1;
      }
    }

    const accuracy = assignment.problemIds.length > 0
      ? Math.round((correctCount / assignment.problemIds.length) * 100)
      : 0;

    const subId = `sub_${id}_${userId}`;
    const submission: AssignmentSubmission = {
      id: subId,
      assignmentId: id,
      studentId: userId,
      problemAttempts: body.problemAttempts || {},
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

    // Award assignment completion XP
    const xpReward = Math.round(assignment.xpReward * (totalScore / Math.max(1, maxScore)));
    this.db.awardXP(userId, xpReward, `Assignment Completed: ${assignment.title}`, 'assignment', id);
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
