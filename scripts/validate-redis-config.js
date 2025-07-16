#!/usr/bin/env node

/**
 * Redis Configuration Validation Script
 * Validates Redis configuration consistency across all SAP microservices
 */

const fs = require('fs');
const path = require('path');

// Service database mapping for validation
const EXPECTED_DB_MAPPING = {
  auth: 1,
  user: 2,
  subscription: 3,
  content: 4
};

// Expected Redis configuration patterns
const EXPECTED_PATTERNS = {
  ENVIRONMENT_VARIABLES: [
    'REDIS_URL',
    'REDIS_HOST', 
    'REDIS_PORT',
    'REDIS_PASSWORD'
  ],
  CONFIG_ACCESS_PATTERNS: [
    'config.get(\'redis.host\'',
    'config.redis.host',
    'process.env.REDIS_HOST',
    'process.env.REDIS_URL'
  ]
};

class RedisConfigValidator {
  constructor() {
    this.results = {
      services: {},
      summary: {
        total: 0,
        valid: 0,
        warnings: 0,
        errors: 0
      }
    };
  }

  async validateAllServices() {
    console.log('🔍 SAP Redis Configuration Validator');
    console.log('=====================================\\n');

    const servicesDir = path.join(__dirname, '../backend/services');
    const services = ['auth-service', 'user-service', 'subscription-management-service', 'content-service'];

    for (const service of services) {
      const servicePath = path.join(servicesDir, service);
      if (fs.existsSync(servicePath)) {
        await this.validateService(service, servicePath);
      }
    }

    this.generateReport();
  }

  async validateService(serviceName, servicePath) {
    console.log(`📋 Validating ${serviceName}...`);
    
    const serviceKey = serviceName.replace('-service', '');
    this.results.services[serviceKey] = {
      name: serviceName,
      path: servicePath,
      checks: {
        environmentAware: false,
        databaseMapping: false,
        consistentAccess: false,
        mockImplementation: false
      },
      issues: [],
      score: 0
    };

    this.results.summary.total++;

    try {
      // Check for environment-aware modules
      await this.checkEnvironmentAwareModules(serviceKey, servicePath);
      
      // Check Redis configuration files
      await this.checkRedisConfiguration(serviceKey, servicePath);
      
      // Check database mapping
      await this.checkDatabaseMapping(serviceKey, servicePath);
      
      // Calculate score
      this.calculateScore(serviceKey);
      
    } catch (error) {
      this.results.services[serviceKey].issues.push({
        type: 'ERROR',
        message: `Failed to validate service: ${error.message}`
      });
      this.results.summary.errors++;
    }
  }

  async checkEnvironmentAwareModules(serviceKey, servicePath) {
    const sharedModulesPath = path.join(servicePath, 'src/utils/sharedModules.ts');
    const moduleResolverPath = path.join(servicePath, 'src/utils/moduleResolver.ts');
    
    if (fs.existsSync(sharedModulesPath) && fs.existsSync(moduleResolverPath)) {
      this.results.services[serviceKey].checks.environmentAware = true;
      
      // Check content for proper patterns
      const sharedContent = fs.readFileSync(sharedModulesPath, 'utf8');
      
      // More flexible pattern matching for consistent access
      const hasConfigGet = sharedContent.includes('config.get') || sharedContent.includes('get:');
      const hasRedisEnv = sharedContent.includes('process.env.REDIS') || sharedContent.includes('REDIS_');
      const hasUnifiedInterface = sharedContent.includes('redis:') && (sharedContent.includes('host:') || sharedContent.includes('url:'));
      
      if (hasConfigGet && hasRedisEnv && hasUnifiedInterface) {
        this.results.services[serviceKey].checks.consistentAccess = true;
      }
      
      if (sharedContent.includes('MockRedisCache') || sharedContent.includes('Mock Redis')) {
        this.results.services[serviceKey].checks.mockImplementation = true;
      }
    } else {
      this.results.services[serviceKey].issues.push({
        type: 'WARNING',
        message: 'Missing environment-aware modules (sharedModules.ts or moduleResolver.ts)'
      });
      this.results.summary.warnings++;
    }
  }

  async checkRedisConfiguration(serviceKey, servicePath) {
    const redisConfigPath = path.join(servicePath, 'src/utils/redis.ts');
    
    if (fs.existsSync(redisConfigPath)) {
      const content = fs.readFileSync(redisConfigPath, 'utf8');
      
      // Check for imports from sharedModules
      if (content.includes('from \'./sharedModules\'')) {
        this.results.services[serviceKey].issues.push({
          type: 'PASS',
          message: 'Uses environment-aware shared modules for Redis configuration'
        });
      } else if (content.includes('../../../../shared/')) {
        this.results.services[serviceKey].issues.push({
          type: 'WARNING',
          message: 'Still using direct shared imports instead of environment-aware modules'
        });
        this.results.summary.warnings++;
      }
      
      // Check for service isolation
      if (content.includes('SERVICE_DB_MAPPING') && content.includes(serviceKey.toUpperCase())) {
        this.results.services[serviceKey].checks.databaseMapping = true;
      }
    } else {
      this.results.services[serviceKey].issues.push({
        type: 'ERROR',
        message: 'Missing Redis configuration file (redis.ts)'
      });
      this.results.summary.errors++;
    }
  }

  async checkDatabaseMapping(serviceKey, servicePath) {
    // Handle subscription-management-service naming
    const mappingKey = serviceKey === 'subscription-management' ? 'subscription' : serviceKey;
    const expectedDb = EXPECTED_DB_MAPPING[mappingKey];
    
    if (!expectedDb) {
      this.results.services[serviceKey].issues.push({
        type: 'WARNING',
        message: `No expected database mapping found for service: ${serviceKey}`
      });
      this.results.summary.warnings++;
      return;
    }

    // Check if database mapping is correctly configured
    const files = [
      path.join(servicePath, 'src/utils/redis.ts'),
      path.join(servicePath, 'src/utils/sharedModules.ts')
    ];

    let foundCorrectMapping = false;
    for (const filePath of files) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(`db: ${expectedDb}`) || content.includes(`${mappingKey}: ${expectedDb}`)) {
          foundCorrectMapping = true;
          break;
        }
      }
    }

    if (foundCorrectMapping) {
      this.results.services[serviceKey].checks.databaseMapping = true;
      this.results.services[serviceKey].issues.push({
        type: 'PASS',
        message: `Correct database mapping found (DB ${expectedDb})`
      });
    } else {
      this.results.services[serviceKey].issues.push({
        type: 'ERROR',
        message: `Incorrect or missing database mapping (expected DB ${expectedDb})`
      });
      this.results.summary.errors++;
    }
  }

  calculateScore(serviceKey) {
    const checks = this.results.services[serviceKey].checks;
    const checkCount = Object.keys(checks).length;
    const passedChecks = Object.values(checks).filter(Boolean).length;
    
    this.results.services[serviceKey].score = Math.round((passedChecks / checkCount) * 100);
    
    if (this.results.services[serviceKey].score >= 80) {
      this.results.summary.valid++;
    }
  }

  generateReport() {
    console.log('\\n📊 Redis Configuration Validation Report');
    console.log('==========================================\\n');
    
    // Service-by-service report
    for (const [serviceKey, result] of Object.entries(this.results.services)) {
      const statusIcon = result.score >= 80 ? '✅' : result.score >= 50 ? '⚠️' : '❌';
      console.log(`${statusIcon} ${result.name} (${result.score}%)`);
      
      // Show check results
      for (const [check, passed] of Object.entries(result.checks)) {
        const icon = passed ? '✓' : '✗';
        console.log(`   ${icon} ${check}`);
      }
      
      // Show issues
      if (result.issues.length > 0) {
        console.log(`   Issues:`);
        for (const issue of result.issues) {
          const icon = issue.type === 'PASS' ? '✓' : issue.type === 'WARNING' ? '⚠' : '✗';
          console.log(`     ${icon} ${issue.message}`);
        }
      }
      console.log('');
    }
    
    // Summary
    console.log('📈 Summary:');
    console.log(`   Total Services: ${this.results.summary.total}`);
    console.log(`   Valid (≥80%): ${this.results.summary.valid}`);
    console.log(`   Warnings: ${this.results.summary.warnings}`);
    console.log(`   Errors: ${this.results.summary.errors}`);
    
    // Recommendations
    console.log('\\n💡 Recommendations:');
    if (this.results.summary.valid === this.results.summary.total) {
      console.log('   🎉 All services have consistent Redis configuration!');
      console.log('   Ready for production deployment.');
    } else {
      console.log('   🔧 Some services need Redis configuration updates:');
      for (const [serviceKey, result] of Object.entries(this.results.services)) {
        if (result.score < 80) {
          console.log(`   - Update ${result.name} to use environment-aware Redis configuration`);
        }
      }
    }
    
    console.log('\\n🔗 Next Steps:');
    console.log('   1. Apply standardized Redis configuration to all services');
    console.log('   2. Test local development environment with mock Redis');
    console.log('   3. Validate production deployment with Redis cluster connection');
    console.log('   4. Monitor service isolation and database mapping in production');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new RedisConfigValidator();
  validator.validateAllServices().catch(console.error);
}

module.exports = { RedisConfigValidator };
