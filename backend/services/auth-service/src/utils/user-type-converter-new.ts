import { IUser } from './sharedModules';

// Local enums to avoid dependency issues
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator'
}

// Local interface for UserDocument
interface UserDocument {
  _id: any;
  username?: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  roles?: any[];
  [key: string]: any;
}

/**
 * Helper function to convert UserDocument to IUser
 * This is needed to fix TypeScript errors when passing UserDocument to functions expecting IUser
 */
export function convertToIUser(user: UserDocument): IUser {
  // Create a new object with all required IUser properties
  const iUser: IUser = {
    _id: user._id?.toString() || '',
    username: user.username || '',
    email: user.email || '',
    password: user.password || '', // Include password field
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    role: user.role || UserRole.USER,
    isActive: user.isActive !== undefined ? user.isActive : true,
    roles: user.roles || []
  };

  return iUser;
}
