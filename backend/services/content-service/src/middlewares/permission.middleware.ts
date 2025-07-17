import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../types';

const USER_SERVICE_PERMISSION_API_URL = process.env.USER_SERVICE_PERMISSION_API_URL || 'http://localhost:3002';

interface PermissionCheckResponse {
  success: boolean;
  data?: {
    hasPermission: boolean;
    reason?: string;
  };
  message?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Utility function to validate permission parameters
 */
function validatePermissionParams(permission: string | string[], application?: string): { valid: boolean; error?: string } {
  if (Array.isArray(permission)) {
    if (permission.length === 0) {
      return { valid: false, error: 'Permissions array cannot be empty' };
    }
    const invalidPermissions = permission.filter(p => !p || typeof p !== 'string');
    if (invalidPermissions.length > 0) {
      return { valid: false, error: 'All permissions must be non-empty strings' };
    }
  } else {
    if (!permission || typeof permission !== 'string') {
      return { valid: false, error: 'Permission must be a non-empty string' };
    }
  }

  if (application && typeof application !== 'string') {
    return { valid: false, error: 'Application must be a string' };
  }

  return { valid: true };
}

/**
 * Utility function to handle axios errors consistently
 */
function handlePermissionError(err: any, context: { permission?: string; permissions?: string[]; userId?: string }): { status: number; response: any } {
  const errorContext = {
    error: err.message,
    stack: err.stack,
    ...context,
    url: `${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`,
    timestamp: new Date().toISOString()
  };

  console.error('Permission check error:', errorContext);

  // Handle specific error types
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return {
      status: 503,
      response: {
        success: false,
        message: 'Permission service unavailable',
        code: 'SERVICE_UNAVAILABLE'
      }
    };
  }

  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return {
      status: 504,
      response: {
        success: false,
        message: 'Permission check timeout',
        code: 'SERVICE_TIMEOUT'
      }
    };
  }

  if (err.response?.status === 401) {
    return {
      status: 401,
      response: {
        success: false,
        message: 'Authentication failed with permission service',
        code: 'AUTH_FAILED'
      }
    };
  }

  if (err.response?.status === 404) {
    return {
      status: 404,
      response: {
        success: false,
        message: 'Permission service endpoint not found',
        code: 'ENDPOINT_NOT_FOUND'
      }
    };
  }

  // Generic error response
  return {
    status: 500,
    response: {
      success: false,
      message: 'Permission check failed',
      code: 'PERMISSION_CHECK_FAILED'
    }
  };
}

/**
 * Middleware to require a specific permission (checked via remote user service)
 */
export function requireRemotePermission(
  permission: string,
  options: {
    application?: string;
    allowSuperadmin?: boolean;
  } = {}
) {
  const { application = '*', allowSuperadmin = true } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user authentication
      if (!req.user || !req.user._id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Validate required parameters
      if (!permission || typeof permission !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid permission parameter',
          code: 'INVALID_PERMISSION'
        });
      }

      // Check if user service URL is configured
      if (!USER_SERVICE_PERMISSION_API_URL) {
        console.error('USER_SERVICE_PERMISSION_API_URL not configured');
        return res.status(500).json({
          success: false,
          message: 'Permission service not configured',
          code: 'SERVICE_NOT_CONFIGURED'
        });
      }

      const response = await axios.post(
        `${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`,
        {
          permission,
          application,
          allowSuperadmin,
          userId: req.user._id
        },
        {
          headers: {
            Authorization: req.headers.authorization || '',
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        }
      );

      // Check response structure
      if (!response.data) {
        throw new Error('Invalid response from permission service');
      }

      if (response.data?.data?.hasPermission === true) {
        return next();
      } else {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permission}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission: permission,
          application
        });
      }
    } catch (err: any) {
      // Enhanced error logging
      console.error('Permission check error:', {
        error: err.message,
        stack: err.stack,
        permission,
        application,
        userId: req.user?._id,
        url: `${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`,
        timestamp: new Date().toISOString()
      });

      // Handle specific error types
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return res.status(503).json({
          success: false,
          message: 'Permission service unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      }

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        return res.status(504).json({
          success: false,
          message: 'Permission check timeout',
          code: 'SERVICE_TIMEOUT'
        });
      }

      if (err.response?.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed',
          code: 'AUTH_FAILED'
        });
      }

      if (err.response?.status === 404) {
        return res.status(404).json({
          success: false,
          message: 'Permission service endpoint not found',
          code: 'ENDPOINT_NOT_FOUND'
        });
      }

      // Generic error response
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        code: 'PERMISSION_CHECK_FAILED'
      });
    }
  };
}

/**
 * Middleware to require any of a list of permissions (checked via remote user service)
 */
export function requireRemoteAnyPermission(
  permissions: string[],
  options: {
    application?: string;
    allowSuperadmin?: boolean;
  } = {}
) {
  const { application = '*', allowSuperadmin = true } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user authentication
      if (!req.user || !req.user._id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Validate permissions array
      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid permissions parameter - must be a non-empty array',
          code: 'INVALID_PERMISSIONS'
        });
      }

      // Validate each permission string
      const invalidPermissions = permissions.filter(p => !p || typeof p !== 'string');
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'All permissions must be non-empty strings',
          code: 'INVALID_PERMISSION_FORMAT'
        });
      }

      // Check if user service URL is configured
      if (!USER_SERVICE_PERMISSION_API_URL) {
        console.error('USER_SERVICE_PERMISSION_API_URL not configured');
        return res.status(500).json({
          success: false,
          message: 'Permission service not configured',
          code: 'SERVICE_NOT_CONFIGURED'
        });
      }

      let hasAnyPermission = false;
      const checkedPermissions: string[] = [];

      for (const permission of permissions) {
        try {
          const response = await axios.post(
            `${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`,
            {
              permission,
              application,
              allowSuperadmin,
              userId: req.user._id
            },
            {
              headers: {
                Authorization: req.headers.authorization || '',
                'Content-Type': 'application/json'
              },
              timeout: 5000 // 5 second timeout per request
            }
          );

          checkedPermissions.push(permission);

          // Check response structure
          if (!response.data) {
            console.warn(`Invalid response for permission ${permission}`);
            continue;
          }

          if (response.data?.data?.hasPermission === true) {
            hasAnyPermission = true;
            break;
          }
        } catch (permissionError: any) {
          console.warn(`Error checking permission ${permission}:`, {
            error: permissionError.message,
            permission,
            userId: req.user._id
          });
          // Continue checking other permissions instead of failing completely
          continue;
        }
      }

      if (hasAnyPermission) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Access denied. Required any of: ${permissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: permissions,
        checkedPermissions,
        application
      });
    } catch (err: any) {
      // Enhanced error logging
      console.error('Permission check error (any permission):', {
        error: err.message,
        stack: err.stack,
        permissions,
        application,
        userId: req.user?._id,
        url: `${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`,
        timestamp: new Date().toISOString()
      });

      // Handle specific error types (same as single permission check)
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return res.status(503).json({
          success: false,
          message: 'Permission service unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      }

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        return res.status(504).json({
          success: false,
          message: 'Permission check timeout',
          code: 'SERVICE_TIMEOUT'
        });
      }

      // Generic error response
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        code: 'PERMISSION_CHECK_FAILED'
      });
    }
  };
}
