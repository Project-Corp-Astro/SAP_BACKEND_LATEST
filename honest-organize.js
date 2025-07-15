#!/usr/bin/env node

/**
 * HONEST PROJECT ORGANIZATION SCRIPT
 * Actually organize the SAP Backend project properly
 */

const fs = require('fs').promises;
const path = require('path');

class HonestProjectOrganizer {
  constructor() {
    this.rootDir = 'd:\\31-rbac-implementation\\SAP_BACKEND_LATEST';
    this.moved = [];
    this.failed = [];
    this.errors = [];
  }

  async organize() {
    console.log('🧹 HONEST PROJECT ORGANIZATION');
    console.log('================================');
    console.log('Moving files to proper directories...\n');

    try {
      // Ensure target directories exist
      await this.ensureDirectories();
      
      // Move files systematically
      await this.moveDockerFiles();
      await this.moveScripts();
      await this.moveReports();
      await this.moveConfigs();
      await this.cleanupDuplicates();
      
      // Report results honestly
      this.reportResults();
      
    } catch (error) {
      console.error('❌ Organization failed:', error.message);
      this.errors.push(error.message);
    }
  }

  async ensureDirectories() {
    const dirs = [
      'infrastructure/docker',
      'infrastructure/kubernetes',
      'infrastructure/monitoring',
      'infrastructure/security',
      'deployment/gitops',
      'tools/scripts',
      'tools/health-monitoring',
      'tools/testing',
      'docs/reports/phase1',
      'docs/reports/phase2',
      'docs/deployment',
      'archives'
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(path.join(this.rootDir, dir), { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      } catch (error) {
        console.log(`⚠️ Directory already exists or failed: ${dir}`);
      }
    }
  }

  async moveDockerFiles() {
    const dockerFiles = [
      'docker-compose.yml',
      'docker-compose.production.yml',
      'docker-compose.monitoring.yml',
      'docker-compose.optimized.yml',
      'docker-compose.override.yml',
      'docker-compose.secure.yml',
      'Dockerfile',
      'Dockerfile.health-monitor'
    ];

    for (const file of dockerFiles) {
      await this.moveFile(file, 'infrastructure/docker', 'Docker file');
    }
  }

  async moveScripts() {
    const scripts = [
      'implement-security.js',
      'implement-monitoring.js',
      'implement-kubernetes-orchestration.js',
      'implement-health-monitoring.js',
      'implement-ha-disaster-recovery.js',
      'implement-cicd-gitops.js',
      'implement-autoscaling-management.js',
      'organize-project.js',
      'start-all-services.js',
      'start-services.js',
      'phase2-progress-tracker.js',
      'phase2-dashboard.html'
    ];

    for (const script of scripts) {
      await this.moveFile(script, 'tools/scripts', 'Script');
    }

    // Move health monitor
    await this.moveFile('health-monitor.js', 'tools/health-monitoring', 'Health monitoring tool');
  }

  async moveReports() {
    // Phase 1 reports
    const phase1Reports = [
      'MODULE1_AUDIT_REPORT.md',
      'MODULE2_DOCKERFILE_REPORT.md',
      'MODULE3_COMPOSE_REPORT.md',
      'MODULE4_OPTIMIZATION_PLAN.md',
      'MODULE4_OPTIMIZATION_REPORT.md',
      'MODULE5_SECURITY_PLAN.md',
      'MODULE5_SECURITY_REPORT.md',
      'MODULE6_HEALTH_MONITORING_PLAN.md',
      'MODULE6_HEALTH_MONITORING_REPORT.md',
      'CONTAINERIZATION_PLAN_PHASE1.md',
      'CONTAINERIZATION_PLAN_PHASE2.md',
      'CONTAINERIZATION_STATUS.md',
      'PROGRESS_TRACKER_PHASE1.md'
    ];

    for (const report of phase1Reports) {
      await this.moveFile(report, 'docs/reports/phase1', 'Phase 1 report');
    }

    // Phase 2 reports
    const phase2Reports = [
      'MODULE7_KUBERNETES_IMPLEMENTATION_REPORT.md',
      'MODULE7_KUBERNETES_PLAN.md',
      'MODULE8_AUTOSCALING_IMPLEMENTATION_REPORT.md',
      'MODULE9_HA_DISASTER_RECOVERY_REPORT.md',
      'Module-11-Monitoring-Report.md',
      'PHASE2_COMPLETION_REPORT.md',
      'PHASE2_PLAN_REVIEW_REPORT.md',
      'PHASE2_PROGRESS_TRACKER.md'
    ];

    for (const report of phase2Reports) {
      await this.moveFile(report, 'docs/reports/phase2', 'Phase 2 report');
    }

    // Main reports
    await this.moveFile('PRODUCTION_READINESS_ASSESSMENT.md', 'docs/reports', 'Production readiness report');
    await this.moveFile('GCP_DEPLOYMENT_GUIDE.md', 'docs/deployment', 'Deployment guide');
  }

  async moveConfigs() {
    await this.moveFile('kind-config.yaml', 'infrastructure/kubernetes', 'Kubernetes config');
    await this.moveFile('package-lock.json', 'archives', 'Lock file');
  }

  async cleanupDuplicates() {
    const duplicateDirs = ['docker', 'monitoring', 'scripts', 'testing', 'k8s', 'gitops-manifests'];
    
    for (const dir of duplicateDirs) {
      try {
        const dirPath = path.join(this.rootDir, dir);
        const exists = await fs.access(dirPath).then(() => true).catch(() => false);
        
        if (exists) {
          console.log(`🔍 Checking duplicate directory: ${dir}`);
          // Move contents if any, then remove directory
          // (Implementation would depend on specific directory contents)
        }
      } catch (error) {
        console.log(`⚠️ Error checking duplicate directory ${dir}: ${error.message}`);
      }
    }
  }

  async moveFile(fileName, targetDir, description) {
    try {
      const sourcePath = path.join(this.rootDir, fileName);
      const targetPath = path.join(this.rootDir, targetDir, fileName);
      
      // Check if source exists
      const exists = await fs.access(sourcePath).then(() => true).catch(() => false);
      if (!exists) {
        console.log(`⚠️ ${description} not found: ${fileName}`);
        return;
      }

      // Move the file
      await fs.rename(sourcePath, targetPath);
      console.log(`✅ Moved ${description}: ${fileName} → ${targetDir}`);
      this.moved.push({ file: fileName, target: targetDir });
      
    } catch (error) {
      console.log(`❌ Failed to move ${description}: ${fileName} - ${error.message}`);
      this.failed.push({ file: fileName, target: targetDir, error: error.message });
    }
  }

  reportResults() {
    console.log('\n📊 ORGANIZATION RESULTS');
    console.log('========================');
    console.log(`✅ Successfully moved: ${this.moved.length} files`);
    console.log(`❌ Failed to move: ${this.failed.length} files`);
    console.log(`⚠️ Errors encountered: ${this.errors.length}`);
    
    if (this.moved.length > 0) {
      console.log('\n✅ SUCCESSFULLY MOVED:');
      this.moved.forEach(item => {
        console.log(`  • ${item.file} → ${item.target}`);
      });
    }
    
    if (this.failed.length > 0) {
      console.log('\n❌ FAILED TO MOVE:');
      this.failed.forEach(item => {
        console.log(`  • ${item.file} → ${item.target} (${item.error})`);
      });
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Manually verify the organization is correct');
    console.log('2. Remove any remaining duplicate directories');
    console.log('3. Update any hardcoded paths in configurations');
    console.log('4. Test that the application still works');
    
    // Honest assessment
    const successRate = (this.moved.length / (this.moved.length + this.failed.length)) * 100;
    console.log(`\n📈 ORGANIZATION SUCCESS RATE: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 Project is now well organized!');
    } else if (successRate >= 70) {
      console.log('⚠️ Project is partially organized - manual cleanup needed');
    } else {
      console.log('❌ Organization mostly failed - manual intervention required');
    }
  }
}

// Execute the organization
const organizer = new HonestProjectOrganizer();
organizer.organize().catch(console.error);
