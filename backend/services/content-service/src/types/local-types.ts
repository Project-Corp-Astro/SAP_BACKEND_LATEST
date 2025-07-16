import { ObjectId } from 'mongodb';

// Temporary local types for development
export interface Content {
  _id: string | ObjectId;
  title: string;
  description?: string;
  body?: string;
  status: ContentStatus;
  type: ContentType;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  PENDING_REVIEW = 'pending_review'
}

export enum ContentType {
  ARTICLE = 'article',
  VIDEO = 'video',
  IMAGE = 'image',
  AUDIO = 'audio',
  DOCUMENT = 'document'
}

export interface User {
  _id: string | ObjectId;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator'
}

export interface AuthUser {
  _id: string | ObjectId;
  email: string;
  username?: string;
  role?: UserRole;
  permissions?: string[];
  rolePermissionIds?: string[];
}

export interface Permission {
  name: string;
  description: string;
  resource: string;
  action: string;
}
