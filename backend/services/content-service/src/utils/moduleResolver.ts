/**
 * Environment-aware module resolver
 * Handles different import paths for local development vs Docker/production
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

export class ModuleResolver {
  private static isDockerEnvironment(): boolean {
    // Check if we're running in Docker container
    return existsSync('/.dockerenv') || 
           process.env.DOCKER_CONTAINER === 'true' ||
           process.cwd() === '/app';
  }

  private static isLocalDevelopment(): boolean {
    // Check if we're in local development (services/content-service directory)
    return process.cwd().includes('services/content-service') ||
           existsSync('../../shared');
  }

  /**
   * Get the correct path for shared modules based on environment
   */
  static getSharedPath(relativePath: string): string {
    if (this.isDockerEnvironment()) {
      // In Docker, shared is at /app/shared/
      return `../../shared/${relativePath}`;
    } else if (this.isLocalDevelopment()) {
      // In local development, shared is at ../../shared/
      return `../../shared/${relativePath}`;
    } else {
      // Fallback to local types
      return `../types/local-types`;
    }
  }

  /**
   * Get the correct path for packages based on environment
   */
  static getPackagePath(packageName: string): string {
    if (this.isDockerEnvironment()) {
      // In Docker, use the installed package
      return packageName;
    } else if (this.isLocalDevelopment()) {
      // In local development, check if package is available
      try {
        require.resolve(packageName);
        return packageName;
      } catch {
        // Fallback to local types
        return '../types/local-types';
      }
    } else {
      return '../types/local-types';
    }
  }

  /**
   * Environment info for debugging
   */
  static getEnvironmentInfo() {
    return {
      isDocker: this.isDockerEnvironment(),
      isLocal: this.isLocalDevelopment(),
      cwd: process.cwd(),
      dockerEnvExists: existsSync('/.dockerenv'),
      sharedExists: existsSync('../../shared'),
      environment: process.env.NODE_ENV
    };
  }
}
