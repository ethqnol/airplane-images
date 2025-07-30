export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export class AuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      access_type: 'online'
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  async getUserInfo(accessToken: string): Promise<User> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
      };
    } catch (error) {
      console.error('Get user info error:', error);
      throw new Error('Failed to get user information');
    }
  }
}

export function createAuthService(env: any, requestUrl?: string): AuthService {
  let baseUrl = env.SITE_URL;
  
  if (!baseUrl && requestUrl) {
    const url = new URL(requestUrl);
    baseUrl = `${url.protocol}//${url.host}`;
  }
  
  if (!baseUrl) {
    baseUrl = 'https://airplane-images.ethqnol.workers.dev';
  }
  
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/auth/callback`;
    
  return new AuthService(
    env.AUTH_GOOGLE_ID,
    env.AUTH_GOOGLE_SECRET,
    redirectUri
  );
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

export async function createSession(db: any, userId: string, token: string) {
  await db.prepare(`
    INSERT OR REPLACE INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(
    token,
    userId,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  ).run();
}

export async function getSessionUser(db: any, token: string): Promise<User | null> {
  if (!token || !db) return null;

  const session = await db.prepare(`
    SELECT u.* FROM users u
    JOIN sessions s ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(token).first();

  return session ? {
    id: session.id,
    email: session.email,
    name: session.name,
    picture: session.picture,
  } : null;
}

export async function deleteSession(db: any, token: string) {
  if (!db) return;
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;

  const match = cookie.match(/session=([^;]+)/);
  return match ? match[1] : null;
}

export function setSessionCookie(token: string): string {
  return `session=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return 'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
}