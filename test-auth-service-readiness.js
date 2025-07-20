#!/usr/bin/env node

/**
 * 🔐 Auth Service Deployment Readiness Test
 * Comprehensive verification that the auth service is ready for deployment
 */

const fs = require('fs');
const path = require('path');

const SERVICE_PATH = './backend/services/auth-service';
const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`, exists ? COLORS.GREEN : COLORS.RED);
  return exists;
}

function checkDirectoryExists(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  log(`${exists ? '✅' : '❌'} ${description}: ${dirPath}`, exists ? COLORS.GREEN : COLORS.RED);
  return exists;
}

function analyzeFile(filePath, description, patterns = []) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    log(`✅ ${description} readable`, COLORS.GREEN);
    
    // Check for specific patterns
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.regex, 'g');
      const matches = content.match(regex);
      if (matches) {
        log(`  ✅ Found ${pattern.name}: ${matches.length} occurrences`, COLORS.BLUE);
      } else {
        log(`  ⚠️ Missing ${pattern.name}`, COLORS.YELLOW);
      }
    });
    
    return true;
  } catch (error) {
    log(`❌ Cannot read ${description}: ${error.message}`, COLORS.RED);
    return false;
  }
}

async function runReadinessCheck() {
  log('\n🚀 SAP Auth Service Deployment Readiness Check', COLORS.BLUE);
  log('=' * 60, COLORS.BLUE);
  
  let score = 0;
  let maxScore = 0;
  
  // 1. Core Files Check
  log('\n📁 Core Files Verification:', COLORS.YELLOW);
  const coreFiles = [
    [`${SERVICE_PATH}/src/index.ts`, 'Main entry point'],
    [`${SERVICE_PATH}/package.json`, 'Package configuration'],
    [`${SERVICE_PATH}/tsconfig.json`, 'TypeScript configuration'],
    [`${SERVICE_PATH}/Dockerfile`, 'Primary Dockerfile'],
    [`${SERVICE_PATH}/Dockerfile.simple`, 'Simple Dockerfile'],
  ];
  
  coreFiles.forEach(([file, desc]) => {
    maxScore++;
    if (checkFileExists(file, desc)) score++;
  });
  
  // 2. Source Structure Check
  log('\n📂 Source Structure Verification:', COLORS.YELLOW);
  const directories = [
    [`${SERVICE_PATH}/src/controllers`, 'Controllers directory'],
    [`${SERVICE_PATH}/src/services`, 'Services directory'],
    [`${SERVICE_PATH}/src/models`, 'Models directory'],
    [`${SERVICE_PATH}/src/routes`, 'Routes directory'],
    [`${SERVICE_PATH}/src/middlewares`, 'Middlewares directory'],
    [`${SERVICE_PATH}/src/utils`, 'Utilities directory'],
  ];
  
  directories.forEach(([dir, desc]) => {
    maxScore++;
    if (checkDirectoryExists(dir, desc)) score++;
  });
  
  // 3. Key Source Files
  log('\n📄 Key Source Files:', COLORS.YELLOW);
  const sourceFiles = [
    [`${SERVICE_PATH}/src/controllers/auth.controller.ts`, 'Auth controller'],
    [`${SERVICE_PATH}/src/services/auth.service.ts`, 'Auth service'],
    [`${SERVICE_PATH}/src/routes/auth.routes.ts`, 'Auth routes'],
    [`${SERVICE_PATH}/src/models/User.ts`, 'User model'],
    [`${SERVICE_PATH}/src/middlewares/auth.middleware.ts`, 'Auth middleware'],
    [`${SERVICE_PATH}/src/utils/redis.ts`, 'Redis utilities'],
  ];
  
  sourceFiles.forEach(([file, desc]) => {
    maxScore++;
    if (checkFileExists(file, desc)) score++;
  });
  
  // 4. Package.json Analysis
  log('\n📦 Package Configuration Analysis:', COLORS.YELLOW);
  maxScore++;
  if (analyzeFile(`${SERVICE_PATH}/package.json`, 'Package.json', [
    { name: 'Start script', regex: '"start":\\s*"[^"]*"' },
    { name: 'Build script', regex: '"build":\\s*"[^"]*"' },
    { name: 'Dependencies', regex: '"dependencies":\\s*{' },
    { name: 'Express dependency', regex: '"express":\\s*"[^"]*"' },
    { name: 'Mongoose dependency', regex: '"mongoose":\\s*"[^"]*"' },
  ])) {
    score++;
  }
  
  // 5. TypeScript Analysis
  log('\n🔧 TypeScript Configuration:', COLORS.YELLOW);
  maxScore++;
  if (analyzeFile(`${SERVICE_PATH}/tsconfig.json`, 'TypeScript config', [
    { name: 'Compiler options', regex: '"compilerOptions":\\s*{' },
    { name: 'Target setting', regex: '"target":\\s*"[^"]*"' },
    { name: 'Module setting', regex: '"module":\\s*"[^"]*"' },
  ])) {
    score++;
  }
  
  // 6. Main Entry Point Analysis
  log('\n🚪 Entry Point Analysis:', COLORS.YELLOW);
  maxScore++;
  if (analyzeFile(`${SERVICE_PATH}/src/index.ts`, 'Main entry point', [
    { name: 'Express imports', regex: 'import.*express' },
    { name: 'MongoDB connection', regex: 'mongoose\\.connect' },
    { name: 'Port configuration', regex: 'PORT|port.*3001' },
    { name: 'Health endpoint', regex: '/health' },
    { name: 'Error handling', regex: 'catch|error' },
  ])) {
    score++;
  }
  
  // 7. Auth Controller Analysis
  log('\n🔐 Auth Controller Analysis:', COLORS.YELLOW);
  maxScore++;
  if (analyzeFile(`${SERVICE_PATH}/src/controllers/auth.controller.ts`, 'Auth controller', [
    { name: 'Register function', regex: 'register.*async' },
    { name: 'Login function', regex: 'login.*async' },
    { name: 'JWT handling', regex: 'jwt|JWT|token' },
    { name: 'Error handling', regex: 'try.*catch|error' },
  ])) {
    score++;
  }
  
  // 8. Dockerfile Analysis
  log('\n🐳 Docker Configuration:', COLORS.YELLOW);
  maxScore++;
  if (analyzeFile(`${SERVICE_PATH}/Dockerfile.simple`, 'Simple Dockerfile', [
    { name: 'Node base image', regex: 'FROM node' },
    { name: 'Port exposure', regex: 'EXPOSE.*3001|PORT.*3001' },
    { name: 'Working directory', regex: 'WORKDIR' },
    { name: 'Dependency installation', regex: 'npm install' },
    { name: 'Build command', regex: 'npm run build' },
  ])) {
    score++;
  }
  
  // 9. Environment Variables Check
  log('\n🌍 Environment Variables:', COLORS.YELLOW);
  maxScore++;
  if (analyzeFile(`${SERVICE_PATH}/src/index.ts`, 'Environment config', [
    { name: 'MongoDB URI', regex: 'MONGO_URI|MONGODB_URL' },
    { name: 'Redis configuration', regex: 'REDIS_URL|REDIS_HOST' },
    { name: 'JWT secret', regex: 'JWT_SECRET' },
    { name: 'Port configuration', regex: 'AUTH_SERVICE_PORT|PORT' },
  ])) {
    score++;
  }
  
  // 10. Deployment Readiness
  log('\n🚀 Deployment Files:', COLORS.YELLOW);
  const deploymentFiles = [
    ['./deployment/microservices/auth-service-deployment.yaml', 'Kubernetes deployment'],
    ['./deployment/microservices/secrets.yaml', 'Secrets configuration'],
  ];
  
  deploymentFiles.forEach(([file, desc]) => {
    maxScore++;
    if (checkFileExists(file, desc)) score++;
  });
  
  // Final Score
  log('\n' + '=' * 60, COLORS.BLUE);
  const percentage = Math.round((score / maxScore) * 100);
  const status = percentage >= 90 ? 'READY' : percentage >= 70 ? 'MOSTLY READY' : 'NEEDS WORK';
  const color = percentage >= 90 ? COLORS.GREEN : percentage >= 70 ? COLORS.YELLOW : COLORS.RED;
  
  log(`📊 Readiness Score: ${score}/${maxScore} (${percentage}%)`, color);
  log(`🎯 Status: ${status}`, color);
  
  if (percentage >= 90) {
    log('\n✅ Auth Service is READY for deployment!', COLORS.GREEN);
    log('🚀 You can proceed with Docker build and Kubernetes deployment.', COLORS.GREEN);
  } else if (percentage >= 70) {
    log('\n⚠️ Auth Service is MOSTLY READY but has some issues to address.', COLORS.YELLOW);
    log('🔧 Review the missing items above before deployment.', COLORS.YELLOW);
  } else {
    log('\n❌ Auth Service is NOT READY for deployment.', COLORS.RED);
    log('🛠️ Please fix the critical issues above before proceeding.', COLORS.RED);
  }
  
  return percentage >= 90;
}

// Run the check
runReadinessCheck().then(isReady => {
  process.exit(isReady ? 0 : 1);
}).catch(error => {
  log(`💥 Error during readiness check: ${error.message}`, COLORS.RED);
  process.exit(1);
});
