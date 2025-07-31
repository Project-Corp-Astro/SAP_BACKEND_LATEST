import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../interfaces/local-shared-types';
import { JwtPayload } from '../interfaces/shared-types';

// Create a simple logger for auth middleware
const logger = {
  info: (...args: any[]) => console.info('[Auth Middleware]', ...args),
  error: (...args: any[]) => console.error('[Auth Middleware]', ...args),
  warn: (...args: any[]) => console.warn('[Auth Middleware]', ...args),
  debug: (...args: any[]) => console.debug('[Auth Middleware]', ...args),
};

// JWT secret key - should be stored in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || '3e4c77c0f78f1aaabf3b15f8ce5fa4cc9c8040b2f9ff3732c4ef3a07f49128b5b3e6f59b19fce67c622d5c9edb9b0ffacfea64f63164eaa6ac59e8913e2dc962';

// Note: Express interface extension is now in src/types/express.d.ts

/**
 * Authentication middleware to protect routes
 * Validates JWT token and attaches user payload to request
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    // Get auth header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.'
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Attach user info to request with only the data we have in the token
    (req as any).user = {
      _id: decoded.userId,
      email: decoded.email,
      rolePermissionIds: decoded.rolePermissionIds || []
    };
    
    // Log the decoded token for debugging
    console.log('Decoded JWT:', JSON.stringify(decoded, null, 2));
    console.log('Attached user to request:', (req as any).user);
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', { error: (error as Error).message });
    
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};
