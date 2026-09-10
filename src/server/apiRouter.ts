import type { IncomingMessage, ServerResponse } from 'http';
import { DatabaseService } from './db/database';
import { AuthRoutes } from './routes/auth';
import { ProfileRoutes } from './routes/profile';
import { ProblemRoutes } from './routes/problems';
import { ChallengeRoutes } from './routes/challenges';
import { LeaderboardRoutes, BadgeRoutes } from './routes/leaderboard';
import { AnalyticsRoutes } from './routes/analytics';
import { ClassroomRoutes } from './routes/classroom';

const authRoutes = new AuthRoutes();
const profileRoutes = new ProfileRoutes();
const problemRoutes = new ProblemRoutes();
const challengeRoutes = new ChallengeRoutes();
const leaderboardRoutes = new LeaderboardRoutes();
const badgeRoutes = new BadgeRoutes();
const analyticsRoutes = new AnalyticsRoutes();
const classroomRoutes = new ClassroomRoutes();
const db = DatabaseService.getInstance();

async function dispatchApi(
  method: string,
  rawUrl: string,
  getBody: () => Promise<any>,
  headers: Record<string, string | string[] | undefined>
): Promise<{ status: number; body: any }> {
  const host = (headers['host'] as string) || 'localhost';
  const urlObj = new URL(rawUrl || '/', `http://${host}`);
  const pathname = urlObj.pathname;
  const path = pathname.replace(/\/+$/, '');

  // Extract auth token
  const authHeader = (headers['authorization'] as string) || (headers['Authorization'] as string) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const session = token ? db.getSession(token) : undefined;
  const currentUserId = session ? session.userId : undefined;

  try {
    // 1. Auth routes
    if (path === '/api/auth/register' && method === 'POST') {
      const body = await getBody();
      return authRoutes.register(body);
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const body = await getBody();
      return authRoutes.login(body);
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      return authRoutes.logout(token);
    }

    if (path === '/api/auth/me' && method === 'GET') {
      return authRoutes.getMe(token);
    }

    // 2. Profile routes
    if (path === '/api/profile' && method === 'PUT') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required' } };
      }
      const body = await getBody();
      return profileRoutes.updateProfile(body, currentUserId);
    }

    const profileMatch = path.match(/^\/api\/profile\/([^/]+)$/);
    if (profileMatch && method === 'GET') {
      return profileRoutes.getProfileByUsername(profileMatch[1]);
    }

    // 3. Problem routes
    if (path === '/api/problems' && method === 'GET') {
      const query = {
        category: urlObj.searchParams.get('category') || undefined,
        difficulty: urlObj.searchParams.get('difficulty') || undefined,
        search: urlObj.searchParams.get('search') || undefined,
      };
      return problemRoutes.listProblems(query);
    }

    const problemHintMatch = path.match(/^\/api\/problems\/([^/]+)\/hint$/);
    if (problemHintMatch && method === 'POST') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required to request hints' } };
      }
      const body = await getBody();
      return problemRoutes.getHint(problemHintMatch[1], body, currentUserId);
    }

    const problemAttemptMatch = path.match(/^\/api\/problems\/([^/]+)\/attempt$/);
    if (problemAttemptMatch && method === 'POST') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required to submit problem attempts' } };
      }
      const body = await getBody();
      return problemRoutes.submitAttempt(problemAttemptMatch[1], body, currentUserId);
    }

    const problemDetailMatch = path.match(/^\/api\/problems\/([^/]+)$/);
    if (problemDetailMatch && method === 'GET') {
      return problemRoutes.getProblem(problemDetailMatch[1], currentUserId);
    }

    // 4. Challenges routes
    if (path === '/api/challenges' && method === 'GET') {
      return challengeRoutes.listChallenges();
    }

    const challengeSubmitMatch = path.match(/^\/api\/challenges\/([^/]+)\/(submit|attempt)$/);
    if (challengeSubmitMatch && method === 'POST') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required to submit simulation challenge' } };
      }
      const body = await getBody();
      return await challengeRoutes.submitChallenge(challengeSubmitMatch[1], body, currentUserId);
    }

    const challengeDetailMatch = path.match(/^\/api\/challenges\/([^/]+)$/);
    if (challengeDetailMatch && method === 'GET') {
      return challengeRoutes.getChallenge(challengeDetailMatch[1]);
    }

    // 5. Leaderboard routes
    if (path === '/api/leaderboard' && method === 'GET') {
      const query = {
        scope: (urlObj.searchParams.get('scope') as any) || 'global',
        metric: (urlObj.searchParams.get('metric') as any) || 'xp',
        institution: urlObj.searchParams.get('institution') || undefined,
      };
      return leaderboardRoutes.getLeaderboard(query);
    }

    // 6. Badges routes
    if (path === '/api/badges' && method === 'GET') {
      return badgeRoutes.listBadges(currentUserId);
    }

    // 7. Analytics routes
    if ((path === '/api/analytics' || path === '/api/analytics/me') && method === 'GET') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required to view analytics' } };
      }
      return analyticsRoutes.getAnalytics(currentUserId);
    }

    // 8. Classroom routes
    if (path === '/api/classrooms' && method === 'GET') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required' } };
      }
      return classroomRoutes.listClassrooms(currentUserId);
    }

    if (path === '/api/classrooms' && method === 'POST') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required' } };
      }
      const body = await getBody();
      return classroomRoutes.createClassroom(body, currentUserId);
    }

    if (path === '/api/classrooms/join' && method === 'POST') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required' } };
      }
      const body = await getBody();
      return classroomRoutes.joinClassroom(body, currentUserId);
    }

    const classAnalyticsMatch = path.match(/^\/api\/classrooms\/([^/]+)\/analytics$/);
    if (classAnalyticsMatch && method === 'GET') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required' } };
      }
      return classroomRoutes.getClassroomAnalytics(classAnalyticsMatch[1], currentUserId);
    }

    const classAssignmentsMatch = path.match(/^\/api\/classrooms\/([^/]+)\/assignments$/);
    if (classAssignmentsMatch) {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required' } };
      }
      if (method === 'POST') {
        const body = await getBody();
        return classroomRoutes.createAssignment(classAssignmentsMatch[1], body, currentUserId);
      }
      if (method === 'GET') {
        const assignments = db.getAssignmentsForClassroom(classAssignmentsMatch[1]);
        return { status: 200, body: { assignments } };
      }
    }

    const classDetailMatch = path.match(/^\/api\/classrooms\/([^/]+)$/);
    if (classDetailMatch && method === 'GET') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required' } };
      }
      return classroomRoutes.getClassroom(classDetailMatch[1], currentUserId);
    }

    // 10. Assignment routes
    const assignmentSubmitMatch = path.match(/^\/api\/assignments\/([^/]+)\/submit$/);
    if (assignmentSubmitMatch && method === 'POST') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required' } };
      }
      const body = await getBody();
      return classroomRoutes.submitAssignment(assignmentSubmitMatch[1], body, currentUserId);
    }

    const assignmentDetailMatch = path.match(/^\/api\/assignments\/([^/]+)$/);
    if (assignmentDetailMatch && method === 'GET') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required' } };
      }
      return classroomRoutes.getAssignment(assignmentDetailMatch[1], currentUserId);
    }

    // 404 Route Not Found
    return { status: 404, body: { error: `Endpoint not found: ${method} ${pathname}` } };
  } catch (err: any) {
    console.error(`Unhandled error handling ${method} ${pathname}:`, err);
    return { status: 500, body: { error: 'Internal server error occurred.' } };
  }
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void
): Promise<void>;
export async function handleApiRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; data: any }>;
export async function handleApiRequest(
  reqOrMethod: IncomingMessage | string,
  resOrUrl?: ServerResponse | string,
  nextOrBody?: (() => void) | any,
  headersArg?: Record<string, string>
): Promise<void | { status: number; data: any }> {
  if (typeof reqOrMethod === 'string') {
    const method = reqOrMethod.toUpperCase();
    const url = typeof resOrUrl === 'string' ? resOrUrl : '/';
    const body = nextOrBody || {};
    const headers = headersArg || {};
    const getBody = async () => body;
    const result = await dispatchApi(method, url, getBody, headers);
    return { status: result.status, data: result.body };
  }

  const req = reqOrMethod as IncomingMessage;
  const res = resOrUrl as ServerResponse;
  const next = typeof nextOrBody === 'function' ? nextOrBody : undefined;

  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  if (!pathname.startsWith('/api')) {
    if (next) next();
    return;
  }

  // Set CORS & Security headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const readBody = async (): Promise<any> => {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });
  };

  const result = await dispatchApi(req.method || 'GET', req.url || '/', readBody, req.headers as any);
  res.statusCode = result.status;
  res.end(JSON.stringify(result.body));
}
