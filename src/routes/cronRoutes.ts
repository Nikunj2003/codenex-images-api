import { Router, Request, Response } from 'express';
import cronService from '../services/cronService';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/cron/status:
 *   get:
 *     summary: Get status of all cron jobs
 *     description: Returns the current status and next run time for all scheduled cron jobs
 *     tags: [Cron]
 *     responses:
 *       200:
 *         description: Successfully retrieved cron job status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 jobs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Daily Limit Reset"
 *                       schedule:
 *                         type: string
 *                         example: "0 0 * * *"
 *                       isRunning:
 *                         type: boolean
 *                         example: true
 *                       nextRun:
 *                         type: string
 *                         format: date-time
 *                       lastRun:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                 serverTime:
 *                   type: string
 *                   format: date-time
 *                 serverTimeIST:
 *                   type: string
 *                   example: "1/1/2025, 12:00:00 AM"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const status = cronService.getStatus();
  
  res.json({
    success: true,
    jobs: status,
    serverTime: new Date().toISOString(),
    serverTimeIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  });
}));

/**
 * @swagger
 * /api/cron/reset-limits:
 *   post:
 *     summary: Manually trigger daily limit reset
 *     description: Manually triggers the daily generation limit reset for all users (for testing purposes)
 *     tags: [Cron]
 *     responses:
 *       200:
 *         description: Successfully reset daily limits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Successfully reset limits for 10 users"
 *                 usersUpdated:
 *                   type: integer
 *                   example: 10
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/reset-limits', asyncHandler(async (_req: Request, res: Response) => {
  logger.info('[API] Manual daily limit reset requested');
  
  const result = await cronService.triggerDailyReset();
  
  res.json({
    success: result.success,
    message: result.success 
      ? `Successfully reset limits for ${result.usersUpdated} users`
      : 'Failed to reset limits',
    usersUpdated: result.usersUpdated,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/cron/stop:
 *   post:
 *     summary: Stop all cron jobs
 *     description: Stops all running cron jobs
 *     tags: [Cron]
 *     responses:
 *       200:
 *         description: Successfully stopped all cron jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "All cron jobs stopped"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/stop', asyncHandler(async (_req: Request, res: Response) => {
  cronService.stopAll();
  
  res.json({
    success: true,
    message: 'All cron jobs stopped',
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/cron/start:
 *   post:
 *     summary: Start all cron jobs
 *     description: Starts all cron jobs
 *     tags: [Cron]
 *     responses:
 *       200:
 *         description: Successfully started all cron jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "All cron jobs started"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/start', asyncHandler(async (_req: Request, res: Response) => {
  cronService.startAll();
  
  res.json({
    success: true,
    message: 'All cron jobs started',
    timestamp: new Date().toISOString()
  });
}));

export default router;