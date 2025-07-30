import type { APIRoute } from 'astro';
import { createAuthService, generateSessionToken, createSession, setSessionCookie } from '../../../lib/auth';

export const GET: APIRoute = async ({ url, redirect, locals }) => {
  try {

    const env = locals.runtime?.env || locals;
  
    if (!env?.AUTH_GOOGLE_ID || !env?.AUTH_GOOGLE_SECRET || !env?.DB) {
      console.error('Missing environment variables:', {
        hasGoogleId: !!env?.AUTH_GOOGLE_ID,
        hasGoogleSecret: !!env?.AUTH_GOOGLE_SECRET,
        hasDB: !!env?.DB,
        localsKeys: Object.keys(locals),
        runtimeKeys: locals.runtime ? Object.keys(locals.runtime) : 'no runtime'
      });
      return new Response('Authentication not configured', { status: 500 });
    }

    const code = url.searchParams.get('code');
    if (!code) {
      return redirect('/signin?error=no_code');
    }


    const authService = createAuthService(env, url.toString());
    
    const tokens = await authService.exchangeCodeForTokens(code);
    
    if (!tokens.access_token) {
      console.error('No access token received');
      return redirect('/signin?error=no_token');
    }
    
    const userInfo = await authService.getUserInfo(tokens.access_token);
  
    console.log('Fuck javascript:', {
      userId: userInfo.id,
      email: userInfo.email,
      hasDB: !!env.DB
    });

    const existingUser = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userInfo.id).first();
    console.log('Callback - Existing user found:', !!existingUser);
    
    const userImages = await env.DB.prepare('SELECT COUNT(*) as count FROM images WHERE user_id = ?').bind(userInfo.id).first();
    console.log('Callback - User has images:', userImages?.count || 0);
    

    await env.DB.prepare(`
      INSERT OR IGNORE INTO users (id, email, name, picture)
      VALUES (?, ?, ?, ?)
    `).bind(
      userInfo.id,
      userInfo.email,
      userInfo.name,
      userInfo.picture || null
    ).run();
    

    await env.DB.prepare(`
      UPDATE users SET email = ?, name = ?, picture = ?
      WHERE id = ?
    `).bind(
      userInfo.email,
      userInfo.name,
      userInfo.picture || null,
      userInfo.id
    ).run();
    
    console.log('Callback - User stored successfully');


    const sessionToken = generateSessionToken();
    await createSession(env.DB, userInfo.id, sessionToken);
    
    console.log('JUST FUCKING PROPOGATE HOLY SHIT: ', userInfo.id);
    
    const headers = new Headers();
    headers.set('Set-Cookie', setSessionCookie(sessionToken));
    headers.set('Location', '/gallery');

    return new Response(null, {
      status: 302,
      headers,
    });

  } catch (error) {
    console.error('Auth callback error:', error);

    let message = 'Unknown Error'
    if (error instanceof Error) message = error.message
    return redirect(`/signin?error=auth_failed&details=${encodeURIComponent(message)}`);
  }
};