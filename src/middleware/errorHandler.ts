import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import logger from '../utils/logger';
import config from '../config/config';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = err as AppError;

  // If not operational error, convert it
  if (!(error instanceof AppError)) {
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    const message = err.message || 'Internal Server Error';
    error = new AppError(message, statusCode);
  }

  // Log error
  logger.error({
    error: {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
  });

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      status: error.statusCode,
      ...(config.env === 'development' && { stack: error.stack }),
    },
  });
};

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
  const message = `Route not found: ${req.originalUrl}`;
  res.status(404).json({
    success: false,
    error: {
      message,
      status: 404,
    },
  });
};