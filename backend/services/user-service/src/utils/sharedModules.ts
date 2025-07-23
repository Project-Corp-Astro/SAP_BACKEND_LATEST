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
    redisManager = require('../../../../shared/utils/redis-manager');
  } else {
    // Enhanced Mock Redis manager for local development
    redisManager = {
      getRedisHealthMetrics: async () => ({
        uptime: '0',
        connectedClients: '0',
        usedMemory: '0',
        totalKeys: 0,
        hitRate: '0%'
      }),
      createServiceRedisClient: () => ({
        // Mock Redis client with essential methods
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
        serviceName?: string;
        options?: any;
        
        constructor(serviceName?: string, options?: any) {
          this.serviceName = serviceName;
          this.options = options;
        }
        
        async get(key: string): Promise<any> { 
          console.log(`[Mock Redis] GET ${key}`);
          return null; 
        }
        
        async set(key: string, value: any, ttl?: number): Promise<boolean> { 
          console.log(`[Mock Redis] SET ${key} = ${JSON.stringify(value)} ${ttl ? `(TTL: ${ttl}s)` : ''}`);
          return true; 
        }
        
        async del(key: string): Promise<boolean> { 
          console.log(`[Mock Redis] DEL ${key}`);
          return true; 
        }
        
        async exists(key: string): Promise<boolean> { 
          console.log(`[Mock Redis] EXISTS ${key}`);
          return false; 
        }
        
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
} catch {
  // Fallback Redis manager with enhanced mock
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
