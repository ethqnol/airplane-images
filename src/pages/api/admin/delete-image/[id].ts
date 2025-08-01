import type { APIRoute } from 'astro';
import { getSessionToken, getSessionUser, isAdmin } from '../../../../lib/auth';

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  try {
    const env = locals.runtime?.env || locals;
    const DB = env?.DB;
    const R2 = env?.R2;

    if (!DB || !R2) {
      return new Response(JSON.stringify({
        error: 'Database or storage not configured'
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

    const imageId = params.id;
    if (!imageId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageId)) {
      return new Response(JSON.stringify({ error: 'Invalid image ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get image details before deletion
    const image = await DB.prepare(`
      SELECT * FROM images WHERE id = ?
    `).bind(imageId).first();

    if (!image) {
      return new Response(JSON.stringify({
        error: 'Image not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete from R2 storage
    try {
      await R2.delete(image.r2_key);
    } catch (r2Error) {
      console.error('Error deleting from R2:', r2Error);
      // Continue with database deletion even if R2 fails
    }

    // Delete from database
    await DB.prepare(`
      DELETE FROM images WHERE id = ?
    `).bind(imageId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Image deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};