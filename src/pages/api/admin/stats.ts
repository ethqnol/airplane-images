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

    const totalImagesResult = await DB.prepare(`
      SELECT COUNT(*) as count FROM images
    `).first();

    const totalUsersResult = await DB.prepare(`
      SELECT COUNT(*) as count FROM users
    `).first();

    const imagesLastWeekResult = await DB.prepare(`
      SELECT COUNT(*) as count FROM images 
      WHERE uploaded_at >= date('now', '-7 days')
    `).first();

    const newUsersLastWeekResult = await DB.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= date('now', '-7 days')
    `).first();

    console.log('Stats query results:', {
      totalImages: totalImagesResult,
      totalUsers: totalUsersResult,
      imagesLastWeek: imagesLastWeekResult,
      newUsersLastWeek: newUsersLastWeekResult
    });

    return new Response(JSON.stringify({
      totalImages: totalImagesResult?.count || 0,
      totalUsers: totalUsersResult?.count || 0,
      imagesLastWeek: imagesLastWeekResult?.count || 0,
      newUsersLastWeek: newUsersLastWeekResult?.count || 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};