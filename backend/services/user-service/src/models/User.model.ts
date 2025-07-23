import mongoose, { Schema, Document, Types } from 'mongoose';

// Define the address interface locally
interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// Document interface for User with all properties
export interface IUserDocument extends Document {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  password?: string;
  roles?: Array<{
    _id: string;
    name?: string;
    role?: string;
    permissions?: string[];
  }>;
  rolePermissionIds?: string[];
  permissions?: string[];
  devices?: any[];
  profileImage?: string;
  userAddress?: UserAddress | string;  // Rename to avoid conflict with Document.address
  preferences?: any;
  securityPreferences?: any;
  isActive: boolean;
  // Add legacy fields for migration
  permissionsLegacy?: string[];
  role?: string;  // For backward compatibility
}

// Simple User schema
const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String },
  lastName: { type: String },
  phoneNumber: { type: String },
  password: { type: String },
  roles: [{
    _id: { type: Schema.Types.ObjectId },
    name: { type: String, required: true },  // Make name required to match interface
    permissions: [{ type: String }]
  }],
  rolePermissionIds: [{ type: String }],
  permissions: [{ type: String }],
  devices: [{ type: Schema.Types.Mixed }],
  profileImage: { type: String },
  userAddress: { type: Schema.Types.Mixed },           // Use userAddress to avoid conflict
  preferences: { type: Schema.Types.Mixed },  // Add preferences field
  securityPreferences: { type: Schema.Types.Mixed },  // Add securityPreferences field
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const UserModel = mongoose.model<IUserDocument>('User', userSchema);

export default UserModel;
