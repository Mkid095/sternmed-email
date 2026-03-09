import { getCloudinaryUploadUrl, cloudinaryConfig } from '../config/cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
}

export const storageService = {
  // Validate file before upload
  validateFile: (file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } => {
    // Check file exists
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: `File size too large. Maximum size is ${maxSizeMB}MB.` };
    }

    return { valid: true };
  },

  // Upload file to Cloudinary (any file type)
  uploadFile: async (file: File, folder?: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('api_key', cloudinaryConfig.apiKey);

    if (folder) {
      formData.append('folder', folder);
    }

    const response = await fetch(getCloudinaryUploadUrl(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to upload file');
    }

    const data = await response.json();

    return data.secure_url;
  },

  // Upload multiple files
  uploadFiles: async (files: File[], folder?: string): Promise<string[]> => {
    const uploadPromises = Array.from(files).map((file) => storageService.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  },

  // Validate image file before upload
  validateImage: (file: File): { valid: boolean; error?: string } => {
    // Check file exists
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.',
      };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size too large. Maximum size is 5MB.' };
    }

    return { valid: true };
  },

  // Upload image to Cloudinary (legacy, kept for compatibility)
  uploadImage: async (file: File, folder?: string): Promise<UploadResult> => {
    const url = await storageService.uploadFile(file, folder)
    return {
      url,
      publicId: url.split('/').pop()?.split('.')[0] || '',
    };
  },

  // Upload multiple images
  uploadImages: async (files: File[]): Promise<UploadResult[]> => {
    const uploadPromises = files.map((file) => storageService.uploadImage(file));
    return Promise.all(uploadPromises);
  },

  // Delete image from Cloudinary (requires server-side implementation for security)
  // This is a placeholder - in production, you'd call your backend to delete
  deleteImage: async (publicId: string): Promise<void> => {
    // Note: Deleting images requires the API secret which should not be exposed client-side
    // In production, implement a server endpoint or use Firebase Cloud Functions
    console.warn('Image deletion requires server-side implementation. Public ID:', publicId);
  },

  // Get optimized image URL with transformations
  getOptimizedUrl: (url: string, options?: { width?: number; height?: number; quality?: number }): string => {
    if (!url || !url.includes('cloudinary.com')) {
      return url;
    }

    // Parse the Cloudinary URL and add transformations
    const { width, height, quality } = options || {};
    const transformations = [];

    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (quality) transformations.push(`q_${quality}`);

    if (transformations.length === 0) {
      return url;
    }

    // Insert transformations into the URL
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
    }

    return url;
  },
};

export default storageService;
