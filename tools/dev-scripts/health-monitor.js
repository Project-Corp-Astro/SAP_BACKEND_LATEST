const express = require('express');
const axios = require('axios');
const prometheus = require('prom-client');
const fs = require('fs').promises;
const path = require('path');

class AdvancedHealthMonitor {
  constructor() {
    this.app = express();
    this.setupMetrics();
    this.setupRoutes();
    this.initializeServices();
    this.healthHistory = [];
    this.alertThresholds = {
      responseTime: 1000, // ms
      errorRate: 0.05, // 5%
      memoryUsage: 0.85, // 85%
      cpuUsage: 0.80 // 80%
    };
  }

  initializeServices() {
    this.services = [
      {
        name: 'api-gateway',
        url: 'http://api-gateway:3000/health',
        critical: true,
        timeout: 5000,
        expectedResponseTime: 200
      },
      {
        name: 'auth-service',
        url: 'http://auth-service:3001/auth/health',
        critical: true,
        timeout: 8000,
        expectedResponseTime: 300
      },
      {
        name: 'user-service',
        url: 'http://user-service:3002/users/health',
        critical: true,
        timeout: 6000,
        expectedResponseTime: 250
      },
      {
        name: 'content-service',
        url: 'http://content-service:3003/content/health',
        critical: false,
        timeout: 10000,
        expectedResponseTime: 500
      },
      {
        name: 'subscription-service',
        url: 'http://subscription-service:3004/subscriptions/health',
        critical: true,
        timeout: 7000,
        expectedResponseTime: 400
      }
    ];
  }

  setupMetrics() {
    // Clear default metrics
    prometheus.register.clear();

    // Service availability metrics
    this.serviceUpGauge = new prometheus.Gauge({
      name: 'service_up',
      help: 'Service availability status (1 = up, 0 = down)',
      labelNames: ['service_name', 'critical']
    });

    // Response time metrics
    this.responseTimeHistogram = new prometheus.Histogram({
      name: 'health_check_duration_seconds',
      help: 'Health check response time in seconds',
      labelNames: ['service_name'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10]
    });

    // Health check failure counter
    this.failureCounter = new prometheus.Counter({
      name: 'health_check_failures_total',
      help: 'Total number of health check failures',
      labelNames: ['service_name', 'error_type', 'critical']
    });

    // Health check success counter
    this.successCounter = new prometheus.Counter({
      name: 'health_check_success_total',
      help: 'Total number of successful health checks',
      labelNames: ['service_name']
    });

    // SLA compliance gauge
    this.slaComplianceGauge = new prometheus.Gauge({
      name: 'service_sla_compliance',
      help: 'Service SLA compliance percentage',
      labelNames: ['service_name']
    });

    // Overall system health gauge
    this.systemHealthGauge = new prometheus.Gauge({
      name: 'system_health_score',
      help: 'Overall system health score (0-100)'
    });

    // Performance deviation gauge
    this.performanceDeviationGauge = new prometheus.Gauge({
      name: 'service_performance_deviation',
      help: 'Performance deviation from expected response time',
      labelNames: ['service_name']
    });

    // Register default metrics
    prometheus.collectDefaultMetrics({ timeout: 5000 });
  }

  async checkServiceHealth(service) {
    const startTime = Date.now();
    const checkId = `${service.name}-${Date.now()}`;
    
    try {
      console.log(`🔍 Checking health for ${service.name}...`);
      
      const response = await axios.get(service.url, { 
        timeout: service.timeout,
        headers: {
          'X-Health-Check': 'true',
          'X-Check-ID': checkId
        }
      });
      
      const duration = (Date.now() - startTime) / 1000;
      const isHealthy = response.status >= 200 && response.status < 300;
      
      // Update metrics
      this.serviceUpGauge.labels(service.name, service.critical.toString()).set(isHealthy ? 1 : 0);
      this.responseTimeHistogram.labels(service.name).observe(duration);
      this.successCounter.labels(service.name).inc();
      
      // Calculate performance deviation
      const expectedDuration = service.expectedResponseTime / 1000;
      const deviation = ((duration - expectedDuration) / expectedDuration) * 100;
      this.performanceDeviationGauge.labels(service.name).set(deviation);
      
      return {
        service: service.name,
        status: 'healthy',
        responseTime: Math.round(duration * 1000), // Convert to ms
        responseTimeSeconds: duration,
        expectedResponseTime: service.expectedResponseTime,
        performanceDeviation: Math.round(deviation * 100) / 100,
        critical: service.critical,
        timestamp: new Date().toISOString(),
        details: response.data || {},
        checkId: checkId
      };
      
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      // Update failure metrics
      this.serviceUpGauge.labels(service.name, service.critical.toString()).set(0);
      this.responseTimeHistogram.labels(service.name).observe(duration);
      this.failureCounter.labels(
        service.name, 
        error.code || error.response?.status || 'unknown',
        service.critical.toString()
      ).inc();
      
      console.error(`❌ Health check failed for ${service.name}: ${error.message}`);
      
      return {
        service: service.name,
        status: 'unhealthy',
        responseTime: Math.round(duration * 1000),
        responseTimeSeconds: duration,
        critical: service.critical,
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          code: error.code || 'unknown',
          status: error.response?.status,
          timeout: duration * 1000 >= service.timeout
        },
        checkId: checkId
      };
    }
  }

  async performComprehensiveHealthCheck() {
    console.log('🩺 Starting comprehensive health check...');
    const startTime = Date.now();
    
    // Perform parallel health checks
    const healthResults = await Promise.allSettled(
      this.services.map(service => this.checkServiceHealth(service))
    );
    
    const results = healthResults.map(result => 
      result.status === 'fulfilled' ? result.value : {
        service: 'unknown',
        status: 'error',
        error: result.reason?.message || 'Health check failed'
      }
    );
    
    // Calculate system metrics
    const healthyServices = results.filter(r => r.status === 'healthy').length;
    const criticalServices = results.filter(r => r.critical).length;
    const healthyCriticalServices = results.filter(r => r.critical && r.status === 'healthy').length;
    const totalServices = results.length;
    
    // Determine overall system status
    let overallStatus = 'healthy';
    if (healthyCriticalServices < criticalServices) {
      overallStatus = 'critical';
    } else if (healthyServices < totalServices) {
      overallStatus = 'degraded';
    }
    
    // Calculate system health score
    const criticalWeight = 0.8;
    const nonCriticalWeight = 0.2;
    const criticalScore = criticalServices > 0 ? (healthyCriticalServices / criticalServices) * 100 : 100;
    const nonCriticalScore = totalServices > criticalServices ? 
      ((healthyServices - healthyCriticalServices) / (totalServices - criticalServices)) * 100 : 100;
    
    const systemHealthScore = (criticalScore * criticalWeight) + (nonCriticalScore * nonCriticalWeight);
    this.systemHealthGauge.set(systemHealthScore);
    
    // Calculate SLA compliance for each service
    results.forEach(result => {
      if (result.service && result.service !== 'unknown') {
        const slaCompliance = result.status === 'healthy' ? 100 : 0;
        this.slaComplianceGauge.labels(result.service).set(slaCompliance);
      }
    });
    
    const totalDuration = Date.now() - startTime;
    
    const healthSummary = {
      timestamp: new Date().toISOString(),
      overall_status: overallStatus,
      system_health_score: Math.round(systemHealthScore * 100) / 100,
      healthy_services: healthyServices,
      total_services: totalServices,
      critical_services: criticalServices,
      healthy_critical_services: healthyCriticalServices,
      check_duration_ms: totalDuration,
      services: results,
      summary: {
        availability: `${healthyServices}/${totalServices} services healthy`,
        critical_availability: `${healthyCriticalServices}/${criticalServices} critical services healthy`,
        performance: this.calculatePerformanceSummary(results)
      }
    };
    
    // Store in health history
    this.healthHistory.push({
      timestamp: new Date().toISOString(),
      overall_status: overallStatus,
      system_health_score: systemHealthScore,
      healthy_services: healthyServices,
      total_services: totalServices
    });
    
    // Keep only last 100 health checks
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }
    
    console.log(`✅ Health check completed: ${overallStatus} (${healthyServices}/${totalServices} services healthy)`);
    
    return healthSummary;
  }

  calculatePerformanceSummary(results) {
    const healthyResults = results.filter(r => r.status === 'healthy');
    if (healthyResults.length === 0) return { avg_response_time: 0, performance_status: 'unknown' };
    
    const avgResponseTime = healthyResults.reduce((sum, r) => sum + r.responseTime, 0) / healthyResults.length;
    const maxResponseTime = Math.max(...healthyResults.map(r => r.responseTime));
    
    let performanceStatus = 'excellent';
    if (avgResponseTime > 500) performanceStatus = 'poor';
    else if (avgResponseTime > 200) performanceStatus = 'fair';
    else if (avgResponseTime > 100) performanceStatus = 'good';
    
    return {
      avg_response_time: Math.round(avgResponseTime),
      max_response_time: maxResponseTime,
      performance_status: performanceStatus,
      services_meeting_sla: healthyResults.filter(r => r.responseTime <= r.expectedResponseTime).length
    };
  }

  async generateHealthReport() {
    const currentHealth = await this.performComprehensiveHealthCheck();
    
    // Calculate trends from health history
    const recentHistory = this.healthHistory.slice(-10);
    const avgHealthScore = recentHistory.reduce((sum, h) => sum + h.system_health_score, 0) / recentHistory.length;
    const healthTrend = recentHistory.length > 1 ? 
      recentHistory[recentHistory.length - 1].system_health_score - recentHistory[0].system_health_score : 0;
    
    return {
      ...currentHealth,
      trends: {
        avg_health_score_10min: Math.round(avgHealthScore * 100) / 100,
        health_trend: Math.round(healthTrend * 100) / 100,
        trend_direction: healthTrend > 0 ? 'improving' : healthTrend < 0 ? 'declining' : 'stable'
      },
      system_info: {
        memory_usage: process.memoryUsage(),
        uptime_seconds: process.uptime(),
        cpu_usage: process.cpuUsage(),
        node_version: process.version
      }
    };
  }

  setupRoutes() {
    // Basic health endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const healthStatus = await this.performComprehensiveHealthCheck();
        const statusCode = healthStatus.overall_status === 'healthy' ? 200 : 
                          healthStatus.overall_status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(healthStatus);
      } catch (error) {
        res.status(500).json({
          timestamp: new Date().toISOString(),
          overall_status: 'error',
          error: error.message,
          system_health_score: 0
        });
      }
    });

    // Detailed health report
    this.app.get('/health/detailed', async (req, res) => {
      try {
        const healthReport = await this.generateHealthReport();
        res.json(healthReport);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to generate health report',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Health history endpoint
    this.app.get('/health/history', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const history = this.healthHistory.slice(-limit);
      res.json({
        history: history,
        count: history.length,
        total_checks: this.healthHistory.length
      });
    });

    // Metrics endpoint for Prometheus
    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', prometheus.register.contentType);
      res.end(prometheus.register.metrics());
    });

    // Service-specific health
    this.app.get('/health/:serviceName', async (req, res) => {
      const serviceName = req.params.serviceName;
      const service = this.services.find(s => s.name === serviceName);
      
      if (!service) {
        return res.status(404).json({
          error: 'Service not found',
          available_services: this.services.map(s => s.name)
        });
      }
      
      try {
        const result = await this.checkServiceHealth(service);
        const statusCode = result.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error) {
        res.status(500).json({
          service: serviceName,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Configuration endpoint
    this.app.get('/config', (req, res) => {
      res.json({
        services: this.services.map(s => ({
          name: s.name,
          critical: s.critical,
          timeout: s.timeout,
          expectedResponseTime: s.expectedResponseTime
        })),
        alert_thresholds: this.alertThresholds,
        monitoring_interval: 30000,
        health_history_limit: 100
      });
    });
  }

  startContinuousMonitoring() {
    console.log('🚀 Starting continuous health monitoring...');
    
    // Initial health check
    this.performComprehensiveHealthCheck();
    
    // Schedule regular health checks every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performComprehensiveHealthCheck();
      } catch (error) {
        console.error('❌ Error during scheduled health check:', error.message);
      }
    }, 30000);
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      process.exit(0);
    });
  }

  async start() {
    const port = process.env.HEALTH_MONITOR_PORT || 9090;
    
    this.app.listen(port, () => {
      console.log(`🩺 Advanced Health Monitor running on port ${port}`);
      console.log(`📊 Metrics available at http://localhost:${port}/metrics`);
      console.log(`🔍 Health status at http://localhost:${port}/health`);
      console.log(`📈 Detailed report at http://localhost:${port}/health/detailed`);
    });
    
    // Start continuous monitoring
    this.startContinuousMonitoring();
  }
}

// Export for use in other modules
module.exports = AdvancedHealthMonitor;

// Auto-start if run directly
if (require.main === module) {
  const monitor = new AdvancedHealthMonitor();
  monitor.start().catch(error => {
    console.error('❌ Failed to start health monitor:', error);
    process.exit(1);
  });
}
