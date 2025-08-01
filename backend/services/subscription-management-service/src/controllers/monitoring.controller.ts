/**
 * Monitoring Controller
 * 
 * This controller provides endpoints for monitoring the performance and health of the Content Service.
 * It exposes metrics such as cache hit rates, response times, and memory usage.
 */

import { Request, Response } from 'express';
import { redisUtils } from '../utils/redis';
import { redisManager, logger } from '../utils/sharedModules';
import performanceMonitor from '../utils/performance';
import { AppDataSource } from '../db/data-source';
import os from 'os';

class MonitoringController {
  /**
   * Get performance metrics
   * @param req - Express request object
   * @param res - Express response object
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    // Get performance metrics
    const metrics = performanceMonitor.getMetrics();
    
    // Get cache statistics
    const cacheStats = redisUtils.getStats();
    
    // Get system information
    const systemInfo = {
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024),
      freeMemory: Math.round(os.freemem() / 1024 / 1024),
      loadAverage: os.loadavg()
    };
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      cache: cacheStats,
      system: systemInfo
    });
  }
  
  /**
   * Reset performance metrics
   * @param req - Express request object
   * @param res - Express response object
   */
  async resetMetrics(req: Request, res: Response): Promise<void> {
    performanceMonitor.resetMetrics();
    
    res.status(200).json({
      success: true,
      message: 'Performance metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Get health status
   * @param req - Express request object
   * @param res - Express response object
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    // Get system information
    const systemInfo = {
      uptime: process.uptime(),
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024),
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)
      },
      cpu: {
        count: os.cpus().length,
        loadAverage: os.loadavg()
      }
    };
    
    // Check if memory usage is critical (less than 10% free)
    const memoryUsagePercent = (os.freemem() / os.totalmem()) * 100;
    const memoryStatus = memoryUsagePercent < 10 ? 'critical' : 'healthy';
    
    // Check if CPU load is critical (load average > CPU count)
    const cpuStatus = os.loadavg()[0] > os.cpus().length ? 'critical' : 'healthy';
    
    // Check Redis health
    const redisConnected = await redisUtils.pingRedis();
    const redisStatus = redisConnected ? 'healthy' : 'critical';
    const redisMetrics = await redisManager.getRedisHealthMetrics('content') || {
      uptime: '0',
      connectedClients: '0',
      usedMemory: '0',
      totalKeys: 0,
      hitRate: '0%'
    };
    
    // Check Database health using TypeORM
    let dbStatus = 'healthy';
    let dbInfo = { name: 'supabase', host: 'connected', readyState: 1 };
    
    try {
      // Test database connection with a simple query
      if (AppDataSource.isInitialized) {
        await AppDataSource.query('SELECT 1');
        dbStatus = 'healthy';
        const options = AppDataSource.options as any;
        dbInfo = {
          name: options.database || 'supabase',
          host: options.host || 'connected',
          readyState: 1
        };
      } else {
        dbStatus = 'critical';
        dbInfo = { name: 'not-initialized', host: 'disconnected', readyState: 0 };
      }
    } catch (error) {
      dbStatus = 'critical';
      dbInfo = { name: 'error', host: 'disconnected', readyState: 0 };
    }
    
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
          loadAverage: os.loadavg()[0],
          cpuCount: os.cpus().length
        },
        redis: {
          status: redisStatus,
          connected: redisConnected,
          caches: ['promoCache', 'userSubsCache', 'planCache', 'defaultCache'],
          metrics: redisMetrics
        },
        database: {
          status: dbStatus,
          name: dbInfo.name,
          host: dbInfo.host,
          readyState: dbInfo.readyState
        }
      },
      system: systemInfo,
      timestamp: new Date().toISOString()
    });
  }
}

export default new MonitoringController();