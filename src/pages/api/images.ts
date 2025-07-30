import type { APIRoute } from 'astro';
import { getSessionToken, getSessionUser } from '../../lib/auth';
import { getPaginationParams, getSearchFilters } from '../../lib/schemas';

export const GET: APIRoute = async ({ request, url, locals }) => {
  try {
    const env = locals.runtime?.env || locals;
    const DB = env?.DB;
    
    console.log('Images API - DB found:', !!DB);

    
    if (!DB) {
      return new Response(JSON.stringify({ 
        images: [], 
        pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      }), { 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const searchParams = url.searchParams;
    
    const { page, limit } = getPaginationParams(searchParams);
    const { userId, aircraftType, title: titleSearch } = getSearchFilters(searchParams);
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        i.*,
        u.name as user_name,
        u.picture as user_picture
      FROM images i
      JOIN users u ON i.user_id = u.id
    `;
    
    const conditions = [];
    const bindings = [];

    if (userId) {
      conditions.push('i.user_id = ?');
      bindings.push(userId);
    }

    if (aircraftType) {
      conditions.push('i.aircraft_type LIKE ?');
      bindings.push(`%${aircraftType}%`);
    }

    if (titleSearch) {
      conditions.push('(i.title LIKE ? OR i.original_name LIKE ?)');
      bindings.push(`%${titleSearch}%`, `%${titleSearch}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY i.uploaded_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    console.log('Images API - Final query:', query);
    console.log('Images API - Query bindings:', bindings);
    
    const { results } = await DB.prepare(query).bind(...bindings).all();
    
    console.log('Images API - Raw results count:', results?.length || 0);
    console.log('Images API - First result sample:', results?.[0] ? { 
      id: results[0].id, 
      title: results[0].title, 
      user_id: results[0].user_id,
      user_name: results[0].user_name
    } : 'none');

    let countQuery = 'SELECT COUNT(*) as total FROM images i';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    const countResult = await DB.prepare(countQuery)
      .bind(...bindings.slice(0, -2)) 
      .first();
    
    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return new Response(JSON.stringify({
      images: results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching images:', error);
    

    
    return new Response(JSON.stringify({ 
      error: 'Error fetching images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};