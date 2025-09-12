import http from 'http';
import app from './app';
import config from './config/config';
import { connectDB } from './config/database';
import logger from './utils/logger';
import cronService from './services/cronService';

// Create HTTP server
const server = http.createServer(app);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize cron jobs
    cronService.initialize();
    logger.info('✅ Cron jobs initialized - Daily limit reset at 12:00 AM IST');
    
    // Start listening
    server.listen(config.port, () => {
      logger.info(`
        ################################################
        🚀 Server listening on port: ${config.port}
        🌍 Environment: ${config.env}
        📝 Log level: ${config.logging.level}
        📅 Cron jobs: Active (Daily reset at 12:00 AM IST)
        ################################################
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  
  // Stop all cron jobs
  cronService.stopAll();
  logger.info('Cron jobs stopped');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
startServer();