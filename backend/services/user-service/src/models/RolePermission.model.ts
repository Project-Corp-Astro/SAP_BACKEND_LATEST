// models/mongodb/RolePermission.model.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

// Define Permission interface for individual permissions
interface IPermission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

// Define RolePermission document interface
interface IRolePermissionDocument extends Document {
  _id: string;
  role: string;
  application: string;
  version?: number;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const rolePermissionSchema = new Schema({
  role: {
    type: String,
    required: true,
    index: true
  },
  application: {
    type: String,
    required: true,
    index: true
  },
  permissions: {
    type: [String] as any,
    required: true
  },
  version: { 
    type: Number as any, 
    default: 1 
  }
}, { 
  timestamps: true,
  versionKey: false 
});

// Compound index for faster lookups
rolePermissionSchema.index({ _id: 1, application: 1 });  // For permission lookups
rolePermissionSchema.index({ 
  application: 1,
  'permissions': 1 
}, { 
  sparse: true 
});

const RolePermissionModel = mongoose.model<IRolePermissionDocument>('RolePermission', rolePermissionSchema);

export default RolePermissionModel;
export type { IRolePermissionDocument, IPermission };