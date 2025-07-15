#!/bin/bash

# ===============================================================
# Module 2: Multi-Stage Dockerfile Creation - Validation Script
# ===============================================================
# Mathematical Success Criteria: 8/8 tasks = 100%
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
echo "🐳 MODULE 2: DOCKERFILE VALIDATION FRAMEWORK"
echo "=================================================="
echo "📊 Mathematical Success Formula: Success_Rate = (Passed_Tests / Total_Tests) × 100"
echo "🎯 Target: 100% Pass Rate (Zero-Error Tolerance)"
echo ""

# Test 1: Dockerfile Existence
log "TEST 1: Dockerfile Existence Validation"
((TOTAL_TESTS++))

DOCKERFILES=(
    "api-gateway/Dockerfile"
    "services/auth-service/Dockerfile"
    "services/user-service/Dockerfile" 
    "services/content-service/Dockerfile"
    "services/subscription-management-service/Dockerfile"
)

ALL_DOCKERFILES_EXIST=true
for dockerfile in "${DOCKERFILES[@]}"; do
    if [[ -f "$dockerfile" ]]; then
        success "Found: $dockerfile"
    else
        error "Missing: $dockerfile"
        ALL_DOCKERFILES_EXIST=false
    fi
done

if [[ "$ALL_DOCKERFILES_EXIST" == true ]]; then
    success "All 5 Dockerfiles created successfully"
else
    error "Some Dockerfiles are missing"
fi

# Test 2: Multi-Stage Build Validation
log "TEST 2: Multi-Stage Build Structure Validation"
((TOTAL_TESTS++))

MULTI_STAGE_COUNT=0
for dockerfile in "${DOCKERFILES[@]}"; do
    if [[ -f "$dockerfile" ]]; then
        STAGES=$(grep -c "^FROM.*AS" "$dockerfile" || echo "0")
        if [[ $STAGES -ge 3 ]]; then
            success "$dockerfile: $STAGES stages (Multi-stage ✅)"
            ((MULTI_STAGE_COUNT++))
        else
            error "$dockerfile: Only $STAGES stages (Expected ≥3)"
        fi
    fi
done

if [[ $MULTI_STAGE_COUNT -eq 5 ]]; then
    success "All Dockerfiles use multi-stage builds"
else
    error "Not all Dockerfiles use multi-stage builds"
fi

# Test 3: Security Hardening Validation
log "TEST 3: Security Hardening Validation"
((TOTAL_TESTS++))

SECURITY_FEATURES=(
    "USER.*[^root]"
    "RUN.*adduser"
    "dumb-init"
    "HEALTHCHECK"
)

SECURE_DOCKERFILES=0
for dockerfile in "${DOCKERFILES[@]}"; do
    if [[ -f "$dockerfile" ]]; then
        SECURITY_SCORE=0
        for feature in "${SECURITY_FEATURES[@]}"; do
            if grep -q "$feature" "$dockerfile"; then
                ((SECURITY_SCORE++))
            fi
        done
        
        if [[ $SECURITY_SCORE -eq 4 ]]; then
            success "$dockerfile: All security features present"
            ((SECURE_DOCKERFILES++))
        else
            error "$dockerfile: Missing security features ($SECURITY_SCORE/4)"
        fi
    fi
done

if [[ $SECURE_DOCKERFILES -eq 5 ]]; then
    success "All Dockerfiles implement security hardening"
else
    error "Some Dockerfiles lack security hardening"
fi

# Test 4: Performance Optimization Validation
log "TEST 4: Performance Optimization Validation"
((TOTAL_TESTS++))

PERFORMANCE_FEATURES=(
    "NODE_OPTIONS.*max-old-space-size"
    "npm.*cache.*clean"
    "apk.*rm.*cache"
    "NODE_ENV=production"
)

OPTIMIZED_DOCKERFILES=0
for dockerfile in "${DOCKERFILES[@]}"; do
    if [[ -f "$dockerfile" ]]; then
        PERF_SCORE=0
        for feature in "${PERFORMANCE_FEATURES[@]}"; do
            if grep -q "$feature" "$dockerfile"; then
                ((PERF_SCORE++))
            fi
        done
        
        if [[ $PERF_SCORE -ge 3 ]]; then
            success "$dockerfile: Performance optimized ($PERF_SCORE/4)"
            ((OPTIMIZED_DOCKERFILES++))
        else
            error "$dockerfile: Performance optimizations missing ($PERF_SCORE/4)"
        fi
    fi
done

if [[ $OPTIMIZED_DOCKERFILES -eq 5 ]]; then
    success "All Dockerfiles are performance optimized"
else
    error "Some Dockerfiles lack performance optimizations"
fi

# Test 5: .dockerignore Validation
log "TEST 5: Docker Ignore Configuration"
((TOTAL_TESTS++))

if [[ -f ".dockerignore" ]]; then
    IGNORE_RULES=(
        "node_modules"
        "\.env"
        "dist/"
        "logs/"
        "test/"
    )
    
    IGNORE_SCORE=0
    for rule in "${IGNORE_RULES[@]}"; do
        if grep -q "$rule" ".dockerignore"; then
            ((IGNORE_SCORE++))
        fi
    done
    
    if [[ $IGNORE_SCORE -eq 5 ]]; then
        success ".dockerignore: All essential rules present"
    else
        error ".dockerignore: Missing rules ($IGNORE_SCORE/5)"
    fi
else
    error ".dockerignore file not found"
fi

# Test 6: Image Size Targets
log "TEST 6: Image Size Target Validation (Simulated)"
((TOTAL_TESTS++))

# Simulate image size validation based on Dockerfile content
LIGHTWEIGHT_IMAGES=0
for dockerfile in "${DOCKERFILES[@]}"; do
    if [[ -f "$dockerfile" ]]; then
        # Check for size optimization indicators
        if grep -q "alpine" "$dockerfile" && grep -q "npm.*omit=dev" "$dockerfile"; then
            success "$dockerfile: Optimized for small image size"
            ((LIGHTWEIGHT_IMAGES++))
        else
            warning "$dockerfile: May not be optimized for size"
        fi
    fi
done

if [[ $LIGHTWEIGHT_IMAGES -eq 5 ]]; then
    success "All Dockerfiles optimized for minimal size"
else
    warning "Some Dockerfiles may produce larger images"
fi

# Test 7: Health Check Configuration
log "TEST 7: Health Check Implementation"
((TOTAL_TESTS++))

HEALTH_CHECK_COUNT=0
for dockerfile in "${DOCKERFILES[@]}"; do
    if [[ -f "$dockerfile" ]]; then
        if grep -q "HEALTHCHECK" "$dockerfile"; then
            success "$dockerfile: Health check configured"
            ((HEALTH_CHECK_COUNT++))
        else
            error "$dockerfile: No health check found"
        fi
    fi
done

if [[ $HEALTH_CHECK_COUNT -eq 5 ]]; then
    success "All services have health checks configured"
else
    error "Missing health checks in some services"
fi

# Test 8: Label Metadata
log "TEST 8: Container Metadata Validation"
((TOTAL_TESTS++))

LABELED_IMAGES=0
for dockerfile in "${DOCKERFILES[@]}"; do
    if [[ -f "$dockerfile" ]]; then
        if grep -q "LABEL.*maintainer" "$dockerfile" && grep -q "LABEL.*version" "$dockerfile"; then
            success "$dockerfile: Proper metadata labels"
            ((LABELED_IMAGES++))
        else
            error "$dockerfile: Missing metadata labels"
        fi
    fi
done

if [[ $LABELED_IMAGES -eq 5 ]]; then
    success "All Dockerfiles have proper metadata"
else
    error "Some Dockerfiles lack metadata"
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
    echo -e "${GREEN}🏆 MODULE 2 STATUS: MATHEMATICALLY CERTIFIED${NC}"
    echo -e "${GREEN}🔒 ZERO-ERROR TOLERANCE: MAINTAINED${NC}"
    echo -e "${GREEN}🚀 READY FOR MODULE 3: Docker Compose Orchestration${NC}"
    exit 0
elif [[ $SUCCESS_RATE -ge 80 ]]; then
    echo -e "${YELLOW}⚠️ MODULE 2 STATUS: NEEDS OPTIMIZATION${NC}"
    echo -e "${YELLOW}🔧 ZERO-ERROR TOLERANCE: REQUIRES FIXES${NC}"
    exit 1
else
    echo -e "${RED}❌ MODULE 2 STATUS: CRITICAL ISSUES DETECTED${NC}"
    echo -e "${RED}🚨 ZERO-ERROR TOLERANCE: VIOLATED${NC}"
    exit 2
fi
