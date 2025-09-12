import mongoose from 'mongoose';
import Generation from '../models/Generation';
import logger from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function cleanupGenerations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    logger.info('Connected to MongoDB for cleanup');

    // Count generations with base64 data
    const base64Count = await Generation.countDocuments({
      imageData: { $exists: true, $ne: null }
    });
    
    logger.info(`Found ${base64Count} generations with base64 imageData`);

    // Delete all generations with base64 imageData (keep only those with URLs)
    const result = await Generation.deleteMany({
      imageData: { $exists: true, $ne: null }
    });

    logger.info(`Deleted ${result.deletedCount} generations with base64 data`);

    // Count remaining generations (should only have URLs)
    const remainingCount = await Generation.countDocuments();
    const withUrlCount = await Generation.countDocuments({
      imageUrl: { $exists: true, $ne: null }
    });

    logger.info(`Remaining generations: ${remainingCount} (${withUrlCount} with URLs)`);

    // Show sample of remaining data
    const sample = await Generation.findOne({
      imageUrl: { $exists: true, $ne: null }
    }).select('prompt imageUrl createdAt');

    if (sample) {
      logger.info('Sample generation with URL:', {
        prompt: sample.prompt,
        imageUrl: sample.imageUrl,
        createdAt: sample.createdAt
      });
    }

    process.exit(0);
  } catch (error) {
    logger.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupGenerations();