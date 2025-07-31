/**
 * Environment-aware shared module imports for subscription-management-service
 * Provides a consistent interface for shared utilities across environments
 */

import { ModuleResolver } from './moduleResolver';

// Logger
let logger: any;
try {
  if (ModuleResolver.isDockerEnvironment()) {
    // In Docker/production - use ModuleResolver for correct paths
    const loggerModule = require(ModuleResolver.getSharedPath('utils/logger'));
    logger = loggerModule.default || loggerModule;
    
    // Ensure logger has all required methods
    if (!logger || typeof logger.info !== 'function' || typeof logger.error !== 'function') {
      throw new Error('Invalid logger module');
    }
  } else {
    // In local development, create a simple logger
    logger = {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.log
    };
  }
} catch (error) {
  // Fallback logger with all required methods
  console.error('Failed to load logger, using fallback:', error);
  logger = {
    info: (...args: any[]) => console.log(...args),
    error: (...args: any[]) => console.error(...args),
    warn: (...args: any[]) => console.warn(...args),
    debug: (...args: any[]) => console.log(...args)
  };
}


// Redis Manager
let redisManager: any;
try {
  if (ModuleResolver.isDockerEnvironment()) {
    redisManager = require('../../../../shared/redis');
  } else {
    // Use ioredis for local development
    const Redis = require('ioredis');
    
    // Create a real Redis client
    const createRedisClient = (options: any = {}) => {
      const client = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        db: options.db || 0,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          logger.warn(`Redis reconnecting in ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: 10000,
        ...options
      });

      // Add event listeners
      client.on('connect', () => {
        logger.info('Redis client connected successfully');
      });

      client.on('ready', () => {
        logger.info('Redis client ready');
      });

      client.on('error', (err: Error) => {
        logger.error('Redis client error:', { error: err.message });
      });

      return client;
    };

    redisManager = {
      getRedisHealthMetrics: async () => ({
        status: 'connected',
        connectedClients: '1',
        usedMemory: '0',
        totalKeys: 0,
        hitRate: '0%'
      }),
      createServiceRedisClient: (serviceName: string, options: any = {}) => {
        try {
          const db = options.db || redisManager.SERVICE_DB_MAPPING[serviceName] || 0;
          logger.info(`Creating Redis client for service ${serviceName} on DB ${db}`);
          return createRedisClient({
            ...options,
            keyPrefix: `${serviceName}:`,
            db
          });
        } catch (error) {
          logger.error('Error creating Redis client:', { 
            error: error instanceof Error ? error.message : String(error) 
          });
          throw error;
        }
      },
      RedisCache: class RedisCache {
        private client: any;
        private prefix: string;
        
        constructor(serviceName: string, options: any = {}) {
          this.prefix = options.keyPrefix || `${serviceName}:cache:`;
          try {
            this.client = createRedisClient({
              ...options,
              keyPrefix: this.prefix,
              db: options.db || redisManager.SERVICE_DB_MAPPING[serviceName] || 0
            });
          } catch (error) {
            logger.error('Failed to initialize RedisCache:', { 
              serviceName,
              error: error instanceof Error ? error.message : String(error)
            });
            throw error;
          }
        }

        async get(key: string): Promise<any> {
          try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            logger.error('Redis get error:', { 
              key,
              error: error instanceof Error ? error.message : String(error)
            });
            return null;
          }
        }

        async set(key: string, value: any, ttl?: number): Promise<boolean> {
          try {
            const serialized = JSON.stringify(value);
            if (ttl) {
              await this.client.set(key, serialized, 'EX', ttl);
            } else {
              await this.client.set(key, serialized);
            }
            return true;
          } catch (error) {
            logger.error('Redis set error:', { 
              key,
              error: error instanceof Error ? error.message : String(error)
            });
            return false;
          }
        }

        async del(key: string): Promise<boolean> {
          try {
            const result = await this.client.del(key);
            return result > 0;
          } catch (error) {
            logger.error('Redis del error:', { 
              key,
              error: error instanceof Error ? error.message : String(error)
            });
            return false;
          }
        }

        async exists(key: string): Promise<boolean> {
          try {
            const result = await this.client.exists(key);
            return result === 1;
          } catch (error) {
            logger.error('Redis exists error:', { 
              key,
              error: error instanceof Error ? error.message : String(error)
            });
            return false;
          }
        }

        getClient() {
          return this.client;
        }
      },
      SERVICE_DB_MAPPING: {
        user: 2,
        auth: 1,
        content: 4,
        subscription: 3
      }
    };
  }
} catch (error) {
  logger.error('Error initializing Redis manager, using mock implementation', { 
    error: error instanceof Error ? error.message : String(error) 
  });
  
  // Fallback to mock implementation
  redisManager = {
    getRedisHealthMetrics: async () => ({
      status: 'disconnected',
      connectedClients: '0',
      usedMemory: '0',
      totalKeys: 0,
      hitRate: '0%'
    }),
    createServiceRedisClient: () => ({
      on: () => {},
      ping: async () => 'PONG',
      set: async () => 'OK',
      get: async () => null,
      del: async () => 1,
      exists: async () => 0,
      quit: async () => 'OK',
      disconnect: async () => {}
    }),
    RedisCache: class MockRedisCache {
      async get() { return null; }
      async set() { return true; }
      async del() { return true; }
      async exists() { return false; }
      getClient() { 
        return {
          on: () => {},
          ping: async () => 'PONG',
          set: async () => 'OK',
          get: async () => null,
          del: async () => 1,
          exists: async () => 0,
          quit: async () => 'OK',
          disconnect: async () => {}
        };
      }
    },
    SERVICE_DB_MAPPING: {
      user: 2,
      auth: 1,
      content: 4,
      subscription: 3
    }
  };
}

// Configuration
let config: any;
try {
  if (ModuleResolver.isDockerEnvironment()) {
    // Try to use shared config first, fallback to local config
    try {
      config = require('../../../../shared/config');
    } catch {
      config = require('../config');
    }
  } else {
    // Local development config with unified interface
    const localConfig = require('../config');
    config = {
      // Add get method for compatibility with shared config interface
      get: (key: string, defaultValue?: any) => {
        const keys = key.split('.');
        let current = config;
        for (const k of keys) {
          if (current && typeof current === 'object' && k in current) {
            current = current[k];
          } else {
            return defaultValue;
          }
        }
        return current;
      },
      // Include existing config properties
      ...localConfig,
      redis: {
        ...localConfig.redis,
        url: process.env.REDIS_URL || `redis://${localConfig.redis.host}:${localConfig.redis.port}`,
        db: 3 // Subscription service database
      }
    };
  }
} catch {
  // Fallback config with get method
  config = {
    get: (key: string, defaultValue?: any) => {
      const keys = key.split('.');
      if (keys[0] === 'redis') {
        if (keys[1] === 'host') return process.env.REDIS_HOST || defaultValue || 'localhost';
        if (keys[1] === 'port') return process.env.REDIS_PORT || defaultValue || '6379';
        if (keys[1] === 'password') return process.env.REDIS_PASSWORD || defaultValue || '';
        if (keys[1] === 'url') return process.env.REDIS_URL || defaultValue || 'redis://localhost:6379';
      }
      return defaultValue;
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: 3 // Subscription service database
    },
    mongodb: {
      uri: process.env.MONGODB_URL || 'mongodb://localhost:27017/subscription-service'
    }
  };
}

export {
  logger,
  redisManager,
  config
};

export default {
  logger,
  redisManager,
  config
};
