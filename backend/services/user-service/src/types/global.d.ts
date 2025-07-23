// TypeScript declaration file to solve interface compatibility issues
import { Document } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id?: string;
        id?: string;
        email: string;
        role?: string;
        rolePermissionIds?: string[];
        permissions?: string[];
        username?: string;
        [key: string]: any;
      };
    }
  }
}

// Extend mongoose Document to include our custom fields
declare module 'mongoose' {
  interface Document {
    password?: string;
    rolePermissionIds?: string[];
    permissionsLegacy?: string[];
    role?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    preferences?: any;
    securityPreferences?: any;
    roles?: Array<{
      _id: string;
      name?: string;
      role?: string;
      permissions?: string[];
    }>;
  }
}
