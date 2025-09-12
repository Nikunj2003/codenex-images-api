import mongoose from 'mongoose';
import Generation from '../models/Generation';
import logger from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function deleteBrokenGenerations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    logger.info('Connected to MongoDB for cleanup');

    // Find generations without both imageUrl and imageData
    const brokenGenerations = await Generation.find({
      $or: [
        { imageUrl: { $exists: false }, imageData: { $exists: false } },
        { imageUrl: null, imageData: null },
        { imageUrl: '', imageData: '' },
        { imageUrl: '', imageData: { $exists: false } },
        { imageUrl: { $exists: false }, imageData: '' }
      ]
    });
    
    logger.info(`Found ${brokenGenerations.length} broken generations`);
    
    // Show details of broken generations
    for (const gen of brokenGenerations) {
      logger.info(`Broken generation: ${gen._id}`, {
        prompt: gen.prompt,
        hasUrl: !!gen.imageUrl,
        hasData: !!gen.imageData,
        createdAt: gen.createdAt
      });
    }

    // Delete broken generations
    const result = await Generation.deleteMany({
      $or: [
        { imageUrl: { $exists: false }, imageData: { $exists: false } },
        { imageUrl: null, imageData: null },
        { imageUrl: '', imageData: '' },
        { imageUrl: '', imageData: { $exists: false } },
        { imageUrl: { $exists: false }, imageData: '' }
      ]
    });

    logger.info(`Deleted ${result.deletedCount} broken generations`);

    // Count remaining
    const remaining = await Generation.countDocuments();
    const withUrl = await Generation.countDocuments({ imageUrl: { $exists: true, $ne: null } });
    const withData = await Generation.countDocuments({ imageData: { $exists: true, $ne: null } });

    logger.info(`Remaining: ${remaining} total (${withUrl} with URL, ${withData} with data)`);

    process.exit(0);
  } catch (error) {
    logger.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
deleteBrokenGenerations();