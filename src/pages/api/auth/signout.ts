import type { APIRoute } from 'astro';
import { getSessionToken, deleteSession, clearSessionCookie } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, redirect, locals }) => {
  try {
    const token = getSessionToken(request);
    
    if (token) {
      const { env } = locals.runtime || import.meta.env;
      const db = env?.DB;
      await deleteSession(db, token);
    }

    const headers = new Headers();
    headers.set('Set-Cookie', clearSessionCookie());
    headers.set('Location', '/');

    return new Response(null, {
      status: 302,
      headers,
    });

  } catch (error) {
    console.error('Signout error:', error);
    return redirect('/');
  }
};