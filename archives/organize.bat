@echo off
echo Starting project organization...
cd /d "d:\31-rbac-implementation\SAP_BACKEND_LATEST"

echo.
echo Moving Docker files to infrastructure\docker\...
if exist "docker-compose.yml" move "docker-compose.yml" "infrastructure\docker\" >nul 2>&1 && echo Moved docker-compose.yml
if exist "docker-compose.production.yml" move "docker-compose.production.yml" "infrastructure\docker\" >nul 2>&1 && echo Moved docker-compose.production.yml
if exist "docker-compose.monitoring.yml" move "docker-compose.monitoring.yml" "infrastructure\docker\" >nul 2>&1 && echo Moved docker-compose.monitoring.yml
if exist "docker-compose.optimized.yml" move "docker-compose.optimized.yml" "infrastructure\docker\" >nul 2>&1 && echo Moved docker-compose.optimized.yml
if exist "docker-compose.override.yml" move "docker-compose.override.yml" "infrastructure\docker\" >nul 2>&1 && echo Moved docker-compose.override.yml
if exist "docker-compose.secure.yml" move "docker-compose.secure.yml" "infrastructure\docker\" >nul 2>&1 && echo Moved docker-compose.secure.yml
if exist "Dockerfile" move "Dockerfile" "infrastructure\docker\" >nul 2>&1 && echo Moved Dockerfile
if exist "Dockerfile.health-monitor" move "Dockerfile.health-monitor" "infrastructure\docker\" >nul 2>&1 && echo Moved Dockerfile.health-monitor

echo.
echo Moving implementation scripts to tools\scripts\...
if exist "implement-security.js" move "implement-security.js" "tools\scripts\" >nul 2>&1 && echo Moved implement-security.js
if exist "implement-monitoring.js" move "implement-monitoring.js" "tools\scripts\" >nul 2>&1 && echo Moved implement-monitoring.js
if exist "implement-kubernetes-orchestration.js" move "implement-kubernetes-orchestration.js" "tools\scripts\" >nul 2>&1 && echo Moved implement-kubernetes-orchestration.js
if exist "implement-health-monitoring.js" move "implement-health-monitoring.js" "tools\scripts\" >nul 2>&1 && echo Moved implement-health-monitoring.js
if exist "implement-ha-disaster-recovery.js" move "implement-ha-disaster-recovery.js" "tools\scripts\" >nul 2>&1 && echo Moved implement-ha-disaster-recovery.js
if exist "implement-cicd-gitops.js" move "implement-cicd-gitops.js" "tools\scripts\" >nul 2>&1 && echo Moved implement-cicd-gitops.js
if exist "implement-autoscaling-management.js" move "implement-autoscaling-management.js" "tools\scripts\" >nul 2>&1 && echo Moved implement-autoscaling-management.js

echo.
echo Moving utility scripts to tools\scripts\...
if exist "start-all-services.js" move "start-all-services.js" "tools\scripts\" >nul 2>&1 && echo Moved start-all-services.js
if exist "start-services.js" move "start-services.js" "tools\scripts\" >nul 2>&1 && echo Moved start-services.js
if exist "organize-project.js" move "organize-project.js" "tools\scripts\" >nul 2>&1 && echo Moved organize-project.js
if exist "phase2-progress-tracker.js" move "phase2-progress-tracker.js" "tools\scripts\" >nul 2>&1 && echo Moved phase2-progress-tracker.js
if exist "phase2-dashboard.html" move "phase2-dashboard.html" "tools\scripts\" >nul 2>&1 && echo Moved phase2-dashboard.html

echo.
echo Moving health monitor to tools\health-monitoring\...
if exist "health-monitor.js" move "health-monitor.js" "tools\health-monitoring\" >nul 2>&1 && echo Moved health-monitor.js

echo.
echo Moving Phase 1 reports to docs\reports\phase1\...
if exist "MODULE1_AUDIT_REPORT.md" move "MODULE1_AUDIT_REPORT.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved MODULE1_AUDIT_REPORT.md
if exist "MODULE2_DOCKERFILE_REPORT.md" move "MODULE2_DOCKERFILE_REPORT.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved MODULE2_DOCKERFILE_REPORT.md
if exist "MODULE3_COMPOSE_REPORT.md" move "MODULE3_COMPOSE_REPORT.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved MODULE3_COMPOSE_REPORT.md
if exist "MODULE4_OPTIMIZATION_PLAN.md" move "MODULE4_OPTIMIZATION_PLAN.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved MODULE4_OPTIMIZATION_PLAN.md
if exist "MODULE4_OPTIMIZATION_REPORT.md" move "MODULE4_OPTIMIZATION_REPORT.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved MODULE4_OPTIMIZATION_REPORT.md
if exist "MODULE5_SECURITY_PLAN.md" move "MODULE5_SECURITY_PLAN.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved MODULE5_SECURITY_PLAN.md
if exist "MODULE5_SECURITY_REPORT.md" move "MODULE5_SECURITY_REPORT.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved MODULE5_SECURITY_REPORT.md
if exist "MODULE6_HEALTH_MONITORING_PLAN.md" move "MODULE6_HEALTH_MONITORING_PLAN.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved MODULE6_HEALTH_MONITORING_PLAN.md
if exist "MODULE6_HEALTH_MONITORING_REPORT.md" move "MODULE6_HEALTH_MONITORING_REPORT.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved MODULE6_HEALTH_MONITORING_REPORT.md
if exist "CONTAINERIZATION_PLAN_PHASE1.md" move "CONTAINERIZATION_PLAN_PHASE1.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved CONTAINERIZATION_PLAN_PHASE1.md
if exist "CONTAINERIZATION_PLAN_PHASE2.md" move "CONTAINERIZATION_PLAN_PHASE2.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved CONTAINERIZATION_PLAN_PHASE2.md
if exist "CONTAINERIZATION_STATUS.md" move "CONTAINERIZATION_STATUS.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved CONTAINERIZATION_STATUS.md
if exist "PROGRESS_TRACKER_PHASE1.md" move "PROGRESS_TRACKER_PHASE1.md" "docs\reports\phase1\" >nul 2>&1 && echo Moved PROGRESS_TRACKER_PHASE1.md

echo.
echo Moving Phase 2 reports to docs\reports\phase2\...
if exist "MODULE7_KUBERNETES_IMPLEMENTATION_REPORT.md" move "MODULE7_KUBERNETES_IMPLEMENTATION_REPORT.md" "docs\reports\phase2\" >nul 2>&1 && echo Moved MODULE7_KUBERNETES_IMPLEMENTATION_REPORT.md
if exist "MODULE7_KUBERNETES_PLAN.md" move "MODULE7_KUBERNETES_PLAN.md" "docs\reports\phase2\" >nul 2>&1 && echo Moved MODULE7_KUBERNETES_PLAN.md
if exist "MODULE8_AUTOSCALING_IMPLEMENTATION_REPORT.md" move "MODULE8_AUTOSCALING_IMPLEMENTATION_REPORT.md" "docs\reports\phase2\" >nul 2>&1 && echo Moved MODULE8_AUTOSCALING_IMPLEMENTATION_REPORT.md
if exist "MODULE9_HA_DISASTER_RECOVERY_REPORT.md" move "MODULE9_HA_DISASTER_RECOVERY_REPORT.md" "docs\reports\phase2\" >nul 2>&1 && echo Moved MODULE9_HA_DISASTER_RECOVERY_REPORT.md
if exist "Module-11-Monitoring-Report.md" move "Module-11-Monitoring-Report.md" "docs\reports\phase2\" >nul 2>&1 && echo Moved Module-11-Monitoring-Report.md
if exist "PHASE2_COMPLETION_REPORT.md" move "PHASE2_COMPLETION_REPORT.md" "docs\reports\phase2\" >nul 2>&1 && echo Moved PHASE2_COMPLETION_REPORT.md
if exist "PHASE2_PLAN_REVIEW_REPORT.md" move "PHASE2_PLAN_REVIEW_REPORT.md" "docs\reports\phase2\" >nul 2>&1 && echo Moved PHASE2_PLAN_REVIEW_REPORT.md
if exist "PHASE2_PROGRESS_TRACKER.md" move "PHASE2_PROGRESS_TRACKER.md" "docs\reports\phase2\" >nul 2>&1 && echo Moved PHASE2_PROGRESS_TRACKER.md

echo.
echo Moving main reports to docs\reports\...
if exist "PRODUCTION_READINESS_ASSESSMENT.md" move "PRODUCTION_READINESS_ASSESSMENT.md" "docs\reports\" >nul 2>&1 && echo Moved PRODUCTION_READINESS_ASSESSMENT.md

echo.
echo Moving deployment guide to docs\deployment\...
if exist "GCP_DEPLOYMENT_GUIDE.md" move "GCP_DEPLOYMENT_GUIDE.md" "docs\deployment\" >nul 2>&1 && echo Moved GCP_DEPLOYMENT_GUIDE.md

echo.
echo Moving config files to infrastructure\kubernetes\...
if exist "kind-config.yaml" move "kind-config.yaml" "infrastructure\kubernetes\" >nul 2>&1 && echo Moved kind-config.yaml

echo.
echo Moving archive files...
if exist "package-lock.json" move "package-lock.json" "archives\" >nul 2>&1 && echo Moved package-lock.json

echo.
echo Organization complete!
echo.
echo Checking remaining files in root directory...
dir /b *.js *.yml *.md 2>nul
echo.
echo Done!
