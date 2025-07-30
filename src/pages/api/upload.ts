import type { APIRoute } from 'astro';
import { getSessionToken, getSessionUser } from '../../lib/auth';
import { CloudflareR2Service, generateImageKey } from '../../lib/r2';
import { isValidAircraftType } from '../../lib/aircraft-validation';
import { getUploadData, validateFile } from '../../lib/schemas';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env || locals;
    const DB = env?.DB;
    
    console.log('WHY WONT LOCALS FUCKING PROPOGATE:', Object.keys(locals));
    
    if (!DB) {
      return new Response(JSON.stringify({ 
        error: 'Database not configured - ensure D1 database is properly set up',
        message: 'Please check your wrangler.toml configuration and run wrangler d1 migrations apply'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const token = getSessionToken(request);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const user = await getSessionUser(DB, token);
    
    console.log('Upload API - Token:', token ? 'exists' : 'none');
    console.log('Upload API - User:', user ? `${user.name} (${user.email})` : 'none');
    
    if (!user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    validateFile(file);
    const validatedData = getUploadData(formData);

    if (validatedData.aircraftType && !(await isValidAircraftType(validatedData.aircraftType))) {
      return new Response(JSON.stringify({ error: 'Invalid aircraft type selected' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const R2 = env?.R2;
    
    console.log('Upload API - R2 found:', !!R2);
    
    if (!R2) {
      return new Response(JSON.stringify({ error: 'R2 not configured' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }


    const r2Key = generateImageKey(user.id, file.name);
    
    const r2Service = new CloudflareR2Service(R2);
    await r2Service.uploadImage(file, r2Key);

    const imageId = crypto.randomUUID();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').toLowerCase();
    
    await DB.prepare(`
      INSERT INTO images (
        id, user_id, filename, original_name, size, mime_type, r2_key,
        title, description, aircraft_type, location, date_taken
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      imageId,
      user.id,
      r2Key.split('/').pop(), 
      sanitizedFilename,
      file.size,
      file.type,
      r2Key,
      validatedData.title,
      validatedData.description,
      validatedData.aircraftType,
      validatedData.location,
      validatedData.dateTaken ? validatedData.dateTaken.toISOString() : null
    ).run();

    return new Response(JSON.stringify({ 
      success: true, 
      imageId,
      message: 'Image uploaded successfully' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    
    return new Response(JSON.stringify({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};