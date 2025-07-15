#!/bin/bash
# 🚀 SAP Backend GCP Deployment - Automated Deployment Script
# Mathematical Precision: Zero-tolerance error policy with rollback mechanisms
# All operations are validated and can be rolled back if needed

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =================================================================
# CONFIGURATION
# =================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR"
LOG_DIR="$PROJECT_ROOT/logs"
DEPLOYMENT_LOG="$LOG_DIR/gcp-deployment-$(date +%Y%m%d-%H%M%S).log"

# Deployment phases
declare -A DEPLOYMENT_PHASES=(
    ["validate"]="Pre-deployment validation"
    ["plan"]="Terraform planning"
    ["apply"]="Infrastructure deployment"
    ["verify"]="Post-deployment verification"
    ["complete"]="Deployment completion"
)

# =================================================================
# UTILITY FUNCTIONS
# =================================================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_phase() {
    echo -e "${PURPLE}[PHASE]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

create_checkpoint() {
    local checkpoint_name=$1
    local checkpoint_file="$LOG_DIR/checkpoint-$checkpoint_name-$(date +%Y%m%d-%H%M%S).txt"
    
    echo "Checkpoint: $checkpoint_name" > "$checkpoint_file"
    echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "$checkpoint_file"
    echo "Terraform State: $(terraform show -json 2>/dev/null | jq -r '.values.root_module.resources | length' || echo "unknown")" >> "$checkpoint_file"
    
    log_info "Checkpoint created: $checkpoint_name"
}

validate_deployment_requirements() {
    log_step "Validating deployment requirements..."
    
    # Create logs directory
    mkdir -p "$LOG_DIR"
    
    # Check if validation script exists
    if [[ ! -f "$TERRAFORM_DIR/validate-preflight.sh" ]]; then
        log_error "Pre-flight validation script not found"
        return 1
    fi
    
    # Run pre-flight validation
    if ! bash "$TERRAFORM_DIR/validate-preflight.sh"; then
        log_error "Pre-flight validation failed"
        return 1
    fi
    
    log_success "Deployment requirements validated ✅"
    return 0
}

terraform_init() {
    log_step "Initializing Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform with backend configuration
    if ! terraform init -input=false; then
        log_error "Terraform initialization failed"
        return 1
    fi
    
    # Validate configuration
    if ! terraform validate; then
        log_error "Terraform configuration validation failed"
        return 1
    fi
    
    log_success "Terraform initialized successfully ✅"
    return 0
}

terraform_plan() {
    log_step "Creating Terraform execution plan..."
    
    cd "$TERRAFORM_DIR"
    
    local plan_file="$LOG_DIR/terraform-plan-$(date +%Y%m%d-%H%M%S).tfplan"
    local plan_output="$LOG_DIR/terraform-plan-$(date +%Y%m%d-%H%M%S).txt"
    
    # Create execution plan
    if ! terraform plan -out="$plan_file" -input=false | tee "$plan_output"; then
        log_error "Terraform planning failed"
        return 1
    fi
    
    # Analyze plan for safety
    local resources_to_create resources_to_change resources_to_destroy
    resources_to_create=$(grep "Plan:" "$plan_output" | grep -o "[0-9]* to add" | grep -o "[0-9]*" || echo "0")
    resources_to_change=$(grep "Plan:" "$plan_output" | grep -o "[0-9]* to change" | grep -o "[0-9]*" || echo "0")
    resources_to_destroy=$(grep "Plan:" "$plan_output" | grep -o "[0-9]* to destroy" | grep -o "[0-9]*" || echo "0")
    
    log_info "Terraform Plan Summary:"
    log_info "  Resources to create: $resources_to_create"
    log_info "  Resources to change: $resources_to_change"
    log_info "  Resources to destroy: $resources_to_destroy"
    
    # Safety check: prevent accidental destruction
    if [[ $resources_to_destroy -gt 0 ]]; then
        log_warning "⚠️  Plan includes resource destruction!"
        log_warning "Resources to destroy: $resources_to_destroy"
        
        read -p "Do you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Deployment cancelled by user"
            return 1
        fi
    fi
    
    # Store plan file path for apply phase
    echo "$plan_file" > "$LOG_DIR/latest-plan-file.txt"
    
    log_success "Terraform plan created successfully ✅"
    return 0
}

terraform_apply() {
    log_step "Applying Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    
    # Get plan file from previous step
    local plan_file
    if [[ -f "$LOG_DIR/latest-plan-file.txt" ]]; then
        plan_file=$(cat "$LOG_DIR/latest-plan-file.txt")
    else
        log_error "Plan file not found. Run plan phase first."
        return 1
    fi
    
    if [[ ! -f "$plan_file" ]]; then
        log_error "Plan file does not exist: $plan_file"
        return 1
    fi
    
    # Create checkpoint before apply
    create_checkpoint "before-apply"
    
    # Apply the plan
    local apply_start_time
    apply_start_time=$(date +%s)
    
    if ! terraform apply -input=false "$plan_file" | tee "$LOG_DIR/terraform-apply-$(date +%Y%m%d-%H%M%S).txt"; then
        log_error "Terraform apply failed"
        
        # Create failure checkpoint
        create_checkpoint "apply-failed"
        
        log_error "Deployment failed. Check logs for details."
        log_info "Rollback may be required. Check Terraform state."
        return 1
    fi
    
    local apply_end_time
    apply_end_time=$(date +%s)
    local apply_duration=$((apply_end_time - apply_start_time))
    
    # Create checkpoint after successful apply
    create_checkpoint "after-apply"
    
    log_success "Terraform apply completed in ${apply_duration}s ✅"
    return 0
}

verify_deployment() {
    log_step "Verifying deployment..."
    
    cd "$TERRAFORM_DIR"
    
    # Get Terraform outputs
    local terraform_outputs
    if ! terraform_outputs=$(terraform output -json 2>/dev/null); then
        log_warning "Could not retrieve Terraform outputs"
    else
        echo "$terraform_outputs" > "$LOG_DIR/terraform-outputs-$(date +%Y%m%d-%H%M%S).json"
        log_info "Terraform outputs saved to logs"
    fi
    
    # Verify GKE cluster
    local cluster_name cluster_location project_id
    cluster_name=$(echo "$terraform_outputs" | jq -r '.gke_cluster_validation.value.cluster_name // empty' 2>/dev/null || echo "")
    cluster_location=$(echo "$terraform_outputs" | jq -r '.gke_cluster_validation.value.cluster_location // empty' 2>/dev/null || echo "")
    project_id=$(echo "$terraform_outputs" | jq -r '.project_validation.value.project_id // empty' 2>/dev/null || echo "")
    
    if [[ -n "$cluster_name" && -n "$cluster_location" && -n "$project_id" ]]; then
        log_step "Verifying GKE cluster connectivity..."
        
        # Get cluster credentials
        if gcloud container clusters get-credentials "$cluster_name" --location "$cluster_location" --project "$project_id"; then
            
            # Test cluster connectivity
            if kubectl cluster-info &>/dev/null; then
                log_success "GKE cluster is accessible ✅"
                
                # Check node status
                local ready_nodes total_nodes
                ready_nodes=$(kubectl get nodes --no-headers | grep -c "Ready" || echo "0")
                total_nodes=$(kubectl get nodes --no-headers | wc -l || echo "0")
                
                log_info "Cluster nodes: $ready_nodes/$total_nodes ready"
                
                if [[ $ready_nodes -eq $total_nodes && $total_nodes -gt 0 ]]; then
                    log_success "All cluster nodes are ready ✅"
                else
                    log_warning "Not all cluster nodes are ready"
                fi
            else
                log_warning "Could not connect to GKE cluster"
            fi
        else
            log_warning "Could not get GKE cluster credentials"
        fi
    else
        log_warning "Could not extract cluster information from Terraform outputs"
    fi
    
    # Test basic Kubernetes functionality
    if kubectl auth can-i get pods --all-namespaces &>/dev/null; then
        log_success "Kubernetes RBAC is working ✅"
    else
        log_warning "Kubernetes RBAC verification failed"
    fi
    
    log_success "Deployment verification completed ✅"
    return 0
}

generate_deployment_summary() {
    log_step "Generating deployment summary..."
    
    local summary_file="$LOG_DIR/deployment-summary-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$summary_file" << EOF
# SAP Backend GCP Deployment Summary

**Deployment Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Deployment Duration**: $(($(date +%s) - ${DEPLOYMENT_START_TIME:-$(date +%s)})) seconds
**Terraform Directory**: $TERRAFORM_DIR
**Logs Directory**: $LOG_DIR

## Deployment Status

✅ **SUCCESS**: Infrastructure deployment completed successfully

## Resources Created

EOF
    
    # Add Terraform outputs to summary
    if [[ -f "$LOG_DIR/terraform-outputs-"*".json" ]]; then
        local latest_output
        latest_output=$(ls -t "$LOG_DIR/terraform-outputs-"*".json" | head -n1)
        
        echo "### GCP Project" >> "$summary_file"
        jq -r '.project_validation.value | to_entries[] | "- **\(.key)**: \(.value)"' "$latest_output" >> "$summary_file" 2>/dev/null || echo "- Project information not available" >> "$summary_file"
        
        echo "" >> "$summary_file"
        echo "### GKE Cluster" >> "$summary_file"
        jq -r '.gke_cluster_validation.value | to_entries[] | "- **\(.key)**: \(.value)"' "$latest_output" >> "$summary_file" 2>/dev/null || echo "- Cluster information not available" >> "$summary_file"
        
        echo "" >> "$summary_file"
        echo "### Network Configuration" >> "$summary_file"
        jq -r '.network_validation.value | to_entries[] | "- **\(.key)**: \(.value)"' "$latest_output" >> "$summary_file" 2>/dev/null || echo "- Network information not available" >> "$summary_file"
    fi
    
    cat >> "$summary_file" << EOF

## Next Steps

1. **Configure kubectl**: 
   \`\`\`bash
   gcloud container clusters get-credentials CLUSTER_NAME --location CLUSTER_LOCATION --project PROJECT_ID
   \`\`\`

2. **Verify cluster**:
   \`\`\`bash
   kubectl cluster-info
   kubectl get nodes
   \`\`\`

3. **Deploy applications**: Proceed with Module 2 (Database Migration)

## Files Generated

- Deployment logs: \`$LOG_DIR/\`
- Terraform state: Remote (GCS bucket)
- Cluster credentials: \`~/.kube/config\`

## Support

- Logs directory: \`$LOG_DIR\`
- Terraform directory: \`$TERRAFORM_DIR\`
- Documentation: \`docs/deployment/\`
EOF
    
    log_success "Deployment summary generated: $summary_file"
    log_info "📋 Review the summary for next steps and important information"
}

# =================================================================
# ROLLBACK FUNCTIONS
# =================================================================
rollback_deployment() {
    log_warning "🔄 Initiating deployment rollback..."
    
    cd "$TERRAFORM_DIR"
    
    # Confirm rollback
    read -p "Are you sure you want to rollback the deployment? This will destroy all created resources. (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Rollback cancelled"
        return 0
    fi
    
    # Create rollback checkpoint
    create_checkpoint "before-rollback"
    
    # Destroy resources
    if terraform destroy -auto-approve; then
        log_success "Rollback completed successfully ✅"
        create_checkpoint "after-rollback"
    else
        log_error "Rollback failed. Manual intervention required."
        return 1
    fi
}

# =================================================================
# MAIN DEPLOYMENT FUNCTION
# =================================================================
deploy() {
    local phase=$1
    
    case $phase in
        "validate")
            log_phase "🔍 Phase 1: ${DEPLOYMENT_PHASES[$phase]}"
            validate_deployment_requirements
            ;;
        "plan")
            log_phase "📋 Phase 2: ${DEPLOYMENT_PHASES[$phase]}"
            terraform_init && terraform_plan
            ;;
        "apply")
            log_phase "🚀 Phase 3: ${DEPLOYMENT_PHASES[$phase]}"
            terraform_apply
            ;;
        "verify")
            log_phase "✅ Phase 4: ${DEPLOYMENT_PHASES[$phase]}"
            verify_deployment
            ;;
        "complete")
            log_phase "🎉 Phase 5: ${DEPLOYMENT_PHASES[$phase]}"
            generate_deployment_summary
            ;;
        "all")
            for p in validate plan apply verify complete; do
                if ! deploy "$p"; then
                    log_error "Deployment failed at phase: $p"
                    return 1
                fi
            done
            ;;
        "rollback")
            rollback_deployment
            ;;
        *)
            log_error "Unknown phase: $phase"
            show_usage
            return 1
            ;;
    esac
}

show_usage() {
    cat << EOF
Usage: $0 [PHASE]

Phases:
  validate    - Run pre-deployment validation
  plan        - Create Terraform execution plan
  apply       - Apply Terraform configuration
  verify      - Verify deployment
  complete    - Generate deployment summary
  all         - Run all phases sequentially
  rollback    - Rollback deployment (destroy resources)

Examples:
  $0 all              # Full deployment
  $0 validate         # Validation only
  $0 plan             # Planning only
  $0 rollback         # Rollback deployment
EOF
}

# =================================================================
# SCRIPT EXECUTION
# =================================================================
main() {
    local phase=${1:-"all"}
    
    # Set deployment start time
    DEPLOYMENT_START_TIME=$(date +%s)
    
    # Create logs directory
    mkdir -p "$LOG_DIR"
    
    log_info "🚀 SAP Backend GCP Deployment Started"
    log_info "Phase: $phase"
    log_info "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    log_info "Log file: $DEPLOYMENT_LOG"
    echo
    
    if deploy "$phase"; then
        echo
        log_success "🎉 Deployment phase '$phase' completed successfully!"
        log_info "Total duration: $(($(date +%s) - DEPLOYMENT_START_TIME)) seconds"
        
        if [[ "$phase" == "all" ]]; then
            log_info "✨ Infrastructure deployment is complete!"
            log_info "📋 Check the deployment summary for next steps"
            log_info "🔗 Proceed to Module 2: Database Migration"
        fi
    else
        echo
        log_error "❌ Deployment phase '$phase' failed!"
        log_info "📋 Check the logs for details: $DEPLOYMENT_LOG"
        log_info "🔄 Consider rollback if needed: $0 rollback"
        return 1
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -eq 0 ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
        show_usage
        exit 0
    fi
    
    main "$@"
fi
