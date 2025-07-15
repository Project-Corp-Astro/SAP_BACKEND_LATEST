#!/bin/bash
# 🔍 Configuration Validation Script
# Validates terraform.tfvars before deployment

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log_info "🔍 Validating terraform.tfvars configuration..."

# Check if terraform.tfvars exists
if [[ ! -f "terraform.tfvars" ]]; then
    log_error "terraform.tfvars not found!"
    log_info "Copy terraform.tfvars.example to terraform.tfvars and update the values"
    exit 1
fi

# Extract values
PROJECT_ID=$(grep '^project_id' terraform.tfvars | cut -d'"' -f2)
BUCKET_URL=$(grep '^terraform_state_bucket' terraform.tfvars | cut -d'"' -f2)

log_info "Configuration found:"
log_info "  Project ID: $PROJECT_ID"
log_info "  State Bucket: $BUCKET_URL"

# Validate project ID
if [[ "$PROJECT_ID" == "test-sap-backend-project" ]]; then
    log_error "❌ Project ID is still set to example value!"
    log_info "Update project_id in terraform.tfvars with your actual GCP project ID"
    exit 1
fi

# Validate bucket URL
if [[ "$BUCKET_URL" == "gs://test-sap-terraform-state" ]]; then
    log_error "❌ Terraform state bucket is still set to example value!"
    log_info "Update terraform_state_bucket in terraform.tfvars with your actual GCS bucket"
    exit 1
fi

log_success "✅ Configuration validation passed!"
log_info "Ready for deployment with:"
log_info "  Project: $PROJECT_ID"
log_info "  Bucket: $BUCKET_URL"

echo
log_info "Next steps:"
log_info "1. Ensure you're authenticated: gcloud auth login"
log_info "2. Set active project: gcloud config set project $PROJECT_ID"
log_info "3. Run deployment: ./deploy.sh all"
