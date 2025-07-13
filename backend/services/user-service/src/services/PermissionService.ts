import UserModel from '../models/User';
import RolePermissionModel from '../models/RolePermission.model';
import { Types } from 'mongoose';
import redis from '../utils/redis';

const { redisUtils } = redis;
interface Permission {
  resource: string;
  action: string;
}

type PermissionInput = string | Permission;

export class PermissionService {
  /**
   * Check if a user has the required permission
   */
  static async hasPermission(
    userId: string | Types.ObjectId,
    requiredPermission: string,
    application: string = '*',
    rolePermissionIds?: string[]
  ): Promise<boolean> {
    try {
      const [requiredResource, requiredAction] = requiredPermission.split(':');

      if (rolePermissionIds?.length) {
        // Try cache first
        const roles = await Promise.all(
          rolePermissionIds.map(async id => {
            const cached = await redisUtils.getCachedRolePermission(id);
            return cached || null;
          })
        );
        // Collect missing IDs (not in cache)
        const missingIds = rolePermissionIds.filter((_, idx) => roles[idx] === null);

        // Fetch missing from DB (with application filter)
        if (missingIds.length > 0) {
          const dbRoles = await RolePermissionModel.find({
            _id: { $in: missingIds.map(id => new Types.ObjectId(id)) },
            $or: [
              { application: application },
              { application: '*' }
            ]
          }).lean();

          // Cache DB results
          await Promise.all(
            dbRoles.map(role => redisUtils.cacheRolePermission(role._id.toString(), role))
          );

          // Replace nulls in roles array
          let dbIdx = 0;
          for (let i = 0; i < roles.length; i++) {
            if (roles[i] === null) {
              roles[i] = dbRoles[dbIdx++] || null;
            }
          }
        }

        // Filter valid roles
        const validRoles = roles.filter(r => r !== null);

        // Check permissions
        for (const role of validRoles) {
          if (role.application !== '*' && role.application !== application) {
            continue;
          }

          if (role.permissions?.includes('*:*')) return true;
          if (role.permissions?.includes(requiredPermission)) return true;

          const wildcardResource = `*:${requiredAction}`;
          if (role.permissions?.includes(wildcardResource)) return true;

          const wildcardAction = `${requiredResource}:*`;
          if (role.permissions?.includes(wildcardAction)) return true;
        }

        return false;
      }


      // Fallback to user roles if no rolePermissionIds provided
      const roles = await UserModel.aggregate([
        { $match: { _id: typeof userId === 'string' ? new Types.ObjectId(userId) : userId } },
        {
          $lookup: {
            from: 'rolepermissions',
            localField: 'roles',
            foreignField: '_id',
            as: 'roleData',
            pipeline: [
              {
                $match: {
                  $or: [
                    { application: application },
                    { application: '*' }
                  ]
                }
              }
            ]
          }
        },
        { $unwind: { path: '$roleData', preserveNullAndEmptyArrays: false } }
      ]).exec();

      const rolesToCheck = roles.map(r => r.roleData);

      for (const role of rolesToCheck) {
        // Normalize permissions to array of { resource, action } objects
        const normalizedPermissions = Array.isArray(role.permissions)
          ? role.permissions.map((p: PermissionInput): Permission => {
            if (typeof p === 'string') {
              const [resource, action] = p.split(':');
              return { resource, action };
            }
            return p;
          })
          : [];

        // Check if role has wildcard permission
        if (normalizedPermissions.some((p: Permission) => p.resource === '*' && p.action === '*')) {
          return true;
        }

        // Check specific permission
        if (normalizedPermissions.some((p: Permission) => {
          return (p.resource === requiredResource || p.resource === '*') &&
            (p.action === requiredAction || p.action === '*');
        })) {
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('Error in hasPermission:', err);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  static async getUserRolePermissions(
    userId: string | Types.ObjectId
  ): Promise<any[]> {
    try {
      const userObjectId =
        typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
      const results = await UserModel.aggregate([
        { $match: { _id: userObjectId } },
        {
          $lookup: {
            from: 'rolepermissions',
            localField: 'roles',
            foreignField: '_id',
            as: 'rolePermissions'
          }
        },
        {
          $project: {
            rolePermissions: 1
          }
        }
      ]).exec();
  
      // Flatten the rolePermissions array
      if (results.length > 0 && Array.isArray(results[0].rolePermissions)) {
        return results[0].rolePermissions;
      }
  
      return [];
    } catch (err) {
      console.error('Error in getUserRolePermissions:', err);
      return [];
    }
  }
  

  /**
   * Check if a role has a specific permission
   */
  static async roleHasPermission(
    roleId: string | Types.ObjectId,
    requiredPermission: string
  ): Promise<boolean> {
    try {
      const roleObjectId = typeof roleId === 'string' ? new Types.ObjectId(roleId) : roleId;
      const role = await RolePermissionModel.findById(roleObjectId).lean();

      if (!role) return false;

      const [requiredResource, requiredAction] = requiredPermission.split(':');

      // Normalize permissions
      const normalizedPermissions = Array.isArray(role.permissions)
        ? role.permissions.map((p: PermissionInput): Permission => {
          if (typeof p === 'string') {
            const [resource, action] = p.split(':');
            return { resource, action };
          }
          return p;
        })
        : [];

      // Check wildcard permission
      if (normalizedPermissions.some((p: Permission) => p.resource === '*' && p.action === '*')) {
        return true;
      }

      // Check specific permission
      return normalizedPermissions.some((p: Permission) => {
        return (p.resource === requiredResource || p.resource === '*') &&
          (p.action === requiredAction || p.action === '*');
      });
    } catch (err) {
      console.error('Error in roleHasPermission:', err);
      return false;
    }
  }
}
