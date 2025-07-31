/**
 * Environment-aware shared module imports for auth-service
 * Provides a consistent interface for shared utilities across environments
 */

import path from 'path';

// Module Resolver class for auth service
export class ModuleResolver {
  /**
   * Determines if we're running in a Docker environment
   */
  static isDockerEnvironment(): boolean {
    // Check if we're in Docker container
    if (process.cwd() === '/app') return true;
    
    // Check for Docker-specific environment variables
    if (process.env.DOCKER_CONTAINER === 'true') return true;
    
    // Check for production environment
    if (process.env.NODE_ENV === 'production') return true;
    
    // Check if we're in a typical Docker working directory
    if (process.cwd().startsWith('/app')) return true;
    
    return false;
  }

  /**
   * Gets the appropriate path for shared modules based on environment
   */
  static getSharedPath(relativePath: string): string {
    if (this.isDockerEnvironment()) {
      // In Docker/production, use the container path structure
      return path.join('/app/shared', relativePath);
    } else {
      // In local development, navigate up to shared folder
      const basePath = path.resolve(__dirname, '../../../shared');
      return path.join(basePath, relativePath);
    }
  }
}

// Logger
let logger: any;
try {
  if (ModuleResolver.isDockerEnvironment()) {
    // In Docker/production
    logger = require('../../../../shared/utils/logger');
  } else {
    // In local development, create a simple logger
    logger = {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.log
    };
  }
} catch {
  // Fallback logger
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.log
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
          return delay;
        },
        ...options
      });

      // Add event listeners
      client.on('connect', () => {
        logger.info('Redis client connected successfully');
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
        return createRedisClient({
          ...options,
          keyPrefix: `${serviceName}:`,
          db: options.db || redisManager.SERVICE_DB_MAPPING[serviceName] || 0
        });
      },
      RedisCache: class RedisCache {
        private client: any;
        private prefix: string;
        
        constructor(serviceName: string, options: any = {}) {
          this.prefix = options.keyPrefix || `${serviceName}:cache:`;
          this.client = createRedisClient({
            ...options,
            keyPrefix: this.prefix
          });
        }

        async get(key: string): Promise<any> {
          const value = await this.client.get(key);
          return value ? JSON.parse(value) : null;
        }

        async set(key: string, value: any, ttl?: number): Promise<boolean> {
          const serialized = JSON.stringify(value);
          if (ttl) {
            await this.client.set(key, serialized, 'EX', ttl);
          } else {
            await this.client.set(key, serialized);
          }
          return true;
        }

        async del(key: string): Promise<boolean> {
          const result = await this.client.del(key);
          return result > 0;
        }

        async exists(key: string): Promise<boolean> {
          const result = await this.client.exists(key);
          return result === 1;
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
  logger.error('Error initializing Redis manager, using mock implementation', { error: error.message });
  // Fallback to mock implementation
  redisManager = {
    getRedisHealthMetrics: async () => ({
      uptime: '0',
      connectedClients: '0', 
      usedMemory: '0',
      totalKeys: 0,
      hitRate: '0%'
    }),
    createServiceRedisClient: () => ({
      ping: async () => 'PONG',
      set: async () => 'OK',
      get: async () => null,
      del: async () => 1,
      exists: async () => 0,
      ttl: async () => -1,
      expire: async () => 1,
      disconnect: async () => {},
      quit: async () => 'OK'
    }),
    RedisCache: class MockRedisCache {
      constructor(serviceName?: string, options?: any) {}
      async get(key: string): Promise<any> { return null; }
      async set(key: string, value: any, ttl?: number): Promise<boolean> { return true; }
      async del(key: string): Promise<boolean> { return true; }
      async exists(key: string): Promise<boolean> { return false; }
      getClient() {
        return {
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
    config = require('../../../../shared/config');
  } else {
    // Local development config with get method
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
        port: process.env.REDIS_PORT || '6379',
        password: process.env.REDIS_PASSWORD || '',
        db: 1 // Auth service database
      },
      mongodb: {
        url: process.env.MONGODB_URL || 'mongodb://localhost:27017/auth-service'
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
      port: process.env.REDIS_PORT || '6379',
      password: process.env.REDIS_PASSWORD || '',
      db: 1 // Auth service database
    },
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017/auth-service'
    }
  };
}

// Local interface definitions for auth service
export interface IUser {
  _id?: string;
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  roles?: string[];
  isActive?: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Mock email service for auth service
const emailService = {
  sendEmail: async (to: string, subject: string, text: string) => {
    console.log('Email sent:', { to, subject, text });
  },
  sendPasswordResetOTP: async (email: string, otp: string) => {
    console.log('Password reset OTP sent:', { email, otp });
  },
  sendWelcomeEmail: async (email: string, name: string) => {
    console.log('Welcome email sent:', { email, name });
  }
};

export {
  logger,
  redisManager,
  config,
  emailService
};

export default {
  logger,
  redisManager,
  config
};
