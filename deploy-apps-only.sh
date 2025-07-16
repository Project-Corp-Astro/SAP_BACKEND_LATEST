#!/bin/bash
# 🚀 SAP Backend Applications Only - Skip Module 2 Database Issues
# Deploy applications directly to existing GKE cluster

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
PROJECT_ID="sap-project-466005"
REGION="asia-south1"
CLUSTER_NAME="sap-backend-test-cluster"

# Microservices configuration
declare -a MICROSERVICES=(
    "api-gateway:5001:backend"
    "auth-service:3001:backend/services/auth-service"  
    "user-service:3002:backend/services/user-service"
    "subscription-service:3004:backend/services/subscription-management-service"
    "content-service:3003:backend/services/content-service"
)

echo -e "${BLUE}🚀 SAP Backend Applications Deployment (Skip Module 2)${NC}"

# =================================================================
# PHASE 1: VERIFY CLUSTER CONNECTION
# =================================================================
echo -e "${YELLOW}📋 Phase 1: Connecting to existing GKE cluster${NC}"

gcloud config set project $PROJECT_ID
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION --project $PROJECT_ID

echo -e "${GREEN}✅ Connected to GKE cluster!${NC}"

# =================================================================
# PHASE 2: BUILD MICROSERVICES CONTAINERS
# =================================================================
echo -e "${YELLOW}📋 Phase 2: Building Microservice Containers${NC}"

# Enable container registry
gcloud services enable containerregistry.googleapis.com
gcloud auth configure-docker

# Build and push each microservice
for service_config in "${MICROSERVICES[@]}"; do
    IFS=':' read -r service_name port context_path <<< "$service_config"
    
    echo -e "${BLUE}🔨 Building $service_name microservice...${NC}"
    
    # Check if service directory exists
    if [ -d "$context_path" ]; then
        # Build service-specific container
        docker build \
            -f "$context_path/Dockerfile" \
            -t "gcr.io/$PROJECT_ID/sap-$service_name:latest" \
            "$context_path"
        
        # Push to Google Container Registry
        echo -e "${BLUE}📤 Pushing $service_name to registry...${NC}"
        docker push "gcr.io/$PROJECT_ID/sap-$service_name:latest"
        
        echo -e "${GREEN}✅ $service_name container deployed!${NC}"
    else
        echo -e "${RED}❌ Service directory not found: $context_path${NC}"
    fi
done

# =================================================================
# PHASE 3: DEPLOY TO KUBERNETES
# =================================================================
echo -e "${YELLOW}📋 Phase 3: Deploying to Kubernetes${NC}"

# Deploy secrets
echo "🔐 Deploying secrets..."
kubectl apply -f deployment/microservices/secrets.yaml

# Deploy applications
echo "🚀 Deploying microservices..."
kubectl apply -f deployment/microservices/production-manifests.yaml

# =================================================================
# PHASE 4: VERIFY DEPLOYMENT
# =================================================================
echo -e "${YELLOW}📋 Phase 4: Verifying Deployment${NC}"

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment --all

# Show status
echo -e "${BLUE}📊 Deployment Status:${NC}"
kubectl get pods
kubectl get services
kubectl get deployments

# Get external IPs
echo -e "${BLUE}🌐 External Access:${NC}"
kubectl get services --field-selector spec.type=LoadBalancer

echo -e "${GREEN}✅ SAP Backend Applications Deployed Successfully!${NC}"
echo -e "${YELLOW}🎉 Your microservices are now running on GKE!${NC}"
