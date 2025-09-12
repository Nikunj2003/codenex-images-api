import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true
});

class CloudinaryService {
  /**
   * Upload base64 image to Cloudinary
   * @param base64Image - Base64 encoded image string
   * @param folder - Folder name in Cloudinary
   * @returns Promise with uploaded image URL
   */
  async uploadImage(base64Image: string, folder: string = 'codenex-generations'): Promise<string> {
    try {
      // Add data URI prefix if not present
      const base64Data = base64Image.startsWith('data:image') 
        ? base64Image 
        : `data:image/png;base64,${base64Image}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(base64Data, {
        folder,
        resource_type: 'image',
        format: 'png',
        transformation: [
          { quality: 'auto:best' },
          { fetch_format: 'auto' }
        ]
      });

      logger.info('Image uploaded to Cloudinary:', result.public_id);
      return result.secure_url;
    } catch (error) {
      logger.error('Error uploading to Cloudinary:', error);
      throw new Error('Failed to upload image to cloud storage');
    }
  }

  /**
   * Delete image from Cloudinary
   * @param publicId - Cloudinary public ID of the image
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      logger.info('Image deleted from Cloudinary:', publicId);
    } catch (error) {
      logger.error('Error deleting from Cloudinary:', error);
      // Don't throw - deletion failures shouldn't break the app
    }
  }

  /**
   * Get optimized URL for an image
   * @param url - Original Cloudinary URL
   * @param width - Desired width
   * @param height - Desired height
   */
  getOptimizedUrl(url: string, width?: number, height?: number): string {
    if (!url.includes('cloudinary.com')) {
      return url;
    }

    // Extract public ID from URL
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1) return url;

    // Build transformation string
    const transformations: string[] = ['q_auto:good', 'f_auto'];
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    
    // Insert transformations after 'upload'
    urlParts.splice(uploadIndex + 1, 0, transformations.join(','));
    
    return urlParts.join('/');
  }

  /**
   * Check if Cloudinary is configured
   */
  isConfigured(): boolean {
    const isConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    
    if (!isConfigured) {
      logger.info('Cloudinary not configured:', {
        hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
      });
    }
    
    return isConfigured;
  }
}

export default new CloudinaryService();