#!/bin/bash
# 🔍 SAP Backend GCP Deployment - Pre-flight Validation Script
# Mathematical Precision: Zero-tolerance error policy
# All checks must pass before proceeding with deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =================================================================
# CONFIGURATION
# =================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR"

# Required tools with minimum versions
declare -A REQUIRED_TOOLS=(
    ["gcloud"]="400.0.0"
    ["kubectl"]="1.28.0"
    ["terraform"]="1.5.0"
    ["docker"]="20.0.0"
    ["git"]="2.30.0"
)

# Required GCP APIs
REQUIRED_APIS=(
    "container.googleapis.com"
    "compute.googleapis.com"
    "cloudsql.googleapis.com"
    "redis.googleapis.com"
    "secretmanager.googleapis.com"
    "monitoring.googleapis.com"
    "logging.googleapis.com"
    "cloudtrace.googleapis.com"
    "clouderrorreporting.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudbuild.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
    "servicenetworking.googleapis.com"
    "dns.googleapis.com"
    "certificatemanager.googleapis.com"
)

# =================================================================
# UTILITY FUNCTIONS
# =================================================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    local cmd=$1
    if ! command -v "$cmd" &> /dev/null; then
        log_error "Command '$cmd' not found. Please install it."
        return 1
    fi
    return 0
}

version_compare() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

check_tool_version() {
    local tool=$1
    local required_version=$2
    local current_version
    
    case $tool in
        "gcloud")
            current_version=$(gcloud version --format="value(Google Cloud SDK)" 2>/dev/null | head -n1)
            ;;
        "kubectl")
            current_version=$(kubectl version --client -o json 2>/dev/null | jq -r '.clientVersion.gitVersion' | sed 's/v//')
            ;;
        "terraform")
            current_version=$(terraform version -json 2>/dev/null | jq -r '.terraform_version')
            ;;
        "docker")
            current_version=$(docker version --format '{{.Client.Version}}' 2>/dev/null)
            ;;
        "git")
            current_version=$(git --version | awk '{print $3}')
            ;;
        *)
            log_error "Unknown tool: $tool"
            return 1
            ;;
    esac
    
    if [[ -z "$current_version" ]]; then
        log_error "Could not determine version for $tool"
        return 1
    fi
    
    if version_compare "$current_version" "$required_version"; then
        log_success "$tool version $current_version >= $required_version ✅"
        return 0
    else
        log_error "$tool version $current_version < $required_version ❌"
        return 1
    fi
}

# =================================================================
# VALIDATION FUNCTIONS
# =================================================================
validate_prerequisites() {
    log_info "🔍 Validating prerequisites..."
    local errors=0
    
    # Check required tools
    for tool in "${!REQUIRED_TOOLS[@]}"; do
        if ! check_command "$tool"; then
            ((errors++))
            continue
        fi
        
        if ! check_tool_version "$tool" "${REQUIRED_TOOLS[$tool]}"; then
            ((errors++))
        fi
    done
    
    # Check for jq (required for JSON parsing)
    if ! check_command "jq"; then
        log_error "jq is required for JSON parsing"
        ((errors++))
    fi
    
    if [[ $errors -gt 0 ]]; then
        log_error "Prerequisites validation failed with $errors errors"
        return 1
    fi
    
    log_success "Prerequisites validation passed ✅"
    return 0
}

validate_gcp_authentication() {
    log_info "🔍 Validating GCP authentication..."
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        log_error "No active GCP authentication found"
        log_info "Run: gcloud auth login"
        return 1
    fi
    
    # Get active account
    local active_account
    active_account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
    log_success "Authenticated as: $active_account ✅"
    
    # Check application default credentials
    if ! gcloud auth application-default print-access-token &>/dev/null; then
        log_warning "Application default credentials not found"
        log_info "Run: gcloud auth application-default login"
        return 1
    fi
    
    log_success "GCP authentication validation passed ✅"
    return 0
}

validate_terraform_configuration() {
    log_info "🔍 Validating Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    
    # Check if terraform.tfvars exists
    if [[ ! -f "terraform.tfvars" ]]; then
        log_error "terraform.tfvars not found"
        log_info "Copy terraform.tfvars.example to terraform.tfvars and update values"
        return 1
    fi
    
    # Validate Terraform configuration
    if ! terraform init -backend=false &>/dev/null; then
        log_error "Terraform initialization failed"
        return 1
    fi
    
    if ! terraform validate; then
        log_error "Terraform configuration validation failed"
        return 1
    fi
    
    log_success "Terraform configuration validation passed ✅"
    return 0
}

validate_gcp_project() {
    log_info "🔍 Validating GCP project configuration..."
    
    cd "$TERRAFORM_DIR"
    
    # Extract project ID from terraform.tfvars
    local project_id
    if ! project_id=$(grep '^project_id' terraform.tfvars | cut -d'"' -f2); then
        log_error "Could not extract project_id from terraform.tfvars"
        return 1
    fi
    
    if [[ -z "$project_id" || "$project_id" == "your-gcp-project-id" ]]; then
        log_error "project_id not set in terraform.tfvars"
        return 1
    fi
    
    # Validate project exists and is accessible
    if ! gcloud projects describe "$project_id" &>/dev/null; then
        log_error "Project '$project_id' not found or not accessible"
        return 1
    fi
    
    # Set current project
    gcloud config set project "$project_id"
    
    # Check billing is enabled
    local billing_enabled
    billing_enabled=$(gcloud billing projects describe "$project_id" --format="value(billingEnabled)" 2>/dev/null || echo "false")
    
    if [[ "$billing_enabled" != "True" ]]; then
        log_error "Billing not enabled for project '$project_id'"
        return 1
    fi
    
    log_success "GCP project '$project_id' validation passed ✅"
    return 0
}

validate_gcp_apis() {
    log_info "🔍 Validating GCP APIs..."
    
    local project_id
    project_id=$(gcloud config get-value project)
    
    local missing_apis=()
    
    for api in "${REQUIRED_APIS[@]}"; do
        if ! gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
            missing_apis+=("$api")
        fi
    done
    
    if [[ ${#missing_apis[@]} -gt 0 ]]; then
        log_warning "Missing APIs detected: ${missing_apis[*]}"
        log_info "These APIs will be enabled during Terraform deployment"
    fi
    
    log_success "GCP APIs validation completed ✅"
    return 0
}

validate_terraform_state_bucket() {
    log_info "🔍 Validating Terraform state bucket..."
    
    cd "$TERRAFORM_DIR"
    
    # Extract bucket from terraform.tfvars
    local bucket_url
    if ! bucket_url=$(grep '^terraform_state_bucket' terraform.tfvars | cut -d'"' -f2); then
        log_error "Could not extract terraform_state_bucket from terraform.tfvars"
        return 1
    fi
    
    if [[ -z "$bucket_url" || "$bucket_url" == "gs://your-terraform-state-bucket" ]]; then
        log_error "terraform_state_bucket not set in terraform.tfvars"
        return 1
    fi
    
    # Extract bucket name (remove gs:// prefix)
    local bucket_name="${bucket_url#gs://}"
    
    # Check if bucket exists and is accessible
    if ! gsutil ls -b "$bucket_url" &>/dev/null; then
        log_warning "Terraform state bucket '$bucket_name' not found"
        log_info "Creating bucket '$bucket_name'..."
        
        # Create bucket with versioning and lifecycle
        if ! gsutil mb -p "$(gcloud config get-value project)" -c STANDARD -l "$(gcloud config get-value compute/region)" "$bucket_url"; then
            log_error "Failed to create bucket '$bucket_name'"
            return 1
        fi
        
        # Enable versioning
        gsutil versioning set on "$bucket_url"
        
        # Set lifecycle policy
        cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30, "isLive": false}
      }
    ]
  }
}
EOF
        gsutil lifecycle set /tmp/lifecycle.json "$bucket_url"
        rm /tmp/lifecycle.json
        
        log_success "Created and configured bucket '$bucket_name' ✅"
    else
        log_success "Terraform state bucket '$bucket_name' validation passed ✅"
    fi
    
    return 0
}

validate_network_configuration() {
    log_info "🔍 Validating network configuration..."
    
    cd "$TERRAFORM_DIR"
    
    # Extract CIDR ranges from terraform.tfvars
    local gke_subnet_cidr pods_cidr services_cidr master_cidr
    gke_subnet_cidr=$(grep '^gke_subnet_cidr' terraform.tfvars | cut -d'"' -f2)
    pods_cidr=$(grep '^pods_cidr_range' terraform.tfvars | cut -d'"' -f2)
    services_cidr=$(grep '^services_cidr_range' terraform.tfvars | cut -d'"' -f2)
    master_cidr=$(grep '^master_ipv4_cidr_block' terraform.tfvars | cut -d'"' -f2)
    
    # Validate CIDR formats
    local cidrs=("$gke_subnet_cidr" "$pods_cidr" "$services_cidr" "$master_cidr")
    local cidr_names=("GKE subnet" "Pods range" "Services range" "Master range")
    
    for i in "${!cidrs[@]}"; do
        local cidr="${cidrs[$i]}"
        local name="${cidr_names[$i]}"
        
        if [[ ! $cidr =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
            log_error "Invalid CIDR format for $name: $cidr"
            return 1
        fi
    done
    
    log_success "Network configuration validation passed ✅"
    return 0
}

# =================================================================
# MAIN VALIDATION FUNCTION
# =================================================================
main() {
    log_info "🚀 Starting SAP Backend GCP Deployment Pre-flight Validation"
    log_info "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo
    
    local validation_functions=(
        "validate_prerequisites"
        "validate_gcp_authentication"
        "validate_terraform_configuration"
        "validate_gcp_project"
        "validate_gcp_apis"
        "validate_terraform_state_bucket"
        "validate_network_configuration"
    )
    
    local failed_validations=0
    
    for validation_func in "${validation_functions[@]}"; do
        echo
        if ! $validation_func; then
            ((failed_validations++))
            log_error "Validation failed: $validation_func"
        fi
    done
    
    echo
    if [[ $failed_validations -eq 0 ]]; then
        log_success "🎉 All pre-flight validations passed! Ready for deployment."
        log_info "Next steps:"
        log_info "1. Review terraform.tfvars configuration"
        log_info "2. Run: terraform plan"
        log_info "3. Run: terraform apply"
        return 0
    else
        log_error "❌ $failed_validations validation(s) failed. Please fix the issues before proceeding."
        return 1
    fi
}

# =================================================================
# SCRIPT EXECUTION
# =================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
