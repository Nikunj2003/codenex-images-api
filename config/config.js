"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
// Define the configuration schema with Zod
const configSchema = zod_1.z.object({
    env: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    port: zod_1.z.number().min(1).max(65535).default(3000),
    mongodb: zod_1.z.object({
        uri: zod_1.z.string().url().optional(),
    }),
    cors: zod_1.z.object({
        origin: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).default('http://localhost:8080'),
        credentials: zod_1.z.boolean().default(true),
    }),
    rateLimit: zod_1.z.object({
        windowMs: zod_1.z.number().default(15 * 60 * 1000), // 15 minutes
        max: zod_1.z.number().default(100), // limit each IP to 100 requests per windowMs
    }),
    gemini: zod_1.z.object({
        apiKey: zod_1.z.string().min(1),
        model: zod_1.z.string().default('gemini-2.5-flash-image-preview'),
        maxRetries: zod_1.z.number().default(3),
        timeout: zod_1.z.number().default(30000),
    }),
    encryption: zod_1.z.object({
        algorithm: zod_1.z.string().default('aes-256-cbc'),
        secretKey: zod_1.z.string().min(32).default('your-32-character-secret-key-here-change-this!!'),
    }),
    logging: zod_1.z.object({
        level: zod_1.z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
        format: zod_1.z.enum(['json', 'simple']).default('json'),
    }),
    cache: zod_1.z.object({
        ttl: zod_1.z.number().default(3600), // 1 hour
        checkPeriod: zod_1.z.number().default(600), // 10 minutes
    }),
});
// Parse and validate configuration
const config = configSchema.parse({
    env: process.env.NODE_ENV,
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
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
    },
    cache: {
        ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
        checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '600', 10),
    },
});
exports.default = config;
//# sourceMappingURL=config.js.map