"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require("dotenv/config");
const logger_1 = __importDefault(require("../utils/logger"));
// Set the service name for logging
const SERVICE_NAME = 'subscription-management-service';
// JWT secret key - should be stored in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Define the auth middleware
const authMiddleware = (req, res, next) => {
    // Get auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger_1.default.warn(`[${SERVICE_NAME}] Missing or invalid auth header`);
        res.status(401).json({
            success: false,
            message: 'Authentication required. Please provide a valid token.',
        });
        return;
    }
    // Extract token
    const token = authHeader.split(' ')[1];
    if (!token) {
        logger_1.default.warn(`[${SERVICE_NAME}] Missing token`);
        res.status(401).json({
            success: false,
            message: 'Authentication token is missing',
        });
        return;
    }
    // Verify token
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Attach user info to request
        req.user = {
            _id: payload.userId,
            email: payload.email,
            rolePermissionIds: payload.rolePermissionIds || [],
        };
        // Log the decoded token for debugging
        // logger.debug(`[${SERVICE_NAME}] Decoded JWT: ${JSON.stringify(payload, null, 2)}`);
        // logger.debug(`[${SERVICE_NAME}] Attached user to request: ${JSON.stringify(req.user)}`);
        next();
    }
    catch (err) {
        logger_1.default.error(`[${SERVICE_NAME}] Token verification error: ${err.message}`);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
};
exports.authMiddleware = authMiddleware;
