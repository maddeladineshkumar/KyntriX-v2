const TOKEN_STORAGE_KEY = 'kyntrix_auth_token';

export class ApiClient {
  private static baseUrl = '/api';

  public static setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  private static getFullUrl(endpoint: string): string {
    const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (this.baseUrl.startsWith('http')) {
      return `${this.baseUrl}${ep}`;
    }
    if (
      typeof window !== 'undefined' &&
      window.location &&
      window.location.origin &&
      window.location.origin !== 'null' &&
      window.location.protocol.startsWith('http')
    ) {
      return `${window.location.origin}${this.baseUrl}${ep}`;
    }
    return `http://localhost:5173${this.baseUrl}${ep}`;
  }

  public static getToken(): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    return null;
  }

  public static setToken(token: string | null): void {
    try {
      if (typeof localStorage !== 'undefined') {
        if (token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      }
    } catch {
      // ignore
    }
  }

  private static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(this.getFullUrl(endpoint), {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          error: data.error || `HTTP error ${response.status}: ${response.statusText}`,
          status: response.status,
        };
      }

      return { data, status: response.status };
    } catch (err: any) {
      console.error(`Network error requesting ${endpoint}:`, err);
      return {
        error: err.message || 'Network failure. Please check your internet connection.',
        status: 0,
      };
    }
  }

  // --- Auth ---
  public static async register(payload: { name: string; username: string; email: string; password: string; role?: string; institution?: string }) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  }

  public static async login(payload: { email: string; password: string }) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  }

  public static async logout() {
    const res = await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
    return res;
  }

  public static async getMe() {
    return this.request('/auth/me');
  }

  // --- Profile ---
  public static async updateProfile(payload: { name?: string; institution?: string; avatarUrl?: string }) {
    return this.request('/profile', { method: 'PUT', body: JSON.stringify(payload) });
  }

  public static async getProfile(username: string) {
    return this.request(`/profile/${encodeURIComponent(username)}`);
  }

  // --- Problems ---
  public static async getProblems(filter?: { category?: string; difficulty?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filter?.category) params.set('category', filter.category);
    if (filter?.difficulty) params.set('difficulty', filter.difficulty);
    if (filter?.search) params.set('search', filter.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/problems${query}`);
  }

  public static async getProblem(id: string) {
    return this.request(`/problems/${encodeURIComponent(id)}`);
  }

  public static async getHint(problemId: string, hintIndex: number) {
    return this.request(`/problems/${encodeURIComponent(problemId)}/hint`, {
      method: 'POST',
      body: JSON.stringify({ hintIndex }),
    });
  }

  public static async submitProblemAttempt(
    problemId: string,
    payload: { answer: any; hintsUsed?: number; solveTimeMs?: number; assignmentId?: string }
  ) {
    return this.request(`/problems/${encodeURIComponent(problemId)}/attempt`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Challenges ---
  public static async getChallenges() {
    return this.request('/challenges');
  }

  public static async getChallenge(id: string) {
    return this.request(`/challenges/${encodeURIComponent(id)}`);
  }

  public static async submitChallenge(
    challengeId: string,
    payload: { finalJoints: number[]; completionTimeSeconds?: number }
  ) {
    return this.request(`/challenges/${encodeURIComponent(challengeId)}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Leaderboard ---
  public static async getLeaderboard(params?: { scope?: string; metric?: string; institution?: string }) {
    const sp = new URLSearchParams();
    if (params?.scope) sp.set('scope', params.scope);
    if (params?.metric) sp.set('metric', params.metric);
    if (params?.institution) sp.set('institution', params.institution);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return this.request(`/leaderboard${q}`);
  }

  // --- Badges ---
  public static async getBadges() {
    return this.request('/badges');
  }

  // --- Analytics ---
  public static async getAnalytics() {
    return this.request('/analytics');
  }

  // --- Classroom ---
  public static async getClassrooms() {
    return this.request('/classrooms');
  }

  public static async createClassroom(payload: { name: string; description?: string; institution?: string }) {
    return this.request('/classrooms', { method: 'POST', body: JSON.stringify(payload) });
  }

  public static async joinClassroom(joinCode: string) {
    return this.request('/classrooms/join', { method: 'POST', body: JSON.stringify({ joinCode }) });
  }

  public static async getClassroom(id: string) {
    return this.request(`/classrooms/${encodeURIComponent(id)}`);
  }

  public static async createAssignment(classroomId: string, payload: any) {
    return this.request(`/classrooms/${encodeURIComponent(classroomId)}/assignments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async getAssignment(id: string) {
    return this.request(`/assignments/${encodeURIComponent(id)}`);
  }

  public static async submitAssignment(assignmentId: string, payload: any) {
    return this.request(`/assignments/${encodeURIComponent(assignmentId)}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async getClassroomAnalytics(classroomId: string) {
    return this.request(`/classrooms/${encodeURIComponent(classroomId)}/analytics`);
  }
}
