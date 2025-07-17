"use strict";
/**
 * Monitoring Controller
 *
 * This controller provides endpoints for monitoring the performance and health of the Content Service.
 * It exposes metrics such as cache hit rates, response times, and memory usage.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("../utils/redis");
const redis_manager_1 = require("../../../../shared/utils/redis-manager");
const performance_1 = __importDefault(require("../utils/performance"));
const mongoose_1 = __importDefault(require("mongoose"));
const os_1 = __importDefault(require("os"));
class MonitoringController {
    /**
     * Get performance metrics
     * @param req - Express request object
     * @param res - Express response object
     */
    getMetrics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get performance metrics
            const metrics = performance_1.default.getMetrics();
            // Get cache statistics
            const cacheStats = redis_1.redisUtils.getStats();
            // Get system information
            const systemInfo = {
                uptime: process.uptime(),
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                cpuCount: os_1.default.cpus().length,
                totalMemory: Math.round(os_1.default.totalmem() / 1024 / 1024),
                freeMemory: Math.round(os_1.default.freemem() / 1024 / 1024),
                loadAverage: os_1.default.loadavg()
            };
            res.status(200).json({
                success: true,
                timestamp: new Date().toISOString(),
                metrics,
                cache: cacheStats,
                system: systemInfo
            });
        });
    }
    /**
     * Reset performance metrics
     * @param req - Express request object
     * @param res - Express response object
     */
    resetMetrics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            performance_1.default.resetMetrics();
            res.status(200).json({
                success: true,
                message: 'Performance metrics reset successfully',
                timestamp: new Date().toISOString()
            });
        });
    }
    /**
     * Get health status
     * @param req - Express request object
     * @param res - Express response object
     */
    getHealth(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get system information
            const systemInfo = {
                uptime: process.uptime(),
                memory: {
                    total: Math.round(os_1.default.totalmem() / 1024 / 1024),
                    free: Math.round(os_1.default.freemem() / 1024 / 1024),
                    used: Math.round((os_1.default.totalmem() - os_1.default.freemem()) / 1024 / 1024)
                },
                cpu: {
                    count: os_1.default.cpus().length,
                    loadAverage: os_1.default.loadavg()
                }
            };
            // Check if memory usage is critical (less than 10% free)
            const memoryUsagePercent = (os_1.default.freemem() / os_1.default.totalmem()) * 100;
            const memoryStatus = memoryUsagePercent < 10 ? 'critical' : 'healthy';
            // Check if CPU load is critical (load average > CPU count)
            const cpuStatus = os_1.default.loadavg()[0] > os_1.default.cpus().length ? 'critical' : 'healthy';
            // Check Redis health
            const redisConnected = yield redis_1.redisUtils.pingRedis();
            const redisStatus = redisConnected ? 'healthy' : 'critical';
            const redisMetrics = (yield (0, redis_manager_1.getRedisHealthMetrics)('content')) || {
                uptime: '0',
                connectedClients: '0',
                usedMemory: '0',
                totalKeys: 0,
                hitRate: '0%'
            };
            // Check Database health
            const dbStatus = mongoose_1.default.connection.readyState === 1 ? 'healthy' : 'critical';
            // Overall status is the worst of the individual statuses
            const status = [
                memoryStatus,
                cpuStatus,
                redisStatus,
                dbStatus
            ].includes('critical') ? 'critical' : 'healthy';
            res.status(status === 'healthy' ? 200 : 503).json({
                success: true,
                status,
                components: {
                    memory: {
                        status: memoryStatus,
                        usagePercent: 100 - memoryUsagePercent
                    },
                    cpu: {
                        status: cpuStatus,
                        loadAverage: os_1.default.loadavg()[0],
                        cpuCount: os_1.default.cpus().length
                    },
                    redis: {
                        status: redisStatus,
                        connected: redisConnected,
                        caches: ['promoCache', 'userSubsCache', 'planCache', 'defaultCache'],
                        metrics: redisMetrics
                    },
                    database: {
                        status: dbStatus,
                        name: mongoose_1.default.connection.name || 'undefined',
                        host: mongoose_1.default.connection.host || 'undefined',
                        readyState: mongoose_1.default.connection.readyState
                    }
                },
                system: systemInfo,
                timestamp: new Date().toISOString()
            });
        });
    }
}
exports.default = new MonitoringController();
