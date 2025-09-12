import { Request, Response, NextFunction } from 'express';
import { expressjwt as jwt, GetVerificationKey } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { AppError } from './errorHandler';
import logger from '../utils/logger';

// Extend Express Request type to include auth property
declare global {
  namespace Express {
    interface Request {
      auth?: {
        sub: string;
        iss: string;
        aud: string | string[];
        iat: number;
        exp: number;
        azp?: string;
        scope?: string;
        permissions?: string[];
        [key: string]: any;
      };
    }
  }
}

// Get Auth0 configuration from environment variables
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const AUTH0_ISSUER = process.env.AUTH0_ISSUER || `https://${AUTH0_DOMAIN}/`;

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  logger.warn('Auth0 configuration missing. JWT authentication will be disabled.');
}

// Create the JWT verification middleware
const checkJwt = AUTH0_DOMAIN && AUTH0_AUDIENCE ? jwt({
  // Retrieve the signing key from Auth0 JWKS endpoint
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
  }) as GetVerificationKey,

  // Validate the audience and the issuer
  audience: AUTH0_AUDIENCE,
  issuer: AUTH0_ISSUER,
  algorithms: ['RS256']
}) : null;

// Main authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication if not configured
  if (!checkJwt) {
    logger.warn('JWT authentication skipped - Auth0 not configured');
    return next();
  }

  // Apply JWT validation
  checkJwt(req, res, (err) => {
    if (err) {
      // Only log detailed error in development, use simpler log in production
      if (process.env.NODE_ENV === 'development') {
        logger.error('JWT validation failed:', err.message);
      }
      
      // Determine the appropriate error message and status code
      if (err.name === 'UnauthorizedError') {
        if (err.message.includes('jwt expired')) {
          return next(new AppError('Token has expired', 401));
        }
        if (err.message.includes('jwt malformed')) {
          return next(new AppError('Invalid token format', 401));
        }
        if (err.message.includes('No authorization token was found')) {
          return next(new AppError('No authorization token provided', 401));
        }
        return next(new AppError('Authentication failed', 401));
      }
      
      return next(err);
    }

    // Token is valid, log the authenticated user
    if (req.auth) {
      logger.info(`Authenticated user: ${req.auth.sub}`);
    }
    
    next();
  });
};

// Optional: Create a middleware for checking specific permissions
export const requirePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AppError('Authentication required', 401));
    }

    const permissions = req.auth.permissions || [];
    
    if (!permissions.includes(permission)) {
      logger.warn(`User ${req.auth.sub} lacks permission: ${permission}`);
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

// Optional: Create a middleware that makes authentication optional
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  // Skip authentication if not configured
  if (!checkJwt) {
    return next();
  }

  // Check if authorization header exists
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // No token provided, continue without authentication
    return next();
  }

  // Token provided, validate it
  checkJwt(req, _res, (err) => {
    if (err) {
      logger.warn('Optional auth token validation failed:', err.message);
      // Token invalid, but continue anyway (optional auth)
      return next();
    }
    
    // Token is valid
    if (req.auth) {
      logger.info(`Optional auth: Authenticated user ${req.auth.sub}`);
    }
    next();
  });
};

// Helper function to extract user ID from authenticated request
export const getUserId = (req: Request): string | null => {
  if (!req.auth || !req.auth.sub) {
    return null;
  }
  
  // Auth0 user IDs typically start with auth0|, google-oauth2|, etc.
  return req.auth.sub;
};

// Helper function to check if request is authenticated
export const isAuthenticated = (req: Request): boolean => {
  return !!req.auth && !!req.auth.sub;
};