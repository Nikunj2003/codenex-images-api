import winston from 'winston';
import config from '../config/config';
import path from 'path';
import fs from 'fs';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

const level = (): string => {
  const env = config.env || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'white',
  silly: 'gray',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Detect serverless environments where local FS is read-only (except /tmp)
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const transports: winston.transport[] = [
  new winston.transports.Console(),
];

if (!isServerless) {
  // Use project logs dir for local/dev or traditional servers
  const logDir = path.join(process.cwd(), 'logs');
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch {
    // Fallback to console-only if we cannot create the directory
  }

  transports.push(
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'all.log') }),
  );
}

const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

export default logger;