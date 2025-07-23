import { Request, Response } from 'express';
import { Types } from 'mongoose';
import RolePermissionModel from '../models/RolePermission.model';
import { PermissionService } from '../services/PermissionService';
// Use local User model instead of problematic import
import UserModel from '../models/User.model';

// Use local error classes instead of importing from problematic paths
class BadRequestError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

interface ValidationError {
  param: string;
  msg: string;
  value?: any;
}

function validateRequest(req: Request, requiredFields: string[] = []): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of requiredFields) {
    if (req.body[field] === undefined || req.body[field] === '') {
      errors.push({
        param: field,
        msg: `${field} is required`,
        value: req.body[field]
      });
    }
  }

  return errors;
}

export const RoleController = {
  /**
   * Create a new role with permissions
   */
  async createRole(req: Request, res: Response) {
    const errors = validateRequest(req, ['role', 'application', 'permissions']);
    if (errors.length > 0) {
      throw new BadRequestError(JSON.stringify({
        message: 'Validation failed',
        errors
      }));
    }

    const { role, application, permissions } = req.body;

    const existingRole = await RolePermissionModel.findOne({ role, application });
    if (existingRole) {
      throw new BadRequestError(`Role '${role}' already exists for application '${application}'`);
    }

    const newRole = new RolePermissionModel({
      role,
      application,
      permissions,
      version: 1
    });

    await newRole.save();

    res.status(201).json({
      success: true,
      data: newRole
    });
  },

  /**
   * Update role permissions
   */
  async updateRolePermissions(req: Request, res: Response) {
    const { roleId } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      throw new BadRequestError('Permissions must be an array');
    }

    // Add new permissions to existing ones without duplicates
    const updatedRole = await RolePermissionModel.findByIdAndUpdate(
      roleId,
      { 
        $addToSet: { permissions: { $each: permissions } },
        $currentDate: { updatedAt: true }
      },
      { new: true, runValidators: true }
    );

    if (!updatedRole) {
      throw new NotFoundError('Role not found');
    }

    res.json({
      success: true,
      data: updatedRole
    });
  },

  /**
   * Assign role to user
   */
  async assignRoleToUser(req: Request, res: Response) {
    const errors = validateRequest(req, ['role', 'application']);
    if (errors.length > 0) {
      throw new BadRequestError(JSON.stringify({
        message: 'Validation failed',
        errors
      }));
    }

    const { userId } = req.params;
    const { role, application } = req.body;

    const rolePermission = await RolePermissionModel.findOne({ role, application });
    if (!rolePermission) {
      throw new NotFoundError(`Role '${role}' not found for application '${application}'`);
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Remove any existing role assignment for same role
    // Remove role from user using proper ObjectId comparison
    user.roles = user.roles?.filter(
      roleId => {
        // Handle both ObjectId and string comparisons
        const roleIdStr = typeof roleId === 'string' ? roleId : roleId.toString();
        const targetIdStr = rolePermission._id.toString();
        return roleIdStr !== targetIdStr;
      }
    ) || [];

    // Add the new role reference with proper structure
    user.roles.push({
      _id: rolePermission._id.toString(),
      name: rolePermission.role,
      permissions: rolePermission.permissions
    });

    await user.save();

    res.json({
      success: true,
      data: user
    });
  },

  /**
   * List all roles
   */
  async listRoles(req: Request, res: Response) {
    const { application } = req.query;

    const query: any = {};
    if (application) {
      query.application = application;
    }

    const roles = await RolePermissionModel.find(query);

    res.json({
      success: true,
      data: roles
    });
  },
  //get roles for multiple/single rolePermissionIds
  async getRoles(req: Request, res: Response) {
    const { rolePermissionIds } = req.body;
  
    if (!Array.isArray(rolePermissionIds) || rolePermissionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'rolePermissionIds must be a non-empty array' });
    }
  
    const roles = await RolePermissionModel.find({ _id: { $in: rolePermissionIds } });
  
    if (!roles || roles.length === 0) {
      return res.status(404).json({ success: false, message: 'No roles found' });
    }
  
    res.json({ success: true, data: roles });
  },
  
  /**
   * Delete role
   */
  async deleteRole(req: Request, res: Response) {
    const { roleId } = req.params;

    const usersWithRole = await UserModel.countDocuments({
      'roles': roleId
    });

    if (usersWithRole > 0) {
      throw new BadRequestError('Cannot delete role that is assigned to users');
    }

    const result = await RolePermissionModel.findByIdAndDelete(roleId);

    if (!result) {
      throw new NotFoundError('Role not found');
    }

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  },

  /**
   * Check if current user has a specific permission
   */
  async checkPermission(req: Request, res: Response) {
    try {
      const { permission, application = '*' } = req.body;
      
      if (!req.user?._id) {
        throw new UnauthorizedError('User not authenticated');
      }
  
      const userId = typeof req.user._id === 'string'
        ? new Types.ObjectId(req.user._id)
        : req.user._id;
  
      const hasPermission = await PermissionService.hasPermission(
        userId,
        permission,
        application,
        // Use proper typing for req.user
        (req.user as any).rolePermissionIds
      );
  
      res.status(200).json({
        success: true,
        data: {
          hasPermission,
        }
      });
    } catch (error) {
      console.error('Error checking permission:', {
        error: error.message,
        stack: error.stack
      });
  
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        message: error.message || 'Error checking permission'
      });
    }
  }
};

export const getUserRolePermissions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const rolePermissions = await PermissionService.getUserRolePermissions(userId);

    return res.status(200).json({ success: true, data: rolePermissions });
  } catch (error) {
    console.error('Error fetching user role permissions:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
