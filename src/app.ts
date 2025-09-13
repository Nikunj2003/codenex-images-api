import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import config from './config/config';
import userRoutes from './routes/userRoutes';
import generationRoutes from './routes/generationRoutes';
import cronRoutes from './routes/cronRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import { swaggerSpec } from './config/swagger';

const app: Application = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
if (config.env !== 'test') {
  const morganFormat = config.env === 'development' ? 'dev' : 'combined';
  app.use(morgan(morganFormat, {
    stream: {
      write: (message: string) => logger.http(message.trim())
    }
  }));
}

// Swagger documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .auth-wrapper { 
      background: #f7f7f7; 
      padding: 10px; 
      border-radius: 4px; 
      margin-bottom: 20px;
    }
    .swagger-ui .authorize { 
      background-color: #4CAF50 !important; 
      border-color: #4CAF50 !important;
    }
    .swagger-ui .authorize:hover { 
      background-color: #45a049 !important; 
      border-color: #45a049 !important;
    }
  `,
  customSiteTitle: 'Codenex Images API Documentation',
  customfavIcon: 'https://nikunj.tech/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
    displayRequestDuration: true,
    filter: true
  }
}));

// Serve swagger spec as JSON
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 environment:
 *                   type: string
 *                   example: development
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/generations', generationRoutes);
app.use('/api/cron', cronRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;