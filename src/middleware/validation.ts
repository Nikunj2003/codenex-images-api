import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError } from './errorHandler';
import { 
  GenerationRequestSchema, 
  EditRequestSchema, 
  SegmentRequestSchema,
  UserApiKeySchema,
  UserCreateSchema,
  UserUpdateSchema 
} from '../types';

// Generic validation middleware factory
export const validate = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return next(new AppError(`Validation error: ${message}`, 400));
      }
      next(error);
    }
  };
};

// Specific validation middlewares
export const validateGenerateImage = validate(GenerationRequestSchema);
export const validateEditImage = validate(EditRequestSchema);
export const validateSegmentImage = validate(SegmentRequestSchema);
export const validateUserApiKey = validate(UserApiKeySchema);
export const validateCreateUser = validate(UserCreateSchema);
export const validateUpdateUser = validate(UserUpdateSchema);

// Path parameter validation
export const validateAuth0Id = (req: Request, _res: Response, next: NextFunction) => {
  const { auth0Id } = req.params;
  if (!auth0Id || auth0Id.length < 1) {
    return next(new AppError('Invalid auth0Id parameter', 400));
  }
  next();
};

// Query parameter validation
export const validatePaginationQuery = (req: Request, _res: Response, next: NextFunction) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = parseInt(req.query.skip as string) || 0;

  if (limit < 1 || limit > 100) {
    return next(new AppError('Limit must be between 1 and 100', 400));
  }

  if (skip < 0) {
    return next(new AppError('Skip must be non-negative', 400));
  }

  req.query.limit = limit.toString();
  req.query.skip = skip.toString();
  next();
};

// Custom validators for special cases
export const validateBase64Image = (fieldName: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const imageData = req.body[fieldName];
    
    if (!imageData) {
      return next(); // Field is optional
    }

    // Basic base64 validation
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(imageData)) {
      return next(new AppError(`${fieldName} must be a valid base64 string`, 400));
    }

    // Check size (limit to 10MB)
    const sizeInBytes = (imageData.length * 3) / 4;
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (sizeInBytes > maxSize) {
      return next(new AppError(`${fieldName} exceeds maximum size of 10MB`, 400));
    }

    next();
  };
};

// Sanitization middleware
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  // Remove any unexpected fields
  const allowedFields = new Set([
    'auth0Id', 'prompt', 'instruction', 'settings', 'originalImage', 
    'maskImage', 'referenceImages', 'temperature', 'seed', 'image', 
    'query', 'email', 'name', 'picture', 'geminiApiKey', 'width', 'height',
    'negativePrompt', 'isEdit', 'editInstruction', 'imageData', 'status', 'metadata'
  ]);

  Object.keys(req.body).forEach(key => {
    if (!allowedFields.has(key)) {
      delete req.body[key];
    }
  });

  // Trim string fields
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  });

  next();
};