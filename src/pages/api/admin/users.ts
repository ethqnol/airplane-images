import type { APIRoute } from 'astro';
import { getSessionToken, getSessionUser, isAdmin } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env || locals;
    const DB = env?.DB;

    if (!DB) {
      return new Response(JSON.stringify({
        error: 'Database not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = getSessionToken(request);
    const user = await getSessionUser(DB, token);

    if (!user || !isAdmin(user)) {
      return new Response(JSON.stringify({
        error: 'Unauthorized - Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const usersResult = await DB.prepare(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.created_at,
        COUNT(i.id) as image_count
      FROM users u
      LEFT JOIN images i ON u.id = i.user_id
      GROUP BY u.id, u.email, u.name, u.created_at
      ORDER BY u.created_at DESC
    `).all();

    console.log('Users query result:', usersResult);
    const users = usersResult.results || usersResult;

    return new Response(JSON.stringify(users), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};