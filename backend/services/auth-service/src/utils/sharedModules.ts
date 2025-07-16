/**
 * Environment-aware shared module imports for auth-service
 * Provides a consistent interface for shared utilities across environments
 */

import { ModuleResolver } from './moduleResolver';

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
    // Mock Redis manager for local development
    redisManager = {
      getRedisHealthMetrics: async () => ({
        uptime: '0',
        connectedClients: '0',
        usedMemory: '0',
        totalKeys: 0,
        hitRate: '0%'
      }),
      createServiceRedisClient: () => null,
      RedisCache: class MockRedisCache {
        constructor(serviceName?: string, options?: any) {}
        async get(key: string): Promise<any> { return null; }
        async set(key: string, value: any, ttl?: number): Promise<boolean> { return true; }
        async del(key: string): Promise<boolean> { return true; }
        async exists(key: string): Promise<boolean> { return false; }
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
  // Fallback Redis manager
  redisManager = {
    getRedisHealthMetrics: async () => ({
      uptime: '0',
      connectedClients: '0', 
      usedMemory: '0',
      totalKeys: 0,
      hitRate: '0%'
    }),
    createServiceRedisClient: () => null,
    RedisCache: class MockRedisCache {
      constructor(serviceName?: string, options?: any) {}
      async get(key: string): Promise<any> { return null; }
      async set(key: string): Promise<boolean> { return true; }
      async del(key: string): Promise<boolean> { return true; }
      async exists(key: string): Promise<boolean> { return false; }
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
