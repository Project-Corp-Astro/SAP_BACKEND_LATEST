/**
 * Environment-aware type exports
 * Dynamically imports from the correct source based on environment
 */

// Direct re-export for TypeScript types - this ensures types work correctly
export * from './local-types';

// For runtime environments, we can also provide fallback logic
export function getEnvironmentInfo() {
  return {
    isDocker: process.cwd() === '/app',
    isLocal: process.cwd().includes('services/content-service'),
    environment: process.env.NODE_ENV
  };
}
