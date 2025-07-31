import * as bcrypt from 'bcrypt';
import userServiceLogger from '../utils/logger';
import UserModel from '../models/User';
import UserActivity, { ActivityType } from '../models/UserActivity';
import UserDevice from '../models/UserDevice';
import { trackDatabaseOperation } from '../utils/performance';
import RolePermissionModel from '../models/RolePermission.model';

import {
  UserFilter,
  SecurityPreferences,
  ActivityFilter,
  ActivityPaginationResult
} from '../interfaces/shared-types';

import redis from '../utils/redis';

interface FormattedUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
}

interface UserPaginationResult {
  users: FormattedUser[];
  totalUsers: number;
  totalPages: number;
  currentPage: number;
  usersPerPage: number;
}

const { redisUtils, userCache } = redis;
const logger = userServiceLogger;

class UserService {
  constructor() {
    this.clearUsersCache().catch(err => {
      logger.error('Failed to clear users cache on initialization:', { error: err.message });
    });
    // Periodically log cache hit rates
    setInterval(() => this.logCacheHitRates(), 300000); // Every 5 minutes
  }

  private logCacheHitRates(): void {
    const stats = redisUtils.getStats();
    logger.info('Cache hit rates', {
      userCache: {
        hits: stats.userCache.hits,
        misses: stats.userCache.misses,
        hitRate: stats.userCache.hitRate.toFixed(4)
      },
      defaultCache: {
        hits: stats.defaultCache.hits,
        misses: stats.defaultCache.misses,
        hitRate: stats.defaultCache.hitRate.toFixed(4)
      }
    });
  }

  async clearUsersCache(): Promise<void> {
    try {
      const client = userCache.getClient();
      
      // Check if keys method exists (not available in mock environment)
      if (typeof client.keys !== 'function') {
        logger.info('Cache clearing skipped (mock environment)');
        return;
      }
      
      const keys = await client.keys('users:*');
      if (keys.length > 0) {
        await client.del(...keys);
        logger.info(`Cleared ${keys.length} users cache entries`);
      }
    } catch (error) {
      logger.error('Error clearing users cache:', { error: (error as Error).message });
    }
  }

  async getUsers(
    filters: UserFilter,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  ): Promise<UserPaginationResult> {
    if (limit > 100) {
      logger.warn(`High volume user query: limit=${limit}`);
    }

    const cacheKey = `users:list:${JSON.stringify({ filters, page, limit, sortBy, sortOrder })}`;
    try {
      const cached = await redisUtils.get<UserPaginationResult>(cacheKey);
      redisUtils.stats.defaultCache[cached ? 'hits' : 'misses']++;
      if (cached) {
        logger.info('Served users from Redis cache');
        return cached;
      }
    } catch (error) {
      redisUtils.stats.defaultCache.misses++;
      logger.warn(`Error retrieving users from cache: ${error instanceof Error ? error.message : String(error)}`);
    }

    logger.info('Fetching users from MongoDB');
    try {
      const query: Record<string, any> = { ...filters };
      if (query.search) {
        const regex = new RegExp(query.search, 'i');
        query.$or = [
          { email: regex },
          { firstName: regex },
          { lastName: regex }
        ];
        delete query.search;
      }

      const totalUsers = await trackDatabaseOperation<number>('countUsers', async () =>
        UserModel.countDocuments(query).exec()
      );

      const skip = (page - 1) * limit;
      const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const users = await trackDatabaseOperation<any[]>('findUsers', async () =>
        UserModel.find(query)
          .populate({
            path: 'roles',
            model: RolePermissionModel.modelName,
            select: 'role permissions'
          })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec()
      );

      const formattedUsers = users.map(user => ({
        _id: user._id.toString(),
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        isActive: user.isActive,
        roles: user.roles?.map((r: any) => r.role) ?? [],
        permissions: user.roles?.flatMap((r: any) => r.permissions || []) ?? []
      }));

      const result: UserPaginationResult = {
        users: formattedUsers,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        usersPerPage: limit
      };

      try {
        await redisUtils.set(cacheKey, result, 1800);
        logger.info('Cached users list');
      } catch (cacheError) {
        logger.warn(`Error caching users list: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return result;
    } catch (error) {
      logger.error('Error getting users:', { error: (error as Error).message });
      throw error;
    }
  }

  async getUserById(userId: string): Promise<any> {
    try {
      const cached = await redisUtils.getCachedUser(userId);
      if (cached) {
        logger.info('Served user from Redis cache');
        return cached;
      }

      logger.info('Fetching user from MongoDB');
      const user = await trackDatabaseOperation<any | null>('findUserById', async () =>
        UserModel.findById(userId)
          .select('-password')
          .populate({
            path: 'roles',
            model: RolePermissionModel.modelName,
            select: 'role permissions'
          })
          .exec()
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Format the user similar to FormattedUser for consistency
      const formattedUser = {
        _id: user._id.toString(),
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        isActive: user.isActive,
        roles: user.roles?.map((r: any) => r.role) ?? [],
        permissions: user.roles?.flatMap((r: any) => r.permissions || []) ?? [],
        // Add other fields if needed
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        userAddress: user.userAddress,
        preferences: user.preferences,
        securityPreferences: user.securityPreferences
      };

      try {
        await redisUtils.cacheUser(userId, formattedUser, 3600);
        logger.info(`Cached user ${userId}`);
      } catch (cacheError) {
        logger.warn(`Error caching user ${userId}: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return formattedUser;
    } catch (error) {
      logger.error('Error getting user by ID:', { error: (error as Error).message, userId });
      throw error;
    }
  }

  async updateUser(userId: string, updateData: Partial<any>): Promise<any> {
    try {
      const cacheKey = `user:check:${updateData.email}`;
      if (updateData.email) {
        try {
          const cachedCheck = await redisUtils.get(cacheKey);
          redisUtils.stats.defaultCache[cachedCheck ? 'hits' : 'misses']++;
          if (cachedCheck?.email === updateData.email) {
            throw new Error('Email already in use');
          }
        } catch (error) {
          redisUtils.stats.defaultCache.misses++;
          logger.warn(`Error checking cache for email ${updateData.email}: ${error instanceof Error ? error.message : String(error)}`);
        }

        const existing = await trackDatabaseOperation<any | null>('findUserByEmail', async () =>
          UserModel.findOne({ email: updateData.email, _id: { $ne: userId } }).exec()
        );
        if (existing) {
          try {
            await redisUtils.set(cacheKey, { email: existing.email }, 300);
          } catch (cacheError) {
            logger.warn(`Error caching email check: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
          }
          throw new Error('Email already in use');
        }
      }

      const updateFields: Record<string, any> = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          updateFields[key] = updateData[key];
        }
      });

      if ((updateData.firstName || updateData.lastName) && !updateData.username) {
        const currentUser = await trackDatabaseOperation<any | null>('findUserById', async () =>
          UserModel.findById(userId).exec()
        );
        if (!currentUser) throw new Error('User not found');
        const firstName = updateData.firstName || currentUser.firstName;
        const lastName = updateData.lastName || currentUser.lastName;
        updateFields.username = `${firstName} ${lastName}`.trim();
      }

      const user = await trackDatabaseOperation<any | null>('updateUser', async () =>
        UserModel.findByIdAndUpdate(userId, { $set: updateFields }, { new: true, runValidators: true }).exec()
      );
      if (!user) throw new Error('User not found');

      // Invalidate caches
      try {
        const listKeys = await userCache.getClient().keys('users:list:*');
        if (listKeys.length > 0) {
          await userCache.getClient().del(...listKeys);
          logger.info(`Cleared ${listKeys.length} user list cache entries`);
        }
        await redisUtils.del(`user:${userId}`);
        if (updateData.email) await redisUtils.del(cacheKey);
      } catch (cacheError) {
        logger.warn(`Error invalidating caches: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      // Cache the updated user
      try {
        await redisUtils.cacheUser(userId, user, 3600);
      } catch (cacheError) {
        logger.warn(`Error caching user ${userId}: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return user;
    } catch (error) {
      logger.error('Error updating user:', { error: (error as Error).message, userId });
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<any> {
    try {
      const user = await trackDatabaseOperation<any | null>('deleteUser', async () =>
        UserModel.findByIdAndDelete(userId).exec()
      );
      if (!user) throw new Error('User not found');

      // Invalidate caches
      try {
        await redisUtils.invalidateUserCache(userId);
        const listKeys = await userCache.getClient().keys('users:list:*');
        if (listKeys.length > 0) {
          await userCache.getClient().del(...listKeys);
          logger.info(`Cleared ${listKeys.length} user list cache entries`);
        }
        await redisUtils.del(`user:${userId}:devices`);
        await redisUtils.del(`user:${userId}:activity:*`);
      } catch (cacheError) {
        logger.warn(`Error invalidating caches: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return user;
    } catch (error) {
      logger.error('Error deleting user:', { error: (error as Error).message, userId });
      throw error;
    }
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<any> {
    try {
      const user = await trackDatabaseOperation<any | null>('updateUserStatus', async () =>
        UserModel.findByIdAndUpdate(userId, { $set: { isActive } }, { new: true }).exec()
      );
      if (!user) throw new Error('User not found');

      // Invalidate caches
      try {
        await redisUtils.invalidateUserCache(userId);
        const listKeys = await userCache.getClient().keys('users:list:*');
        if (listKeys.length > 0) {
          await userCache.getClient().del(...listKeys);
          logger.info(`Cleared ${listKeys.length} user list cache entries`);
        }
      } catch (cacheError) {
        logger.warn(`Error invalidating caches: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      // Cache the updated user
      try {
        await redisUtils.cacheUser(userId, user, 3600);
      } catch (cacheError) {
        logger.warn(`Error caching user ${userId}: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return user;
    } catch (error) {
      logger.error('Error updating user status:', { error: (error as Error).message, userId });
      throw error;
    }
  }

  async updateProfile(userId: string, profileData: Partial<any>): Promise<any> {
    try {
      await this.getUserById(userId);
      const allowed: any = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phoneNumber: profileData.phoneNumber,
        userAddress: profileData.userAddress,
        profileImage: profileData.profileImage,
        preferences: profileData.preferences
      };
    
      Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);

      const updatedUser = await trackDatabaseOperation<any | null>('updateProfile', async () =>
        UserModel.findByIdAndUpdate(userId, { $set: allowed }, { new: true }).exec()
      );
      if (!updatedUser) throw new Error('User not found');

      await this.logUserActivity(userId, ActivityType.PROFILE_UPDATE, 'Profile updated');

      // Invalidate caches
      try {
        await redisUtils.invalidateUserCache(userId);
        const listKeys = await userCache.getClient().keys('users:list:*');
        if (listKeys.length > 0) {
          await userCache.getClient().del(...listKeys);
          logger.info(`Cleared ${listKeys.length} user list cache entries`);
        }
      } catch (cacheError) {
        logger.warn(`Error invalidating caches: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      // Cache the updated user
      try {
        await redisUtils.cacheUser(userId, updatedUser, 3600);
      } catch (cacheError) {
        logger.warn(`Error caching user ${userId}: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return updatedUser;
    } catch (error) {
      logger.error('Error updating user profile:', { error: (error as Error).message, userId });
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await trackDatabaseOperation<any | null>('findUserWithPassword', async () =>
        UserModel.findById(userId).select('+password').exec()
      );
      if (!user) throw new Error('User not found');

      const isMatch = await bcrypt.compare(currentPassword, user.password as string);
      if (!isMatch) throw new Error('Current password is incorrect');

      user.password = await bcrypt.hash(newPassword, 10);
      const updatedUser = await trackDatabaseOperation<any | null>('updatePassword', async () => {
        await user.save();
        return user;
      });
      if (!updatedUser) throw new Error('User not found');

      await this.logUserActivity(userId, ActivityType.PASSWORD_CHANGE, 'Password changed');

      // Invalidate caches
      try {
        await redisUtils.invalidateUserCache(userId);
        const listKeys = await userCache.getClient().keys('users:list:*');
        if (listKeys.length > 0) {
          await userCache.getClient().del(...listKeys);
          logger.info(`Cleared ${listKeys.length} user list cache entries`);
        }
      } catch (cacheError) {
        logger.warn(`Error invalidating caches: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      // Cache the updated user
      try {
        await redisUtils.cacheUser(userId, updatedUser, 3600);
      } catch (cacheError) {
        logger.warn(`Error caching user ${userId}: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return true;
    } catch (error) {
      logger.error('Error changing password:', { error: (error as Error).message, userId });
      throw error;
    }
  }

  async updateSecurityPreferences(userId: string, securityPreferences: SecurityPreferences): Promise<any> {
    try {
      await this.getUserById(userId);
      const updatedUser = await trackDatabaseOperation<any | null>('updateSecurityPreferences', async () =>
        UserModel.findByIdAndUpdate(userId, { $set: { securityPreferences } }, { new: true }).exec()
      );
      if (!updatedUser) throw new Error('User not found');

      await this.logUserActivity(userId, ActivityType.SECURITY_UPDATE, 'Security preferences updated');

      // Invalidate caches
      try {
        await redisUtils.invalidateUserCache(userId);
        const listKeys = await userCache.getClient().keys('users:list:*');
        if (listKeys.length > 0) {
          await userCache.getClient().del(...listKeys);
          logger.info(`Cleared ${listKeys.length} user list cache entries`);
        }
      } catch (cacheError) {
        logger.warn(`Error invalidating caches: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      // Cache the updated user
      try {
        await redisUtils.cacheUser(userId, updatedUser, 3600);
      } catch (cacheError) {
        logger.warn(`Error caching user ${userId}: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return updatedUser;
    } catch (error) {
      logger.error('Error updating security preferences:', { error: (error as Error).message, userId });
      throw error;
    }
  }

  async logUserActivity(userId: string, type: ActivityType, description: string, metadata: Record<string, any> = {}): Promise<any> {
    try {
      const activity = await trackDatabaseOperation('logUserActivity', async () => {
        const act = new UserActivity({
          user: userId,
          type,
          description,
          metadata,
          ipAddress: metadata.ipAddress || '',
          userAgent: metadata.userAgent || ''
        });
        await act.save();
        return act;
      });

      // Invalidate activity caches
      try {
        const activityKeys = await userCache.getClient().keys(`user:${userId}:activity:*`);
        if (activityKeys.length > 0) {
          await userCache.getClient().del(...activityKeys);
          logger.info(`Cleared ${activityKeys.length} activity cache entries`);
        }
      } catch (cacheError) {
        logger.warn(`Error invalidating activity caches: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return activity;
    } catch (error) {
      logger.error('Error logging user activity:', { error: (error as Error).message, userId });
      return null;
    }
  }

  async getUserActivity(userId: string, page = 1, limit = 20, filters: ActivityFilter = {}): Promise<ActivityPaginationResult> {
    const cacheKey = `user:${userId}:activity:${JSON.stringify({ filters, page, limit })}`;
    try {
      const cached = await redisUtils.get<ActivityPaginationResult>(cacheKey);
      redisUtils.stats.defaultCache[cached ? 'hits' : 'misses']++;
      if (cached) {
        logger.info('Served user activity from Redis cache');
        return cached;
      }
    } catch (error) {
      redisUtils.stats.defaultCache.misses++;
      logger.warn(`Error retrieving user activity from cache: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await this.getUserById(userId);
      const query = { user: userId, ...filters };
      const total = await trackDatabaseOperation<number>('countUserActivity', async () =>
        UserActivity.countDocuments(query).exec()
      );
      const skip = (page - 1) * limit;
      const activities = await trackDatabaseOperation<any[]>('findUserActivity', async () =>
        UserActivity.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec()
      );

      const result: ActivityPaginationResult = {
        activities,
        total,
        page,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };

      try {
        await redisUtils.set(cacheKey, result, 300);
        logger.info('Cached user activity');
      } catch (cacheError) {
        logger.warn(`Error caching user activity: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return result;
    } catch (error) {
      logger.error('Error getting user activity:', { error: (error as Error).message, userId });
      throw error;
    }
  }

  async getUserDevices(userId: string): Promise<any[]> {
    const cacheKey = `user:${userId}:devices`;
    try {
      const cached = await redisUtils.get<any[]>(cacheKey);
      redisUtils.stats.defaultCache[cached ? 'hits' : 'misses']++;
      if (cached) {
        logger.info('Served user devices from Redis cache');
        return cached;
      }
    } catch (error) {
      redisUtils.stats.defaultCache.misses++;
      logger.warn(`Error retrieving user devices from cache: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await this.getUserById(userId);
      const devices = await trackDatabaseOperation<any[]>('findUserDevices', async () =>
        UserDevice.find({ user: userId }).sort({ lastUsed: -1 }).exec()
      );

      try {
        await redisUtils.set(cacheKey, devices, 300);
        logger.info('Cached user devices');
      } catch (cacheError) {
        logger.warn(`Error caching user devices: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return devices;
    } catch (error) {
      logger.error('Error getting user devices:', { error: (error as Error).message, userId });
      throw error;
    }
  }

  async removeUserDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      await this.getUserById(userId);
      const device = await trackDatabaseOperation('deleteUserDevice', async () =>
        UserDevice.findOneAndDelete({ _id: deviceId, user: userId }).exec()
      );
      if (!device) throw new Error('Device not found');

      await this.logUserActivity(userId, ActivityType.DEVICE_REMOVED, 'Device removed', {
        deviceId,
        deviceName: device.deviceName
      });

      // Invalidate caches
      try {
        const activityKeys = await userCache.getClient().keys(`user:${userId}:activity:*`);
        if (activityKeys.length > 0) {
          await userCache.getClient().del(...activityKeys);
          logger.info(`Cleared ${activityKeys.length} activity cache entries`);
        }
        await redisUtils.del(`user:${userId}:devices`);
      } catch (cacheError) {
        logger.warn(`Error invalidating caches: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }

      return true;
    } catch (error) {
      logger.error('Error removing user device:', { error: (error as Error).message, userId, deviceId });
      throw error;
    }
  }
}

export default new UserService();