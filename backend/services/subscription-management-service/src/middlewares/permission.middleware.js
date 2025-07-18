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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRemotePermission = requireRemotePermission;
exports.requireRemoteAnyPermission = requireRemoteAnyPermission;
exports.checkUserPermission = checkUserPermission;
exports.checkUserAnyPermission = checkUserAnyPermission;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
const USER_SERVICE_PERMISSION_API_URL = process.env.USER_SERVICE_PERMISSION_API_URL || 'http://localhost:3002';
const SERVICE_NAME = 'subscription-management-service';
/**
 * Utility function to validate permission parameters
 */
function validatePermissionParams(permission, application) {
    if (Array.isArray(permission)) {
        if (permission.length === 0) {
            return { valid: false, error: 'Permissions array cannot be empty' };
        }
        const invalidPermissions = permission.filter(p => !p || typeof p !== 'string');
        if (invalidPermissions.length > 0) {
            return { valid: false, error: 'All permissions must be non-empty strings' };
        }
    }
    else {
        if (!permission || typeof permission !== 'string') {
            return { valid: false, error: 'Permission must be a non-empty string' };
        }
    }
    if (application && typeof application !== 'string') {
        return { valid: false, error: 'Application must be a string' };
    }
    return { valid: true };
}
/**
 * Utility function to handle axios errors consistently
 */
function handlePermissionError(err, context) {
    var _a, _b, _c;
    const errorContext = Object.assign(Object.assign({ service: SERVICE_NAME, error: err.message, stack: err.stack }, context), { url: `${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`, timestamp: new Date().toISOString() });
    logger_1.default.error('Permission check error:', errorContext);
    // Handle specific error types
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return {
            status: 503,
            response: {
                success: false,
                message: 'Permission service unavailable',
                code: 'SERVICE_UNAVAILABLE',
                service: SERVICE_NAME
            }
        };
    }
    if (err.code === 'ECONNABORTED' || ((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes('timeout'))) {
        return {
            status: 504,
            response: {
                success: false,
                message: 'Permission check timeout',
                code: 'SERVICE_TIMEOUT',
                service: SERVICE_NAME
            }
        };
    }
    if (((_b = err.response) === null || _b === void 0 ? void 0 : _b.status) === 401) {
        return {
            status: 401,
            response: {
                success: false,
                message: 'Authentication failed with permission service',
                code: 'AUTH_FAILED',
                service: SERVICE_NAME
            }
        };
    }
    if (((_c = err.response) === null || _c === void 0 ? void 0 : _c.status) === 404) {
        return {
            status: 404,
            response: {
                success: false,
                message: 'Permission service endpoint not found',
                code: 'ENDPOINT_NOT_FOUND',
                service: SERVICE_NAME
            }
        };
    }
    // Generic error response
    return {
        status: 500,
        response: {
            success: false,
            message: 'Permission check failed',
            code: 'PERMISSION_CHECK_FAILED',
            service: SERVICE_NAME
        }
    };
}
/**
 * Middleware to require a specific permission (checked via remote user service)
 */
function requireRemotePermission(permission, options = {}) {
    const { application = '*', allowSuperadmin = true } = options;
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            // Validate user authentication
            if (!req.user || !req.user._id) {
                logger_1.default.warn(`[${SERVICE_NAME}] Permission check failed: No authenticated user`);
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED',
                    service: SERVICE_NAME
                });
            }
            // Validate required parameters
            const validation = validatePermissionParams(permission, application);
            if (!validation.valid) {
                logger_1.default.warn(`[${SERVICE_NAME}] Permission check failed: ${validation.error}`);
                return res.status(400).json({
                    success: false,
                    message: validation.error,
                    code: 'INVALID_PERMISSION',
                    service: SERVICE_NAME
                });
            }
            // Check if user service URL is configured
            if (!USER_SERVICE_PERMISSION_API_URL) {
                logger_1.default.error(`[${SERVICE_NAME}] USER_SERVICE_PERMISSION_API_URL not configured`);
                return res.status(500).json({
                    success: false,
                    message: 'Permission service not configured',
                    code: 'SERVICE_NOT_CONFIGURED',
                    service: SERVICE_NAME
                });
            }
            logger_1.default.info(`[${SERVICE_NAME}] Checking permission: ${permission} for user: ${(_a = req.user._id) === null || _a === void 0 ? void 0 : _a.toString()}`);
            const response = yield axios_1.default.post(`${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`, {
                permission,
                application,
                allowSuperadmin,
                userId: (_b = req.user._id) === null || _b === void 0 ? void 0 : _b.toString()
            }, {
                headers: {
                    Authorization: req.headers.authorization || '',
                    'Content-Type': 'application/json'
                },
                timeout: 5000 // 5 second timeout
            });
            // Check response structure
            if (!response.data) {
                throw new Error('Invalid response from permission service');
            }
            if (((_d = (_c = response.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.hasPermission) === true) {
                logger_1.default.info(`[${SERVICE_NAME}] Permission granted: ${permission} for user: ${(_e = req.user._id) === null || _e === void 0 ? void 0 : _e.toString()}`);
                return next();
            }
            else {
                logger_1.default.warn(`[${SERVICE_NAME}] Permission denied: ${permission} for user: ${(_f = req.user._id) === null || _f === void 0 ? void 0 : _f.toString()}`);
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required permission: ${permission}`,
                    code: 'INSUFFICIENT_PERMISSIONS',
                    requiredPermission: permission,
                    application,
                    service: SERVICE_NAME
                });
            }
        }
        catch (err) {
            const errorResponse = handlePermissionError(err, {
                permission,
                userId: (_h = (_g = req.user) === null || _g === void 0 ? void 0 : _g._id) === null || _h === void 0 ? void 0 : _h.toString()
            });
            return res.status(errorResponse.status).json(errorResponse.response);
        }
    });
}
/**
 * Middleware to require any of a list of permissions (checked via remote user service)
 */
function requireRemoteAnyPermission(permissions, options = {}) {
    const { application = '*', allowSuperadmin = true } = options;
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            // Validate user authentication
            if (!req.user || !req.user._id) {
                logger_1.default.warn(`[${SERVICE_NAME}] Permission check failed: No authenticated user`);
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED',
                    service: SERVICE_NAME
                });
            }
            // Validate permissions array
            const validation = validatePermissionParams(permissions, application);
            if (!validation.valid) {
                logger_1.default.warn(`[${SERVICE_NAME}] Permission check failed: ${validation.error}`);
                return res.status(400).json({
                    success: false,
                    message: validation.error,
                    code: 'INVALID_PERMISSIONS',
                    service: SERVICE_NAME
                });
            }
            // Check if user service URL is configured
            if (!USER_SERVICE_PERMISSION_API_URL) {
                logger_1.default.error(`[${SERVICE_NAME}] USER_SERVICE_PERMISSION_API_URL not configured`);
                return res.status(500).json({
                    success: false,
                    message: 'Permission service not configured',
                    code: 'SERVICE_NOT_CONFIGURED',
                    service: SERVICE_NAME
                });
            }
            let hasAnyPermission = false;
            const checkedPermissions = [];
            logger_1.default.info(`[${SERVICE_NAME}] Checking any permission: [${permissions.join(', ')}] for user: ${(_a = req.user._id) === null || _a === void 0 ? void 0 : _a.toString()}`);
            for (const permission of permissions) {
                try {
                    const response = yield axios_1.default.post(`${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`, {
                        permission,
                        application,
                        allowSuperadmin,
                        userId: (_b = req.user._id) === null || _b === void 0 ? void 0 : _b.toString()
                    }, {
                        headers: {
                            Authorization: req.headers.authorization || '',
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000 // 5 second timeout per request
                    });
                    checkedPermissions.push(permission);
                    // Check response structure
                    if (!response.data) {
                        logger_1.default.warn(`[${SERVICE_NAME}] Invalid response for permission ${permission}`);
                        continue;
                    }
                    if (((_d = (_c = response.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.hasPermission) === true) {
                        hasAnyPermission = true;
                        logger_1.default.info(`[${SERVICE_NAME}] Permission granted: ${permission} for user: ${(_e = req.user._id) === null || _e === void 0 ? void 0 : _e.toString()}`);
                        break;
                    }
                }
                catch (permissionError) {
                    logger_1.default.warn(`[${SERVICE_NAME}] Error checking permission ${permission}:`, {
                        error: permissionError.message,
                        permission,
                        userId: (_f = req.user._id) === null || _f === void 0 ? void 0 : _f.toString()
                    });
                    // Continue checking other permissions instead of failing completely
                    continue;
                }
            }
            if (hasAnyPermission) {
                return next();
            }
            logger_1.default.warn(`[${SERVICE_NAME}] All permissions denied: [${permissions.join(', ')}] for user: ${(_g = req.user._id) === null || _g === void 0 ? void 0 : _g.toString()}`);
            return res.status(403).json({
                success: false,
                message: `Access denied. Required any of: ${permissions.join(', ')}`,
                code: 'INSUFFICIENT_PERMISSIONS',
                requiredPermissions: permissions,
                checkedPermissions,
                application,
                service: SERVICE_NAME
            });
        }
        catch (err) {
            const errorResponse = handlePermissionError(err, {
                permissions,
                userId: (_j = (_h = req.user) === null || _h === void 0 ? void 0 : _h._id) === null || _j === void 0 ? void 0 : _j.toString()
            });
            return res.status(errorResponse.status).json(errorResponse.response);
        }
    });
}
/**
 * Utility function to check user permission programmatically
 */
function checkUserPermission(userId_1, permission_1) {
    return __awaiter(this, arguments, void 0, function* (userId, permission, options = {}) {
        var _a, _b;
        try {
            const { application = '*', allowSuperadmin = true, authToken } = options;
            // Validate inputs
            const validation = validatePermissionParams(permission, application);
            if (!validation.valid) {
                return { hasPermission: false, error: validation.error };
            }
            if (!userId || typeof userId !== 'string') {
                return { hasPermission: false, error: 'Invalid user ID' };
            }
            if (!USER_SERVICE_PERMISSION_API_URL) {
                return { hasPermission: false, error: 'Permission service not configured' };
            }
            logger_1.default.info(`[${SERVICE_NAME}] Programmatic permission check: ${permission} for user: ${userId}`);
            const response = yield axios_1.default.post(`${USER_SERVICE_PERMISSION_API_URL}/api/roles/check-permission`, {
                permission,
                application,
                allowSuperadmin,
                userId
            }, {
                headers: Object.assign(Object.assign({}, (authToken && { Authorization: authToken })), { 'Content-Type': 'application/json' }),
                timeout: 5000
            });
            if (!response.data) {
                return { hasPermission: false, error: 'Invalid response from permission service' };
            }
            const hasPermission = ((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.hasPermission) === true;
            logger_1.default.info(`[${SERVICE_NAME}] Programmatic permission result: ${hasPermission} for ${permission}`);
            return { hasPermission };
        }
        catch (err) {
            logger_1.default.error(`[${SERVICE_NAME}] Programmatic permission check error:`, {
                error: err.message,
                permission,
                userId,
                timestamp: new Date().toISOString()
            });
            return {
                hasPermission: false,
                error: `Permission check failed: ${err.message}`
            };
        }
    });
}
/**
 * Utility function to check multiple permissions programmatically (OR logic)
 */
function checkUserAnyPermission(userId_1, permissions_1) {
    return __awaiter(this, arguments, void 0, function* (userId, permissions, options = {}) {
        try {
            // Validate inputs
            const validation = validatePermissionParams(permissions, options.application);
            if (!validation.valid) {
                return { hasPermission: false, error: validation.error };
            }
            if (!userId || typeof userId !== 'string') {
                return { hasPermission: false, error: 'Invalid user ID' };
            }
            logger_1.default.info(`[${SERVICE_NAME}] Programmatic any permission check: [${permissions.join(', ')}] for user: ${userId}`);
            // Check each permission until one is granted
            for (const permission of permissions) {
                const result = yield checkUserPermission(userId, permission, options);
                if (result.hasPermission) {
                    logger_1.default.info(`[${SERVICE_NAME}] Programmatic permission granted: ${permission} for user: ${userId}`);
                    return {
                        hasPermission: true,
                        grantedPermission: permission
                    };
                }
            }
            return {
                hasPermission: false,
                error: `User does not have any of the required permissions: ${permissions.join(', ')}`
            };
        }
        catch (err) {
            logger_1.default.error(`[${SERVICE_NAME}] Programmatic multiple permission check error:`, {
                error: err.message,
                permissions,
                userId,
                timestamp: new Date().toISOString()
            });
            return {
                hasPermission: false,
                error: `Permission check failed: ${err.message}`
            };
        }
    });
}
