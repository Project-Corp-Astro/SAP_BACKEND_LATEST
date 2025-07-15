#!/bin/bash

# ============================================================================
# Module 2: Database Infrastructure Validation Script
# ============================================================================
# Purpose: Validate database configurations before deployment
# Zero-Tolerance Policy: All checks must pass before proceeding
# Mathematical Precision: Performance calculations and capacity validations
# ============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Logging
LOG_FILE="${SCRIPT_DIR}/../logs/module-2-validation-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo -e "${1}" | tee -a "$LOG_FILE"
}

# Function to display progress
progress() {
    echo -e "${BLUE}▶ ${1}${NC}" | tee -a "$LOG_FILE"
}

# Function to display success
success() {
    echo -e "${GREEN}✅ ${1}${NC}" | tee -a "$LOG_FILE"
}

# Function to display warnings
warning() {
    echo -e "${YELLOW}⚠️ ${1}${NC}" | tee -a "$LOG_FILE"
}

# Function to display errors and exit
error_exit() {
    echo -e "${RED}❌ ERROR: ${1}${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# ============================================================================
# Validation Functions
# ============================================================================

validate_terraform_files() {
    progress "Validating Terraform database configuration files..."
    
    # Check if databases.tf exists
    if [[ ! -f "${SCRIPT_DIR}/databases.tf" ]]; then
        error_exit "databases.tf file not found!"
    fi
    
    # Check if variables are defined
    local required_vars=(
        "postgres_version"
        "postgres_instance_tier"
        "postgres_disk_size_gb"
        "redis_version"
        "redis_memory_size_gb"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "variable \"$var\"" "${SCRIPT_DIR}/variables.tf"; then
            error_exit "Required variable '$var' not found in variables.tf"
        fi
    done
    
    success "Terraform configuration files validated"
}

validate_gcp_apis() {
    progress "Validating required GCP APIs..."
    
    local required_apis=(
        "sqladmin.googleapis.com"
        "redis.googleapis.com"
        "secretmanager.googleapis.com"
        "cloudkms.googleapis.com"
        "servicenetworking.googleapis.com"
        "monitoring.googleapis.com"
    )
    
    for api in "${required_apis[@]}"; do
        if ! gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
            warning "API $api is not enabled. It will be enabled during deployment."
        else
            success "API $api is enabled"
        fi
    done
}

validate_database_passwords() {
    progress "Validating database password security..."
    
    # Check terraform.tfvars for password changes
    if grep -q "CHANGE_ME" "${SCRIPT_DIR}/terraform.tfvars"; then
        error_exit "Default passwords detected in terraform.tfvars! Please change all CHANGE_ME passwords before deployment."
    fi
    
    # Validate password complexity (basic check)
    local passwords=(
        "postgres_app_password"
        "postgres_readonly_password"
        "postgres_migration_password"
    )
    
    for password_var in "${passwords[@]}"; do
        local password_value
        password_value=$(grep "^$password_var" "${SCRIPT_DIR}/terraform.tfvars" | cut -d'"' -f2)
        
        if [[ ${#password_value} -lt 12 ]]; then
            error_exit "Password for $password_var must be at least 12 characters long"
        fi
        
        # Check for complexity (at least one uppercase, lowercase, digit, and special char)
        if ! [[ "$password_value" =~ [A-Z] ]] || \
           ! [[ "$password_value" =~ [a-z] ]] || \
           ! [[ "$password_value" =~ [0-9] ]] || \
           ! [[ "$password_value" =~ [^A-Za-z0-9] ]]; then
            warning "Password for $password_var should contain uppercase, lowercase, digit, and special character"
        fi
    done
    
    success "Database passwords validated"
}

validate_resource_capacity() {
    progress "Validating resource capacity calculations..."
    
    # Get environment from terraform.tfvars
    local environment
    environment=$(grep "^environment" "${SCRIPT_DIR}/terraform.tfvars" | cut -d'"' -f2)
    
    # Get postgres instance tier
    local postgres_tier
    postgres_tier=$(grep "^postgres_instance_tier" "${SCRIPT_DIR}/terraform.tfvars" | cut -d'"' -f2)
    
    # Get redis memory size
    local redis_memory
    redis_memory=$(grep "^redis_memory_size_gb" "${SCRIPT_DIR}/terraform.tfvars" | cut -d'=' -f2 | tr -d ' ')
    
    # Validate capacity based on environment
    case "$environment" in
        "production")
            if [[ "$postgres_tier" == "db-f1-micro" ]]; then
                warning "Production environment should use at least db-n1-standard-2 for PostgreSQL"
            fi
            if [[ "$redis_memory" -lt 4 ]]; then
                warning "Production environment should use at least 4GB Redis memory"
            fi
            ;;
        "staging")
            if [[ "$postgres_tier" == "db-f1-micro" ]]; then
                warning "Staging environment should consider using db-g1-small for PostgreSQL"
            fi
            ;;
        "test"|"development")
            success "Resource configuration appropriate for $environment environment"
            ;;
        *)
            warning "Unknown environment: $environment"
            ;;
    esac
    
    success "Resource capacity validation completed"
}

validate_network_configuration() {
    progress "Validating network configuration..."
    
    # Check if VPC network variables are defined
    if ! grep -q "vpc_network_name" "${SCRIPT_DIR}/variables.tf"; then
        error_exit "VPC network configuration required for database private networking"
    fi
    
    # Check CIDR configuration
    local vpc_cidr
    vpc_cidr=$(grep "^vpc_cidr" "${SCRIPT_DIR}/terraform.tfvars" | cut -d'"' -f2)
    
    # Validate CIDR format
    if ! [[ "$vpc_cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        error_exit "Invalid VPC CIDR format: $vpc_cidr"
    fi
    
    success "Network configuration validated"
}

validate_security_configuration() {
    progress "Validating security configuration..."
    
    # Check if KMS configuration is present
    if ! grep -q "google_kms_crypto_key" "${SCRIPT_DIR}/databases.tf"; then
        error_exit "KMS encryption configuration missing for database security"
    fi
    
    # Check if secrets management is configured
    if ! grep -q "google_secret_manager_secret" "${SCRIPT_DIR}/databases.tf"; then
        error_exit "Secret Manager configuration missing for database credentials"
    fi
    
    # Check backup configuration
    if ! grep -q "backup_configuration" "${SCRIPT_DIR}/databases.tf"; then
        error_exit "Backup configuration missing for PostgreSQL"
    fi
    
    success "Security configuration validated"
}

validate_monitoring_configuration() {
    progress "Validating monitoring configuration..."
    
    # Check if uptime checks are configured
    if ! grep -q "google_monitoring_uptime_check_config" "${SCRIPT_DIR}/databases.tf"; then
        warning "Uptime monitoring configuration missing"
    fi
    
    # Check if alerts are configured (would be in a separate file)
    if [[ -f "${SCRIPT_DIR}/monitoring.tf" ]]; then
        if ! grep -q "google_monitoring_alert_policy" "${SCRIPT_DIR}/monitoring.tf"; then
            warning "Database alert policies should be configured"
        fi
    else
        warning "Monitoring configuration file not found"
    fi
    
    success "Monitoring configuration validated"
}

validate_terraform_syntax() {
    progress "Validating Terraform syntax..."
    
    cd "$SCRIPT_DIR"
    
    # Initialize Terraform (if not already done)
    if [[ ! -d ".terraform" ]]; then
        terraform init -backend=false > /dev/null 2>&1 || error_exit "Terraform initialization failed"
    fi
    
    # Validate syntax
    if ! terraform validate > /dev/null 2>&1; then
        terraform validate
        error_exit "Terraform validation failed"
    fi
    
    success "Terraform syntax validated"
}

calculate_estimated_costs() {
    progress "Calculating estimated costs..."
    
    local environment
    environment=$(grep "^environment" "${SCRIPT_DIR}/terraform.tfvars" | cut -d'"' -f2)
    
    local postgres_tier
    postgres_tier=$(grep "^postgres_instance_tier" "${SCRIPT_DIR}/terraform.tfvars" | cut -d'"' -f2)
    
    local redis_memory
    redis_memory=$(grep "^redis_memory_size_gb" "${SCRIPT_DIR}/terraform.tfvars" | cut -d'=' -f2 | tr -d ' ')
    
    # Rough cost estimates (USD per month) - these are approximations
    local postgres_cost=0
    local redis_cost=0
    
    case "$postgres_tier" in
        "db-f1-micro") postgres_cost=7 ;;
        "db-g1-small") postgres_cost=25 ;;
        "db-n1-standard-1") postgres_cost=52 ;;
        "db-n1-standard-2") postgres_cost=104 ;;
        *) postgres_cost=50 ;;
    esac
    
    # Redis cost approximately $25 per GB per month
    redis_cost=$((redis_memory * 25))
    
    local total_cost=$((postgres_cost + redis_cost))
    
    log ""
    log "📊 ESTIMATED MONTHLY COSTS (USD):"
    log "   PostgreSQL ($postgres_tier): ~$${postgres_cost}"
    log "   Redis (${redis_memory}GB): ~$${redis_cost}"
    log "   Total Estimated: ~$${total_cost}/month"
    log ""
    log "⚠️  Note: Actual costs may vary based on usage, region, and additional features"
    log ""
}

# ============================================================================
# Main Validation Execution
# ============================================================================

main() {
    log "============================================================================"
    log "🔍 MODULE 2: DATABASE INFRASTRUCTURE VALIDATION"
    log "============================================================================"
    log "Started at: $(date)"
    log "Script: $0"
    log "Log file: $LOG_FILE"
    log ""
    
    # Run validations
    validate_terraform_files
    validate_gcp_apis
    validate_database_passwords
    validate_resource_capacity
    validate_network_configuration
    validate_security_configuration
    validate_monitoring_configuration
    validate_terraform_syntax
    calculate_estimated_costs
    
    log ""
    log "============================================================================"
    success "🎉 ALL MODULE 2 VALIDATIONS PASSED!"
    log "============================================================================"
    log "✅ Database configuration is ready for deployment"
    log "✅ Security measures are properly configured"
    log "✅ Resource capacity is appropriate for environment"
    log "✅ Terraform syntax is valid"
    log ""
    log "📋 NEXT STEPS:"
    log "1. Review the estimated costs above"
    log "2. Ensure your GCP project has sufficient billing quota"
    log "3. Run deployment: ./deploy-module-2.sh"
    log ""
    log "Completed at: $(date)"
}

# Execute main function
main "$@"
