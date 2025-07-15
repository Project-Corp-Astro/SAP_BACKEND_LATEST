#!/usr/bin/env node

/**
 * Module 4: Container Optimization Validation Script
 * Implements mathematical validation and zero-error tolerance
 */

const { execSync } = require('child_process');
const fs = require('fs');

class Module4Validator {
    constructor() {
        this.services = [
            { name: 'api-gateway', targetSize: 100, targetStartup: 6, port: 5001 },
            { name: 'auth-service', targetSize: 125, targetStartup: 9, port: 3001 },
            { name: 'user-service', targetSize: 120, targetStartup: 7, port: 3002 },
            { name: 'content-service', targetSize: 135, targetStartup: 9, port: 3005 },
            { name: 'subscription-service', targetSize: 125, targetStartup: 8, port: 3003 }
        ];
        
        this.validationResults = {
            dockerfileExists: {},
            imageOptimization: {},
            composeValidation: {},
            overallSuccess: false
        };
    }

    /**
     * Mathematical success formula
     */
    calculateSuccessRate() {
        let totalTests = 0;
        let passedTests = 0;

        // Count Dockerfile validations
        Object.values(this.validationResults.dockerfileExists).forEach(result => {
            totalTests++;
            if (result) passedTests++;
        });

        // Count optimization validations
        Object.values(this.validationResults.imageOptimization).forEach(result => {
            totalTests++;
            if (result.valid) passedTests++;
        });

        // Count compose validation
        totalTests++;
        if (this.validationResults.composeValidation.valid) passedTests++;

        const successRate = (passedTests / totalTests) * 100;
        return { successRate, passedTests, totalTests };
    }

    /**
     * Validate optimized Dockerfiles exist and are properly configured
     */
    validateOptimizedDockerfiles() {
        console.log('🔍 Validating Optimized Dockerfiles...\n');

        this.services.forEach(service => {
            const dockerfilePath = service.name === 'api-gateway' 
                ? `api-gateway/Dockerfile.optimized`
                : `services/${service.name}/Dockerfile.optimized`;

            try {
                const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
                
                // Validate key optimization features
                const hasDistroless = dockerfileContent.includes('gcr.io/distroless/nodejs18-debian11');
                const hasMultiStage = dockerfileContent.includes('FROM') && dockerfileContent.split('FROM').length > 2;
                const hasNodeOptions = dockerfileContent.includes('NODE_OPTIONS');
                const hasHealthCheck = dockerfileContent.includes('HEALTHCHECK');
                const hasNonRootUser = dockerfileContent.includes('USER 1000:1000');
                
                const optimizationScore = [hasDistroless, hasMultiStage, hasNodeOptions, hasHealthCheck, hasNonRootUser]
                    .filter(Boolean).length / 5 * 100;

                this.validationResults.dockerfileExists[service.name] = optimizationScore >= 80;
                
                const status = optimizationScore >= 80 ? '✅' : '❌';
                console.log(`${status} ${service.name}: Optimization Score ${optimizationScore.toFixed(1)}%`);
                console.log(`   - Distroless Base: ${hasDistroless ? '✅' : '❌'}`);
                console.log(`   - Multi-Stage: ${hasMultiStage ? '✅' : '❌'}`);
                console.log(`   - Node Options: ${hasNodeOptions ? '✅' : '❌'}`);
                console.log(`   - Health Check: ${hasHealthCheck ? '✅' : '❌'}`);
                console.log(`   - Non-Root User: ${hasNonRootUser ? '✅' : '❌'}\n`);
                
            } catch (error) {
                console.log(`❌ ${service.name}: Dockerfile.optimized not found`);
                this.validationResults.dockerfileExists[service.name] = false;
            }
        });
    }

    /**
     * Validate image optimization features
     */
    validateImageOptimization() {
        console.log('🚀 Validating Image Optimization...\n');

        this.services.forEach(service => {
            try {
                // Check if optimized image exists
                const imageExists = this.checkImageExists(`sap-${service.name}:optimized`);
                
                if (imageExists) {
                    // Get image size
                    const imageSizeResult = execSync(`docker images sap-${service.name}:optimized --format "{{.Size}}"`, {
                        stdio: 'pipe',
                        encoding: 'utf8'
                    });

                    const imageSizeMB = this.parseSizeToMB(imageSizeResult.trim());
                    const sizeTargetMet = imageSizeMB <= service.targetSize;
                    
                    // Check layer count
                    const layerResult = execSync(`docker history sap-${service.name}:optimized --format "{{.ID}}" | wc -l`, {
                        stdio: 'pipe',
                        encoding: 'utf8'
                    });
                    
                    const layerCount = parseInt(layerResult.trim()) || 0;
                    const layerTargetMet = layerCount <= 10;

                    const optimizationValid = sizeTargetMet && layerTargetMet;
                    
                    this.validationResults.imageOptimization[service.name] = {
                        valid: optimizationValid,
                        size: imageSizeMB,
                        layers: layerCount,
                        sizeTargetMet,
                        layerTargetMet
                    };

                    const status = optimizationValid ? '✅' : '❌';
                    console.log(`${status} ${service.name}:`);
                    console.log(`   - Image Size: ${imageSizeMB}MB (Target: ≤${service.targetSize}MB) ${sizeTargetMet ? '✅' : '❌'}`);
                    console.log(`   - Layer Count: ${layerCount} (Target: ≤10) ${layerTargetMet ? '✅' : '❌'}\n`);
                    
                } else {
                    console.log(`❌ ${service.name}: Optimized image not found\n`);
                    this.validationResults.imageOptimization[service.name] = {
                        valid: false,
                        size: 0,
                        layers: 0,
                        sizeTargetMet: false,
                        layerTargetMet: false
                    };
                }
                
            } catch (error) {
                console.log(`❌ ${service.name}: Validation failed - ${error.message}\n`);
                this.validationResults.imageOptimization[service.name] = {
                    valid: false,
                    size: 0,
                    layers: 0,
                    sizeTargetMet: false,
                    layerTargetMet: false
                };
            }
        });
    }

    /**
     * Check if Docker image exists
     */
    checkImageExists(imageName) {
        try {
            execSync(`docker images ${imageName} --format "{{.Repository}}"`, { stdio: 'pipe' });
            return true;
        } catch (error) {
            return false;
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
     * Validate optimized Docker Compose configuration
     */
    validateOptimizedCompose() {
        console.log('🐳 Validating Optimized Docker Compose...\n');

        try {
            const composeContent = fs.readFileSync('docker-compose.optimized.yml', 'utf8');
            
            // Validate key optimization features
            const hasResourceLimits = composeContent.includes('resources:') && composeContent.includes('limits:');
            const hasHealthChecks = composeContent.includes('healthcheck:');
            const hasOptimizedImages = composeContent.includes(':optimized');
            const hasNetworkOptimization = composeContent.includes('sap-optimized-network');
            const hasMemoryLimits = composeContent.includes('memory:');
            
            const features = [
                { name: 'Resource Limits', present: hasResourceLimits },
                { name: 'Health Checks', present: hasHealthChecks },
                { name: 'Optimized Images', present: hasOptimizedImages },
                { name: 'Network Optimization', present: hasNetworkOptimization },
                { name: 'Memory Limits', present: hasMemoryLimits }
            ];

            const validFeatures = features.filter(f => f.present).length;
            const composeScore = (validFeatures / features.length) * 100;
            const composeValid = composeScore >= 80;

            this.validationResults.composeValidation = {
                valid: composeValid,
                score: composeScore,
                features: features
            };

            const status = composeValid ? '✅' : '❌';
            console.log(`${status} Docker Compose Optimization: ${composeScore.toFixed(1)}%`);
            
            features.forEach(feature => {
                const featureStatus = feature.present ? '✅' : '❌';
                console.log(`   - ${feature.name}: ${featureStatus}`);
            });
            console.log();

        } catch (error) {
            console.log('❌ docker-compose.optimized.yml not found or invalid\n');
            this.validationResults.composeValidation = {
                valid: false,
                score: 0,
                features: []
            };
        }
    }

    /**
     * Generate validation report
     */
    generateValidationReport() {
        const { successRate, passedTests, totalTests } = this.calculateSuccessRate();
        
        const report = `# 🎯 Module 4: Container Optimization - VALIDATION REPORT
**Validation Date**: ${new Date().toISOString()}
**Validation Framework**: Mathematical Zero-Error Tolerance

## 📊 Mathematical Validation Results

### Success Rate Formula:
\`\`\`
Module_4_Success_Rate = (Passed_Tests / Total_Tests) × 100
Result: ${passedTests}/${totalTests} = ${successRate.toFixed(1)}%
\`\`\`

### Zero-Error Tolerance Status:
\`\`\`
Target: 100% success rate
Achieved: ${successRate.toFixed(1)}%
Status: ${successRate === 100 ? 'COMPLIANT ✅' : 'NON-COMPLIANT ❌'}
\`\`\`

## 🔍 Detailed Validation Results

### Dockerfile Optimization Validation:
${this.services.map(service => {
    const result = this.validationResults.dockerfileExists[service.name];
    return `- **${service.name}**: ${result ? '✅ PASS' : '❌ FAIL'}`;
}).join('\n')}

### Image Optimization Validation:
${this.services.map(service => {
    const result = this.validationResults.imageOptimization[service.name];
    return `- **${service.name}**: ${result.valid ? '✅ PASS' : '❌ FAIL'} (${result.size}MB, ${result.layers} layers)`;
}).join('\n')}

### Docker Compose Optimization:
- **Configuration**: ${this.validationResults.composeValidation.valid ? '✅ PASS' : '❌ FAIL'} (${this.validationResults.composeValidation.score.toFixed(1)}% score)

## 🎯 Optimization Achievements

### Image Size Targets:
${this.services.map(service => {
    const result = this.validationResults.imageOptimization[service.name];
    const status = result.sizeTargetMet ? '✅' : '❌';
    return `- **${service.name}**: ${result.size}MB ${status} (Target: ≤${service.targetSize}MB)`;
}).join('\n')}

### Layer Optimization:
${this.services.map(service => {
    const result = this.validationResults.imageOptimization[service.name];
    const status = result.layerTargetMet ? '✅' : '❌';
    return `- **${service.name}**: ${result.layers} layers ${status} (Target: ≤10)`;
}).join('\n')}

## 🏆 Module 4 Assessment

**✅ Optimization Success Rate**: ${successRate.toFixed(1)}%
**🎯 Zero-Error Tolerance**: ${successRate === 100 ? 'MAINTAINED' : 'VIOLATED'}
**🚀 Ready for Module 5**: ${successRate >= 90 ? 'YES' : 'OPTIMIZATION REQUIRED'}

### Next Steps:
${successRate >= 90 
    ? '✅ Module 4 optimization completed successfully. Ready to proceed with Module 5: Security Implementation.'
    : '⚠️ Module 4 requires additional optimization before proceeding to Module 5.'}

---
**Generated by Module 4 Validation Framework**
**Mathematical Certification**: ${successRate === 100 ? 'CERTIFIED ✅' : 'PENDING ⚠️'}
`;

        return report;
    }

    /**
     * Execute full validation pipeline
     */
    async executeValidation() {
        console.log('🔥 MODULE 4: CONTAINER OPTIMIZATION VALIDATION');
        console.log('📊 Mathematical Framework: ACTIVE');
        console.log('🎯 Zero-Error Tolerance: ENFORCED\n');

        this.validateOptimizedDockerfiles();
        this.validateImageOptimization();
        this.validateOptimizedCompose();

        const { successRate } = this.calculateSuccessRate();
        this.validationResults.overallSuccess = successRate === 100;

        const report = this.generateValidationReport();
        fs.writeFileSync('MODULE4_VALIDATION_REPORT.md', report);

        console.log('📋 Validation Report Generated: MODULE4_VALIDATION_REPORT.md');
        console.log(`🎯 Module 4 Success Rate: ${successRate.toFixed(1)}%`);
        
        if (successRate === 100) {
            console.log('✅ MODULE 4: MATHEMATICALLY CERTIFIED');
            console.log('🚀 READY FOR MODULE 5: Security Implementation');
        } else if (successRate >= 90) {
            console.log('⚠️ MODULE 4: ACCEPTABLE (Minor optimizations recommended)');
            console.log('🚀 PROCEEDING TO MODULE 5: Security Implementation');
        } else {
            console.log('❌ MODULE 4: REQUIRES OPTIMIZATION');
            console.log('🔄 Additional optimization needed before Module 5');
        }

        return this.validationResults.overallSuccess;
    }
}

// Execute validation if run directly
if (require.main === module) {
    const validator = new Module4Validator();
    validator.executeValidation().catch(console.error);
}

module.exports = Module4Validator;
