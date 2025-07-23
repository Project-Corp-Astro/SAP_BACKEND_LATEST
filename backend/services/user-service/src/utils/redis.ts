/**
 * User Service Redis Implementation
 * Uses the shared Redis manager with environment-aware switching
 * Pattern consistent with auth-service and content-service
 */

import { logger, redisManager } from './sharedModules';

// Service-specific constants
const SERVICE_NAME = 'user';

// Environment-aware Redis client factory
const createRedisClient = (database: number = 2) => {
  try {
    return redisManager.createServiceRedisClient(SERVICE_NAME, { db: database });
  } catch (error) {
    logger.error('Failed to create Redis client:', error);
    throw error;
  }
};

// Main Redis client for general operations
const mainRedisClient = createRedisClient(redisManager.SERVICE_DB_MAPPING[SERVICE_NAME] || 2);

// Service-specific Redis cache instances using shared manager
const defaultCache = new redisManager.RedisCache(SERVICE_NAME, { keyPrefix: `${SERVICE_NAME}:default:` });
const userCache = new redisManager.RedisCache(SERVICE_NAME, { keyPrefix: `${SERVICE_NAME}:users:` });
const rolePermissionCache = new redisManager.RedisCache(SERVICE_NAME, { keyPrefix: `${SERVICE_NAME}:rolePermission:` });

// Redis event handling
mainRedisClient.on('error', (error: Error) => {
  logger.error('Redis client error:', { error: error.message });
});

mainRedisClient.on('connect', () => {
  logger.info('Redis client connected successfully');
});

mainRedisClient.on('end', () => {
  logger.warn('Redis client disconnected');
});

mainRedisClient.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
});

logger.info(`User service using Redis database ${redisManager.SERVICE_DB_MAPPING[SERVICE_NAME] || 2}`);

// Redis utility interface for type safety
interface RedisUtilities {
  stats: {
    defaultCache: { hits: number; misses: number };
    userCache: { hits: number; misses: number };
    rolePermissionCache: { hits: number; misses: number };
  };
  getStats: () => any;
  set: (key: string, value: any, expiryInSeconds?: number) => Promise<'OK' | string>;
  get: <T = any>(key: string) => Promise<T | null>;
  del: (key: string) => Promise<number>;
  exists: (key: string) => Promise<number>;
  close: () => Promise<void>;
  pingRedis: () => Promise<boolean>;
  cacheUser: (userId: string, userData: any, ttlSeconds?: number) => Promise<boolean>;
  getCachedUser: (userId: string) => Promise<any>;
  cacheRolePermission: (rolePermissionId: string, data: any, ttlSeconds?: number) => Promise<boolean>;
  getCachedRolePermission: (rolePermissionId: string) => Promise<any>;
  invalidateUserCache: (userId: string) => Promise<number>;
}

// Redis utility implementations
const redisUtils: RedisUtilities = {
  stats: {
    defaultCache: { hits: 0, misses: 0 },
    userCache: { hits: 0, misses: 0 },
    rolePermissionCache: { hits: 0, misses: 0 }
  },

  getStats() {
    return {
      defaultCache: {
        ...this.stats.defaultCache,
        hitRate: this.stats.defaultCache.hits / (this.stats.defaultCache.hits + this.stats.defaultCache.misses) || 0
      },
      userCache: {
        ...this.stats.userCache,
        hitRate: this.stats.userCache.hits / (this.stats.userCache.hits + this.stats.userCache.misses) || 0
      },
      rolePermissionCache: {
        ...this.stats.rolePermissionCache,
        hitRate: this.stats.rolePermissionCache.hits / (this.stats.rolePermissionCache.hits + this.stats.rolePermissionCache.misses) || 0
      }
    };
  },

  async set(key: string, value: any, expiryInSeconds?: number): Promise<'OK' | string> {
    try {
      const success = await defaultCache.set(key, value, expiryInSeconds);
      return success ? 'OK' : 'ERROR';
    } catch (error: unknown) {
      logger.error(`Error setting Redis key ${key}:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'ERROR';
    }
  },

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await defaultCache.get(key);
      this.stats.defaultCache[value ? 'hits' : 'misses']++;
      return value as T;
    } catch (error: unknown) {
      this.stats.defaultCache.misses++;
      logger.error(`Error getting Redis key ${key}:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  },

  async del(key: string): Promise<number> {
    try {
      return await defaultCache.del(key);
    } catch (error: unknown) {
      logger.error(`Error deleting Redis key ${key}:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  },

  async exists(key: string): Promise<number> {
    try {
      const exists = await defaultCache.exists(key);
      return exists ? 1 : 0;
    } catch (error: unknown) {
      logger.error(`Error checking if Redis key ${key} exists:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  },

  async close(): Promise<void> {
    interface RedisCloseError {
      client: string;
      error: string;
    }
    const errors: RedisCloseError[] = [];
    const closePromises: Promise<string>[] = [];

    // Close all cache instances
    closePromises.push(
      defaultCache.getClient().quit().catch(error => {
        errors.push({ client: 'default', error: (error as Error).message });
        return '';
      })
    );
    closePromises.push(
      userCache.getClient().quit().catch(error => {
        errors.push({ client: 'user', error: (error as Error).message });
        return '';
      })
    );
    closePromises.push(
      rolePermissionCache.getClient().quit().catch(error => {
        errors.push({ client: 'rolePermission', error: (error as Error).message });
        return '';
      })
    );
    closePromises.push(
      mainRedisClient.quit().catch(error => {
        errors.push({ client: 'main', error: (error as Error).message });
        return '';
      })
    );

    await Promise.all(closePromises);

    if (errors.length > 0) {
      logger.error('Errors closing Redis connections:', errors);
    } else {
      logger.info('All Redis connections closed successfully');
    }
  },

  async pingRedis(): Promise<boolean> {
    try {
      const response = await defaultCache.getClient().ping();
      return response === 'PONG';
    } catch (error: unknown) {
      logger.error('Error pinging Redis:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  },

  async cacheUser(userId: string, userData: any, ttlSeconds: number = 300): Promise<boolean> {
    try {
      const cacheKey = `${userId}:user`;
      return await userCache.set(cacheKey, userData, ttlSeconds);
    } catch (error: unknown) {
      logger.error(`Error caching user ${userId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  },

  async getCachedUser(userId: string): Promise<any> {
    try {
      const cacheKey = `${userId}:user`;
      const value = await userCache.get(cacheKey);
      this.stats.userCache[value ? 'hits' : 'misses']++;
      return value;
    } catch (error: unknown) {
      this.stats.userCache.misses++;
      logger.warn(`Error getting cached user ${userId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  },

  async cacheRolePermission(rolePermissionId: string, data: any, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      const cacheKey = `${rolePermissionId}:rolePermission`;
      return await rolePermissionCache.set(cacheKey, data, ttlSeconds);
    } catch (error: unknown) {
      logger.error(`Error caching rolePermission ${rolePermissionId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  },

  async getCachedRolePermission(rolePermissionId: string): Promise<any> {
    try {
      const cacheKey = `${rolePermissionId}:rolePermission`;
      const value = await rolePermissionCache.get(cacheKey);
      this.stats.rolePermissionCache[value ? 'hits' : 'misses']++;
      return value;
    } catch (error: unknown) {
      this.stats.rolePermissionCache.misses++;
      logger.warn(`Error getting cached rolePermission ${rolePermissionId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  },

  async invalidateUserCache(userId: string): Promise<number> {
    try {
      const userPattern = `*${userId}:user*`;
      const userKeys = await userCache.getClient().keys(userPattern);
      if (userKeys.length === 0) return 0;
      const deletions = await userCache.getClient().del(...userKeys);
      return deletions;
    } catch (error: unknown) {
      logger.warn(`Failed to invalidate cache for user ${userId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return 0;
    }
  }
};

// Export service instances and utilities following auth/content service pattern
export const redisClient = mainRedisClient;
export { defaultCache, userCache, rolePermissionCache, redisUtils };

// Default export matching the pattern
export default {
  redisClient: mainRedisClient,
  redisUtils,
  defaultCache,
  userCache,
  rolePermissionCache
};