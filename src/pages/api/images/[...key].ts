import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request, locals }) => {
  const { key } = params;
  
  if (!key) {
    return new Response('Image key required', { status: 400 });
  }

  const fullKey = Array.isArray(key) ? key.join('/') : key;

  try {
    const env = locals.runtime?.env || locals;
    const R2 = env?.R2;
    
    console.log('Image serving - Available in locals:', Object.keys(locals));
    console.log('Image serving - R2 found:', !!R2);
    
    if (!R2) {
      return new Response('R2 storage not configured', { status: 500 });
    }

    const object = await R2.get(fullKey);
    
    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000');
    
    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Error fetching image:', error);
    return new Response('Error fetching image', { status: 500 });
  }
};