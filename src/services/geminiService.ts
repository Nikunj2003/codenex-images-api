import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/config';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { GenerationSettings } from '../types';
import { removeWhiteBorders, ensureDimensions } from '../utils/imageProcessing';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          data: string;
        };
      }>;
    };
  }>;
}

interface SegmentationResult {
  masks: Array<{
    label: string;
    box_2d: number[];
    mask: string;
  }>;
}

class GeminiService {
  private defaultApiKey: string | null;
  private model: string;

  constructor() {
    // Default API key for rate-limited free tier (2 requests/day)
    this.defaultApiKey = config.gemini.apiKey || null;
    if (!this.defaultApiKey) {
      logger.warn('No default API key configured - free tier will not work');
    } else {
      logger.info('Default API key configured for free tier (2 requests/day)');
    }
    this.model = 'gemini-2.5-flash-image-preview';
  }

  /**
   * Get GoogleGenerativeAI instance with the appropriate API key
   */
  private getGenAI(customApiKey?: string | null): GoogleGenerativeAI {
    // CRITICAL: Proper API key isolation
    if (customApiKey && customApiKey.trim() !== '') {
      // User has their own API key - use it for unlimited access
      logger.info('Using user\'s personal API key for unlimited generation');
      return new GoogleGenerativeAI(customApiKey);
    }
    
    if (this.defaultApiKey) {
      // Use default API key for rate-limited free tier (2/day)
      // Rate limiting is enforced in the controller before this is called
      logger.info('Using default API key for rate-limited free tier');
      return new GoogleGenerativeAI(this.defaultApiKey);
    }
    
    // No API key available
    throw new AppError('No API key available. Please add your own Gemini API key or use the free tier.', 403);
  }

  /**
   * Generate image based on prompt and settings
   */
  async generateImage(
    prompt: string, 
    settings: GenerationSettings = {}, 
    customApiKey: string | null = null
  ): Promise<string[]> {
    try {
      logger.info('Generating image with Gemini', { 
        prompt: prompt.substring(0, 100),
        usingCustomKey: !!customApiKey,
        settings: {
          width: settings.width,
          height: settings.height,
          temperature: settings.temperature,
          seed: settings.seed
        }
      });
      
      // Enhance prompt based on settings
      const enhancedPrompt = this.enhancePrompt(prompt, settings);
      
      // Log the enhanced prompt for debugging
      logger.info('Enhanced prompt:', { prompt: enhancedPrompt.substring(0, 500) });
      
      // Prepare contents array with proper structure
      const contents: any[] = [{ text: enhancedPrompt }];
      
      // Add reference images if provided
      if (settings.referenceImages && Array.isArray(settings.referenceImages)) {
        logger.info(`Adding ${settings.referenceImages.length} reference images to generation request`);
        settings.referenceImages.forEach((image, index) => {
          // Strip data URL prefix if present and detect mime type
          let cleanImage = image;
          let mimeType = "image/png"; // default
          
          if (image.includes('base64,')) {
            const parts = image.split('base64,');
            cleanImage = parts[1];
            // Try to detect mime type from data URL
            if (parts[0].includes('image/jpeg') || parts[0].includes('image/jpg')) {
              mimeType = "image/jpeg";
            } else if (parts[0].includes('image/webp')) {
              mimeType = "image/webp";
            }
          }
          
          logger.info(`Reference image ${index + 1}: type=${mimeType}, size=${cleanImage.length} chars`);
          contents.push({
            inlineData: {
              mimeType,
              data: cleanImage
            }
          });
        });
      } else {
        logger.info('No reference images provided for generation');
      }
      
      // Generate with Gemini
      // Only works if user has their own API key
      const genAI = this.getGenAI(customApiKey);
      const model = genAI.getGenerativeModel({ model: this.model });
      const response = await model.generateContent(contents);
      
      // Extract images from response
      let images = this.extractImagesFromResponse(response.response as GeminiResponse);
      
      if (images.length === 0) {
        throw new AppError('No images generated', 500);
      }
      
      // Post-process images to remove white borders and ensure dimensions
      const processedImages: string[] = [];
      for (const image of images) {
        try {
          // First remove white borders
          let processedImage = await removeWhiteBorders(image);
          
          // Then ensure the image matches requested dimensions
          if (settings.width && settings.height) {
            processedImage = await ensureDimensions(processedImage, settings.width, settings.height);
          }
          
          processedImages.push(processedImage);
          logger.info('Image post-processed successfully');
        } catch (error) {
          logger.warn('Failed to post-process image, using original:', error);
          processedImages.push(image);
        }
      }
      
      logger.info('Successfully generated and processed images', { count: processedImages.length });
      return processedImages;
      
    } catch (error: any) {
      logger.error('Gemini generation error:', error);
      
      if (error.status === 400 && error.message?.includes('API key not valid')) {
        throw new AppError('Invalid API key', 400);
      }
      
      throw new AppError(error.message || 'Failed to generate image', 500);
    }
  }

  /**
   * Edit image based on instruction
   */
  async editImage(
    originalImage: string, 
    instruction: string, 
    settings: GenerationSettings = {}, 
    customApiKey: string | null = null
  ): Promise<string[]> {
    try {
      logger.info('Editing image with Gemini', { 
        instruction: instruction.substring(0, 100),
        usingCustomKey: !!customApiKey 
      });
      
      // Build edit prompt
      const editPrompt = this.buildEditPrompt(instruction, settings);
      
      // Strip data URL prefix from original image if present
      let cleanOriginalImage = originalImage;
      if (originalImage.includes('base64,')) {
        cleanOriginalImage = originalImage.split('base64,')[1];
      }
      
      // Prepare contents array with proper structure
      const contents: any[] = [
        { text: editPrompt },
        {
          inlineData: {
            mimeType: "image/png",
            data: cleanOriginalImage
          }
        }
      ];
      
      // Add reference images if provided
      if (settings.referenceImages && Array.isArray(settings.referenceImages)) {
        logger.info(`Adding ${settings.referenceImages.length} reference images to generation request`);
        settings.referenceImages.forEach((image, index) => {
          // Strip data URL prefix if present and detect mime type
          let cleanImage = image;
          let mimeType = "image/png"; // default
          
          if (image.includes('base64,')) {
            const parts = image.split('base64,');
            cleanImage = parts[1];
            // Try to detect mime type from data URL
            if (parts[0].includes('image/jpeg') || parts[0].includes('image/jpg')) {
              mimeType = "image/jpeg";
            } else if (parts[0].includes('image/webp')) {
              mimeType = "image/webp";
            }
          }
          
          logger.info(`Reference image ${index + 1}: type=${mimeType}, size=${cleanImage.length} chars`);
          contents.push({
            inlineData: {
              mimeType,
              data: cleanImage
            }
          });
        });
      } else {
        logger.info('No reference images provided for generation');
      }
      
      // Add mask image if provided
      if (settings.maskImage) {
        let cleanMask = settings.maskImage;
        if (settings.maskImage.includes('base64,')) {
          cleanMask = settings.maskImage.split('base64,')[1];
        }
        contents.push({
          inlineData: {
            mimeType: "image/png",
            data: cleanMask
          }
        });
      }
      
      // Generate with Gemini
      // Only works if user has their own API key
      const genAI = this.getGenAI(customApiKey);
      const model = genAI.getGenerativeModel({ model: this.model });
      const response = await model.generateContent(contents);
      
      // Extract images from response
      let images = this.extractImagesFromResponse(response.response as GeminiResponse);
      
      if (images.length === 0) {
        throw new AppError('No edited image generated', 500);
      }
      
      // Post-process images to remove white borders and ensure dimensions
      const processedImages: string[] = [];
      for (const image of images) {
        try {
          // First remove white borders
          let processedImage = await removeWhiteBorders(image);
          
          // Then ensure the image matches requested dimensions if provided
          if (settings.width && settings.height) {
            processedImage = await ensureDimensions(processedImage, settings.width, settings.height);
          }
          
          processedImages.push(processedImage);
          logger.info('Edited image post-processed successfully');
        } catch (error) {
          logger.warn('Failed to post-process edited image, using original:', error);
          processedImages.push(image);
        }
      }
      
      logger.info('Successfully edited and processed image');
      return processedImages;
      
    } catch (error: any) {
      logger.error('Gemini edit error:', error);
      throw new AppError(error.message || 'Failed to edit image', 500);
    }
  }

  /**
   * Segment image based on query
   */
  async segmentImage(
    image: string, 
    query: string, 
    customApiKey: string | null = null
  ): Promise<SegmentationResult> {
    try {
      logger.info('Segmenting image with Gemini', { query, usingCustomKey: !!customApiKey });
      
      // Strip data URL prefix from image if present
      let cleanImage = image;
      if (image.includes('base64,')) {
        cleanImage = image.split('base64,')[1];
      }
      
      const prompt: any[] = [
        { text: `Analyze this image and create a segmentation mask for: ${query}

Return a JSON object with this exact structure:
{
  "masks": [
    {
      "label": "description of the segmented object",
      "box_2d": [x, y, width, height],
      "mask": "base64-encoded binary mask image"
    }
  ]
}

Only segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.` },
        {
          inlineData: {
            mimeType: "image/png",
            data: cleanImage
          }
        }
      ];
      
      // Only works if user has their own API key
      const genAI = this.getGenAI(customApiKey);
      const model = genAI.getGenerativeModel({ model: this.model });
      const response = await model.generateContent(prompt);
      
      const responseText = response.response.text();
      
      // Try to parse JSON response
      try {
        const result = JSON.parse(responseText);
        logger.info('Successfully segmented image');
        return result as SegmentationResult;
      } catch (parseError) {
        logger.error('Failed to parse segmentation response:', responseText);
        throw new AppError('Invalid segmentation response format', 500);
      }
      
    } catch (error: any) {
      logger.error('Gemini segmentation error:', error);
      throw new AppError(error.message || 'Failed to segment image', 500);
    }
  }

  /**
   * Enhance prompt with additional parameters
   */
  private enhancePrompt(prompt: string, settings: GenerationSettings): string {
    let enhancedPrompt = prompt;
    
    // Add creative style based on temperature (exact match from working version)
    let creativeGuidance = '';
    if (settings.temperature !== undefined) {
      const temp = parseFloat(settings.temperature.toString());
      
      if (temp <= 0.5) {
        creativeGuidance = 'Create a precise, realistic, and highly detailed image with photographic accuracy.';
      } else if (temp <= 1.0) {
        creativeGuidance = 'Create a balanced image with natural style and moderate artistic interpretation.';
      } else if (temp <= 1.5) {
        creativeGuidance = 'Create an artistic and creative image with stylized elements and imaginative details.';
      } else {
        creativeGuidance = 'Create a highly imaginative, surreal, and experimental image with bold artistic choices.';
      }
    }
    
    // Add seed for consistency (as a style hint)
    let seedGuidance = '';
    if (settings.seed) {
      seedGuidance = `Style reference: ${settings.seed}`;
    }
    
    // Handle aspect ratio and dimensions (exact match from working version)
    if (settings.width && settings.height) {
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(settings.width, settings.height);
      const simplifiedWidth = settings.width / divisor;
      const simplifiedHeight = settings.height / divisor;
      
      const ratio = `${simplifiedWidth}:${simplifiedHeight}`;
      let format = '';
      if (ratio === '16:9') format = 'widescreen/cinematic';
      else if (ratio === '9:16') format = 'vertical/mobile';
      else if (ratio === '4:3') format = 'standard/classic';
      else if (ratio === '3:4') format = 'portrait';
      else if (ratio === '21:9') format = 'ultra-wide/cinematic';
      else if (ratio === '1:1') format = 'square/Instagram';
      
      // Put aspect ratio first for better adherence
      enhancedPrompt = `[${ratio} ${format ? format : 'aspect ratio'}, ${settings.width}×${settings.height}px, full frame, no borders]

${creativeGuidance ? creativeGuidance + '\n\n' : ''}${prompt}

CRITICAL REQUIREMENTS:
• The image MUST be exactly ${settings.width}×${settings.height} pixels
• The image MUST fill the entire ${ratio} frame edge-to-edge
• NO white borders, NO black bars, NO letterboxing, NO empty space
• Content should extend to all edges${seedGuidance ? '\n• ' + seedGuidance : ''}`;
    } else if (creativeGuidance || seedGuidance) {
      // Even without dimensions, apply creative settings
      enhancedPrompt = `${creativeGuidance ? creativeGuidance + '\n\n' : ''}${prompt}${seedGuidance ? '\n\n' + seedGuidance : ''}`;
    } else {
      // Default case - no special enhancements
      enhancedPrompt = prompt;
    }
    
    return enhancedPrompt;
  }

  /**
   * Build edit prompt with mask instructions
   */
  private buildEditPrompt(instruction: string, settings: GenerationSettings): string {
    // Get style guidance
    let styleGuidance = 'photorealistic, high quality';
    if (settings.temperature !== undefined) {
      const temp = parseFloat(settings.temperature.toString());
      if (temp <= 0.5) {
        styleGuidance = 'photorealistic, highly detailed';
      } else if (temp <= 1.0) {
        styleGuidance = 'realistic, natural';
      } else if (temp <= 1.5) {
        styleGuidance = 'artistic, creative';
      } else {
        styleGuidance = 'experimental, imaginative';
      }
    }

    let editPrompt = `Edit the image: ${instruction}, maintain ${styleGuidance} quality, seamless integration with original`;

    if (settings.maskImage) {
      editPrompt += `, edit only the masked areas (white pixels), preserve unmasked regions exactly`;
    }

    if (settings.seed) {
      editPrompt += `, consistent style seed: ${settings.seed}`;
    }

    return editPrompt;
  }

  /**
   * Extract images from Gemini response
   */
  private extractImagesFromResponse(response: GeminiResponse): string[] {
    const images: string[] = [];
    
    if (response && response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            images.push(part.inlineData.data);
          }
        }
      }
    }
    
    return images;
  }
}

export default new GeminiService();