#!/bin/bash
# 🚀 User Service Deployment Script for Google Cloud
# Following the exact same pattern used for auth-service deployment

set -e

echo "🚀 Starting User Service Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="sap-project-466005"
REGION="asia-south1"
CLUSTER_NAME="sap-backend-gke"
SERVICE_NAME="user-service"
IMAGE_TAG="asia-south1-docker.pkg.dev/${PROJECT_ID}/sap-microservices/${SERVICE_NAME}:latest"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Cluster: $CLUSTER_NAME"
echo "Service: $SERVICE_NAME"
echo "Image: $IMAGE_TAG"
echo ""

# Step 1: Build User Service (same as auth service pattern)
echo -e "${YELLOW}🏗️ Step 1: Building User Service Docker Image...${NC}"
echo "Command: docker build -f services/user-service/Dockerfile.simple -t $IMAGE_TAG ."
cd ../../backend
docker build -f services/user-service/Dockerfile.simple -t $IMAGE_TAG .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ User Service Docker image built successfully${NC}"
else
    echo -e "${RED}❌ User Service Docker build failed${NC}"
    exit 1
fi

# Step 2: Push to Artifact Registry (same as auth service pattern)
echo -e "${YELLOW}🏷️ Step 2: Push into the artifact registry...${NC}"
echo "Command: docker push $IMAGE_TAG"
docker push $IMAGE_TAG

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Image pushed to Artifact Registry successfully${NC}"
else
    echo -e "${RED}❌ Image push failed${NC}"
    exit 1
fi

# Step 3: Deploy to Kubernetes (same as auth service pattern)
echo -e "${YELLOW}🚀 Step 3: Deploy to Kubernetes...${NC}"
echo "Command: cd ../deployment/microservices && kubectl apply -f user-service-deployment.yaml"
cd ../deployment/microservices
kubectl apply -f user-service-deployment.yaml

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment applied successfully${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 User Service Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Now run these commands to monitor your deployment (same as auth-service):${NC}"
echo ""
echo -e "${YELLOW}# Check the deployment status${NC}"
echo "kubectl get pods -n sap-microservices -l app=user-service"
echo ""
echo -e "${YELLOW}# Check the service${NC}"
echo "kubectl get service user-service -n sap-microservices"
echo ""
echo -e "${YELLOW}# Watch the pod startup in real-time${NC}"
echo "kubectl get pods -n sap-microservices -l app=user-service -w"
echo ""
echo -e "${YELLOW}# View the user service logs${NC}"
echo "kubectl logs -l app=user-service -n sap-microservices -f"
echo ""
echo -e "${YELLOW}# If you want to see logs from a specific pod${NC}"
echo "kubectl logs deployment/user-service -n sap-microservices -f"
echo ""
echo -e "${YELLOW}# Check if the health endpoint is responding${NC}"
echo "kubectl port-forward service/user-service 3002:3002 -n sap-microservices &"
echo ""
echo -e "${YELLOW}# Restart the deployment to pick up new environment variables${NC}"
echo "kubectl rollout restart deployment/user-service -n sap-microservices"
echo ""
echo -e "${YELLOW}# Check pod events to see why they might be pending${NC}"
echo "kubectl describe pods -l app=user-service -n sap-microservices"
echo ""
echo -e "${GREEN}✅ User Service is now deployed using the same pattern as auth-service!${NC}"
