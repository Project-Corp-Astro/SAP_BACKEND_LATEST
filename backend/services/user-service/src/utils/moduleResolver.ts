/**
 * Environment-aware module resolution for user-service
 * Provides consistent path resolution across local development and production environments
 */

import path from 'path';
import fs from 'fs';

export class ModuleResolver {
  /**
   * Determines if we're running in a Docker environment
   */
  static isDockerEnvironment(): boolean {
    // Check if we're in Docker container
    if (process.cwd() === '/app') return true;
    
    // Check for Docker-specific environment variables
    if (process.env.DOCKER_CONTAINER === 'true') return true;
    
    // Check for production environment
    if (process.env.NODE_ENV === 'production') return true;
    
    // Check if we're in a typical Docker working directory
    if (process.cwd().startsWith('/app')) return true;
    
    return false;
  }

  /**
   * Gets the appropriate path for shared modules based on environment
   */
  static getSharedPath(relativePath: string): string {
    if (this.isDockerEnvironment()) {
      // In Docker/production, use the container path structure
      return path.join('/app/shared', relativePath);
    } else {
      // In local development, navigate up to shared folder
      const basePath = path.resolve(__dirname, '../../../../shared');
      return path.join(basePath, relativePath);
    }
  }

  /**
   * Attempts to require a module with fallback handling
   */
  static safeRequire(modulePath: string, fallback?: any): any {
    try {
      return require(modulePath);
    } catch (error) {
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  /**
   * Checks if a file exists
   */
  static fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }
}
