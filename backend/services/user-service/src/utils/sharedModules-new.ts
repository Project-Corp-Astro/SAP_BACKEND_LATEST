/**
 * Environment-aware shared module imports for user-service
 * Provides a consistent interface for shared utilities across environments
 */

// Simple logger for container environment
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log
};

// Mock Redis manager for container environment
const redisManager = {
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
    async set(key: string, value: any, ttl?: number): Promise<void> {}
    async del(key: string): Promise<void> {}
    async exists(key: string): Promise<boolean> { return false; }
    async flush(): Promise<void> {}
    async keys(pattern: string): Promise<string[]> { return []; }
    getStats() { return { hits: 0, misses: 0, hitRate: 0 }; }
  },
  SERVICE_DB_MAPPING: {
    user: 2,
    auth: 1,
    content: 4,
    subscription: 3
  }
};

// Simple config for container environment
const config = {
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
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: 2 // user service database
  },
  database: {
    url: process.env.MONGO_URL || 'mongodb://localhost:27017/sap-user-service'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  service: {
    port: parseInt(process.env.PORT || '3002'),
    environment: process.env.NODE_ENV || 'development'
  }
};

export { logger, redisManager, config };

export default {
  logger,
  redisManager,
  config
};
