"use strict";
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
exports.promoCache = exports.userSubsCache = exports.planCache = exports.defaultCache = exports.redisUtils = exports.redisClient = void 0;
const sharedModules_1 = require("./sharedModules");
const cache_key_utils_1 = require("./cache-key-utils");
// Extract utilities from redisManager
const { RedisCache, createServiceRedisClient, SERVICE_DB_MAPPING, RedisOptions } = sharedModules_1.redisManager;
// Constants
const SERVICE_NAME = 'subscription';
const DB_NUMBER = 3;
// Create service-specific Redis clients
const defaultCache = new RedisCache(SERVICE_NAME);
exports.defaultCache = defaultCache;
const planCache = new RedisCache(SERVICE_NAME, { keyPrefix: `${SERVICE_NAME}:plans:` });
exports.planCache = planCache;
const userSubsCache = new RedisCache(SERVICE_NAME, { keyPrefix: `${SERVICE_NAME}:user-subscriptions:` });
exports.userSubsCache = userSubsCache;
const promoCache = new RedisCache(SERVICE_NAME, { keyPrefix: `${SERVICE_NAME}:promos:` });
exports.promoCache = promoCache;
// Create standard Redis client instance
const redisClient = createServiceRedisClient(SERVICE_NAME, {
    host: sharedModules_1.config.get ? sharedModules_1.config.get('redis.host', 'localhost') : sharedModules_1.config.redis.host,
    port: sharedModules_1.config.get ? parseInt(sharedModules_1.config.get('redis.port', '6379')) : sharedModules_1.config.redis.port,
    password: (sharedModules_1.config.get ? sharedModules_1.config.get('redis.password', '') : sharedModules_1.config.redis.password) || undefined,
    db: SERVICE_DB_MAPPING[SERVICE_NAME] || DB_NUMBER
});
exports.redisClient = redisClient;
// Connection event handlers
redisClient.on('error', (error) => sharedModules_1.logger.error('Redis client error:', { error: error.message }));
redisClient.on('connect', () => sharedModules_1.logger.info('Redis client connected successfully'));
redisClient.on('end', () => sharedModules_1.logger.warn('Redis client disconnected'));
redisClient.on('reconnecting', () => sharedModules_1.logger.info('Redis client reconnecting...'));
// Log Redis database information
sharedModules_1.logger.info(`Subscription service using Redis database ${SERVICE_DB_MAPPING[SERVICE_NAME] || DB_NUMBER}`);
const redisUtils = {
    stats: {
        defaultCache: { hits: 0, misses: 0 },
        planCache: { hits: 0, misses: 0 },
        userSubsCache: { hits: 0, misses: 0 },
        promoCache: { hits: 0, misses: 0 }
    },
    getStats() {
        return {
            defaultCache: Object.assign(Object.assign({}, this.stats.defaultCache), { hitRate: this.stats.defaultCache.hits / (this.stats.defaultCache.hits + this.stats.defaultCache.misses) || 0 }),
            planCache: Object.assign(Object.assign({}, this.stats.planCache), { hitRate: this.stats.planCache.hits / (this.stats.planCache.hits + this.stats.planCache.misses) || 0 }),
            userSubsCache: Object.assign(Object.assign({}, this.stats.userSubsCache), { hitRate: this.stats.userSubsCache.hits / (this.stats.userSubsCache.hits + this.stats.userSubsCache.misses) || 0 }),
            promoCache: Object.assign(Object.assign({}, this.stats.promoCache), { hitRate: this.stats.promoCache.hits / (this.stats.promoCache.hits + this.stats.promoCache.misses) || 0 })
        };
    },
    set(key, value, expiryInSeconds) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const success = yield defaultCache.set(key, value, expiryInSeconds);
                return success ? 'OK' : 'ERROR';
            }
            catch (error) {
                try {
                    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    if (expiryInSeconds) {
                        yield redisClient.set(key, stringValue, 'EX', expiryInSeconds);
                    }
                    else {
                        yield redisClient.set(key, stringValue);
                    }
                    return 'OK';
                }
                catch (fallbackError) {
                    sharedModules_1.logger.error(`Error setting Redis key ${key}:`, {
                        primaryError: error instanceof Error ? error.message : String(error),
                        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                    });
                    return 'ERROR';
                }
            }
        });
    },
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const value = yield defaultCache.get(key);
                this.stats.defaultCache[value ? 'hits' : 'misses']++;
                return value;
            }
            catch (error) {
                this.stats.defaultCache.misses++;
                try {
                    const value = yield redisClient.get(key);
                    if (!value)
                        return null;
                    try {
                        return JSON.parse(value);
                    }
                    catch (_a) {
                        return value;
                    }
                }
                catch (fallbackError) {
                    sharedModules_1.logger.error(`Error getting Redis key ${key}:`, {
                        primaryError: error instanceof Error ? error.message : String(error),
                        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                    });
                    return null;
                }
            }
        });
    },
    del(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const success = yield defaultCache.del(key);
                return success ? 1 : 0;
            }
            catch (error) {
                try {
                    return yield redisClient.del(key);
                }
                catch (fallbackError) {
                    sharedModules_1.logger.error(`Error deleting Redis key ${key}:`, {
                        primaryError: error instanceof Error ? error.message : String(error),
                        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                    });
                    return 0;
                }
            }
        });
    },
    exists(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const exists = yield defaultCache.exists(key);
                return exists ? 1 : 0;
            }
            catch (error) {
                try {
                    return yield redisClient.exists(key);
                }
                catch (fallbackError) {
                    sharedModules_1.logger.error(`Error checking if Redis key ${key} exists:`, {
                        primaryError: error instanceof Error ? error.message : String(error),
                        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                    });
                    return 0;
                }
            }
        });
    },
    expire(key, seconds) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const client = defaultCache.getClient();
                return yield client.expire(key, seconds);
            }
            catch (error) {
                try {
                    return yield redisClient.expire(key, seconds);
                }
                catch (fallbackError) {
                    sharedModules_1.logger.error(`Error setting expiry on Redis key ${key}:`, {
                        primaryError: error instanceof Error ? error.message : String(error),
                        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                    });
                    return 0;
                }
            }
        });
    },
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            const errors = [];
            const closePromises = [];
            closePromises.push(defaultCache.getClient().quit().catch((error) => {
                errors.push({ client: 'default', error: error.message });
                return '';
            }));
            closePromises.push(planCache.getClient().quit().catch((error) => {
                errors.push({ client: 'plan', error: error.message });
                return '';
            }));
            closePromises.push(userSubsCache.getClient().quit().catch((error) => {
                errors.push({ client: 'user-subs', error: error.message });
                return '';
            }));
            closePromises.push(promoCache.getClient().quit().catch((error) => {
                errors.push({ client: 'promo', error: error.message });
                return '';
            }));
            closePromises.push(redisClient.quit().catch((error) => {
                errors.push({ client: 'legacy', error: error.message });
                return '';
            }));
            yield Promise.all(closePromises);
            if (errors.length > 0) {
                sharedModules_1.logger.error('Errors closing Redis connections:', errors);
            }
            else {
                sharedModules_1.logger.info('All Redis connections closed successfully');
            }
        });
    },
    pingRedis() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield defaultCache.getClient().ping();
                return response === 'PONG';
            }
            catch (error) {
                try {
                    const response = yield redisClient.ping();
                    return response === 'PONG';
                }
                catch (fallbackError) {
                    sharedModules_1.logger.error('Error pinging Redis:', {
                        primaryError: error instanceof Error ? error.message : String(error),
                        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                    });
                    return false;
                }
            }
        });
    },
    cachePlan(planId_1, planData_1) {
        return __awaiter(this, arguments, void 0, function* (planId, planData, ttlSeconds = 240) {
            try {
                return yield planCache.set(`plan:${planId}`, planData, ttlSeconds);
            }
            catch (error) {
                sharedModules_1.logger.error(`Error caching plan ${planId}:`, { error: error instanceof Error ? error.message : String(error) });
                return false;
            }
        });
    },
    getCachedPlan(planId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const value = yield planCache.get(`plan:${planId}`);
                this.stats.planCache[value ? 'hits' : 'misses']++;
                return value;
            }
            catch (error) {
                this.stats.planCache.misses++;
                sharedModules_1.logger.warn(`Error getting cached plan ${planId}:`, { error: error instanceof Error ? error.message : String(error) });
                return null;
            }
        });
    },
    cacheUserSubscriptions(userId_1, subscriptions_1) {
        return __awaiter(this, arguments, void 0, function* (userId, subscriptions, ttlSeconds = 240) {
            try {
                return yield userSubsCache.set(`user:${userId}:subscriptions`, subscriptions, ttlSeconds);
            }
            catch (error) {
                sharedModules_1.logger.error(`Error caching subscriptions for user ${userId}:`, { error: error instanceof Error ? error.message : String(error) });
                return false;
            }
        });
    },
    getCachedUserSubscriptions(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const value = yield userSubsCache.get(`user:${userId}:subscriptions`);
                this.stats.userSubsCache[value ? 'hits' : 'misses']++;
                return value || [];
            }
            catch (error) {
                this.stats.userSubsCache.misses++;
                sharedModules_1.logger.warn(`Error getting cached subscriptions for user ${userId}:`, { error: error instanceof Error ? error.message : String(error) });
                return [];
            }
        });
    },
    cachePromo(promoId_1, promoData_1) {
        return __awaiter(this, arguments, void 0, function* (promoId, promoData, ttlSeconds = cache_key_utils_1.CacheKeyUtils.getTTL()) {
            try {
                return yield promoCache.set(`promo:${promoId}`, promoData, ttlSeconds);
            }
            catch (error) {
                sharedModules_1.logger.error(`Error caching promo ${promoId}:`, { error: error instanceof Error ? error.message : String(error) });
                return false;
            }
        });
    },
    getCachedPromo(promoId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const value = yield promoCache.get(`promo:${promoId}`);
                this.stats.promoCache[value ? 'hits' : 'misses']++;
                return value;
            }
            catch (error) {
                this.stats.promoCache.misses++;
                sharedModules_1.logger.warn(`Error getting cached promo ${promoId}:`, { error: error instanceof Error ? error.message : String(error) });
                return null;
            }
        });
    },
    invalidateUserCache(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pattern = `user:${userId}:*`;
                const keys = yield userSubsCache.getClient().keys(pattern);
                if (keys.length === 0)
                    return 0;
                return yield userSubsCache.getClient().del(...keys);
            }
            catch (error) {
                sharedModules_1.logger.warn(`Failed to invalidate cache for user ${userId}:`, { error: error instanceof Error ? error.message : String(error) });
                return 0;
            }
        });
    }
};
exports.redisUtils = redisUtils;
exports.default = redisUtils;
