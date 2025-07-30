import type { APIRoute } from 'astro';
import { createAuthService } from '../../../lib/auth';

export const GET: APIRoute = async (context) => {
  const { redirect, locals, url } = context;
  
  try {
    const env = locals.runtime?.env || locals;
  
    if (!env?.AUTH_GOOGLE_ID || !env?.AUTH_GOOGLE_SECRET) {
      console.error('Missing AUTH_GOOGLE_ID or AUTH_GOOGLE_SECRET');
      return new Response('Authentication not configured', { status: 500 });
    }

    const authService = createAuthService(env, url.toString());
    const authUrl = authService.getAuthUrl();
    
    return redirect(authUrl);
  } catch (error) {
    console.error('Auth signin error:', error);
    return new Response('Authentication error', { status: 500 });
  }
};