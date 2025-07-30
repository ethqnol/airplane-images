import validator from 'validator';


export function sanitizeString(input: string | null | undefined, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';
  

  let sanitized = validator.escape(input);
  sanitized = validator.trim(sanitized);
  
  return sanitized.substring(0, maxLength);
}

export function sanitizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '';
  
  const sanitized = validator.normalizeEmail(email) || '';
  
  return validator.isEmail(sanitized) ? sanitized : '';
}

export function sanitizeAircraftType(type: string | null | undefined): string {
  if (!type || typeof type !== 'string') return '';
  
  let sanitized = validator.escape(type);
  sanitized = validator.trim(sanitized);
  

  return validator.isAlphanumeric(sanitized) ? sanitized.toUpperCase() : '';
}

export function sanitizeDate(input: string | null | undefined): Date | null {
  if (!input || typeof input !== 'string') return null;
  
  const sanitized = validator.trim(input);
  
  if (!validator.isISO8601(sanitized)) {
    return null;
  }
  
  const date = new Date(sanitized);
  

  if (date > new Date()) {
    return null;
  }
  
  return date;
}


export function getPaginationParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '12', 10);
  
  return {
    page: isNaN(page) || page < 1 || page > 1000 ? 1 : page,
    limit: isNaN(limit) || limit < 1 || limit > 100 ? 12 : limit
  };
}

export function getSearchFilters(searchParams: URLSearchParams) {

  const userId = searchParams.get('userId') || undefined; 
  const aircraftType = sanitizeAircraftType(searchParams.get('aircraftType'));
  const title = sanitizeString(searchParams.get('title'), 100);
  
  return {
    userId,
    aircraftType: aircraftType || undefined,
    title: title || undefined
  };
}


export function getUploadData(formData: FormData) {
  return {
    title: sanitizeString(formData.get('title') as string, 200) || null,
    description: sanitizeString(formData.get('description') as string, 1000) || null,
    aircraftType: sanitizeAircraftType(formData.get('aircraftType') as string) || null,
    location: sanitizeString(formData.get('location') as string, 100) || null,
    dateTaken: sanitizeDate(formData.get('dateTaken') as string)
  };
}


export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function validateFile(file: File) {
  if (!file || typeof file.size !== 'number') {
    throw new Error('Valid file is required');
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size must be less than 10MB');
  }
  
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('File must be a JPEG, PNG, or WebP image');
  }
  
  return file;
}