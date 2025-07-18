#!/bin/bash

# 🚀 SAP Backend - Subscription Service Deployment Script
# This script deploys the subscription service to your Kubernetes cluster

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 SAP Backend - Subscription Service Deployment${NC}"
echo "=================================================="

# Configuration
PROJECT_ID="sap-project-466005"
REGION="asia-south1"
CLUSTER_NAME="sap-backend-gke"
SERVICE_NAME="subscription-service"
NAMESPACE="sap-microservices"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if we're connected to the right cluster
echo -e "${YELLOW}🔍 Checking cluster connection...${NC}"
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${YELLOW}⚠️ Not connected to cluster. Connecting...${NC}"
    gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION --project $PROJECT_ID
fi

# Create namespace if it doesn't exist
echo -e "${YELLOW}📁 Creating namespace: $NAMESPACE${NC}"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply secrets first
echo -e "${YELLOW}🔐 Applying secrets and configuration...${NC}"
kubectl apply -f deployment/microservices/secrets.yaml

# Wait a moment for secrets to be created
sleep 2

# Deploy subscription service
echo -e "${YELLOW}🚀 Deploying subscription service...${NC}"
kubectl apply -f deployment/microservices/subscription-service-deployment.yaml

# Wait for deployment to be ready
echo -e "${YELLOW}⏳ Waiting for deployment to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/$SERVICE_NAME -n $NAMESPACE

# Check pod status
echo -e "${YELLOW}📊 Checking pod status...${NC}"
kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME

# Check service
echo -e "${YELLOW}🌐 Checking service...${NC}"
kubectl get svc -n $NAMESPACE -l app=$SERVICE_NAME

# Get logs to check for any issues
echo -e "${YELLOW}📋 Recent logs from subscription service:${NC}"
kubectl logs -n $NAMESPACE -l app=$SERVICE_NAME --tail=20

# Display deployment status
echo ""
echo -e "${GREEN}✅ Subscription Service Deployment Summary:${NC}"
echo "=================================================="
echo "Namespace: $NAMESPACE"
echo "Service: $SERVICE_NAME"
echo "Replicas: 2 (with auto-scaling 2-10)"
echo "Port: 3003"
echo ""

# Check if all pods are running
RUNNING_PODS=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME --field-selector=status.phase=Running --no-headers | wc -l)
TOTAL_PODS=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME --no-headers | wc -l)

if [ "$RUNNING_PODS" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -gt 0 ]; then
    echo -e "${GREEN}🎉 All pods are running successfully!${NC}"
else
    echo -e "${YELLOW}⚠️ Some pods may still be starting. Check status with:${NC}"
    echo "kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME"
fi

# Display useful commands
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo "Check pods: kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME"
echo "Check logs: kubectl logs -n $NAMESPACE -l app=$SERVICE_NAME -f"
echo "Check service: kubectl get svc -n $NAMESPACE -l app=$SERVICE_NAME"
echo "Port forward: kubectl port-forward -n $NAMESPACE svc/$SERVICE_NAME 3003:3003"
echo ""

# Test service health (if accessible)
echo -e "${YELLOW}🏥 Testing service health...${NC}"
if kubectl get svc -n $NAMESPACE $SERVICE_NAME &> /dev/null; then
    echo "Service is deployed. Test health with:"
    echo "kubectl port-forward -n $NAMESPACE svc/$SERVICE_NAME 3003:3003"
    echo "Then visit: http://localhost:3003/health"
fi

echo -e "${GREEN}🎯 Subscription service deployment completed!${NC}"
