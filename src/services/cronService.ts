import { CronJob } from 'cron';
import User from '../models/User';
import Generation from '../models/Generation';
import logger from '../utils/logger';

class CronService {
  private jobs: Map<string, CronJob> = new Map();

  /**
   * Initialize all cron jobs
   */
  initialize(): void {
    this.setupDailyLimitReset();
    this.setupWeeklyCleanup();
    
    // Start all jobs
    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`[CRON] Started job: ${name}`);
    });
    
    logger.info('Cron jobs initialized successfully');
  }

  /**
   * Setup daily limit reset job - runs at 12:00 AM IST every day
   */
  private setupDailyLimitReset(): void {
    const job = new CronJob(
      '0 0 * * *', // 12:00 AM every day
      async () => {
        try {
          logger.info('[CRON] Starting daily generation limit reset...');
          
          const startTime = Date.now();
          
          // Reset dailyGenerationCount for all users who don't have their own API key
          const result = await User.updateMany(
            { hasApiKey: false }, // Only reset for users without their own API key
            { 
              $set: { 
                dailyGenerationCount: 0,
                lastGenerationDate: null // Reset to null so next generation starts fresh count
              } 
            }
          );

          const duration = Date.now() - startTime;
          
          logger.info(`[CRON] Daily limit reset completed`, {
            usersUpdated: result.modifiedCount,
            totalMatched: result.matchedCount,
            duration: `${duration}ms`
          });

          // Log statistics
          await this.logUsageStatistics();
          
        } catch (error) {
          logger.error('[CRON] Failed to reset daily limits:', error);
        }
      },
      null, // onComplete callback
      false, // Don't start immediately - will be started in initialize()
      'Asia/Kolkata' // IST timezone
    );

    this.jobs.set('dailyLimitReset', job);
    
    // Log next execution time
    const nextDate = job.nextDate();
    logger.info(`[CRON] Daily limit reset scheduled. Next run: ${nextDate.toISO()}`);
  }

  /**
   * Setup weekly cleanup job - runs at 2:00 AM IST every Sunday
   */
  private setupWeeklyCleanup(): void {
    const job = new CronJob(
      '0 2 * * 0', // 2:00 AM every Sunday
      async () => {
        try {
          logger.info('[CRON] Starting weekly cleanup...');
          
          const startTime = Date.now();
          
          // Clean up old failed generations (older than 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const deleteResult = await Generation.deleteMany({
            status: 'failed',
            createdAt: { $lt: thirtyDaysAgo }
          });

          // Clean up orphaned generations (no imageUrl and no imageData)
          const orphanResult = await Generation.deleteMany({
            $and: [
              { imageUrl: { $exists: false } },
              { imageData: { $exists: false } },
              { createdAt: { $lt: thirtyDaysAgo } }
            ]
          });

          const duration = Date.now() - startTime;
          
          logger.info(`[CRON] Weekly cleanup completed`, {
            failedGenerationsDeleted: deleteResult.deletedCount,
            orphanedGenerationsDeleted: orphanResult.deletedCount,
            duration: `${duration}ms`
          });
          
        } catch (error) {
          logger.error('[CRON] Failed to perform weekly cleanup:', error);
        }
      },
      null,
      true,
      'Asia/Kolkata'
    );

    this.jobs.set('weeklyCleanup', job);
    
    const nextDate = job.nextDate();
    logger.info(`[CRON] Weekly cleanup scheduled. Next run: ${nextDate.toISO()}`);
  }

  /**
   * Log usage statistics
   */
  private async logUsageStatistics(): Promise<void> {
    try {
      // Get user statistics
      const totalUsers = await User.countDocuments();
      const usersWithApiKey = await User.countDocuments({ hasApiKey: true });
      const activeUsersToday = await User.countDocuments({ 
        dailyGenerationCount: { $gt: 0 } 
      });

      // Get generation statistics for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayGenerations = await Generation.countDocuments({
        createdAt: { $gte: today }
      });

      const todayEdits = await Generation.countDocuments({
        createdAt: { $gte: today },
        isEdit: true
      });

      logger.info('[CRON] Daily usage statistics', {
        totalUsers,
        usersWithApiKey,
        activeUsersToday,
        todayGenerations,
        todayEdits,
        freeUsersLimited: activeUsersToday - usersWithApiKey
      });
    } catch (error) {
      logger.error('[CRON] Failed to log usage statistics:', error);
    }
  }

  /**
   * Manually trigger daily reset (for testing)
   */
  async triggerDailyReset(): Promise<{ success: boolean; usersUpdated: number }> {
    try {
      logger.info('[CRON] Manually triggering daily limit reset...');
      
      const result = await User.updateMany(
        { hasApiKey: false },
        { 
          $set: { 
            dailyGenerationCount: 0,
            lastGenerationDate: null
          } 
        }
      );

      await this.logUsageStatistics();

      return {
        success: true,
        usersUpdated: result.modifiedCount
      };
    } catch (error) {
      logger.error('[CRON] Manual reset failed:', error);
      return {
        success: false,
        usersUpdated: 0
      };
    }
  }

  /**
   * Get status of all cron jobs
   */
  getStatus(): { [key: string]: { running: boolean; nextRun: string | null } } {
    const status: { [key: string]: { running: boolean; nextRun: string | null } } = {};
    
    this.jobs.forEach((job, name) => {
      // CronJob has a `running` property but it's not in the type definitions
      const isRunning = (job as any).running === true;
      const nextDate = job.nextDate();
      status[name] = {
        running: isRunning,
        nextRun: nextDate ? nextDate.toISO() : null
      };
    });

    return status;
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    this.jobs.forEach((job, name) => {
      // CronJob has a `running` property but it's not in the type definitions
      if ((job as any).running === true) {
        job.stop();
        logger.info(`[CRON] Stopped job: ${name}`);
      }
    });
  }

  /**
   * Start all cron jobs
   */
  startAll(): void {
    this.jobs.forEach((job, name) => {
      // CronJob has a `running` property but it's not in the type definitions
      if ((job as any).running !== true) {
        job.start();
        logger.info(`[CRON] Started job: ${name}`);
      }
    });
  }
}

// Export singleton instance
export default new CronService();