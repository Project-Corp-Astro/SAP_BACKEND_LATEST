#!/bin/bash

# 🔒 SAP Backend HTTPS Setup Script
# This script installs NGINX Ingress Controller and cert-manager for HTTPS access

set -e

echo "🚀 Setting up HTTPS for SAP Backend Microservices..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo -e "${YELLOW}⚠️  Helm not found, installing via kubectl apply...${NC}"
    INSTALL_METHOD="kubectl"
else
    echo -e "${GREEN}✅ Helm found, using Helm installation${NC}"
    INSTALL_METHOD="helm"
fi

echo -e "${BLUE}📋 Step 1: Installing NGINX Ingress Controller${NC}"

# Install NGINX Ingress Controller
if [[ "$INSTALL_METHOD" == "helm" ]]; then
    # Install via Helm (recommended)
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=LoadBalancer \
        --set controller.service.loadBalancerSourceRanges='{0.0.0.0/0}' \
        --set controller.replicaCount=2 \
        --set controller.resources.requests.cpu=100m \
        --set controller.resources.requests.memory=90Mi \
        --set controller.service.annotations."cloud\.google\.com/load-balancer-type"="External"
else
    # Install via kubectl
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
fi

echo -e "${BLUE}📋 Step 2: Waiting for NGINX Ingress Controller to be ready${NC}"

# Wait for ingress controller to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

echo -e "${BLUE}📋 Step 3: Installing cert-manager${NC}"

if [[ "$INSTALL_METHOD" == "helm" ]]; then
    # Install cert-manager via Helm
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --set installCRDs=true \
        --set global.leaderElection.namespace=cert-manager
else
    # Install cert-manager via kubectl
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
fi

echo -e "${BLUE}📋 Step 4: Waiting for cert-manager to be ready${NC}"

# Wait for cert-manager to be ready
kubectl wait --for=condition=available --timeout=300s --namespace cert-manager deployment --all

echo -e "${BLUE}📋 Step 5: Applying HTTPS Ingress configuration${NC}"

# Apply the HTTPS Ingress configuration
kubectl apply -f deployment/microservices/https-ingress-setup.yaml

echo -e "${BLUE}📋 Step 6: Getting external IP addresses${NC}"

# Get the NGINX Ingress external IP
echo -e "${YELLOW}⏳ Waiting for NGINX Ingress external IP...${NC}"
sleep 30

NGINX_EXTERNAL_IP=""
for i in {1..10}; do
    NGINX_EXTERNAL_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [[ -n "$NGINX_EXTERNAL_IP" ]]; then
        break
    fi
    echo -e "${YELLOW}⏳ Waiting for external IP assignment... (attempt $i/10)${NC}"
    sleep 15
done

if [[ -n "$NGINX_EXTERNAL_IP" ]]; then
    echo -e "${GREEN}✅ NGINX Ingress External IP: $NGINX_EXTERNAL_IP${NC}"
else
    echo -e "${YELLOW}⚠️  External IP not assigned yet. Check later with:${NC}"
    echo "kubectl get service ingress-nginx-controller -n ingress-nginx"
fi

# Get API Gateway LoadBalancer IP
API_GATEWAY_IP=$(kubectl get service api-gateway -n sap-microservices -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

echo -e "${GREEN}📊 Setup Summary:${NC}"
echo -e "${GREEN}✅ NGINX Ingress Controller: Installed${NC}"
echo -e "${GREEN}✅ cert-manager: Installed${NC}"
echo -e "${GREEN}✅ HTTPS Ingress: Applied${NC}"

echo -e "${BLUE}🌐 Access URLs:${NC}"
if [[ -n "$NGINX_EXTERNAL_IP" ]]; then
    echo -e "${GREEN}🔒 HTTPS URL (with automatic SSL): https://${NGINX_EXTERNAL_IP}.nip.io${NC}"
    echo -e "${GREEN}🔓 HTTP URL (redirects to HTTPS): http://${NGINX_EXTERNAL_IP}.nip.io${NC}"
fi

if [[ -n "$API_GATEWAY_IP" ]]; then
    echo -e "${YELLOW}📡 Direct API Gateway (HTTP): http://${API_GATEWAY_IP}${NC}"
fi

echo -e "${BLUE}🔍 Monitoring Commands:${NC}"
echo "kubectl get ingress -n sap-microservices"
echo "kubectl describe ingress sap-backend-nip-ingress -n sap-microservices"
echo "kubectl get certificate -n sap-microservices"
echo "kubectl get pods -n ingress-nginx"
echo "kubectl get pods -n cert-manager"

echo -e "${GREEN}🎉 HTTPS setup complete! Your API Gateway now supports both HTTP and HTTPS access.${NC}"
echo -e "${YELLOW}📝 Note: SSL certificates may take 2-5 minutes to be issued by Let's Encrypt.${NC}"
