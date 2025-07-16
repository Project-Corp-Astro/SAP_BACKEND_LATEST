/**
 * Mock permission middleware for local development
 * Replaces the user-service permission middleware
 */

import { Request, Response, NextFunction } from 'express';

export function requirePermission(permission: string, options?: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    // For local development, just log and continue
    console.log(`[Mock Permission] Checking permission: ${permission}`, options);
    
    // In local development, we'll just pass through
    // In production, this would be replaced by the actual permission middleware
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Permission middleware not properly configured for production'
      });
    }
    
    next();
  };
}
