import { Request, Response } from 'express';
import User from '../models/User';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { UserCreate, UserApiKey } from '../types';

/**
 * Create or update user
 */
export const createOrUpdateUser = asyncHandler(async (req: Request<{}, {}, UserCreate>, res: Response) => {
  const { auth0Id, email, name, picture } = req.body;
  
  let user = await User.findOne({ auth0Id });
  
  if (user) {
    // Update existing user
    user.email = email;
    user.name = name;
    user.picture = picture;
    await user.save();
    
    logger.info('User updated', { auth0Id });
  } else {
    // Create new user
    user = await User.create({
      auth0Id,
      email,
      name,
      picture
    });
    
    logger.info('New user created', { auth0Id });
  }
  
  res.json({
    success: true,
    user: user.toJSON()
  });
});

/**
 * Get user by auth0Id
 */
export const getUser = asyncHandler(async (req: Request<{ auth0Id: string }>, res: Response) => {
  const { auth0Id } = req.params;
  
  const user = await User.findOne({ auth0Id });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.json({
    success: true,
    user: user.toJSON()
  });
});

/**
 * Update user API key
 */
export const updateUserApiKey = asyncHandler(async (req: Request<{ auth0Id: string }, {}, UserApiKey>, res: Response) => {
  const { auth0Id } = req.params;
  const { geminiApiKey } = req.body;
  
  const user = await User.findOne({ auth0Id });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  if (geminiApiKey) {
    await user.setApiKey(geminiApiKey);
    logger.info('User API key updated', { auth0Id });
  } else {
    await user.removeApiKey();
    logger.info('User API key removed', { auth0Id });
  }
  
  res.json({
    success: true,
    message: geminiApiKey ? 'API key updated successfully' : 'API key removed successfully',
    hasApiKey: user.hasApiKey
  });
});

/**
 * Get user's generation stats
 */
export const getUserStats = asyncHandler(async (req: Request<{ auth0Id: string }>, res: Response) => {
  const { auth0Id } = req.params;
  
  const user = await User.findOne({ auth0Id });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  const todayGenerations = await user.getTodayGenerations();
  
  res.json({
    success: true,
    stats: {
      totalGenerations: user.generationCount,
      todayGenerations,
      dailyLimit: user.hasApiKey ? -1 : 2,
      remainingToday: user.hasApiKey ? -1 : Math.max(0, 2 - todayGenerations),
      hasApiKey: user.hasApiKey,
      lastGenerationDate: user.lastGenerationDate
    }
  });
});

/**
 * Delete user
 */
export const deleteUser = asyncHandler(async (req: Request<{ auth0Id: string }>, res: Response) => {
  const { auth0Id } = req.params;
  
  const user = await User.findOneAndDelete({ auth0Id });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  logger.info('User deleted', { auth0Id });
  
  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

/**
 * Check if user can generate (limit check)
 */
export const checkCanGenerate = asyncHandler(async (req: Request<{ auth0Id: string }>, res: Response) => {
  const { auth0Id } = req.params;
  
  logger.info(`[checkCanGenerate] Checking for user: ${auth0Id}`);
  
  const user = await User.findOne({ auth0Id });
  
  if (!user) {
    // Allow generation for new users (they'll be created on first generation)
    logger.info(`[checkCanGenerate] New user ${auth0Id}, allowing first generation`);
    res.json({
      success: true,
      allowed: true,
      hasApiKey: false,
      dailyGenerations: 0,
      todayGenerations: 0,
      remainingToday: 2,
      message: 'New user, generation allowed'
    });
    return;
  }
  
  // CRITICAL: Check if THIS SPECIFIC USER has their own API key
  // Each user's hasApiKey flag is stored in their own database record
  logger.info(`[checkCanGenerate] User ${auth0Id} hasApiKey flag: ${user.hasApiKey}`);
  
  if (user.hasApiKey) {
    // Verify the API key is actually stored and valid
    try {
      const apiKey = user.getDecryptedApiKey();
      if (apiKey && apiKey.trim().length > 0) {
        logger.info(`[checkCanGenerate] User ${auth0Id} has valid personal API key - unlimited access`);
        res.json({
          success: true,
          allowed: true,
          hasApiKey: true,
          dailyGenerations: 0,
          todayGenerations: 0,
          remainingToday: -1,
          message: 'Using personal API key'
        });
        return;
      } else {
        // API key is empty or invalid
        logger.warn(`[checkCanGenerate] User ${auth0Id} has hasApiKey=true but key is empty`);
        user.hasApiKey = false;
        await user.save();
      }
    } catch (error) {
      // If decryption fails, treat as no API key
      logger.error(`[checkCanGenerate] Failed to decrypt API key for user ${auth0Id}:`, error);
      user.hasApiKey = false;
      await user.save();
    }
  }
  
  // User doesn't have their own API key - check daily limit for free tier
  logger.info(`[checkCanGenerate] User ${auth0Id} using free tier - checking daily limit`);
  const todayGenerations = await user.getTodayGenerations();
  const allowed = todayGenerations < 2;
  
  logger.info(`[checkCanGenerate] User ${auth0Id} free tier: ${todayGenerations}/2 used today, allowed=${allowed}`);
  
  res.json({
    success: true,
    allowed,
    hasApiKey: false,
    dailyGenerations: todayGenerations,
    todayGenerations,
    remainingToday: Math.max(0, 2 - todayGenerations),
    message: allowed 
      ? `${2 - todayGenerations} generations remaining today` 
      : 'Daily generation limit exceeded. Please add your own API key to continue.'
  });
});