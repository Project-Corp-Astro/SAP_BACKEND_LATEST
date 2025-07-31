import Redis from 'ioredis';
import { logger, redisManager, config } from './sharedModules';
import { CacheKeyUtils } from './cache-key-utils';

// Extract utilities from redisManager
const {
  RedisCache,
  createServiceRedisClient,
  SERVICE_DB_MAPPING,
  RedisOptions
} = redisManager;
import type { Redis as IORedis } from 'ioredis';

// Constants
const SERVICE_NAME = 'subscription';
const DB_NUMBER = 3;

// Create service-specific Redis clients
const defaultCache = new RedisCache(SERVICE_NAME);
const planCache = new RedisCache(SERVICE_NAME, { keyPrefix: `${SERVICE_NAME}:plans:` });
const userSubsCache = new RedisCache(SERVICE_NAME, { keyPrefix: `${SERVICE_NAME}:user-subscriptions:` });
const promoCache = new RedisCache(SERVICE_NAME, { keyPrefix: `${SERVICE_NAME}:promos:` });

// Create standard Redis client instance with proper fallbacks
const getRedisConfig = () => {
  // If REDIS_URL is available, use it directly
  if (process.env.REDIS_URL) {
    logger.info('Using REDIS_URL for configuration:', { redisUrl: process.env.REDIS_URL });
    return process.env.REDIS_URL;
  }
  
  // Otherwise use config with proper fallbacks
  const host = config.get ? config.get('redis.host', 'localhost') : (config.redis?.host || 'localhost');
  const port = config.get ? parseInt(config.get('redis.port', '6379')) : (config.redis?.port || 6379);
  const password = config.get ? config.get('redis.password', '') : (config.redis?.password || '');
  
  return {
    host,
    port,
    password: password || undefined,
    db: SERVICE_DB_MAPPING[SERVICE_NAME] || DB_NUMBER,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 100, 5000);
      logger.warn(`Redis reconnecting in ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      logger.error('Redis connection error:', { error: err.message });
      return true;
    }
  };
};

// Initialize Redis client as null initially
let redisClient: IORedis | null = null;

// Function to safely attach event listeners
function attachRedisEventListeners(client: IORedis) {
  if (!client) return;
  
  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  client.on('error', (error) => {
    logger.error('Redis client error:', { error: error.message });
  });

  client.on('reconnecting', () => {
    logger.warn('Redis client reconnecting...');
  });

  client.on('end', () => {
    logger.warn('Redis client connection closed');
  });
}

// Create a factory function for Redis clients
function createRedisClient() {
  const config = getRedisConfig();
  let client: IORedis;
  
  try {
    if (typeof config === 'string') {
      logger.info('Creating direct Redis client with URL');
      client = new Redis(config, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 5000);
          logger.warn(`Redis reconnecting in ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: 10000,
      });
    } else {
      logger.info('Creating direct Redis client with config', {
        host: config.host,
        port: config.port,
        db: config.db || SERVICE_DB_MAPPING[SERVICE_NAME] || DB_NUMBER
      });
      
      client = new Redis({
        host: config.host || '127.0.0.1',
        port: config.port || 6379,
        password: config.password,
        db: config.db || SERVICE_DB_MAPPING[SERVICE_NAME] || DB_NUMBER,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 5000);
          logger.warn(`Redis reconnecting in ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: 10000,
      });
    }

    // Attach event listeners
    attachRedisEventListeners(client);
    
    return client;
  } catch (error) {
    logger.error('Failed to create Redis client:', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function initializeRedisClient(): Promise<IORedis> {
  const client = createRedisClient();
  
  try {
    // Test the connection
    await client.ping();
    logger.info('Successfully connected to Redis');
    
    // Set the global redisClient only after successful connection
    redisClient = client;
    return client;
  } catch (error) {
    logger.error('Failed to initialize Redis client:', {
      error: error instanceof Error ? error.message : String(error)
    });
    // Close the client if it was created but failed to connect
    await client.quit().catch(() => {});
    throw error;
  }
}

// Initialize Redis client and set up event handlers
let redisInitialization: Promise<void> | null = null;

async function initializeRedisWithRetry(): Promise<void> {
  if (redisInitialization) {
    return redisInitialization;
  }

  redisInitialization = (async () => {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempting to connect to Redis (attempt ${attempt}/${maxRetries})`);
        await initializeRedisClient();
        return;
      } catch (error) {
        lastError = error as Error;
        const delay = Math.min(1000 * attempt, 5000);
        logger.warn(`Redis connection attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: lastError.message
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    logger.error('All Redis connection attempts failed, proceeding without Redis', {
      error: lastError?.message || 'Unknown error'
    });
  })();

  return redisInitialization;
}

// Export a function to get the Redis client
export async function getRedisClient(): Promise<IORedis> {
  if (!redisClient) {
    await initializeRedisWithRetry();
    if (!redisClient) {
      throw new Error('Redis client could not be initialized');
    }
  }
  return redisClient;
}

/**
 * Enhanced Redis utilities for the Subscription Service
 * - Uses service-isolated Redis databases
 * - Provides purpose-specific caching for different data types
 * - Includes fault tolerance and fallback mechanisms
 * - Tracks cache hit/miss statistics
 */
interface RedisUtils {
  stats: {
    defaultCache: { hits: number; misses: number };
    planCache: { hits: number; misses: number };
    userSubsCache: { hits: number; misses: number };
    promoCache: { hits: number; misses: number };
  };
  getStats: () => {
    defaultCache: { hits: number; misses: number; hitRate: number };
    planCache: { hits: number; misses: number; hitRate: number };
    userSubsCache: { hits: number; misses: number; hitRate: number };
    promoCache: { hits: number; misses: number; hitRate: number };
  };
  set: <T>(key: string, value: T, expiryInSeconds?: number) => Promise<'OK' | string>;
  get: <T>(key: string) => Promise<T | null>;
  del: (key: string) => Promise<number>;
  exists: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
  close: () => Promise<void>;
  pingRedis: () => Promise<boolean>;
  cachePlan: (planId: string, planData: any, ttlSeconds?: number) => Promise<boolean>;
  getCachedPlan: (planId: string) => Promise<any>;
  cacheUserSubscriptions: (userId: string, subscriptions: any[], ttlSeconds?: number) => Promise<boolean>;
  getCachedUserSubscriptions: (userId: string) => Promise<any[]>;
  cachePromo: (promoId: string, promoData: any, ttlSeconds?: number) => Promise<boolean>;
  getCachedPromo: (promoId: string) => Promise<any>;
  invalidateUserCache: (userId: string) => Promise<number>;
}

const redisUtils: RedisUtils = {
  stats: {
    defaultCache: { hits: 0, misses: 0 },
    planCache: { hits: 0, misses: 0 },
    userSubsCache: { hits: 0, misses: 0 },
    promoCache: { hits: 0, misses: 0 }
  },

  getStats() {
    const calculateHitRate = (hits: number, misses: number) => {
      const total = hits + misses;
      return total > 0 ? hits / total : 0;
    };

    return {
      defaultCache: {
        ...this.stats.defaultCache,
        hitRate: calculateHitRate(this.stats.defaultCache.hits, this.stats.defaultCache.misses)
      },
      planCache: {
        ...this.stats.planCache,
        hitRate: calculateHitRate(this.stats.planCache.hits, this.stats.planCache.misses)
      },
      userSubsCache: {
        ...this.stats.userSubsCache,
        hitRate: calculateHitRate(this.stats.userSubsCache.hits, this.stats.userSubsCache.misses)
      },
      promoCache: {
        ...this.stats.promoCache,
        hitRate: calculateHitRate(this.stats.promoCache.hits, this.stats.promoCache.misses)
      }
    };
  },

  async set<T>(key: string, value: T, expiryInSeconds?: number): Promise<'OK' | string> {
    try {
      const success = await defaultCache.set(key, value, expiryInSeconds);
      return success ? 'OK' : 'ERROR';
    } catch (error: unknown) {
      try {
        const client = await getRedisClient();
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (expiryInSeconds) {
          return await client.set(key, stringValue, 'EX', expiryInSeconds);
        }
        return await client.set(key, stringValue);
      } catch (fallbackError: unknown) {
        logger.error(`Error setting Redis key ${key}:`, {
          primaryError: error instanceof Error ? error.message : String(error),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
        return 'ERROR';
      }
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await defaultCache.get(key);
      this.stats.defaultCache[value ? 'hits' : 'misses']++;
      return value as T;
    } catch (error: unknown) {
      this.stats.defaultCache.misses++;
      try {
        const client = await getRedisClient();
        const value = await client.get(key);
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      } catch (fallbackError: unknown) {
        logger.error(`Error getting Redis key ${key}:`, {
          primaryError: error instanceof Error ? error.message : String(error),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
        return null;
      }
    }
  },

  async del(key: string): Promise<number> {
    try {
      const success = await defaultCache.del(key);
      return success ? 1 : 0;
    } catch (error: unknown) {
      try {
        const client = await getRedisClient();
        return await client.del(key);
      } catch (fallbackError: unknown) {
        logger.error(`Error deleting Redis key ${key}:`, {
          primaryError: error instanceof Error ? error.message : String(error),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
        return 0;
      }
    }
  },

  async exists(key: string): Promise<number> {
    try {
      const exists = await defaultCache.exists(key);
      return exists ? 1 : 0;
    } catch (error: unknown) {
      try {
        const client = await getRedisClient();
        return await client.exists(key);
      } catch (fallbackError: unknown) {
        logger.error(`Error checking if Redis key ${key} exists:`, {
          primaryError: error instanceof Error ? error.message : String(error),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
        return 0;
      }
    }
  },

  async expire(key: string, seconds: number): Promise<number> {
    try {
      const client = defaultCache.getClient();
      return await client.expire(key, seconds);
    } catch (error: unknown) {
      try {
        const client = await getRedisClient();
        return await client.expire(key, seconds);
      } catch (fallbackError: unknown) {
        logger.error(`Error setting expiry on Redis key ${key}:`, {
          primaryError: error instanceof Error ? error.message : String(error),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
        return 0;
      }
    }
  },

  async close(): Promise<void> {
    const errors: Array<{ client: string; error: string }> = [];
    const closePromises: Promise<unknown>[] = [];

    const closeWithErrorHandling = async (client: any, name: string) => {
      try {
        await client.quit();
      } catch (error) {
        errors.push({ 
          client: name, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    };

    closePromises.push(closeWithErrorHandling(defaultCache.getClient(), 'default'));
    closePromises.push(closeWithErrorHandling(planCache.getClient(), 'plan'));
    closePromises.push(closeWithErrorHandling(userSubsCache.getClient(), 'user-subs'));
    closePromises.push(closeWithErrorHandling(promoCache.getClient(), 'promo'));

    if (redisClient) {
      closePromises.push(closeWithErrorHandling(redisClient, 'legacy'));
    }

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
      try {
        const client = await getRedisClient();
        const response = await client.ping();
        return response === 'PONG';
      } catch (fallbackError: unknown) {
        logger.error('Error pinging Redis:', {
          primaryError: error instanceof Error ? error.message : String(error),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
        return false;
      }
    }
  },

  async cachePlan(planId: string, planData: any, ttlSeconds: number = 240): Promise<boolean> {
    try {
      return await planCache.set(`plan:${planId}`, planData, ttlSeconds);
    } catch (error: unknown) {
      logger.error(`Error caching plan ${planId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  },

  async getCachedPlan(planId: string): Promise<any> {
    try {
      const value = await planCache.get(`plan:${planId}`);
      this.stats.planCache[value ? 'hits' : 'misses']++;
      return value;
    } catch (error: unknown) {
      this.stats.planCache.misses++;
      logger.error(`Error getting cached plan ${planId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  },

  async cacheUserSubscriptions(userId: string, subscriptions: any[], ttlSeconds: number = 240): Promise<boolean> {
    try {
      return await userSubsCache.set(`user:${userId}:subscriptions`, subscriptions, ttlSeconds);
    } catch (error: unknown) {
      logger.error(`Error caching subscriptions for user ${userId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  },

  async getCachedUserSubscriptions(userId: string): Promise<any[]> {
    try {
      const value = await userSubsCache.get(`user:${userId}:subscriptions`) as any[];
      this.stats.userSubsCache[value ? 'hits' : 'misses']++;
      return value || [];
    } catch (error: unknown) {
      this.stats.userSubsCache.misses++;
      logger.error(`Error getting cached subscriptions for user ${userId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  },

  async cachePromo(promoId: string, promoData: any, ttlSeconds: number = CacheKeyUtils.getTTL()): Promise<boolean> {
    try {
      return await promoCache.set(`promo:${promoId}`, promoData, ttlSeconds);
    } catch (error: unknown) {
      logger.error(`Error caching promo ${promoId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  },

  async getCachedPromo(promoId: string): Promise<any> {
    try {
      const value = await promoCache.get(`promo:${promoId}`);
      this.stats.promoCache[value ? 'hits' : 'misses']++;
      return value;
    } catch (error: unknown) {
      this.stats.promoCache.misses++;
      logger.error(`Error getting cached promo ${promoId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  },

  async invalidateUserCache(userId: string): Promise<number> {
    try {
      const pattern = `user:${userId}:*`;
      const keys = await userSubsCache.getClient().keys(pattern);
      if (keys.length === 0) return 0;
      return await userSubsCache.getClient().del(...keys);
    } catch (error: unknown) {
      logger.error(`Failed to invalidate cache for user ${userId}:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return 0;
    }
  }
};

export { redisClient, redisUtils, defaultCache, planCache, userSubsCache, promoCache };
export default redisUtils;

// Initialize Redis when this module is loaded
initializeRedisWithRetry().catch(err => {
  logger.error('Unhandled error during Redis initialization', {
    error: err instanceof Error ? err.message : String(err)
  });});