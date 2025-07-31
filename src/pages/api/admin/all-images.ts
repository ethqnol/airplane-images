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

    const imagesResult = await DB.prepare(`
      SELECT 
        i.id,
        i.r2_key,
        i.title,
        i.original_name,
        i.description,
        i.aircraft_type,
        i.location,
        i.date_taken,
        i.uploaded_at,
        u.name as user_name,
        u.email as user_email
      FROM images i
      JOIN users u ON i.user_id = u.id
      ORDER BY i.uploaded_at DESC
    `).all();

    console.log('Images query result:', imagesResult);
    const images = imagesResult.results || imagesResult;

    return new Response(JSON.stringify(images), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching all images:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};