import type { APIRoute } from 'astro';
import { getSessionToken, getSessionUser } from '../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env || locals;
    const DB = env?.DB;
    
    if (!DB) {
      return new Response(JSON.stringify({ error: 'No database connection' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = getSessionToken(request);
    const user = await getSessionUser(DB, token);
    
    const usersResult = await DB.prepare('SELECT id, email, name FROM users ORDER BY created_at DESC').all();
    
    const imagesResult = await DB.prepare('SELECT id, user_id, title, original_name, uploaded_at FROM images ORDER BY uploaded_at DESC').all();
    
    const sessionsResult = await DB.prepare('SELECT token, user_id, expires_at FROM sessions ORDER BY created_at DESC').all();

    return new Response(JSON.stringify({
      currentUser: user ? { id: user.id, email: user.email } : null,
      sessionToken: token ? 'present' : 'missing',
      tables: {
        users: {
          count: usersResult.results?.length || 0,
          data: usersResult.results || []
        },
        images: {
          count: imagesResult.results?.length || 0,
          data: imagesResult.results || []
        },
        sessions: {
          count: sessionsResult.results?.length || 0,
          data: sessionsResult.results?.map((s: any) => ({
            user_id: s.user_id,
            expires_at: s.expires_at,
            isExpired: new Date(s.expires_at) < new Date()
          })) || []
        }
      }
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};