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

    const images = await DB.prepare(`
      SELECT 
        i.id,
        i.r2_key,
        i.title,
        i.original_name,
        i.uploaded_at,
        u.name as user_name
      FROM images i
      JOIN users u ON i.user_id = u.id
      ORDER BY i.uploaded_at DESC
      LIMIT 20
    `).all();

    return new Response(JSON.stringify(images), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching recent images:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch recent images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};