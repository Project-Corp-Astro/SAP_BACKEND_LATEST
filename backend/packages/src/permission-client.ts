import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

const USER_SERVICE_PERMISSION_API_URL = process.env.USER_SERVICE_PERMISSION_API_URL || 'http://localhost:3002';

interface AuthenticatedUser {
  _id: string;
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
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
      if (!req.user || !req.user._id) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const response = await axios.post(`${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`, {
        permission,
        application,
        allowSuperadmin
      }, {
        headers: {
          Authorization: req.headers.authorization || ''
        }
      });

      if (response.data?.data?.hasPermission) {
        return next();
      } else {
        return res.status(403).json({
          success: false,
          message: `Required permission: ${permission}`
        });
      }
    } catch (err) {
      console.error('Permission check error', err);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
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
      if (!req.user || !req.user._id) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      for (const permission of permissions) {
        const response = await axios.post(`${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`, {
          permission,
          application,
          allowSuperadmin
        }, {
          headers: {
            Authorization: req.headers.authorization || ''
          }
        });

        if (response.data?.data?.hasPermission) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    } catch (err) {
      console.error('Permission check error', err);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
}
