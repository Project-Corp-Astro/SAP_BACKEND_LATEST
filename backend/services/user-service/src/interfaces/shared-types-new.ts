/**
 * Shared types for user service
 * Clean interface definitions without conflicting imports
 */
import { Document } from 'mongoose';

// Core user interface
export interface BaseUser {
  _id?: string;
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  isVerified?: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  role?: string;
}

// Extended user with additional properties  
export interface ExtendedUser extends BaseUser {
  phoneNumber?: string;
  isEmailVerified?: boolean;
  avatar?: string;
  userAddress?: UserAddress | string;
  metadata?: Record<string, any>;
  preferences?: UserPreferences;
  securityPreferences?: SecurityPreferences;
  fullName?: string;
  timezone?: string;
  language?: string;
  address?: Address;
  socialLinks?: SocialLinks;
  profilePicture?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  manager?: string;
  location?: string;
  workStartDate?: Date;
  accessLevel?: number;
  tags?: string[];
  customFields?: Record<string, any>;
  subscriptionId?: string;
  permissions?: string[];
  devices?: DeviceInfo[];
  rolePermissionIds?: string[];
  roles?: Array<{
    _id: string;
    name?: string;
    role?: string;
    permissions?: string[];
  }>;
}

// Document interface for Mongoose - clean interface to avoid conflicts
export interface UserDocument extends Document {
  _id: string;
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  isVerified?: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  role?: string;
  phoneNumber?: string;
  isEmailVerified?: boolean;
  avatar?: string;
  userAddress?: UserAddress | string;
  metadata?: Record<string, any>;
  userPreferences?: UserPreferences;
  securityPreferences?: SecurityPreferences;
  fullName?: string;
  timezone?: string;
  language?: string;
  userLocation?: Address;
  socialLinks?: SocialLinks;
  profilePicture?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  manager?: string;
  location?: string;
  workStartDate?: Date;
  accessLevel?: number;
  tags?: string[];
  customFields?: Record<string, any>;
  subscriptionId?: string;
}

// User preferences
export interface UserPreferences {
  theme?: string;
  notifications?: NotificationSettings;
  privacy?: PrivacySettings;
  language?: string;
  timezone?: string;
}

// Theme enum
export enum ThemeType {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

// Application type enum
export enum ApplicationType {
  CORP_ASTRO = 'corp_astro',
  TELL_MY_STARS = 'tell_my_stars'
}

// User roles enum
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager', 
  USER = 'user',
  GUEST = 'guest'
}

// Activity types
export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PROFILE_UPDATE = 'profile_update',
  PERMISSION_CHANGE = 'permission_change',
  SETTINGS_UPDATE = 'settings_update'
}

// Notification settings
export interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  inApp?: boolean;
}

// Privacy settings
export interface PrivacySettings {
  profileVisibility?: string;
  dataSharing?: boolean;
  analytics?: boolean;
}

// Security preferences
export interface SecurityPreferences {
  twoFactorEnabled?: boolean;
  loginNotifications?: boolean;
  deviceTracking?: boolean;
}

// Device information
export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  userAgent?: string;
  lastAccess?: Date;
}

// User address
export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  type?: string;
}

// Address interface
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

// Social links
export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  github?: string;
  website?: string;
}

// User filter
export interface UserFilter {
  search?: string;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
  application?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  [key: string]: any;
}

// Pagination result
export interface UserPaginationResult {
  users: UserDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Activity filter
export interface ActivityFilter {
  userId?: string;
  type?: ActivityType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Activity pagination result
export interface ActivityPaginationResult {
  activities: any[];
  total: number;
  page: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// User registration data
export interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  application?: ApplicationType;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email?: string;
  rolePermissionIds?: string[];
  iat?: number;
  exp?: number;
}
