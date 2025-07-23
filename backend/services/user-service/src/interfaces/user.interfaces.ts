import { Document } from 'mongoose';
import type { Permission, UserRole } from './local-shared-types';

import { ActivityType } from '../models/UserActivity';
import { DeviceType, DeviceLocation } from '../models/UserDevice';
import {
  AstrologyUserProfile,
  BusinessProfile,
  AstrologyPreferences,
  AstrologySubscription,
  AstrologySpecialist,
} from './astrology.interfaces';

import {
  ExtendedUser,
  UserDocument,
  ThemePreference,
  NotificationPreferences,
  UserPreferences,
  SecurityPreferences,
  UserAddress,
  IUserDevice,
  IUserActivity,
  UserFilter,
  UserPaginationResult,
  ActivityFilter,
  ActivityPaginationResult,
  JwtPayload,
} from './shared-types';

// Export UserDocument for use by other modules
export { UserDocument } from './shared-types';

/**
 * Legacy User interface - use ExtendedUser from shared-types.ts instead
 * @deprecated Use ExtendedUser from shared-types.ts instead
 */
export interface IUser extends ExtendedUser {
  username: string;
  phoneNumber?: string;
  isActive: boolean;
  // permissions inherited from ExtendedUser as string[]
}
