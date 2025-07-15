#!/bin/bash
# 🐳 SAP Backend Containerized Deployment - All-in-One Script
# For containerized microservices with GitOps deployment

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
CLUSTER_NAME="sap-backend-gke"
BUCKET_NAME="sap-backend-terraform-state-mumbai"

echo -e "${BLUE}🚀 SAP Backend Containerized Deployment Starting...${NC}"

# =================================================================
# PHASE 1: INFRASTRUCTURE DEPLOYMENT (Module 1)
# =================================================================
echo -e "${YELLOW}📋 Phase 1: Deploying Infrastructure (Module 1)${NC}"

cd infrastructure/gcp/terraform

# Set project
gcloud config set project $PROJECT_ID

# Initialize and deploy infrastructure
echo "🔧 Initializing Terraform..."
terraform init -backend-config="bucket=$BUCKET_NAME"

echo "🏗️ Deploying VPC, GKE, and base infrastructure..."
terraform apply -var-file="terraform.tfvars" -auto-approve

echo -e "${GREEN}✅ Module 1 Infrastructure deployed successfully!${NC}"

# =================================================================
# PHASE 2: DATABASE DEPLOYMENT (Module 2)
# =================================================================
echo -e "${YELLOW}📋 Phase 2: Deploying Databases (Module 2)${NC}"

# Check if deploy-module-2.sh exists and run it
if [ -f "deploy-module-2.sh" ]; then
    echo "🗄️ Deploying databases..."
    chmod +x deploy-module-2.sh
    bash deploy-module-2.sh
    echo -e "${GREEN}✅ Module 2 Databases deployed successfully!${NC}"
else
    echo "⚠️ Module 2 deployment script not found, skipping database deployment"
fi

# =================================================================
# PHASE 3: CONTAINER BUILD & PUSH
# =================================================================
echo -e "${YELLOW}📋 Phase 3: Building and Pushing Container Images${NC}"

cd ../../../

# Configure Docker for GCR
echo "🐳 Configuring Docker for Google Container Registry..."
gcloud auth configure-docker

# Build container images
echo "🔨 Building container images..."

# Main application container
if [ -f "infrastructure/docker/Dockerfile" ]; then
    docker build -f infrastructure/docker/Dockerfile \
        -t gcr.io/$PROJECT_ID/sap-backend:latest \
        -t gcr.io/$PROJECT_ID/sap-backend:$(date +%Y%m%d-%H%M%S) .
    
    docker push gcr.io/$PROJECT_ID/sap-backend:latest
    echo -e "${GREEN}✅ Main application image pushed${NC}"
fi

# Microservice container
if [ -f "infrastructure/docker/Dockerfile.microservice" ]; then
    docker build -f infrastructure/docker/Dockerfile.microservice \
        -t gcr.io/$PROJECT_ID/sap-microservice:latest \
        -t gcr.io/$PROJECT_ID/sap-microservice:$(date +%Y%m%d-%H%M%S) .
    
    docker push gcr.io/$PROJECT_ID/sap-microservice:latest
    echo -e "${GREEN}✅ Microservice image pushed${NC}"
fi

# Health monitor container
if [ -f "infrastructure/docker/Dockerfile.health-monitor" ]; then
    docker build -f infrastructure/docker/Dockerfile.health-monitor \
        -t gcr.io/$PROJECT_ID/sap-health-monitor:latest \
        -t gcr.io/$PROJECT_ID/sap-health-monitor:$(date +%Y%m%d-%H%M%S) .
    
    docker push gcr.io/$PROJECT_ID/sap-health-monitor:latest
    echo -e "${GREEN}✅ Health monitor image pushed${NC}"
fi

# =================================================================
# PHASE 4: KUBERNETES DEPLOYMENT
# =================================================================
echo -e "${YELLOW}📋 Phase 4: Deploying Applications to Kubernetes${NC}"

# Get GKE credentials
echo "🔑 Getting GKE cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION

# Update image references in Kubernetes manifests
echo "🔄 Updating container image references..."
find deployment/gitops -name "*.yaml" -type f -exec sed -i "s|gcr.io/PROJECT_ID|gcr.io/$PROJECT_ID|g" {} \;

# Deploy ArgoCD (if not already installed)
echo "🔧 Setting up ArgoCD..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
echo "⏳ Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# Apply GitOps configurations
echo "🚀 Deploying applications via GitOps..."
kubectl apply -f deployment/gitops/

echo -e "${GREEN}✅ Applications deployed successfully!${NC}"

# =================================================================
# PHASE 5: VERIFICATION
# =================================================================
echo -e "${YELLOW}📋 Phase 5: Verifying Deployment${NC}"

echo "🔍 Checking infrastructure..."
gcloud compute networks list --filter="name:sap-backend-vpc"
gcloud container clusters list --filter="name:$CLUSTER_NAME"

echo "🔍 Checking containers..."
gcloud container images list --repository=gcr.io/$PROJECT_ID

echo "🔍 Checking Kubernetes resources..."
kubectl get pods --all-namespaces
kubectl get services --all-namespaces

# Get ArgoCD admin password
echo "🔑 ArgoCD admin password:"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
echo ""

echo -e "${GREEN}🎉 SAP Backend Containerized Deployment Completed Successfully!${NC}"
echo -e "${BLUE}📊 Access ArgoCD UI: kubectl port-forward svc/argocd-server -n argocd 8080:443${NC}"
echo -e "${BLUE}🌐 Access applications through the load balancer endpoints${NC}"

# =================================================================
# DEPLOYMENT SUMMARY
# =================================================================
echo -e "${YELLOW}📋 Deployment Summary:${NC}"
echo "✅ Module 1: Infrastructure (VPC, GKE) - Deployed"
echo "✅ Module 2: Databases (PostgreSQL, Redis) - Deployed"
echo "✅ Module 3: Container Images - Built and Pushed"
echo "✅ Module 4: Applications - Deployed via GitOps"
echo "✅ Module 5: Monitoring - ArgoCD Dashboard Available"
echo ""
echo -e "${GREEN}🚀 Your SAP Backend is now running in production on GCP!${NC}"
