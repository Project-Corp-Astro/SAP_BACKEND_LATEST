"use strict";
/**
 * Performance Monitoring Middleware
 *
 * This middleware tracks response times for all API requests and logs them
 * to help identify performance bottlenecks.
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
exports.trackResponseTime = trackResponseTime;
exports.trackDatabasePerformance = trackDatabasePerformance;
const performance_1 = __importDefault(require("../utils/performance"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Middleware to track response time for all API requests
 */
function trackResponseTime(req, res, next) {
    // Record start time
    const startTime = Date.now();
    // Store original end function
    const originalEnd = res.end;
    // Override end function to calculate response time
    // @ts-ignore - We need to override the end function to track response time
    res.end = function (chunk, encoding, callback) {
        // Calculate response time
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        // Track response time in performance monitor
        performance_1.default.trackResponseTime(startTime, endTime, req.originalUrl || req.url, res.statusCode);
        // Log slow responses (over 500ms)
        if (responseTime > 500) {
            logger_1.default.warn(`Slow response: ${req.method} ${req.originalUrl || req.url} (${responseTime}ms)`, {
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                responseTime,
                userAgent: req.headers['user-agent'],
                ip: req.ip || req.connection.remoteAddress
            });
        }
        // Call original end function
        if (typeof encoding === 'function') {
            // Handle overload where encoding is actually the callback
            return originalEnd.call(this, chunk, encoding);
        }
        else {
            return originalEnd.call(this, chunk, encoding, callback);
        }
    };
    next();
}
/**
 * Middleware to track database query performance
 * This middleware should be applied to routes that make database queries
 */
function trackDatabasePerformance(req, res, next) {
    // Store the original mongoose exec function
    const mongoose = require('mongoose');
    const originalExec = mongoose.Query.prototype.exec;
    // Override the exec function to track query time
    mongoose.Query.prototype.exec = function (...args) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const collection = this.model.collection.name;
            const operation = this.op;
            try {
                // Execute the original query
                const result = yield originalExec.apply(this, args);
                // Track query time
                const endTime = Date.now();
                performance_1.default.trackDbQuery(startTime, endTime, operation, collection);
                return result;
            }
            catch (error) {
                // Still track query time even if it fails
                const endTime = Date.now();
                performance_1.default.trackDbQuery(startTime, endTime, operation, collection);
                throw error;
            }
        });
    };
    next();
    // Restore original exec function after request is complete
    res.on('finish', () => {
        mongoose.Query.prototype.exec = originalExec;
    });
}
exports.default = {
    trackResponseTime,
    trackDatabasePerformance
};
