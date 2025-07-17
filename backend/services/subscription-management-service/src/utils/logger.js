"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLoggerMiddleware = exports.requestLoggerMiddleware = exports.errorLogger = exports.requestLogger = void 0;
const winston_1 = __importDefault(require("winston"));
require("winston-daily-rotate-file");
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
// Define log directory
const LOG_DIR = path_1.default.join(process.cwd(), 'logs');
// Define log formats
const formats = [
    winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston_1.default.format.errors({ stack: true }),
    winston_1.default.format.splat(),
    winston_1.default.format.json(),
];
// Create console format with colors for better readability in development
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.printf((_a) => {
    var { timestamp, level, message, service, stack } = _a, meta = __rest(_a, ["timestamp", "level", "message", "service", "stack"]);
    const serviceName = service || config_1.default.serviceName;
    let logMessage = `${timestamp} [${serviceName}] ${level}: ${message}`;
    if (stack) {
        logMessage += `\n${stack}`;
    }
    if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return logMessage;
}));
// Create file transport for daily rotate
const fileTransport = new winston_1.default.transports.DailyRotateFile({
    dirname: LOG_DIR,
    filename: `${config_1.default.serviceName}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d', // Keep logs for 14 days
    format: winston_1.default.format.combine(...formats),
});
// Create transports array based on environment
const transports = [
    // Always log to console
    new winston_1.default.transports.Console({
        format: consoleFormat,
    }),
];
// Only add file transport in production/staging to save disk space during development
if (['production', 'staging'].includes(config_1.default.env)) {
    transports.push(fileTransport);
}
// Create a simple console transport that will show all logs
const consoleTransport = new winston_1.default.transports.Console({
    level: 'debug', // Show all logs
    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.printf((_a) => {
        var { level, message, timestamp, stack } = _a, meta = __rest(_a, ["level", "message", "timestamp", "stack"]);
        let log = `${timestamp} [${config_1.default.serviceName}] ${level}: ${message}`;
        // Include metadata if available
        if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
        }
        // Include stack trace if available
        if (stack) {
            log += `\n${stack}`;
        }
        return log;
    }))
});
// Helper to safely stringify objects with circular references
const safeStringify = (obj, indent = 2) => {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                // Circular reference found, discard key
                return '[Circular]';
            }
            // Store value in our set
            cache.add(value);
        }
        return value;
    }, indent);
};
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
    defaultMeta: { service: 'subscription-service' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf((_a) => {
                var { level, message, timestamp } = _a, meta = __rest(_a, ["level", "message", "timestamp"]);
                const metaString = Object.keys(meta).length
                    ? `\n${safeStringify(meta, 2)}`
                    : '';
                return `${timestamp} [${meta.service || 'app'}] ${level}: ${message}${metaString}`;
            }))
        })
    ]
});
// Log the current log level
logger.info(`Logger initialized in ${config_1.default.env} mode with level: debug`);
// Override console methods to use our logger
const originalConsole = Object.assign({}, console);
console.log = (message, ...optionalParams) => {
    logger.debug(message, ...optionalParams);
    if (config_1.default.env === 'development') {
        originalConsole.log(message, ...optionalParams);
    }
};
console.info = (message, ...optionalParams) => {
    logger.info(message, ...optionalParams);
    if (config_1.default.env === 'development') {
        originalConsole.info(message, ...optionalParams);
    }
};
console.warn = (message, ...optionalParams) => {
    logger.warn(message, ...optionalParams);
    if (config_1.default.env === 'development') {
        originalConsole.warn(message, ...optionalParams);
    }
};
console.error = (message, ...optionalParams) => {
    logger.error(message, ...optionalParams);
    if (config_1.default.env === 'development') {
        originalConsole.error(message, ...optionalParams);
    }
};
console.debug = (message, ...optionalParams) => {
    logger.debug(message, ...optionalParams);
    if (config_1.default.env === 'development') {
        originalConsole.debug(message, ...optionalParams);
    }
};
// Middleware for request logging
const requestLogger = (options = {}) => {
    const skip = options.skip || (() => false);
    const format = options.format || ':method :url :status :response-time ms';
    return (req, res, next) => {
        if (skip(req))
            return next();
        const startTime = Date.now();
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            const message = format
                .replace(':method', req.method)
                .replace(':url', req.originalUrl)
                .replace(':status', res.statusCode.toString())
                .replace(':response-time', responseTime.toString());
            if (res.statusCode >= 500) {
                logger.error(message, { path: req.path, body: req.body, query: req.query });
            }
            else if (res.statusCode >= 400) {
                logger.warn(message, { path: req.path });
            }
            else {
                logger.info(message);
            }
        });
        next();
    };
};
exports.requestLogger = requestLogger;
// Middleware for error logging
const errorLogger = (options = {}) => {
    return (err, req, res, next) => {
        logger.error(err.message, {
            error: {
                message: err.message,
                name: err.name,
                stack: err.stack,
            },
            request: {
                path: req.path,
                headers: req.headers,
                method: req.method,
                ip: req.ip,
            },
        });
        next(err);
    };
};
exports.errorLogger = errorLogger;
// Create middleware instances
exports.requestLoggerMiddleware = (0, exports.requestLogger)();
exports.errorLoggerMiddleware = (0, exports.errorLogger)();
exports.default = logger;
