import { IUser } from './sharedModules';
import { ExtendedUser } from '../interfaces/user-extensions-local';
import { Document } from 'mongoose';

/**
 * Helper function to cast Document to IUser for TypeScript compatibility
 * This is needed because UserDocument has optional properties while IUser has required properties
 */
export function asIUser(user: Document & any): IUser {
  return user as unknown as IUser;
}

/**
 * Helper function to cast any mongoose document to IUser
 */
export function documentToIUser(doc: any): IUser {
  return doc as unknown as IUser;
}

/**
 * Type definitions for JWT token payload
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
}

/**
 * Type definitions for auth tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
