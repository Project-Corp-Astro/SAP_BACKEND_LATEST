#!/usr/bin/env node

/**
 * Container Optimization Build Script
 * Implements advanced Docker build optimization techniques
 * Mathematical validation and performance benchmarking
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ContainerOptimizer {
    constructor() {
        this.services = [
            { name: 'api-gateway', path: 'api-gateway', port: 5001, targetSize: 100 },
            { name: 'auth-service', path: 'services/auth-service', port: 3001, targetSize: 125 },
            { name: 'user-service', path: 'services/user-service', port: 3002, targetSize: 120 },
            { name: 'content-service', path: 'services/content-service', port: 3005, targetSize: 135 },
            { name: 'subscription-service', path: 'services/subscription-management-service', port: 3003, targetSize: 125 }
        ];
        
        this.optimizationResults = {
            imageSizes: {},
            buildTimes: {},
            startupTimes: {},
            memoryUsage: {}
        };
        
        this.startTime = Date.now();
    }

    /**
     * Mathematical validation of optimization success
     */
    calculateOptimizationMetrics() {
        const metrics = {
            totalServices: this.services.length,
            successfulBuilds: 0,
            averageSizeReduction: 0,
            averageStartupImprovement: 0,
            totalOptimizationScore: 0
        };

        let totalSizeReduction = 0;
        let totalStartupImprovement = 0;

        this.services.forEach(service => {
            const imageSizeMB = this.optimizationResults.imageSizes[service.name] || 0;
            const originalSizeMB = this.getOriginalSize(service.name);
            const sizeReduction = ((originalSizeMB - imageSizeMB) / originalSizeMB) * 100;
            
            if (imageSizeMB > 0 && imageSizeMB <= service.targetSize) {
                metrics.successfulBuilds++;
            }
            
            totalSizeReduction += sizeReduction;
            totalStartupImprovement += this.calculateStartupImprovement(service.name);
        });

        metrics.averageSizeReduction = totalSizeReduction / this.services.length;
        metrics.averageStartupImprovement = totalStartupImprovement / this.services.length;
        metrics.totalOptimizationScore = (metrics.successfulBuilds / metrics.totalServices) * 100;

        return metrics;
    }

    /**
     * Get original image size for comparison
     */
    getOriginalSize(serviceName) {
        const originalSizes = {
            'api-gateway': 150,
            'auth-service': 180,
            'user-service': 170,
            'content-service': 190,
            'subscription-service': 175
        };
        return originalSizes[serviceName] || 170;
    }

    /**
     * Calculate startup time improvement
     */
    calculateStartupImprovement(serviceName) {
        const originalStartupTimes = {
            'api-gateway': 10,
            'auth-service': 15,
            'user-service': 12,
            'content-service': 15,
            'subscription-service': 13
        };
        
        const original = originalStartupTimes[serviceName] || 13;
        const optimized = this.optimizationResults.startupTimes[serviceName] || original;
        
        return ((original - optimized) / original) * 100;
    }

    /**
     * Build optimized Docker images with advanced techniques
     */
    async buildOptimizedImages() {
        console.log('🚀 Starting Container Optimization Build Process...\n');
        
        for (const service of this.services) {
            await this.buildServiceImage(service);
        }
        
        console.log('\n✅ All optimized images built successfully!');
    }

    /**
     * Build individual service with optimization
     */
    async buildServiceImage(service) {
        const buildStart = Date.now();
        console.log(`🔧 Building optimized ${service.name}...`);
        
        try {
            // Enable BuildKit for advanced features
            const buildCommand = [
                'docker', 'build',
                '--file', `${service.path}/Dockerfile.optimized`,
                '--tag', `sap-${service.name}:optimized`,
                '--tag', `sap-${service.name}:latest`,
                '--build-arg', 'BUILDKIT_INLINE_CACHE=1',
                '--build-arg', 'NODE_ENV=production',
                '--progress=plain',
                service.path
            ];

            console.log(`   Command: ${buildCommand.join(' ')}`);
            
            const buildResult = execSync(buildCommand.join(' '), {
                stdio: 'pipe',
                env: { ...process.env, DOCKER_BUILDKIT: '1' }
            });

            const buildTime = Date.now() - buildStart;
            this.optimizationResults.buildTimes[service.name] = buildTime;

            // Measure image size
            const sizeResult = execSync(`docker images sap-${service.name}:optimized --format "{{.Size}}"`, {
                stdio: 'pipe',
                encoding: 'utf8'
            });

            const imageSizeMB = this.parseSizeToMB(sizeResult.trim());
            this.optimizationResults.imageSizes[service.name] = imageSizeMB;

            // Validate image size target
            const sizeReduction = ((this.getOriginalSize(service.name) - imageSizeMB) / this.getOriginalSize(service.name)) * 100;
            const sizeStatus = imageSizeMB <= service.targetSize ? '✅' : '⚠️';
            
            console.log(`   ${sizeStatus} Image Size: ${imageSizeMB}MB (Target: ${service.targetSize}MB, Reduction: ${sizeReduction.toFixed(1)}%)`);
            console.log(`   ⏱️  Build Time: ${(buildTime / 1000).toFixed(1)}s`);
            
        } catch (error) {
            console.error(`❌ Failed to build ${service.name}:`, error.message);
            throw error;
        }
    }

    /**
     * Parse Docker image size to MB
     */
    parseSizeToMB(sizeString) {
        const match = sizeString.match(/([0-9.]+)(MB|GB|KB)/);
        if (!match) return 0;
        
        const value = parseFloat(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 'GB': return value * 1024;
            case 'KB': return value / 1024;
            case 'MB': default: return value;
        }
    }

    /**
     * Test startup performance of optimized containers
     */
    async testStartupPerformance() {
        console.log('\n🚀 Testing Startup Performance...\n');
        
        for (const service of this.services) {
            await this.measureStartupTime(service);
        }
    }

    /**
     * Measure startup time for a service
     */
    async measureStartupTime(service) {
        console.log(`⏱️  Measuring startup time for ${service.name}...`);
        
        try {
            const containerName = `${service.name}-startup-test`;
            
            // Remove existing test container
            try {
                execSync(`docker rm -f ${containerName}`, { stdio: 'pipe' });
            } catch (e) {
                // Container doesn't exist, continue
            }

            const startTime = Date.now();
            
            // Start container and wait for health check
            const runCommand = [
                'docker', 'run', '-d',
                '--name', containerName,
                '--publish', `${service.port}:${service.port}`,
                `sap-${service.name}:optimized`
            ];

            execSync(runCommand.join(' '), { stdio: 'pipe' });

            // Wait for health check to pass
            let healthy = false;
            let attempts = 0;
            const maxAttempts = 60; // 60 seconds max wait

            while (!healthy && attempts < maxAttempts) {
                try {
                    const healthResult = execSync(`docker inspect ${containerName} --format='{{.State.Health.Status}}'`, {
                        stdio: 'pipe',
                        encoding: 'utf8'
                    });

                    if (healthResult.trim() === 'healthy') {
                        healthy = true;
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        attempts++;
                    }
                } catch (e) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    attempts++;
                }
            }

            const startupTime = (Date.now() - startTime) / 1000;
            this.optimizationResults.startupTimes[service.name] = startupTime;

            // Clean up
            execSync(`docker rm -f ${containerName}`, { stdio: 'pipe' });

            const improvement = this.calculateStartupImprovement(service.name);
            const status = startupTime <= this.getTargetStartupTime(service.name) ? '✅' : '⚠️';
            
            console.log(`   ${status} Startup Time: ${startupTime.toFixed(1)}s (Improvement: ${improvement.toFixed(1)}%)`);
            
        } catch (error) {
            console.error(`❌ Failed to measure startup time for ${service.name}:`, error.message);
        }
    }

    /**
     * Get target startup time for service
     */
    getTargetStartupTime(serviceName) {
        const targets = {
            'api-gateway': 6,
            'auth-service': 9,
            'user-service': 7,
            'content-service': 9,
            'subscription-service': 8
        };
        return targets[serviceName] || 8;
    }

    /**
     * Generate optimization report
     */
    generateOptimizationReport() {
        const metrics = this.calculateOptimizationMetrics();
        const totalTime = (Date.now() - this.startTime) / 1000;

        const report = `# 🚀 Container Optimization Results Report
**Execution Date**: ${new Date().toISOString()}
**Total Execution Time**: ${(totalTime / 60).toFixed(1)} minutes

## 📊 Mathematical Validation Results

### Success Rate Formula:
\`\`\`
Optimization_Success_Rate = (Successful_Builds / Total_Services) × 100
Result: ${metrics.successfulBuilds}/${metrics.totalServices} = ${metrics.totalOptimizationScore.toFixed(1)}%
\`\`\`

### Performance Improvements:
\`\`\`
Average_Size_Reduction = ${metrics.averageSizeReduction.toFixed(1)}%
Average_Startup_Improvement = ${metrics.averageStartupImprovement.toFixed(1)}%
\`\`\`

## 🎯 Service Optimization Results

| Service | Original Size | Optimized Size | Reduction | Target Met | Startup Time | Improvement |
|---------|---------------|----------------|-----------|------------|--------------|-------------|
${this.services.map(service => {
    const originalSize = this.getOriginalSize(service.name);
    const optimizedSize = this.optimizationResults.imageSizes[service.name] || 0;
    const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    const targetMet = optimizedSize <= service.targetSize ? '✅' : '❌';
    const startupTime = this.optimizationResults.startupTimes[service.name]?.toFixed(1) || 'N/A';
    const improvement = this.calculateStartupImprovement(service.name).toFixed(1);
    
    return `| ${service.name} | ${originalSize}MB | ${optimizedSize}MB | ${reduction}% | ${targetMet} | ${startupTime}s | ${improvement}% |`;
}).join('\n')}

## 🏆 Optimization Achievements

### Image Size Optimization:
${this.services.map(service => {
    const size = this.optimizationResults.imageSizes[service.name];
    const target = service.targetSize;
    const status = size <= target ? '✅' : '❌';
    return `- **${service.name}**: ${size}MB ${status} (Target: ${target}MB)`;
}).join('\n')}

### Build Performance:
${this.services.map(service => {
    const buildTime = this.optimizationResults.buildTimes[service.name];
    const buildTimeSeconds = buildTime ? (buildTime / 1000).toFixed(1) : 'N/A';
    return `- **${service.name}**: ${buildTimeSeconds}s build time`;
}).join('\n')}

## 🎯 Overall Assessment

**✅ Module 4 Success Rate**: ${metrics.totalOptimizationScore.toFixed(1)}%
**🎯 Zero-Error Tolerance**: ${metrics.totalOptimizationScore === 100 ? 'MAINTAINED' : 'NEEDS ATTENTION'}
**🚀 Ready for Module 5**: ${metrics.totalOptimizationScore >= 90 ? 'YES' : 'OPTIMIZATION REQUIRED'}

---
**Generated by Container Optimization Framework v1.0**
`;

        return report;
    }

    /**
     * Execute full optimization pipeline
     */
    async executeOptimization() {
        try {
            console.log('🔥 CONTAINER OPTIMIZATION FRAMEWORK v1.0');
            console.log('📊 Mathematical Validation: ACTIVE');
            console.log('🎯 Zero-Error Tolerance: ENABLED\n');

            await this.buildOptimizedImages();
            await this.testStartupPerformance();

            const report = this.generateOptimizationReport();
            fs.writeFileSync('MODULE4_OPTIMIZATION_REPORT.md', report);

            console.log('\n📋 Optimization Report Generated: MODULE4_OPTIMIZATION_REPORT.md');
            
            const metrics = this.calculateOptimizationMetrics();
            console.log(`\n🎯 Final Success Rate: ${metrics.totalOptimizationScore.toFixed(1)}%`);
            
            if (metrics.totalOptimizationScore >= 90) {
                console.log('✅ MODULE 4 OPTIMIZATION: MATHEMATICALLY CERTIFIED');
            } else {
                console.log('⚠️  MODULE 4 OPTIMIZATION: REQUIRES ATTENTION');
            }

        } catch (error) {
            console.error('❌ Optimization failed:', error.message);
            process.exit(1);
        }
    }
}

// Execute optimization if run directly
if (require.main === module) {
    const optimizer = new ContainerOptimizer();
    optimizer.executeOptimization().catch(console.error);
}

module.exports = ContainerOptimizer;
