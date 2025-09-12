import { Request, Response } from 'express';
import geminiService from '../services/geminiService';
import cloudinaryService from '../services/cloudinaryService';
import User from '../models/User';
import Generation from '../models/Generation';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { GenerationRequest, EditRequest, SegmentRequest } from '../types';

/**
 * Generate image using Gemini API
 */
export const generateImage = asyncHandler(async (req: Request<{}, {}, GenerationRequest>, res: Response) => {
  const { auth0Id, prompt, settings = {} } = req.body;
  
  logger.info('Generate image request received:', {
    auth0Id,
    prompt: prompt?.substring(0, 100),
    hasReferenceImages: !!(settings.referenceImages && settings.referenceImages.length > 0),
    referenceImagesCount: settings.referenceImages?.length || 0,
    width: settings.width,
    height: settings.height,
    temperature: settings.temperature,
    seed: settings.seed
  });
  
  // Get user from database
  const user = await User.findOne({ auth0Id });
  if (!user) {
    logger.error(`[generateImage] User not found: ${auth0Id}`);
    throw new AppError('User not found', 404);
  }
  
  logger.info(`[generateImage] User ${auth0Id} hasApiKey: ${user.hasApiKey}`);
  
  // CRITICAL: Check generation limits for users without their own API key
  // This prevents unauthorized unlimited access to the default API key
  if (!user.hasApiKey) {
    const todayGenerations = await user.getTodayGenerations();
    if (todayGenerations >= 2) {
      throw new AppError('Daily generation limit exceeded. Please add your own API key to continue.', 403);
    }
    logger.info(`User ${auth0Id} using free tier: ${todayGenerations}/2 generations today`);
  }
  
  try {
    // Determine which API key to use
    let userApiKey: string | null = null;
    if (user.hasApiKey) {
      // Decrypt user's API key for unlimited generation
      userApiKey = user.getDecryptedApiKey();
      logger.info('Using user\'s custom API key for generation');
    } else {
      // IMPORTANT: Pass null to use default API key with rate limiting enforced above
      userApiKey = null;
      logger.info('Using default API key with rate limiting for free tier');
    }
    
    // Generate image with appropriate API key
    const images = settings.isEdit && settings.originalImage
      ? await geminiService.editImage(settings.originalImage, prompt, settings, userApiKey)
      : await geminiService.generateImage(prompt, {
          ...settings,
          referenceImages: settings.referenceImages // Ensure reference images are passed
        }, userApiKey);
    
    // Upload image to Cloudinary if configured, otherwise store base64
    let imageUrl: string | null = null;
    let imageData: string | null = null;
    
    const isCloudinaryConfigured = cloudinaryService.isConfigured();
    logger.info('Cloudinary configuration status:', isCloudinaryConfigured);
    
    if (isCloudinaryConfigured) {
      try {
        logger.info('Uploading image to Cloudinary...');
        imageUrl = await cloudinaryService.uploadImage(images[0], `generations/${user._id}`);
        logger.info('Image uploaded to Cloudinary:', imageUrl);
      } catch (uploadError) {
        logger.error('Failed to upload to Cloudinary, falling back to base64:', uploadError);
        imageData = images[0];
      }
    } else {
      // Store base64 if Cloudinary not configured
      logger.info('Cloudinary not configured, storing base64 data');
      imageData = images[0];
    }
    
    // Record generation
    const generation = await Generation.create({
      userId: user._id,
      auth0Id,
      prompt,
      negativePrompt: settings.negativePrompt,
      imageUrl,
      imageData,
      settings,
      metadata: {
        model: 'gemini-2.5-flash-image-preview',
        generationTime: Date.now()
      },
      isEdit: settings.isEdit || false,
      editInstruction: settings.isEdit ? prompt : undefined,
      maskData: settings.maskImage,
      status: 'completed'
    });
    
    // Increment user generation count if not using own API key
    if (!user.hasApiKey) {
      await user.incrementGeneration();
    }
    
    res.json({
      success: true,
      result: {
        images,
        generationId: generation._id
      }
    });
    
  } catch (error: any) {
    logger.error('Generation failed:', error);
    
    // Check if it's an API key error and user has their own key
    if (user.hasApiKey && error.message?.includes('API key')) {
      // Clear invalid API key
      await user.removeApiKey();
      throw new AppError('Your API key is invalid. It has been removed. Please add a valid key or use the free tier.', 400);
    }
    
    throw error;
  }
});

/**
 * Edit image using Gemini API
 */
export const editImage = asyncHandler(async (req: Request<{}, {}, EditRequest>, res: Response) => {
  const { auth0Id, instruction, originalImage, maskImage, referenceImages, temperature, seed } = req.body;
  
  // Get user from database
  const user = await User.findOne({ auth0Id });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // CRITICAL: Check generation limits for users without their own API key
  // This prevents unauthorized unlimited access to the default API key
  if (!user.hasApiKey) {
    const todayGenerations = await user.getTodayGenerations();
    if (todayGenerations >= 2) {
      throw new AppError('Daily generation limit exceeded. Please add your own API key to continue.', 403);
    }
    logger.info(`User ${auth0Id} using free tier for edit: ${todayGenerations}/2 generations today`);
  }
  
  try {
    // Determine which API key to use
    let userApiKey: string | null = null;
    if (user.hasApiKey) {
      // Decrypt user's API key for unlimited generation
      userApiKey = user.getDecryptedApiKey();
      logger.info('Using user\'s custom API key for edit');
    } else {
      // IMPORTANT: Pass null to use default API key with rate limiting enforced above
      userApiKey = null;
      logger.info('Using default API key with rate limiting for free tier edit');
    }
    
    // Edit image with appropriate API key
    const images = await geminiService.editImage(originalImage, instruction, {
      maskImage,
      referenceImages,
      temperature,
      seed
    }, userApiKey);
    
    // Upload image to Cloudinary if configured, otherwise store base64
    let imageUrl: string | null = null;
    let imageData: string | null = null;
    
    const isCloudinaryConfigured = cloudinaryService.isConfigured();
    logger.info('Cloudinary configuration status for edit:', isCloudinaryConfigured);
    
    if (isCloudinaryConfigured) {
      try {
        logger.info('Uploading edited image to Cloudinary...');
        imageUrl = await cloudinaryService.uploadImage(images[0], `generations/${user._id}`);
        logger.info('Edited image uploaded to Cloudinary:', imageUrl);
      } catch (uploadError) {
        logger.error('Failed to upload to Cloudinary, falling back to base64:', uploadError);
        imageData = images[0];
      }
    } else {
      // Store base64 if Cloudinary not configured
      logger.info('Cloudinary not configured, storing base64 data for edit');
      imageData = images[0];
    }
    
    // Record generation
    const generation = await Generation.create({
      userId: user._id,
      auth0Id,
      prompt: instruction,
      imageUrl,
      imageData,
      settings: {
        temperature,
        seed
      },
      metadata: {
        model: 'gemini-2.5-flash-image-preview',
        generationTime: Date.now()
      },
      isEdit: true,
      editInstruction: instruction,
      maskData: maskImage,
      status: 'completed'
    });
    
    // Increment user generation count if not using own API key
    if (!user.hasApiKey) {
      await user.incrementGeneration();
    }
    
    res.json({
      success: true,
      result: {
        images,
        generationId: generation._id
      }
    });
    
  } catch (error: any) {
    logger.error('Edit failed:', error);
    
    // Check if it's an API key error and user has their own key
    if (user.hasApiKey && error.message?.includes('API key')) {
      // Clear invalid API key
      await user.removeApiKey();
      throw new AppError('Your API key is invalid. It has been removed. Please add a valid key or use the free tier.', 400);
    }
    
    throw error;
  }
});

/**
 * Segment image using Gemini API
 */
export const segmentImage = asyncHandler(async (req: Request<{}, {}, SegmentRequest>, res: Response) => {
  const { auth0Id, image, query } = req.body;
  
  // Get user
  const user = await User.findOne({ auth0Id });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  try {
    // Determine which API key to use
    let userApiKey: string | null = null;
    if (user.hasApiKey) {
      userApiKey = user.getDecryptedApiKey();
      logger.info('Using user\'s custom API key for segmentation');
    }
    
    const result = await geminiService.segmentImage(image, query, userApiKey);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error('Segmentation failed:', error);
    throw error;
  }
});

/**
 * Get generation history
 */
export const getGenerationHistory = asyncHandler(async (req: Request<{ auth0Id: string }, {}, {}, { limit?: string; skip?: string }>, res: Response) => {
  const { auth0Id } = req.params;
  const { limit = '10', skip = '0' } = req.query; // Reduced default limit to 10 for performance
  
  logger.info('Fetching generation history for:', auth0Id);
  
  const user = await User.findOne({ auth0Id });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  const generations = await Generation.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip));
  
  const total = await Generation.countDocuments({ userId: user._id });
  
  logger.info(`Found ${generations.length} generations for user`);
  
  // Convert to JSON - only include imageData if no imageUrl
  const generationsWithImages = generations.map(gen => {
    const genObj: any = gen.toObject ? gen.toObject() : gen;
    return {
      ...genObj,
      _id: genObj._id?.toString() || genObj._id,
      // Include imageUrl if available, otherwise include imageData
      imageUrl: genObj.imageUrl || null,
      imageData: !genObj.imageUrl ? (genObj.imageData || null) : null,
      hasImageUrl: !!genObj.imageUrl,
      hasImageData: !!genObj.imageData
    };
  });
  
  res.json({
    success: true,
    generations: generationsWithImages,
    total,
    hasMore: parseInt(skip) + generations.length < total
  });
});

/**
 * Get today's generation count
 */
export const getTodayGenerations = asyncHandler(async (req: Request<{ auth0Id: string }>, res: Response) => {
  const { auth0Id } = req.params;
  
  const user = await User.findOne({ auth0Id });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  const count = await user.getTodayGenerations();
  
  res.json({
    success: true,
    count,
    limit: user.hasApiKey ? -1 : 2,
    remaining: user.hasApiKey ? -1 : Math.max(0, 2 - count)
  });
});

/**
 * Delete a generation and its associated Cloudinary image
 */
export const deleteGeneration = asyncHandler(async (req: Request, res: Response) => {
  const { generationId, auth0Id } = req.params;
  
  logger.info(`[DELETE] Deleting generation ${generationId} for user ${auth0Id}`);
  
  // Verify user exists
  const user = await User.findOne({ auth0Id });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // Find the generation and verify ownership
  const generation = await Generation.findOne({ 
    _id: generationId,
    auth0Id: auth0Id 
  });
  
  if (!generation) {
    throw new AppError('Generation not found or access denied', 404);
  }
  
  // Delete from Cloudinary if image URL exists
  if (generation.imageUrl && cloudinaryService.isConfigured()) {
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = generation.imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = `generations/${user._id}/${filename.split('.')[0]}`;
      
      logger.info(`[DELETE] Attempting to delete Cloudinary image: ${publicId}`);
      await cloudinaryService.deleteImage(publicId);
      logger.info(`[DELETE] Successfully deleted Cloudinary image`);
    } catch (error) {
      // Log error but continue with deletion from database
      logger.error('[DELETE] Failed to delete from Cloudinary:', error);
    }
  }
  
  // Delete from database
  await Generation.findByIdAndDelete(generationId);
  
  logger.info(`[DELETE] Successfully deleted generation ${generationId}`);
  
  res.json({
    success: true,
    message: 'Generation deleted successfully',
    deletedId: generationId
  });
});