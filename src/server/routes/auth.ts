import { randomBytesHex, hashPassword } from '../cryptoUtils';
import { DatabaseService } from '../db/database';
import type { User, UserRole } from '../db/types';

export class AuthRoutes {
  private db = DatabaseService.getInstance();

  public register(body: any): { status: number; body: any } {
    const { name, username, email, password, institution = '' } = body || {};

    if (!name || !username || !email || !password) {
      return { status: 400, body: { error: 'Name, username, email, and password are required.' } };
    }

    if (password.length < 6) {
      return { status: 400, body: { error: 'Password must be at least 6 characters.' } };
    }

    if (this.db.getUserByEmail(email)) {
      return { status: 409, body: { error: 'A user with this email already exists.' } };
    }

    if (this.db.getUserByUsername(username)) {
      return { status: 409, body: { error: 'Username is already taken.' } };
    }

    const salt = randomBytesHex(16);
    const passwordHash = hashPassword(password, salt);
    const userId = `user_${Date.now()}_${randomBytesHex(6)}`;

    const user: User = {
      id: userId,
      name,
      username,
      email,
      role: 'student' as UserRole, // VULN-04 fix: default registrations strictly to student
      institution,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.createUser(user);

    const token = `tok_${randomBytesHex(32)}`;
    this.db.createSession(userId, token);

    const profile = this.db.getProfile(userId);
    const { passwordHash: _, salt: __, ...sanitized } = user;

    return {
      status: 201,
      body: {
        token,
        user: sanitized,
        profile,
      },
    };
  }

  public login(body: any): { status: number; body: any } {
    const { email, password } = body || {};
    if (!email || !password) {
      return { status: 400, body: { error: 'Email and password are required.' } };
    }

    const user = this.db.getUserByEmail(email);
    if (!user) {
      return { status: 401, body: { error: 'Invalid email or password.' } };
    }

    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      return { status: 401, body: { error: 'Invalid email or password.' } };
    }

    const token = `tok_${randomBytesHex(32)}`;
    this.db.createSession(user.id, token);

    const profile = this.db.getProfile(user.id);
    const { passwordHash: _, salt: __, ...sanitized } = user;

    return {
      status: 200,
      body: {
        token,
        user: sanitized,
        profile,
      },
    };
  }

  public logout(token: string): { status: number; body: any } {
    if (token) {
      this.db.deleteSession(token);
    }
    return { status: 200, body: { message: 'Logged out successfully.' } };
  }

  public getMe(token: string, userId?: string): { status: number; body: any } {
    let targetUserId = userId;
    if (!targetUserId && token) {
      const session = this.db.getSession(token);
      if (session) {
        targetUserId = session.userId;
      }
    }

    if (!targetUserId) {
      return { status: 401, body: { error: 'Session expired or invalid.' } };
    }

    const user = this.db.getUserById(targetUserId);
    if (!user) {
      return { status: 404, body: { error: 'User not found.' } };
    }

    this.db.evaluateBadges(user.id);
    const profile = this.db.getProfile(user.id);
    const userBadges = this.db.getUserBadges(user.id);
    const { passwordHash: _, salt: __, ...sanitized } = user;

    return {
      status: 200,
      body: {
        user: sanitized,
        profile,
        badges: userBadges,
      },
    };
  }
}
