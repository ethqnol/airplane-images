
export class DevStorage {
  private static users = new Map();
  private static sessions = new Map();
  private static images = new Map();
  private static imageFiles = new Map(); 

  static clear() {
    this.users.clear();
    this.sessions.clear();
    this.images.clear();
    this.imageFiles.clear();
  }

  static async createUser(user: any) {
    this.users.set(user.id, user);
  }

  static async getUser(id: string) {
    return this.users.get(id) || null;
  }

  static async createSession(token: string, userId: string) {
    this.sessions.set(token, {
      token,
      user_id: userId,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  static async getSession(token: string) {
    const session = this.sessions.get(token);
    if (!session) return null;
    
    if (new Date(session.expires_at) < new Date()) {
      this.sessions.delete(token);
      return null;
    }
    
    const user = this.users.get(session.user_id);
    return user;
  }

  static async deleteSession(token: string) {
    this.sessions.delete(token);
  }

  static async createImage(image: any) {
    this.images.set(image.id, image);
  }

  static async storeImageFile(key: string, file: File) {
    const arrayBuffer = await file.arrayBuffer();
    this.imageFiles.set(key, {
      data: arrayBuffer,
      type: file.type,
      name: file.name
    });
  }

  static getImageFile(key: string) {
    return this.imageFiles.get(key);
  }

  static async getImages(filters: any = {}) {
    let allImages = Array.from(this.images.values());
    

    if (filters.userId) {
      allImages = allImages.filter(img => img.user_id === filters.userId);
    }
    
    if (filters.aircraftType) {
      allImages = allImages.filter(img => 
        img.aircraft_type && img.aircraft_type.toLowerCase().includes(filters.aircraftType.toLowerCase())
      );
    }
    
    if (filters.titleSearch) {
      allImages = allImages.filter(img => 
        (img.title && img.title.toLowerCase().includes(filters.titleSearch.toLowerCase())) ||
        (img.original_name && img.original_name.toLowerCase().includes(filters.titleSearch.toLowerCase()))
      );
    }
    

    allImages.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    

    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedImages = allImages.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(allImages.length / limit);
    
    return {
      images: paginatedImages,
      pagination: {
        page,
        limit,
        total: allImages.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    };
  }
}

export function isDevelopment() {
  const runtime = (globalThis as any).runtime;
  

  if (runtime?.env?.DB && runtime?.env?.R2) {
    return false;
  }
  

  return true;
}