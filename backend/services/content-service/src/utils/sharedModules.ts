/**
 * Environment-aware shared module imports for content-service
 * Provides a consistent interface for shared utilities across environments
 */

// Simple environment detection
const isDockerEnvironment = (): boolean => {
  console.log('=== Content Service Environment Detection Debug ===');
  console.log('process.cwd():', process.cwd());
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('KUBERNETES_SERVICE_HOST:', process.env.KUBERNETES_SERVICE_HOST);
  console.log('MONGO_URI contains mongodb+srv:', process.env.MONGODB_URL?.includes('mongodb+srv://'));
  console.log('REDIS_URL:', process.env.REDIS_URL);
  
  // Check if we're in Docker container
  if (process.cwd() === '/app') {
    console.log('✅ Docker detected: process.cwd() === /app');
    return true;
  }
  
  // Check for Docker-specific environment variables
  if (process.env.DOCKER_CONTAINER === 'true') {
    console.log('✅ Docker detected: DOCKER_CONTAINER === true');
    return true;
  }
  
  // Check for production environment
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Production detected: NODE_ENV === production');
    return true;
  }
  
  // Check if we're in a typical Docker working directory
  if (process.cwd().startsWith('/app')) {
    console.log('✅ Docker detected: process.cwd() starts with /app');
    return true;
  }
  
  // Check for Kubernetes environment variables
  if (process.env.KUBERNETES_SERVICE_HOST) {
    console.log('✅ Kubernetes detected: KUBERNETES_SERVICE_HOST exists');
    return true;
  }
  if (process.env.KUBERNETES_PORT) {
    console.log('✅ Kubernetes detected: KUBERNETES_PORT exists');
    return true;
  }
  
  // Check for production MongoDB (indicates production environment)
  if (process.env.MONGODB_URL && process.env.MONGODB_URL.includes('mongodb+srv://')) {
    console.log('✅ Production detected: MongoDB Atlas URI found');
    return true;
  }
  
  console.log('❌ Local environment detected');
  return false;
};

// Logger
let logger: any;
try {
  if (isDockerEnvironment()) {
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
  const isDocker = isDockerEnvironment();
  console.log(`=== Content Service Redis Manager Loading: isDockerEnvironment = ${isDocker} ===`);
  
  if (isDocker) {
    console.log('🔄 Attempting to load shared Redis manager...');
    redisManager = require('../../../shared/utils/redis-manager');
    console.log('✅ Shared Redis manager loaded successfully');
  } else {
    console.log('🔄 Using mock Redis manager for local development');
    // Mock Redis manager for local development
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
        quit: async () => 'OK',
        keys: async () => [],
        del: async () => 0,
        get: async () => null,
        set: async () => 'OK',
        exists: async () => 0,
        on: (event: string, listener: (...args: any[]) => void) => {
          // Mock event listener
          console.log(`Redis event listener registered for: ${event}`);
        }
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
            quit: async () => 'OK',
            keys: async () => [],
            del: async () => 0
          };
        }
        async ping() { return 'PONG'; }
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
    createServiceRedisClient: () => ({
      ping: async () => 'PONG',
      quit: async () => 'OK',
      keys: async () => [],
      del: async () => 0,
      get: async () => null,
      set: async () => 'OK',
      exists: async () => 0
    }),
    RedisCache: class MockRedisCache {
      async get() { return null; }
      async set() { return true; }
      async del() { return true; }
      async exists() { return false; }
      getClient() { 
        return {
          ping: async () => 'PONG',
          quit: async () => 'OK',
          keys: async () => [],
          del: async () => 0
        };
      }
      async ping() { return 'PONG'; }
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
