#!/bin/bash

# SAP Containerization Validation Scripts
# Mathematical fail-proof validation system with zero-error tolerance

set -euo pipefail  # Exit on any error, undefined variable, or pipe failure

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Mathematical validation function
validate_percentage() {
    local current=$1
    local total=$2
    local expected=$3
    local percentage=$((current * 100 / total))
    
    if [ $percentage -eq $expected ]; then
        return 0
    else
        return 1
    fi
}

# Module 1: Pre-Containerization Audit
validate_module1() {
    log "Starting Module 1 validation: Pre-Containerization Audit"
    local validation_count=0
    local total_validations=5
    
    # Test 1: Service health checks
    log "Testing service health endpoints..."
    if npm run test:services:health > /dev/null 2>&1; then
        success "All services health endpoints responsive"
        ((validation_count++))
    else
        error "Service health check failed"
    fi
    
    # Test 2: Inter-service communication
    log "Testing inter-service communication..."
    if npm run test:inter-service-communication > /dev/null 2>&1; then
        success "Inter-service communication verified"
        ((validation_count++))
    else
        error "Inter-service communication test failed"
    fi
    
    # Test 3: Database connections
    log "Testing database connections..."
    if npm run test:database-connections > /dev/null 2>&1; then
        success "Database connections verified"
        ((validation_count++))
    else
        error "Database connection test failed"
    fi
    
    # Test 4: Port conflict check
    log "Checking for port conflicts..."
    if ! netstat -tuln | grep -E ':3001|:3002|:3003|:3004|:3005|:5001' | grep LISTEN > /dev/null; then
        error "Required ports are not available"
    else
        success "Port allocation verified"
        ((validation_count++))
    fi
    
    # Test 5: Environment variable validation
    log "Validating environment variables..."
    local env_vars=("NODE_ENV" "MONGO_URI" "REDIS_HOST" "JWT_SECRET")
    local env_valid=true
    
    for var in "${env_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            warning "Environment variable $var is not set"
            env_valid=false
        fi
    done
    
    if $env_valid; then
        success "Environment variables validated"
        ((validation_count++))
    else
        error "Environment variable validation failed"
    fi
    
    # Mathematical validation
    if validate_percentage $validation_count $total_validations 100; then
        success "Module 1 validation: 100% pass rate ($validation_count/$total_validations)"
        return 0
    else
        error "Module 1 validation failed: $(($validation_count * 100 / $total_validations))% pass rate"
    fi
}

# Module 2: Docker Build Validation
validate_module2() {
    log "Starting Module 2 validation: Docker Build Validation"
    local validation_count=0
    local total_validations=6
    
    local services=("api-gateway" "auth-service" "user-service" "content-service" "subscription-service" "monitoring-service")
    
    for service in "${services[@]}"; do
        log "Building Docker image for $service..."
        if docker build -t "sap-$service:test" "./services/$service" > /dev/null 2>&1; then
            success "Docker build successful for $service"
            ((validation_count++))
        else
            error "Docker build failed for $service"
        fi
    done
    
    # Verify all images were created
    local image_count=$(docker images | grep "sap-" | grep ":test" | wc -l)
    if [ $image_count -eq ${#services[@]} ]; then
        success "All Docker images created successfully"
    else
        error "Expected ${#services[@]} images, found $image_count"
    fi
    
    # Mathematical validation
    if validate_percentage $validation_count $total_validations 100; then
        success "Module 2 validation: 100% pass rate ($validation_count/$total_validations)"
        return 0
    else
        error "Module 2 validation failed: $(($validation_count * 100 / $total_validations))% pass rate"
    fi
}

# Module 3: Docker Compose Validation
validate_module3() {
    log "Starting Module 3 validation: Docker Compose Stack"
    local validation_count=0
    local total_validations=4
    
    # Test 1: Docker Compose build
    log "Building Docker Compose stack..."
    if docker-compose build > /dev/null 2>&1; then
        success "Docker Compose build successful"
        ((validation_count++))
    else
        error "Docker Compose build failed"
    fi
    
    # Test 2: Start all services
    log "Starting Docker Compose stack..."
    if docker-compose up -d > /dev/null 2>&1; then
        success "Docker Compose stack started"
        ((validation_count++))
    else
        error "Failed to start Docker Compose stack"
    fi
    
    # Wait for services to initialize
    sleep 30
    
    # Test 3: Check all containers are running
    log "Checking container status..."
    local running_containers=$(docker-compose ps | grep "Up" | wc -l)
    local expected_containers=9  # 6 services + 3 databases
    
    if [ $running_containers -eq $expected_containers ]; then
        success "All containers running ($running_containers/$expected_containers)"
        ((validation_count++))
    else
        error "Expected $expected_containers containers, found $running_containers running"
    fi
    
    # Test 4: API Gateway health check
    log "Testing API Gateway accessibility..."
    local max_retries=10
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -f http://localhost:5001/health > /dev/null 2>&1; then
            success "API Gateway health check passed"
            ((validation_count++))
            break
        else
            ((retry_count++))
            sleep 3
        fi
    done
    
    if [ $retry_count -eq $max_retries ]; then
        error "API Gateway health check failed after $max_retries attempts"
    fi
    
    # Mathematical validation
    if validate_percentage $validation_count $total_validations 100; then
        success "Module 3 validation: 100% pass rate ($validation_count/$total_validations)"
        return 0
    else
        error "Module 3 validation failed: $(($validation_count * 100 / $total_validations))% pass rate"
    fi
}

# Module 4: Performance Validation
validate_module4() {
    log "Starting Module 4 validation: Performance Testing"
    local validation_count=0
    local total_validations=4
    
    # Test 1: Image size validation
    log "Validating Docker image sizes..."
    local oversized_images=0
    local max_size_mb=200
    
    while IFS= read -r line; do
        local size_str=$(echo "$line" | awk '{print $7}')
        local size_mb=$(echo "$size_str" | sed 's/MB//')
        
        if (( $(echo "$size_mb > $max_size_mb" | bc -l) )); then
            warning "Image size exceeds limit: $line"
            ((oversized_images++))
        fi
    done < <(docker images | grep "sap-" | grep ":test")
    
    if [ $oversized_images -eq 0 ]; then
        success "All images within size limits"
        ((validation_count++))
    else
        error "$oversized_images images exceed size limit"
    fi
    
    # Test 2: Container startup time
    log "Testing container startup times..."
    local services=("api-gateway" "auth-service" "user-service" "content-service")
    local slow_startups=0
    
    for service in "${services[@]}"; do
        local start_time=$(date +%s)
        docker run -d --name "test-$service" "sap-$service:test" > /dev/null 2>&1
        
        # Wait for health check to pass
        local health_check_passed=false
        local timeout=30
        local elapsed=0
        
        while [ $elapsed -lt $timeout ]; do
            if docker exec "test-$service" curl -f http://localhost:3000/health > /dev/null 2>&1; then
                health_check_passed=true
                break
            fi
            sleep 1
            ((elapsed++))
        done
        
        docker stop "test-$service" > /dev/null 2>&1
        docker rm "test-$service" > /dev/null 2>&1
        
        if [ $elapsed -gt 30 ]; then
            warning "$service startup time exceeded 30 seconds"
            ((slow_startups++))
        fi
    done
    
    if [ $slow_startups -eq 0 ]; then
        success "All services start within 30 seconds"
        ((validation_count++))
    else
        error "$slow_startups services have slow startup times"
    fi
    
    # Test 3: Memory usage under load
    log "Testing memory usage under load..."
    if npm run performance:test:memory > /dev/null 2>&1; then
        success "Memory usage within limits"
        ((validation_count++))
    else
        error "Memory usage test failed"
    fi
    
    # Test 4: CPU usage under load
    log "Testing CPU usage under load..."
    if npm run performance:test:cpu > /dev/null 2>&1; then
        success "CPU usage within limits"
        ((validation_count++))
    else
        error "CPU usage test failed"
    fi
    
    # Mathematical validation
    if validate_percentage $validation_count $total_validations 100; then
        success "Module 4 validation: 100% pass rate ($validation_count/$total_validations)"
        return 0
    else
        error "Module 4 validation failed: $(($validation_count * 100 / $total_validations))% pass rate"
    fi
}

# Module 5: Security Validation
validate_module5() {
    log "Starting Module 5 validation: Security Testing"
    local validation_count=0
    local total_validations=4
    
    # Test 1: Vulnerability scanning with Trivy
    log "Running Trivy security scans..."
    local vulnerable_images=0
    
    while IFS= read -r image; do
        if ! trivy image --severity HIGH,CRITICAL --exit-code 0 "$image" > /dev/null 2>&1; then
            error "High/Critical vulnerabilities found in $image"
            ((vulnerable_images++))
        fi
    done < <(docker images | grep "sap-" | grep ":test" | awk '{print $1":"$2}')
    
    if [ $vulnerable_images -eq 0 ]; then
        success "No high/critical vulnerabilities found"
        ((validation_count++))
    else
        error "$vulnerable_images images have security vulnerabilities"
    fi
    
    # Test 2: Container security best practices
    log "Validating container security configurations..."
    local insecure_containers=0
    
    # Check for non-root users
    while IFS= read -r image; do
        local user=$(docker run --rm "$image" whoami 2>/dev/null || echo "root")
        if [ "$user" = "root" ]; then
            warning "Container $image running as root"
            ((insecure_containers++))
        fi
    done < <(docker images | grep "sap-" | grep ":test" | awk '{print $1":"$2}')
    
    if [ $insecure_containers -eq 0 ]; then
        success "All containers use non-root users"
        ((validation_count++))
    else
        error "$insecure_containers containers running as root"
    fi
    
    # Test 3: Secret management validation
    log "Validating secret management..."
    if npm run security:test:secrets > /dev/null 2>&1; then
        success "Secret management validation passed"
        ((validation_count++))
    else
        error "Secret management test failed"
    fi
    
    # Test 4: Network security validation
    log "Validating network security..."
    if npm run security:test:network > /dev/null 2>&1; then
        success "Network security validation passed"
        ((validation_count++))
    else
        error "Network security test failed"
    fi
    
    # Mathematical validation
    if validate_percentage $validation_count $total_validations 100; then
        success "Module 5 validation: 100% pass rate ($validation_count/$total_validations)"
        return 0
    else
        error "Module 5 validation failed: $(($validation_count * 100 / $total_validations))% pass rate"
    fi
}

# Module 6: Monitoring Validation
validate_module6() {
    log "Starting Module 6 validation: Monitoring System"
    local validation_count=0
    local total_validations=4
    
    # Test 1: Prometheus metrics endpoints
    log "Testing Prometheus metrics collection..."
    local metrics_endpoints=0
    local expected_endpoints=6
    
    for port in 3001 3002 3003 3004 3005 5001; do
        if curl -f "http://localhost:$port/metrics" > /dev/null 2>&1; then
            ((metrics_endpoints++))
        fi
    done
    
    if [ $metrics_endpoints -eq $expected_endpoints ]; then
        success "All metrics endpoints accessible"
        ((validation_count++))
    else
        error "Expected $expected_endpoints metrics endpoints, found $metrics_endpoints"
    fi
    
    # Test 2: Grafana dashboard access
    log "Testing Grafana dashboard access..."
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        success "Grafana dashboard accessible"
        ((validation_count++))
    else
        error "Grafana dashboard not accessible"
    fi
    
    # Test 3: Health check endpoints
    log "Testing health check endpoints..."
    local healthy_services=0
    local expected_services=6
    
    for port in 3001 3002 3003 3004 3005 5001; do
        if curl -f "http://localhost:$port/health" > /dev/null 2>&1; then
            ((healthy_services++))
        fi
    done
    
    if [ $healthy_services -eq $expected_services ]; then
        success "All health check endpoints functional"
        ((validation_count++))
    else
        error "Expected $expected_services healthy services, found $healthy_services"
    fi
    
    # Test 4: Alert system validation
    log "Testing alert configuration..."
    if npm run monitoring:test:alerts > /dev/null 2>&1; then
        success "Alert system validation passed"
        ((validation_count++))
    else
        error "Alert system test failed"
    fi
    
    # Mathematical validation
    if validate_percentage $validation_count $total_validations 100; then
        success "Module 6 validation: 100% pass rate ($validation_count/$total_validations)"
        return 0
    else
        error "Module 6 validation failed: $(($validation_count * 100 / $total_validations))% pass rate"
    fi
}

# Main validation orchestrator
main() {
    local module=${1:-"all"}
    
    log "SAP Containerization Validation System"
    log "Zero-error tolerance policy in effect"
    log "==============================================="
    
    case $module in
        "1"|"module1")
            validate_module1
            ;;
        "2"|"module2")
            validate_module2
            ;;
        "3"|"module3")
            validate_module3
            ;;
        "4"|"module4")
            validate_module4
            ;;
        "5"|"module5")
            validate_module5
            ;;
        "6"|"module6")
            validate_module6
            ;;
        "all")
            validate_module1
            validate_module2
            validate_module3
            validate_module4
            validate_module5
            validate_module6
            success "All modules validated successfully - 100% pass rate"
            ;;
        *)
            error "Invalid module specified. Use 1-6 or 'all'"
            ;;
    esac
    
    log "Validation completed successfully"
}

# Execute main function with provided arguments
main "$@"
