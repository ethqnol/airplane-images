import type { APIRoute } from 'astro';
import { getSessionToken, getSessionUser } from '../../../lib/auth';
import { getUploadData } from '../../../lib/schemas';

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

    if (!user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const imageId = params.id;
    if (!imageId) {
      return new Response(JSON.stringify({
        error: 'Image ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!imageId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageId)) {
      return new Response(JSON.stringify({ error: 'Invalid image ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const image = await DB.prepare(`
      SELECT * FROM images WHERE id = ? AND user_id = ?
    `).bind(imageId, user.id).first();

    if (!image) {
      return new Response(JSON.stringify({
        error: 'Image not found or not owned by user'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      await R2.delete(image.r2_key);
    } catch (r2Error) {
      console.error('Error deleting from R2:', r2Error);
    }

    await DB.prepare(`
      DELETE FROM images WHERE id = ? AND user_id = ?
    `).bind(imageId, user.id).run();

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

export const PATCH: APIRoute = async ({ params, request, locals }) => {
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

    if (!user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
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

    const image = await DB.prepare(`
      SELECT * FROM images WHERE id = ? AND user_id = ?
    `).bind(imageId, user.id).first();

    if (!image) {
      return new Response(JSON.stringify({
        error: 'Image not found or not owned by user'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const uploadData = getUploadData(formData);

    await DB.prepare(`
      UPDATE images 
      SET title = ?, description = ?, aircraft_type = ?, location = ?, date_taken = ?
      WHERE id = ? AND user_id = ?
    `).bind(
      uploadData.title,
      uploadData.description,
      uploadData.aircraftType,
      uploadData.location,
      uploadData.dateTaken?.toISOString() || null,
      imageId,
      user.id
    ).run();

    const updatedImage = await DB.prepare(`
      SELECT i.*, u.name as user_name
      FROM images i
      JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `).bind(imageId).first();

    return new Response(JSON.stringify({
      success: true,
      image: updatedImage
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating image:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};