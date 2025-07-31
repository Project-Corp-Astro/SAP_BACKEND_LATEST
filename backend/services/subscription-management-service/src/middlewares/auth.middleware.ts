import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import logger from '../utils/logger';

// Define AuthUser interface locally to avoid shared dependency issues
interface AuthUser {
  id: string;
  _id?: string;
  email: string;
  role: string;
  permissions?: string[];
  userId?: string;
  rolePermissionIds?: string[];
}

// Define JWT payload interface
interface CustomJwtPayload {
  userId: string;
  email: string;
  role?: string;
  rolePermissionIds?: string[];
}

// Set the service name for logging
const SERVICE_NAME = 'subscription-management-service';

// JWT secret key - should be stored in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';


// Define JWT payload interface
interface JwtPayload {
  userId: string;
  email: string;
  rolePermissionIds?: string[];
  iat?: number;
  exp?: number;
}

// Extend Express Request type to include our user property
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Define the auth middleware
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get auth header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`[${SERVICE_NAME}] Missing or invalid auth header`);
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid token.',
    });
    return;
  }

  // Extract token
  const token = authHeader.split(' ')[1];

  if (!token) {
    logger.warn(`[${SERVICE_NAME}] Missing token`);
    res.status(401).json({
      success: false,
      message: 'Authentication token is missing',
    });
    return;
  }

  // Verify token
  try {
    console.log("token",token )
    console.log("Jwt secret",JWT_SECRET)
    const payload = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;

    // Attach user info to request
    req.user = {
      id: payload.userId,
      _id: payload.userId,
      email: payload.email,
      role: payload.role || 'user',
      rolePermissionIds: payload.rolePermissionIds || [],
    };

    // Log the decoded token for debugging
    // logger.debug(`[${SERVICE_NAME}] Decoded JWT: ${JSON.stringify(payload, null, 2)}`);
    // logger.debug(`[${SERVICE_NAME}] Attached user to request: ${JSON.stringify(req.user)}`);

    next();
  } catch (err) {
    logger.error(`[${SERVICE_NAME}] Token verification error: ${(err as Error).message}`);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};