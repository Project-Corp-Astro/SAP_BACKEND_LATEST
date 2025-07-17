"use strict";
/**
 * Environment-aware module resolution for subscription-management-service
 * Provides consistent path resolution across local development and production environments
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleResolver = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class ModuleResolver {
    /**
     * Determines if we're running in a Docker environment
     */
    static isDockerEnvironment() {
        // Check if we're in Docker container
        if (process.cwd() === '/app')
            return true;
        // Check for Docker-specific environment variables
        if (process.env.DOCKER_CONTAINER === 'true')
            return true;
        // Check for production environment
        if (process.env.NODE_ENV === 'production')
            return true;
        // Check if we're in a typical Docker working directory
        if (process.cwd().startsWith('/app'))
            return true;
        return false;
    }
    /**
     * Gets the appropriate path for shared modules based on environment
     */
    static getSharedPath(relativePath) {
        if (this.isDockerEnvironment()) {
            // In Docker/production, use the container path structure
            return path_1.default.join('/app/shared', relativePath);
        }
        else {
            // In local development, navigate up to shared folder
            const basePath = path_1.default.resolve(__dirname, '../../../../shared');
            return path_1.default.join(basePath, relativePath);
        }
    }
    /**
     * Attempts to require a module with fallback handling
     */
    static safeRequire(modulePath, fallback) {
        try {
            return require(modulePath);
        }
        catch (error) {
            if (fallback !== undefined) {
                return fallback;
            }
            throw error;
        }
    }
    /**
     * Checks if a file exists
     */
    static fileExists(filePath) {
        try {
            return fs_1.default.existsSync(filePath);
        }
        catch (_a) {
            return false;
        }
    }
}
exports.ModuleResolver = ModuleResolver;
