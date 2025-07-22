#!/bin/bash
# 🚀 User Service Deployment Script for Google Cloud
# This script builds and deploys the user service to GKE

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
CLUSTER_NAME="sap-backend-test-cluster"
SERVICE_NAME="user-service"
IMAGE_TAG="asia-south1-docker.pkg.dev/${PROJECT_ID}/sap-microservices/${SERVICE_NAME}:latest"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Cluster: $CLUSTER_NAME"
echo "Service: $SERVICE_NAME"
echo "Image: $IMAGE_TAG"
echo ""

# Step 1: Build Docker Image
echo -e "${YELLOW}🏗️ Step 1: Building Docker Image...${NC}"
cd ../backend
docker build -f services/user-service/Dockerfile.simple -t $SERVICE_NAME:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Step 2: Tag and Push to Artifact Registry
echo -e "${YELLOW}🏷️ Step 2: Tagging and pushing to Artifact Registry...${NC}"
docker tag $SERVICE_NAME:latest $IMAGE_TAG
docker push $IMAGE_TAG

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Image pushed to Artifact Registry${NC}"
else
    echo -e "${RED}❌ Image push failed${NC}"
    exit 1
fi

# Step 3: Get GKE Credentials
echo -e "${YELLOW}🔐 Step 3: Getting GKE credentials...${NC}"
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION --project=$PROJECT_ID

# Step 4: Apply Deployment
echo -e "${YELLOW}🚀 Step 4: Deploying to Kubernetes...${NC}"
cd ../deployment/microservices
kubectl apply -f user-service-deployment.yaml

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment applied successfully${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Step 5: Wait for deployment to be ready
echo -e "${YELLOW}⏳ Step 5: Waiting for deployment to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/user-service -n sap-microservices

# Step 6: Check deployment status
echo -e "${YELLOW}📊 Step 6: Checking deployment status...${NC}"
kubectl get pods -l app=user-service -n sap-microservices
kubectl get service user-service -n sap-microservices

# Step 7: Test health endpoint
echo -e "${YELLOW}🏥 Step 7: Testing health endpoint...${NC}"
echo "Waiting for pods to be ready..."
sleep 30

# Get pod name
POD_NAME=$(kubectl get pods -l app=user-service -n sap-microservices -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [ ! -z "$POD_NAME" ]; then
    echo "Testing health endpoint on pod: $POD_NAME"
    kubectl logs $POD_NAME -n sap-microservices --tail=20
    
    echo ""
    echo "Port forwarding to test health endpoint..."
    kubectl port-forward service/user-service 8081:3002 -n sap-microservices &
    PORT_FORWARD_PID=$!
    
    sleep 5
    
    echo "Testing health endpoint..."
    curl -f http://localhost:8081/health || echo "Health check failed"
    
    # Clean up port forward
    kill $PORT_FORWARD_PID 2>/dev/null || true
else
    echo -e "${RED}❌ No running pods found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 User Service Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary:${NC}"
echo "• Docker image: $IMAGE_TAG"
echo "• Deployment: user-service in sap-microservices namespace"
echo "• Service endpoint: http://user-service.sap-microservices.svc.cluster.local:3002"
echo "• Health check: http://user-service.sap-microservices.svc.cluster.local:3002/health"
echo ""
echo -e "${YELLOW}🔍 Next steps:${NC}"
echo "1. Monitor logs: kubectl logs -l app=user-service -n sap-microservices -f"
echo "2. Check status: kubectl get pods -l app=user-service -n sap-microservices"
echo "3. Test API: kubectl port-forward service/user-service 8081:3002 -n sap-microservices"
echo ""
