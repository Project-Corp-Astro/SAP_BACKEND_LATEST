#!/bin/bash

set -e

echo "🚀 Setting up CI/CD automation for SAP Backend..."

# Configuration
PROJECT_ID="sap-project-466005"
REPO_NAME="SAP_BACKEND_LATEST"
REPO_OWNER="Project-Corp-Astro"
REGION="asia-south1"
CLUSTER_NAME="sap-backend-cluster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if gcloud is installed and authenticated
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI not found. Please install Google Cloud SDK."
        exit 1
    fi
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 &> /dev/null; then
        print_error "No active gcloud authentication found. Please run 'gcloud auth login'"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable cloudbuild.googleapis.com \
        container.googleapis.com \
        artifactregistry.googleapis.com \
        --project=$PROJECT_ID
    
    print_success "APIs enabled successfully"
}

# Create Artifact Registry repository
create_artifact_registry() {
    print_status "Creating Artifact Registry repository..."
    
    # Check if repository already exists
    if gcloud artifacts repositories describe sap-microservices \
        --location=$REGION \
        --project=$PROJECT_ID &> /dev/null; then
        print_warning "Artifact Registry repository already exists"
    else
        gcloud artifacts repositories create sap-microservices \
            --repository-format=docker \
            --location=$REGION \
            --description="SAP Backend microservices container images" \
            --project=$PROJECT_ID
        print_success "Artifact Registry repository created"
    fi
}

# Set up Cloud Build permissions
setup_permissions() {
    print_status "Setting up Cloud Build service account permissions..."
    
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
    CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
    
    # Grant required roles
    roles=(
        "roles/storage.admin"
        "roles/artifactregistry.writer"
        "roles/container.clusterAdmin"
        "roles/container.developer"
        "roles/compute.instanceAdmin.v1"
    )
    
    for role in "${roles[@]}"; do
        gcloud projects add-iam-policy-binding $PROJECT_ID \
            --member="serviceAccount:${CLOUD_BUILD_SA}" \
            --role="$role" \
            --quiet
        print_status "Granted $role to Cloud Build service account"
    done
    
    print_success "Permissions configured successfully"
}

# Create Cloud Build trigger
create_trigger() {
    print_status "Creating Cloud Build trigger..."
    
    # Check if trigger already exists
    if gcloud builds triggers list --filter="name:sap-backend-main-trigger" --format="value(name)" | head -n1 &> /dev/null; then
        print_warning "Cloud Build trigger already exists"
        return
    fi
    
    gcloud builds triggers create github \
        --repo-name=$REPO_NAME \
        --repo-owner=$REPO_OWNER \
        --branch-pattern=main \
        --build-config=cloudbuild.yaml \
        --project=$PROJECT_ID \
        --name="sap-backend-main-trigger" \
        --description="Automated CI/CD for SAP Backend main branch"
    
    print_success "Cloud Build trigger created successfully"
}

# Create monitoring script
create_monitoring_script() {
    print_status "Creating deployment monitoring script..."
    
    cat > monitor-deployment.sh << 'EOF'
#!/bin/bash

# SAP Backend Deployment Monitor
PROJECT_ID="sap-project-466005"
CLUSTER_NAME="sap-backend-cluster"
CLUSTER_LOCATION="asia-south1-a"
NAMESPACE="sap-microservices"

echo "🔍 SAP Backend Deployment Status"
echo "=================================="

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --location=$CLUSTER_LOCATION --quiet

# Check pod status
echo "📊 Pod Status:"
kubectl get pods -n $NAMESPACE -o wide

echo ""
echo "🌐 Service Status:"
kubectl get services -n $NAMESPACE

echo ""
echo "🏥 Health Checks:"

# Get API Gateway external IP
API_GATEWAY_IP=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)

if [ -n "$API_GATEWAY_IP" ]; then
    echo "API Gateway: http://$API_GATEWAY_IP"
    
    # Test health endpoint
    if curl -s -f "http://$API_GATEWAY_IP/health" > /dev/null; then
        echo "✅ API Gateway health check: PASSED"
    else
        echo "❌ API Gateway health check: FAILED"
    fi
    
    # Test other endpoints
    endpoints=("api/auth" "api/users" "api/content" "api/subscription")
    for endpoint in "${endpoints[@]}"; do
        if curl -s -f "http://$API_GATEWAY_IP/$endpoint" > /dev/null 2>&1; then
            echo "✅ $endpoint: AVAILABLE"
        else
            echo "⚠️  $endpoint: NOT RESPONDING"
        fi
    done
else
    echo "⚠️  API Gateway external IP not found"
fi

echo ""
echo "📈 Recent Deployments:"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | grep -E "(Deployment|ReplicaSet)" | tail -5

EOF

    chmod +x monitor-deployment.sh
    print_success "Monitoring script created: ./monitor-deployment.sh"
}

# Create deployment rollback script
create_rollback_script() {
    print_status "Creating rollback script..."
    
    cat > rollback-deployment.sh << 'EOF'
#!/bin/bash

# SAP Backend Deployment Rollback Script
PROJECT_ID="sap-project-466005"
CLUSTER_NAME="sap-backend-cluster"
CLUSTER_LOCATION="asia-south1-a"
NAMESPACE="sap-microservices"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <service-name>"
    echo "Available services: api-gateway, auth-service, user-service, content-service, subscription-service"
    exit 1
fi

SERVICE_NAME=$1

echo "🔄 Rolling back $SERVICE_NAME deployment..."

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --location=$CLUSTER_LOCATION --quiet

# Perform rollback
kubectl rollout undo deployment/$SERVICE_NAME -n $NAMESPACE

# Wait for rollback to complete
kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE

echo "✅ Rollback completed for $SERVICE_NAME"

# Show current status
kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME

EOF

    chmod +x rollback-deployment.sh
    print_success "Rollback script created: ./rollback-deployment.sh"
}

# Main execution
main() {
    echo "🎯 SAP Backend CI/CD Setup"
    echo "=========================="
    
    check_prerequisites
    enable_apis
    create_artifact_registry
    setup_permissions
    create_trigger
    create_monitoring_script
    create_rollback_script
    
    echo ""
    print_success "🎉 CI/CD automation setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Commit and push your changes to trigger the first build"
    echo "2. Monitor builds at: https://console.cloud.google.com/cloud-build/builds"
    echo "3. Use './monitor-deployment.sh' to check deployment status"
    echo "4. Use './rollback-deployment.sh <service>' if rollback is needed"
    echo ""
    echo "🔗 Useful Links:"
    echo "- Cloud Build Console: https://console.cloud.google.com/cloud-build"
    echo "- GKE Console: https://console.cloud.google.com/kubernetes"
    echo "- Artifact Registry: https://console.cloud.google.com/artifacts"
}

# Run main function
main "$@"
