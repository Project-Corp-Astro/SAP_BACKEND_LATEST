/**
 * Performance Monitoring Middleware
 * 
 * This middleware tracks response times for all API requests and logs them
 * to help identify performance bottlenecks.
 */

import { Request, Response, NextFunction } from 'express';
import performanceMonitor from '../utils/performance';
import logger from '../utils/logger';

/**
 * Middleware to track response time for all API requests
 */
export function trackResponseTime(req: Request, res: Response, next: NextFunction): void {
  // Record start time
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to calculate response time
  // @ts-ignore - We need to override the end function to track response time
  res.end = function(this: Response, chunk?: any, encoding?: any, callback?: any): Response {
    // Calculate response time
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Track response time in performance monitor
    performanceMonitor.trackResponseTime(
      startTime,
      endTime,
      req.originalUrl || req.url,
      res.statusCode
    );
    
    // Log slow responses (over 500ms)
    if (responseTime > 500) {
      logger.warn(`Slow response: ${req.method} ${req.originalUrl || req.url} (${responseTime}ms)`, {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      });
    }
    
    // Call original end function
    if (typeof encoding === 'function') {
      // Handle overload where encoding is actually the callback
      return originalEnd.call(this, chunk, encoding);
    } else {
      return originalEnd.call(this, chunk, encoding as BufferEncoding, callback);
    }
  };
  
  next();
}

/**
 * Placeholder for database performance tracking
 * This is kept for compatibility but doesn't do anything
 * since we're not using Mongoose
 */
export function trackDatabasePerformance(_req: Request, _res: Response, next: NextFunction): void {
  // No-op implementation since we're not using Mongoose
  next();
}

export default {
  trackResponseTime,
  trackDatabasePerformance
};