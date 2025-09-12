import mongoose from 'mongoose';
import config from './config';
import logger from '../utils/logger';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected) {
    logger.info('MongoDB already connected');
    return;
  }

  try {
    if (!config.mongodb.uri) {
      throw new Error('MongoDB URI is not configured');
    }

    const conn = await mongoose.connect(config.mongodb.uri, {
      dbName: 'codenex-images',
      retryWrites: true,
      w: 'majority',
    });

    isConnected = true;
    logger.info(`MongoDB connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    isConnected = false;
    
    // Retry connection after 5 seconds
    if (config.env !== 'test') {
      logger.info('Retrying MongoDB connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
};

export const getDBStatus = (): boolean => isConnected;

export default { connectDB, disconnectDB, getDBStatus };