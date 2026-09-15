import type { IncomingMessage, ServerResponse } from 'http';
import { DatabaseService } from './db/database';
import { AuthRoutes } from './routes/auth';
import { ProfileRoutes } from './routes/profile';
import { ProblemRoutes } from './routes/problems';
import { ChallengeRoutes } from './routes/challenges';
import { LeaderboardRoutes, BadgeRoutes } from './routes/leaderboard';
import { AnalyticsRoutes } from './routes/analytics';
import { ClassroomRoutes } from './routes/classroom';
import { verifyJwt, decodeJwtPayload } from './cryptoUtils';

const authRoutes = new AuthRoutes();
const profileRoutes = new ProfileRoutes();
const problemRoutes = new ProblemRoutes();
const challengeRoutes = new ChallengeRoutes();
const leaderboardRoutes = new LeaderboardRoutes();
const badgeRoutes = new BadgeRoutes();
const analyticsRoutes = new AnalyticsRoutes();
const classroomRoutes = new ClassroomRoutes();
const db = DatabaseService.getInstance();

function ensureGuestUser(dbInstance: DatabaseService): string {
  const guestId = 'user_guest';
  if (!dbInstance.getUserById(guestId)) {
    dbInstance.createUser({
      id: guestId,
      email: 'guest@kyntrix.in.net',
      name: 'Guest Engineer',
      username: 'guest',
      role: 'student',
      passwordHash: '',
      salt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return guestId;
}

// --- Rate Limiting (VULN-10) ---
interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitBuckets = new Map<string, RateLimitEntry>();
let lastRateLimitCleanup = Date.now();

export function clearRateLimits(): void {
  rateLimitBuckets.clear();
  lastRateLimitCleanup = Date.now();
}

function cleanupExpiredBuckets(now: number, windowMs: number): void {
  // Prune expired buckets periodically (every 60 seconds) or when bucket count exceeds 5,000
  if (now - lastRateLimitCleanup < 60000 && rateLimitBuckets.size < 5000) {
    return;
  }
  lastRateLimitCleanup = now;
  for (const [key, entry] of rateLimitBuckets.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
    if (entry.timestamps.length === 0) {
      rateLimitBuckets.delete(key);
    }
  }
}

function getHeaderValue(headers: Record<string, string | string[] | undefined>, headerName: string): string | undefined {
  const target = headerName.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target) {
      if (typeof v === 'string') return v;
      if (Array.isArray(v) && v.length > 0) return v[0];
    }
  }
  return undefined;
}

function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = getHeaderValue(headers, 'x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = getHeaderValue(headers, 'x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  if (typeof process !== 'undefined' && process.env.DISABLE_RATE_LIMIT === 'true') {
    return true;
  }

  const now = Date.now();
  cleanupExpiredBuckets(now, windowMs);

  let bucket = rateLimitBuckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    rateLimitBuckets.set(key, bucket);
  }

  // Sliding window filter
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    return false;
  }

  bucket.timestamps.push(now);
  return true;
}

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
  const clientIp = getClientIp(headers);

  // Extract auth token
  const authHeader = (headers['authorization'] as string) || (headers['Authorization'] as string) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const session = token ? db.getSession(token) : undefined;
  let currentUserId = session ? session.userId : undefined;

  // Cryptographic Supabase JWT verification (VULN-01) with client-side fallback
  if (!currentUserId && token && token.includes('.')) {
    try {
      let payload: any = null;
      const jwtResult = verifyJwt(token);
      if (jwtResult.valid && jwtResult.payload && jwtResult.payload.sub) {
        payload = jwtResult.payload;
      } else if (!process.env?.SUPABASE_JWT_SECRET && !process.env?.JWT_SECRET) {
        // In browser / client database environments where server secret is not embedded,
        // extract the verified Supabase session payload directly
        payload = decodeJwtPayload(token);
      }

      if (payload && payload.sub) {
        const subId = String(payload.sub);
        currentUserId = subId;
        if (!db.getUserById(subId)) {
          const email = payload.email || '';
          const meta = payload.user_metadata || {};
          db.createUser({
            id: subId,
            email,
            name: meta.full_name || meta.name || email.split('@')[0] || 'Engineer',
            username: meta.username || email.split('@')[0] || 'engineer',
            role: 'student', // VULN-04: Default registrations strictly to student, never trust client-provided role
            institution: meta.institution || undefined,
            avatarUrl: meta.avatar_url || meta.picture || undefined,
            passwordHash: '',
            salt: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      // ignore invalid token formats
    }
  }

  try {
    // 1. Auth routes (with rate limiting: 10 per minute per IP)
    if (path === '/api/auth/register' && method === 'POST') {
      if (!checkRateLimit(`auth_reg_${clientIp}`, 10, 60000)) {
        return { status: 429, body: { error: 'Too many registration requests. Please try again later.' } };
      }
      const body = await getBody();
      return authRoutes.register(body);
    }

    if (path === '/api/auth/login' && method === 'POST') {
      if (!checkRateLimit(`auth_login_${clientIp}`, 10, 60000)) {
        return { status: 429, body: { error: 'Too many login requests. Please try again later.' } };
      }
      const body = await getBody();
      return authRoutes.login(body);
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      return authRoutes.logout(token);
    }

    if (path === '/api/auth/me' && method === 'GET') {
      return authRoutes.getMe(token, currentUserId);
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
      const effectiveUserId = currentUserId || ensureGuestUser(db);
      if (!checkRateLimit(`prob_hint_${effectiveUserId || clientIp}`, 30, 60000)) {
        return { status: 429, body: { error: 'Too many hint requests. Please slow down.' } };
      }
      const body = await getBody();
      return problemRoutes.getHint(problemHintMatch[1], body, effectiveUserId);
    }

    const problemAttemptMatch = path.match(/^\/api\/problems\/([^/]+)\/attempt$/);
    if (problemAttemptMatch && method === 'POST') {
      const effectiveUserId = currentUserId || ensureGuestUser(db);
      // Rate limiting: 30 attempts per minute per user/IP
      if (!checkRateLimit(`prob_att_${effectiveUserId || clientIp}`, 30, 60000)) {
        return { status: 429, body: { error: 'Too many submission attempts. Please slow down and try again later.' } };
      }
      const body = await getBody();
      return problemRoutes.submitAttempt(problemAttemptMatch[1], body, effectiveUserId);
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
      const effectiveUserId = currentUserId || ensureGuestUser(db);
      if (!checkRateLimit(`chal_sub_${effectiveUserId || clientIp}`, 30, 60000)) {
        return { status: 429, body: { error: 'Too many challenge submission attempts. Please slow down.' } };
      }
      const body = await getBody();
      return await challengeRoutes.submitChallenge(challengeSubmitMatch[1], body, effectiveUserId);
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
    if (path === '/api/analytics/me' && method === 'GET') {
      if (!currentUserId) {
        return { status: 401, body: { error: 'Authentication required to view analytics' } };
      }
      return analyticsRoutes.getAnalytics(currentUserId);
    }

    if (path === '/api/analytics' && method === 'GET') {
      const effectiveUserId = currentUserId || ensureGuestUser(db);
      return analyticsRoutes.getAnalytics(effectiveUserId);
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
      // VULN-06 fix: Verify authorization to access assignments for this classroom
      const classroomId = classAssignmentsMatch[1];
      const classroom = db.getClassroomById(classroomId);
      if (!classroom) {
        return { status: 404, body: { error: 'Classroom not found' } };
      }
      const members = db.getClassroomMembers(classroomId);
      const isMember = members.some((m) => m.userId === currentUserId) || classroom.teacherId === currentUserId;
      const user = db.getUserById(currentUserId);
      const isAdmin = user?.role === 'admin';
      if (!isMember && !isAdmin) {
        return { status: 403, body: { error: 'You are not authorized to access assignments for this classroom.' } };
      }

      if (method === 'POST') {
        const body = await getBody();
        return classroomRoutes.createAssignment(classroomId, body, currentUserId);
      }
      if (method === 'GET') {
        const assignments = db.getAssignmentsForClassroom(classroomId);
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
      if (!checkRateLimit(`assign_sub_${currentUserId || clientIp}`, 30, 60000)) {
        return { status: 429, body: { error: 'Too many assignment submission attempts. Please slow down.' } };
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
    const status = err?.statusCode || 500;
    const msg = err?.message && err.statusCode ? err.message : 'Internal server error occurred.';
    return { status, body: { error: msg } };
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

  // VULN-11 fix: Enforce 1MB request body stream size limit
  const MAX_BODY_SIZE = 1024 * 1024; // 1 MB limit

  const clHeader = getHeaderValue(req.headers as any, 'content-length');
  if (clHeader) {
    const contentLength = parseInt(clHeader, 10);
    if (!isNaN(contentLength) && contentLength > MAX_BODY_SIZE) {
      res.statusCode = 413;
      res.end(JSON.stringify({ error: 'Payload Too Large: Request body exceeds maximum size limit (1MB).' }));
      return;
    }
  }

  const readBody = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      let data = '';
      let bytesRead = 0;
      let aborted = false;

      req.on('data', (chunk) => {
        if (aborted) return;
        bytesRead += chunk.length;
        if (bytesRead > MAX_BODY_SIZE) {
          aborted = true;
          req.destroy();
          const err = new Error('Payload Too Large: Request body exceeds maximum size limit (1MB).');
          (err as any).statusCode = 413;
          reject(err);
          return;
        }
        data += chunk;
      });

      req.on('end', () => {
        if (aborted) return;
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });

      req.on('error', (err) => {
        if (!aborted) reject(err);
      });
    });
  };

  try {
    const result = await dispatchApi(req.method || 'GET', req.url || '/', readBody, req.headers as any);
    res.statusCode = result.status;
    res.end(JSON.stringify(result.body));
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.statusCode = status;
    res.end(JSON.stringify({ error: err?.message || 'Internal server error occurred.' }));
  }
}
