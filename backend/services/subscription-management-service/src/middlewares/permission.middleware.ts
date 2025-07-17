import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../../shared/types/auth-user';
import logger from '../utils/logger';

const USER_SERVICE_PERMISSION_API_URL = process.env.USER_SERVICE_PERMISSION_API_URL || 'http://localhost:3002';
const SERVICE_NAME = 'subscription-management-service';

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
    service: SERVICE_NAME,
    error: err.message,
    stack: err.stack,
    ...context,
    url: `${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`,
    timestamp: new Date().toISOString()
  };

  logger.error('Permission check error:', errorContext);

  // Handle specific error types
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return {
      status: 503,
      response: {
        success: false,
        message: 'Permission service unavailable',
        code: 'SERVICE_UNAVAILABLE',
        service: SERVICE_NAME
      }
    };
  }

  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return {
      status: 504,
      response: {
        success: false,
        message: 'Permission check timeout',
        code: 'SERVICE_TIMEOUT',
        service: SERVICE_NAME
      }
    };
  }

  if (err.response?.status === 401) {
    return {
      status: 401,
      response: {
        success: false,
        message: 'Authentication failed with permission service',
        code: 'AUTH_FAILED',
        service: SERVICE_NAME
      }
    };
  }

  if (err.response?.status === 404) {
    return {
      status: 404,
      response: {
        success: false,
        message: 'Permission service endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        service: SERVICE_NAME
      }
    };
  }

  // Generic error response
  return {
    status: 500,
    response: {
      success: false,
      message: 'Permission check failed',
      code: 'PERMISSION_CHECK_FAILED',
      service: SERVICE_NAME
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
        logger.warn(`[${SERVICE_NAME}] Permission check failed: No authenticated user`);
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          service: SERVICE_NAME
        });
      }

      // Validate required parameters
      const validation = validatePermissionParams(permission, application);
      if (!validation.valid) {
        logger.warn(`[${SERVICE_NAME}] Permission check failed: ${validation.error}`);
        return res.status(400).json({
          success: false,
          message: validation.error,
          code: 'INVALID_PERMISSION',
          service: SERVICE_NAME
        });
      }

      // Check if user service URL is configured
      if (!USER_SERVICE_PERMISSION_API_URL) {
        logger.error(`[${SERVICE_NAME}] USER_SERVICE_PERMISSION_API_URL not configured`);
        return res.status(500).json({
          success: false,
          message: 'Permission service not configured',
          code: 'SERVICE_NOT_CONFIGURED',
          service: SERVICE_NAME
        });
      }

      logger.info(`[${SERVICE_NAME}] Checking permission: ${permission} for user: ${req.user._id?.toString()}`);

      const response = await axios.post(
        `${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`,
        {
          permission,
          application,
          allowSuperadmin,
          userId: req.user._id?.toString()
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
        logger.info(`[${SERVICE_NAME}] Permission granted: ${permission} for user: ${req.user._id?.toString()}`);
        return next();
      } else {
        logger.warn(`[${SERVICE_NAME}] Permission denied: ${permission} for user: ${req.user._id?.toString()}`);
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permission}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission: permission,
          application,
          service: SERVICE_NAME
        });
      }
    } catch (err: any) {
      const errorResponse = handlePermissionError(err, {
        permission,
        userId: req.user?._id?.toString()
      });
      
      return res.status(errorResponse.status).json(errorResponse.response);
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
        logger.warn(`[${SERVICE_NAME}] Permission check failed: No authenticated user`);
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          service: SERVICE_NAME
        });
      }

      // Validate permissions array
      const validation = validatePermissionParams(permissions, application);
      if (!validation.valid) {
        logger.warn(`[${SERVICE_NAME}] Permission check failed: ${validation.error}`);
        return res.status(400).json({
          success: false,
          message: validation.error,
          code: 'INVALID_PERMISSIONS',
          service: SERVICE_NAME
        });
      }

      // Check if user service URL is configured
      if (!USER_SERVICE_PERMISSION_API_URL) {
        logger.error(`[${SERVICE_NAME}] USER_SERVICE_PERMISSION_API_URL not configured`);
        return res.status(500).json({
          success: false,
          message: 'Permission service not configured',
          code: 'SERVICE_NOT_CONFIGURED',
          service: SERVICE_NAME
        });
      }

      let hasAnyPermission = false;
      const checkedPermissions: string[] = [];

      logger.info(`[${SERVICE_NAME}] Checking any permission: [${permissions.join(', ')}] for user: ${req.user._id?.toString()}`);

      for (const permission of permissions) {
        try {
          const response = await axios.post(
            `${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`,
            {
              permission,
              application,
              allowSuperadmin,
              userId: req.user._id?.toString()
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
            logger.warn(`[${SERVICE_NAME}] Invalid response for permission ${permission}`);
            continue;
          }

          if (response.data?.data?.hasPermission === true) {
            hasAnyPermission = true;
            logger.info(`[${SERVICE_NAME}] Permission granted: ${permission} for user: ${req.user._id?.toString()}`);
            break;
          }
        } catch (permissionError: any) {
          logger.warn(`[${SERVICE_NAME}] Error checking permission ${permission}:`, {
            error: permissionError.message,
            permission,
            userId: req.user._id?.toString()
          });
          // Continue checking other permissions instead of failing completely
          continue;
        }
      }

      if (hasAnyPermission) {
        return next();
      }

      logger.warn(`[${SERVICE_NAME}] All permissions denied: [${permissions.join(', ')}] for user: ${req.user._id?.toString()}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Required any of: ${permissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: permissions,
        checkedPermissions,
        application,
        service: SERVICE_NAME
      });
    } catch (err: any) {
      const errorResponse = handlePermissionError(err, {
        permissions,
        userId: req.user?._id?.toString()
      });
      
      return res.status(errorResponse.status).json(errorResponse.response);
    }
  };
}

/**
 * Utility function to check user permission programmatically
 */
export async function checkUserPermission(
  userId: string,
  permission: string,
  options: {
    application?: string;
    allowSuperadmin?: boolean;
    authToken?: string;
  } = {}
): Promise<{ hasPermission: boolean; error?: string }> {
  try {
    const { application = '*', allowSuperadmin = true, authToken } = options;

    // Validate inputs
    const validation = validatePermissionParams(permission, application);
    if (!validation.valid) {
      return { hasPermission: false, error: validation.error };
    }

    if (!userId || typeof userId !== 'string') {
      return { hasPermission: false, error: 'Invalid user ID' };
    }

    if (!USER_SERVICE_PERMISSION_API_URL) {
      return { hasPermission: false, error: 'Permission service not configured' };
    }

    logger.info(`[${SERVICE_NAME}] Programmatic permission check: ${permission} for user: ${userId}`);

    const response = await axios.post(
      `${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`,
      {
        permission,
        application,
        allowSuperadmin,
        userId
      },
      {
        headers: {
          ...(authToken && { Authorization: authToken }),
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    if (!response.data) {
      return { hasPermission: false, error: 'Invalid response from permission service' };
    }

    const hasPermission = response.data?.data?.hasPermission === true;
    logger.info(`[${SERVICE_NAME}] Programmatic permission result: ${hasPermission} for ${permission}`);

    return { hasPermission };

  } catch (err: any) {
    logger.error(`[${SERVICE_NAME}] Programmatic permission check error:`, {
      error: err.message,
      permission,
      userId,
      timestamp: new Date().toISOString()
    });

    return { 
      hasPermission: false, 
      error: `Permission check failed: ${err.message}` 
    };
  }
}

/**
 * Utility function to check multiple permissions programmatically (OR logic)
 */
export async function checkUserAnyPermission(
  userId: string,
  permissions: string[],
  options: {
    application?: string;
    allowSuperadmin?: boolean;
    authToken?: string;
  } = {}
): Promise<{ hasPermission: boolean; grantedPermission?: string; error?: string }> {
  try {
    // Validate inputs
    const validation = validatePermissionParams(permissions, options.application);
    if (!validation.valid) {
      return { hasPermission: false, error: validation.error };
    }

    if (!userId || typeof userId !== 'string') {
      return { hasPermission: false, error: 'Invalid user ID' };
    }

    logger.info(`[${SERVICE_NAME}] Programmatic any permission check: [${permissions.join(', ')}] for user: ${userId}`);

    // Check each permission until one is granted
    for (const permission of permissions) {
      const result = await checkUserPermission(userId, permission, options);
      if (result.hasPermission) {
        logger.info(`[${SERVICE_NAME}] Programmatic permission granted: ${permission} for user: ${userId}`);
        return { 
          hasPermission: true, 
          grantedPermission: permission 
        };
      }
    }

    return { 
      hasPermission: false, 
      error: `User does not have any of the required permissions: ${permissions.join(', ')}` 
    };

  } catch (err: any) {
    logger.error(`[${SERVICE_NAME}] Programmatic multiple permission check error:`, {
      error: err.message,
      permissions,
      userId,
      timestamp: new Date().toISOString()
    });

    return { 
      hasPermission: false, 
      error: `Permission check failed: ${err.message}` 
    };
  }
}
