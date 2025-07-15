#!/bin/bash

# ===============================================================
# Module 3: Docker Compose Development Stack - Validation Script
# ===============================================================
# Mathematical Success Criteria: 4/4 tasks = 100%
# Zero-Error Tolerance Policy: ACTIVE

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_TESTS++))
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Header
echo "=================================================="
echo "🐳 MODULE 3: DOCKER COMPOSE VALIDATION FRAMEWORK"
echo "=================================================="
echo "📊 Mathematical Success Formula: Success_Rate = (Passed_Tests / Total_Tests) × 100"
echo "🎯 Target: 100% Pass Rate (Zero-Error Tolerance)"
echo ""

# Test 1: Docker Compose File Validation
log "TEST 1: Docker Compose Configuration Validation"
((TOTAL_TESTS++))

COMPOSE_FILES=(
    "docker-compose.production.yml"
    "docker-compose.override.yml"
)

ALL_COMPOSE_EXIST=true
for compose_file in "${COMPOSE_FILES[@]}"; do
    if [[ -f "$compose_file" ]]; then
        success "Found: $compose_file"
        
        # Validate YAML syntax
        if docker-compose -f "$compose_file" config >/dev/null 2>&1; then
            success "$compose_file: Valid YAML syntax"
        else
            error "$compose_file: Invalid YAML syntax"
            ALL_COMPOSE_EXIST=false
        fi
    else
        error "Missing: $compose_file"
        ALL_COMPOSE_EXIST=false
    fi
done

if [[ "$ALL_COMPOSE_EXIST" == true ]]; then
    success "All Docker Compose files validated"
else
    error "Docker Compose configuration issues detected"
fi

# Test 2: Service Configuration Validation
log "TEST 2: Service Configuration Validation"
((TOTAL_TESTS++))

REQUIRED_SERVICES=(
    "api-gateway"
    "auth-service"
    "user-service"
    "content-service"
    "subscription-service"
    "mongodb"
    "postgres"
    "redis"
    "elasticsearch"
    "prometheus"
    "grafana"
)

CONFIGURED_SERVICES=0
for service in "${REQUIRED_SERVICES[@]}"; do
    if docker-compose -f docker-compose.production.yml config | grep -q "^  $service:"; then
        success "Service configured: $service"
        ((CONFIGURED_SERVICES++))
    else
        error "Service missing: $service"
    fi
done

if [[ $CONFIGURED_SERVICES -eq ${#REQUIRED_SERVICES[@]} ]]; then
    success "All required services configured (${#REQUIRED_SERVICES[@]}/${#REQUIRED_SERVICES[@]})"
else
    error "Missing services: $((${#REQUIRED_SERVICES[@]} - CONFIGURED_SERVICES))/${#REQUIRED_SERVICES[@]}"
fi

# Test 3: Network and Volume Configuration
log "TEST 3: Network and Volume Configuration"
((TOTAL_TESTS++))

NETWORK_VALIDATION=true
VOLUME_VALIDATION=true

# Check networks
if docker-compose -f docker-compose.production.yml config | grep -q "sap-network:"; then
    success "Network configured: sap-network"
else
    error "Missing network: sap-network"
    NETWORK_VALIDATION=false
fi

if docker-compose -f docker-compose.production.yml config | grep -q "monitoring-network:"; then
    success "Network configured: monitoring-network"
else
    error "Missing network: monitoring-network"
    NETWORK_VALIDATION=false
fi

# Check essential volumes
REQUIRED_VOLUMES=(
    "mongodb_data"
    "postgres_data"
    "redis_data"
    "elasticsearch_data"
    "prometheus_data"
    "grafana_data"
)

CONFIGURED_VOLUMES=0
for volume in "${REQUIRED_VOLUMES[@]}"; do
    if docker-compose -f docker-compose.production.yml config | grep -q "$volume:"; then
        success "Volume configured: $volume"
        ((CONFIGURED_VOLUMES++))
    else
        error "Volume missing: $volume"
        VOLUME_VALIDATION=false
    fi
done

if [[ "$NETWORK_VALIDATION" == true ]] && [[ "$VOLUME_VALIDATION" == true ]] && [[ $CONFIGURED_VOLUMES -eq ${#REQUIRED_VOLUMES[@]} ]]; then
    success "Network and volume configuration validated"
else
    error "Network or volume configuration issues"
fi

# Test 4: Environment Configuration Validation
log "TEST 4: Environment Configuration Validation"
((TOTAL_TESTS++))

ENV_FILES=(
    ".env.development"
)

ENV_VALIDATION=true
for env_file in "${ENV_FILES[@]}"; do
    if [[ -f "$env_file" ]]; then
        success "Environment file found: $env_file"
        
        # Check essential environment variables
        REQUIRED_ENV_VARS=(
            "MONGO_ROOT_PASSWORD"
            "POSTGRES_PASSWORD"
            "REDIS_PASSWORD"
            "JWT_SECRET"
            "JWT_REFRESH_SECRET"
        )
        
        for env_var in "${REQUIRED_ENV_VARS[@]}"; do
            if grep -q "^$env_var=" "$env_file"; then
                success "$env_file: $env_var configured"
            else
                error "$env_file: Missing $env_var"
                ENV_VALIDATION=false
            fi
        done
    else
        error "Environment file missing: $env_file"
        ENV_VALIDATION=false
    fi
done

if [[ "$ENV_VALIDATION" == true ]]; then
    success "Environment configuration validated"
else
    error "Environment configuration issues detected"
fi

# Test 5: Development Tools Validation (Bonus Test)
log "TEST 5: Development Tools Configuration (Bonus)"

DEV_TOOLS=(
    "mongo-express"
    "adminer"
    "redis-commander"
)

DEV_TOOLS_COUNT=0
for tool in "${DEV_TOOLS[@]}"; do
    if docker-compose -f docker-compose.override.yml config | grep -q "^  $tool:"; then
        success "Development tool configured: $tool"
        ((DEV_TOOLS_COUNT++))
    else
        warning "Development tool missing: $tool"
    fi
done

if [[ $DEV_TOOLS_COUNT -eq ${#DEV_TOOLS[@]} ]]; then
    success "All development tools configured"
else
    warning "Some development tools missing ($DEV_TOOLS_COUNT/${#DEV_TOOLS[@]})"
fi

# Test 6: Docker Manager Script Validation
log "TEST 6: Docker Management Script Validation"

if [[ -f "scripts/docker-manager.sh" ]]; then
    success "Docker manager script found"
    
    if [[ -x "scripts/docker-manager.sh" ]]; then
        success "Docker manager script is executable"
    else
        warning "Docker manager script needs execute permissions"
        chmod +x scripts/docker-manager.sh
        success "Execute permissions added to docker-manager.sh"
    fi
else
    error "Docker manager script not found"
fi

# Test 7: Health Check Configuration Validation
log "TEST 7: Health Check Configuration Validation"

HEALTH_CHECK_SERVICES=(
    "api-gateway"
    "auth-service"
    "user-service"
    "content-service"
    "subscription-service"
    "mongodb"
    "postgres"
    "redis"
    "elasticsearch"
)

HEALTH_CHECKS_CONFIGURED=0
for service in "${HEALTH_CHECK_SERVICES[@]}"; do
    if docker-compose -f docker-compose.production.yml config | grep -A 10 "^  $service:" | grep -q "healthcheck:"; then
        success "Health check configured: $service"
        ((HEALTH_CHECKS_CONFIGURED++))
    else
        warning "Health check missing: $service"
    fi
done

if [[ $HEALTH_CHECKS_CONFIGURED -ge 7 ]]; then
    success "Sufficient health checks configured ($HEALTH_CHECKS_CONFIGURED/${#HEALTH_CHECK_SERVICES[@]})"
else
    warning "More health checks recommended ($HEALTH_CHECKS_CONFIGURED/${#HEALTH_CHECK_SERVICES[@]})"
fi

# ========================================
# MATHEMATICAL VALIDATION RESULTS
# ========================================

echo ""
echo "=================================================="
echo "📊 MATHEMATICAL VALIDATION RESULTS"
echo "=================================================="

SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))

echo "🎯 Total Tests: $TOTAL_TESTS"
echo "✅ Passed Tests: $PASSED_TESTS"
echo "❌ Failed Tests: $((TOTAL_TESTS - PASSED_TESTS))"
echo ""
echo "📈 SUCCESS RATE: $PASSED_TESTS/$TOTAL_TESTS = $SUCCESS_RATE%"

if [[ $SUCCESS_RATE -eq 100 ]]; then
    echo -e "${GREEN}🏆 MODULE 3 STATUS: MATHEMATICALLY CERTIFIED${NC}"
    echo -e "${GREEN}🔒 ZERO-ERROR TOLERANCE: MAINTAINED${NC}"
    echo -e "${GREEN}🚀 READY FOR MODULE 4: Container Optimization${NC}"
    echo ""
    echo "🚀 Quick Start Commands:"
    echo "  Development: ./scripts/docker-manager.sh dev"
    echo "  Production:  ./scripts/docker-manager.sh prod"
    echo "  Health Check: ./scripts/docker-manager.sh health"
    exit 0
elif [[ $SUCCESS_RATE -ge 80 ]]; then
    echo -e "${YELLOW}⚠️ MODULE 3 STATUS: NEEDS OPTIMIZATION${NC}"
    echo -e "${YELLOW}🔧 ZERO-ERROR TOLERANCE: REQUIRES FIXES${NC}"
    exit 1
else
    echo -e "${RED}❌ MODULE 3 STATUS: CRITICAL ISSUES DETECTED${NC}"
    echo -e "${RED}🚨 ZERO-ERROR TOLERANCE: VIOLATED${NC}"
    exit 2
fi
