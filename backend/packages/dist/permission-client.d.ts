import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to require a specific permission (checked via remote user service)
 */
export declare function requireRemotePermission(permission: string, options?: {
    application?: string;
    allowSuperadmin?: boolean;
}): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware to require any of a list of permissions (checked via remote user service)
 */
export declare function requireRemoteAnyPermission(permissions: string[], options?: {
    application?: string;
    allowSuperadmin?: boolean;
}): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
