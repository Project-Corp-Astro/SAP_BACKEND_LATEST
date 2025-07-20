// Local user extensions for auth service
// Using local interfaces instead of shared modules to avoid path issues

export interface UserMFA {
  enabled: boolean;
  type: string;
  secret?: string;
  backupCodes?: string[];
  verified: boolean;
  lastVerified?: Date;
}

export interface UserSecurity {
  passwordLastChanged?: Date;
  passwordExpiryDays?: number;
  loginAttempts?: number;
  lockUntil?: Date;
  accountLocked?: boolean;
}

export interface UserPreferences {
  theme?: string;
  language?: string;
  notifications?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

// Extended user interface for auth service
export interface ExtendedUser {
  _id?: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
  mfa?: UserMFA;
  security?: UserSecurity;
  preferences?: UserPreferences;
  passwordLastChanged?: Date;
  loginAttempts?: any[];
  lockUntil?: number;
  accountLocked?: boolean;
}
