import mongoose from 'mongoose';
import Generation from '../models/Generation';
import cloudinaryService from '../services/cloudinaryService';
import logger from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrateGenerations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    logger.info('Connected to MongoDB for migration');

    // Check if Cloudinary is configured
    if (!cloudinaryService.isConfigured()) {
      logger.error('Cloudinary is not configured. Please set up your Cloudinary credentials.');
      process.exit(1);
    }

    // Get all generations with imageData but no imageUrl
    const generationsToMigrate = await Generation.find({
      imageData: { $exists: true, $ne: null },
      imageUrl: { $exists: false }
    }).limit(100); // Process in batches

    logger.info(`Found ${generationsToMigrate.length} generations to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const generation of generationsToMigrate) {
      try {
        if (generation.imageData) {
          // Upload to Cloudinary
          const imageUrl = await cloudinaryService.uploadImage(
            generation.imageData,
            `generations/${generation.userId}`
          );
          
          // Update generation with URL and remove imageData
          await Generation.updateOne(
            { _id: generation._id },
            {
              $set: { imageUrl },
              $unset: { imageData: 1 }
            }
          );
          
          successCount++;
          logger.info(`Migrated generation ${generation._id}`);
        }
      } catch (error) {
        errorCount++;
        logger.error(`Failed to migrate generation ${generation._id}:`, error);
      }
    }

    logger.info(`Migration complete: ${successCount} successful, ${errorCount} failed`);

    // Optional: Delete generations that are too old or corrupted
    const deletedCount = await Generation.deleteMany({
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Older than 30 days
      imageUrl: { $exists: false },
      imageData: { $exists: false }
    });

    logger.info(`Deleted ${deletedCount.deletedCount} old/corrupted generations`);

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateGenerations();