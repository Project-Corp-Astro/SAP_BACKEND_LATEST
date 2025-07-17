"use strict";
/**
 * Performance Monitoring Utility
 *
 * This utility provides tools for monitoring and tracking performance metrics
 * in the Content Service, including:
 * - Response time tracking
 * - Cache hit/miss rates
 * - Database query performance
 * - Memory usage
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./logger"));
/**
 * Performance monitoring class
 */
class PerformanceMonitor {
    constructor() {
        this.responseTimes = [];
        this.dbQueryTimes = [];
        this.metricsInterval = null;
        this.startTime = new Date();
        this.metrics = this.initializeMetrics();
        // Log metrics periodically (every 5 minutes by default)
        this.startMetricsLogging(5 * 60 * 1000);
    }
    /**
     * Initialize metrics with default values
     */
    initializeMetrics() {
        return {
            cacheHits: 0,
            cacheMisses: 0,
            cacheHitRate: 0,
            responseTimeAvg: 0,
            responseTimeMin: 0,
            responseTimeMax: 0,
            dbQueryCount: 0,
            dbQueryTimeAvg: 0,
            dbQueryTimeTotal: 0,
            memoryUsageMB: this.getCurrentMemoryUsage(),
            requestCount: 0,
            errorCount: 0,
            timestamp: new Date()
        };
    }
    /**
     * Start periodic metrics logging
     * @param interval - Interval in milliseconds
     */
    startMetricsLogging(interval = 5 * 60 * 1000) {
        // Clear existing interval if any
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        // Set new interval
        this.metricsInterval = setInterval(() => {
            this.logMetrics();
        }, interval);
    }
    /**
     * Stop metrics logging
     */
    stopMetricsLogging() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
    }
    /**
     * Get current memory usage in MB
     */
    getCurrentMemoryUsage() {
        const memoryUsage = process.memoryUsage();
        return Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
    }
    /**
     * Track cache operation
     * @param operation - Cache operation type
     * @param key - Cache key
     */
    trackCacheOperation(operation, key) {
        switch (operation) {
            case 'hit':
                this.metrics.cacheHits++;
                break;
            case 'miss':
                this.metrics.cacheMisses++;
                break;
            default:
                // Just log other operations
                break;
        }
        // Calculate cache hit rate
        const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
        this.metrics.cacheHitRate = totalCacheOps > 0
            ? Math.round((this.metrics.cacheHits / totalCacheOps) * 100) / 100
            : 0;
        // Log detailed cache operation for debugging in development
        if (process.env.NODE_ENV !== 'production') {
            logger_1.default.debug(`Cache ${operation}: ${key}`, {
                cacheOperation: operation,
                cacheKey: key,
                cacheHitRate: this.metrics.cacheHitRate
            });
        }
    }
    /**
     * Track response time
     * @param startTime - Start time in milliseconds
     * @param endTime - End time in milliseconds
     * @param route - API route
     * @param statusCode - HTTP status code
     */
    trackResponseTime(startTime, endTime, route, statusCode) {
        const responseTime = endTime - startTime;
        this.responseTimes.push(responseTime);
        // Update request count
        this.metrics.requestCount++;
        // Update error count if status code is 4xx or 5xx
        if (statusCode >= 400) {
            this.metrics.errorCount++;
        }
        // Calculate average, min, and max response times
        this.metrics.responseTimeAvg = this.calculateAverage(this.responseTimes);
        this.metrics.responseTimeMin = Math.min(...this.responseTimes);
        this.metrics.responseTimeMax = Math.max(...this.responseTimes);
        // Log response time for slow responses (> 1000ms)
        if (responseTime > 1000) {
            logger_1.default.warn(`Slow response: ${route} (${responseTime}ms)`, {
                route,
                responseTime,
                statusCode
            });
        }
    }
    /**
     * Track database query time
     * @param startTime - Start time in milliseconds
     * @param endTime - End time in milliseconds
     * @param operation - Database operation (find, update, etc.)
     * @param collection - Database collection
     */
    trackDbQuery(startTime, endTime, operation, collection) {
        const queryTime = endTime - startTime;
        this.dbQueryTimes.push(queryTime);
        // Update database metrics
        this.metrics.dbQueryCount++;
        this.metrics.dbQueryTimeTotal += queryTime;
        this.metrics.dbQueryTimeAvg = this.calculateAverage(this.dbQueryTimes);
        // Log slow queries (> 500ms)
        if (queryTime > 500) {
            logger_1.default.warn(`Slow DB query: ${operation} on ${collection} (${queryTime}ms)`, {
                operation,
                collection,
                queryTime
            });
        }
    }
    /**
     * Calculate average of an array of numbers
     * @param values - Array of numbers
     */
    calculateAverage(values) {
        if (values.length === 0)
            return 0;
        const sum = values.reduce((acc, val) => acc + val, 0);
        return Math.round((sum / values.length) * 100) / 100;
    }
    /**
     * Log current metrics
     */
    logMetrics() {
        // Update memory usage
        this.metrics.memoryUsageMB = this.getCurrentMemoryUsage();
        this.metrics.timestamp = new Date();
        // Log metrics
        logger_1.default.info('Performance metrics', {
            metrics: this.metrics,
            uptime: Math.round((Date.now() - this.startTime.getTime()) / 1000 / 60) + ' minutes'
        });
        // Reset certain metrics for the next period
        this.responseTimes = [];
        this.dbQueryTimes = [];
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        // Update memory usage before returning
        this.metrics.memoryUsageMB = this.getCurrentMemoryUsage();
        this.metrics.timestamp = new Date();
        return Object.assign({}, this.metrics);
    }
    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = this.initializeMetrics();
        this.responseTimes = [];
        this.dbQueryTimes = [];
        logger_1.default.info('Performance metrics reset');
    }
}
// Create singleton instance
const performanceMonitor = new PerformanceMonitor();
exports.default = performanceMonitor;
