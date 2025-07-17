/**
 * Environment-aware shared module imports
 * Provides a consistent interface for shared utilities across environments
 */

import { ModuleResolver } from './moduleResolver';

// Logger
let logger: any;
try {
  if (process.env.NODE_ENV === 'production' || process.cwd() === '/app') {
    // In Docker/production
    logger = require('../../../shared/utils/logger');
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
  if (process.env.NODE_ENV === 'production' || process.cwd() === '/app') {
    redisManager = require('../../../shared/utils/redis-manager');
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
        async get() { return null; }
        async set() { return true; }
        async del() { return true; }
        async exists() { return false; }
      },
      SERVICE_DB_MAPPING: {
        'api-gateway': 0,
        'auth': 1,
        'user': 2,
        'subscription': 3,
        'content': 4,
        'notification': 5,
        'payment': 6,
        'monitoring': 7,
        'analytics': 8,
        'default': 0
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
      async get() { return null; }
      async set() { return true; }
      async del() { return true; }
      async exists() { return false; }
    },
    SERVICE_DB_MAPPING: {
      'api-gateway': 0,
      'auth': 1,
      'user': 2,
      'subscription': 3,
      'content': 4,
      'notification': 5,
      'payment': 6,
      'monitoring': 7,
      'analytics': 8,
      'default': 0
    }
  };
}

// Elasticsearch Client
let esClient: any;
try {
  if (process.env.NODE_ENV === 'production' || process.cwd() === '/app') {
    esClient = require('../../../shared/utils/elasticsearch');
  } else {
    // Mock Elasticsearch for local development
    esClient = {
      search: async () => ({ hits: { hits: [] } }),
      index: async () => ({ result: 'created' }),
      update: async () => ({ result: 'updated' }),
      delete: async () => ({ result: 'deleted' })
    };
  }
} catch {
  // Fallback Elasticsearch client
  esClient = {
    search: async () => ({ hits: { hits: [] } }),
    index: async () => ({ result: 'created' }),
    update: async () => ({ result: 'updated' }),
    delete: async () => ({ result: 'deleted' })
  };
}

// Configuration
let config: any;
try {
  if (process.env.NODE_ENV === 'production' || process.cwd() === '/app') {
    config = require('../../../shared/config').default;
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
        db: 4
      },
      mongodb: {
        url: process.env.MONGODB_URL || 'mongodb://localhost:27017/content-service'
      },
      elasticsearch: {
        url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
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
      db: 4
    },
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017/content-service'
    },
    elasticsearch: {
      url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
    }
  };
}

export {
  logger,
  redisManager,
  esClient,
  config
};

export default {
  logger,
  redisManager,
  esClient,
  config
};
