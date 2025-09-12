import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define the configuration schema with Zod
const configSchema = z.object({
  env: z.enum(['development', 'production', 'test']).default('development'),
  port: z.number().min(1).max(65535).default(3000),
  mongodb: z.object({
    uri: z.string().url().optional(),
  }),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default('http://localhost:8080'),
    credentials: z.boolean().default(true),
  }),
  rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    max: z.number().default(100), // limit each IP to 100 requests per windowMs
  }),
  gemini: z.object({
    apiKey: z.string().min(1),
    model: z.string().default('gemini-2.5-flash-image-preview'),
    maxRetries: z.number().default(3),
    timeout: z.number().default(30000),
  }),
  encryption: z.object({
    algorithm: z.string().default('aes-256-cbc'),
    secretKey: z.string().min(32).default('your-32-character-secret-key-here-change-this!!'),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
    format: z.enum(['json', 'simple']).default('json'),
  }),
  cache: z.object({
    ttl: z.number().default(3600), // 1 hour
    checkPeriod: z.number().default(600), // 10 minutes
  }),
  auth0: z.object({
    domain: z.string().optional(),
    audience: z.string().optional(),
    issuer: z.string().optional(),
  }),
});

// Type inference from schema
export type Config = z.infer<typeof configSchema>;

// Parse and validate configuration
const config: Config = configSchema.parse({
  env: process.env.NODE_ENV as 'development' | 'production' | 'test',
  port: parseInt(process.env.PORT || '3000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:8080',
    credentials: true,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10), // Increased for development
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-image-preview',
    maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.GEMINI_TIMEOUT || '30000', 10),
  },
  encryption: {
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc',
    secretKey: process.env.ENCRYPTION_SECRET || 'your-32-character-secret-key-here-change-this!!',
  },
  logging: {
    level: (process.env.LOG_LEVEL as Config['logging']['level']) || 'info',
    format: (process.env.LOG_FORMAT as Config['logging']['format']) || 'json',
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '600', 10),
  },
  auth0: {
    domain: process.env.AUTH0_DOMAIN,
    audience: process.env.AUTH0_AUDIENCE,
    issuer: process.env.AUTH0_ISSUER || (process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}/` : undefined),
  },
});

export default config;