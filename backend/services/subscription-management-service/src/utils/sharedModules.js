"use strict";
/**
 * Environment-aware shared module imports for subscription-management-service
 * Provides a consistent interface for shared utilities across environments
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.redisManager = exports.logger = void 0;
const moduleResolver_1 = require("./moduleResolver");
// Logger
let logger;
try {
    if (moduleResolver_1.ModuleResolver.isDockerEnvironment()) {
        // In Docker/production
        exports.logger = logger = require('../../../../shared/utils/logger');
    }
    else {
        // In local development, create a simple logger
        exports.logger = logger = {
            info: console.log,
            error: console.error,
            warn: console.warn,
            debug: console.log
        };
    }
}
catch (_a) {
    // Fallback logger
    exports.logger = logger = {
        info: console.log,
        error: console.error,
        warn: console.warn,
        debug: console.log
    };
}
// Redis Manager
let redisManager;
try {
    if (moduleResolver_1.ModuleResolver.isDockerEnvironment()) {
        exports.redisManager = redisManager = require('../../../../shared/utils/redis-manager');
    }
    else {
        // Mock Redis manager for local development
        exports.redisManager = redisManager = {
            getRedisHealthMetrics: () => __awaiter(void 0, void 0, void 0, function* () {
                return ({
                    uptime: '0',
                    connectedClients: '0',
                    usedMemory: '0',
                    totalKeys: 0,
                    hitRate: '0%'
                });
            }),
            createServiceRedisClient: () => null,
            RedisCache: class MockRedisCache {
                constructor(serviceName, options) { }
                get(key) {
                    return __awaiter(this, void 0, void 0, function* () { return null; });
                }
                set(key, value, ttl) {
                    return __awaiter(this, void 0, void 0, function* () { return true; });
                }
                del(key) {
                    return __awaiter(this, void 0, void 0, function* () { return true; });
                }
                exists(key) {
                    return __awaiter(this, void 0, void 0, function* () { return false; });
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
}
catch (_b) {
    // Fallback Redis manager
    exports.redisManager = redisManager = {
        getRedisHealthMetrics: () => __awaiter(void 0, void 0, void 0, function* () {
            return ({
                uptime: '0',
                connectedClients: '0',
                usedMemory: '0',
                totalKeys: 0,
                hitRate: '0%'
            });
        }),
        createServiceRedisClient: () => null,
        RedisCache: class MockRedisCache {
            constructor(serviceName, options) { }
            get(key) {
                return __awaiter(this, void 0, void 0, function* () { return null; });
            }
            set(key) {
                return __awaiter(this, void 0, void 0, function* () { return true; });
            }
            del(key) {
                return __awaiter(this, void 0, void 0, function* () { return true; });
            }
            exists(key) {
                return __awaiter(this, void 0, void 0, function* () { return false; });
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
let config;
try {
    if (moduleResolver_1.ModuleResolver.isDockerEnvironment()) {
        // Try to use shared config first, fallback to local config
        try {
            exports.config = config = require('../../../../shared/config');
        }
        catch (_c) {
            exports.config = config = require('../config');
        }
    }
    else {
        // Local development config with unified interface
        const localConfig = require('../config');
        exports.config = config = Object.assign(Object.assign({ 
            // Add get method for compatibility with shared config interface
            get: (key, defaultValue) => {
                const keys = key.split('.');
                let current = config;
                for (const k of keys) {
                    if (current && typeof current === 'object' && k in current) {
                        current = current[k];
                    }
                    else {
                        return defaultValue;
                    }
                }
                return current;
            } }, localConfig), { redis: Object.assign(Object.assign({}, localConfig.redis), { url: process.env.REDIS_URL || `redis://${localConfig.redis.host}:${localConfig.redis.port}`, db: 3 // Subscription service database
             }) });
    }
}
catch (_d) {
    // Fallback config with get method
    exports.config = config = {
        get: (key, defaultValue) => {
            const keys = key.split('.');
            if (keys[0] === 'redis') {
                if (keys[1] === 'host')
                    return process.env.REDIS_HOST || defaultValue || 'localhost';
                if (keys[1] === 'port')
                    return process.env.REDIS_PORT || defaultValue || '6379';
                if (keys[1] === 'password')
                    return process.env.REDIS_PASSWORD || defaultValue || '';
                if (keys[1] === 'url')
                    return process.env.REDIS_URL || defaultValue || 'redis://localhost:6379';
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
exports.default = {
    logger,
    redisManager,
    config
};
