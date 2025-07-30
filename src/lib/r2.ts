import type { R2Bucket } from '@cloudflare/workers-types';

export interface R2Service {
  uploadImage(file: File, key: string): Promise<void>;
  getImageUrl(key: string): string;
  deleteImage(key: string): Promise<void>;
}

export class CloudflareR2Service implements R2Service {
  constructor(private bucket: R2Bucket) {}

  async uploadImage(file: File, key: string): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    
    await this.bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  getImageUrl(key: string): string {

    return `/api/images/${key}`;
  }

  async deleteImage(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}

export function generateImageKey(userId: string, originalName: string): string {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop() || 'jpg';
  return `images/${userId}/${timestamp}-${crypto.randomUUID()}.${extension}`;
}