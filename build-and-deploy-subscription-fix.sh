#!/bin/bash
# 🔧 Complete Fix: Build and Deploy Subscription Service with Port Fix
# Fixes the detectPort() issue and environment variable handling

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Building and Deploying Fixed Subscription Service...${NC}"

# =================================================================
# PHASE 1: BUILD UPDATED DOCKER IMAGE
# =================================================================
echo -e "${YELLOW}📋 Phase 1: Building Updated Docker Image${NC}"

echo "🔧 Building subscription service with fixed port handling..."
cd backend/services/subscription-management-service

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t subscription-service:port-fix .

# Tag for GCR
echo "🏷️ Tagging for Google Container Registry..."
docker tag subscription-service:port-fix gcr.io/sap-project-466005/subscription-service:port-fix

# Push to GCR
echo "📤 Pushing to Google Container Registry..."
docker push gcr.io/sap-project-466005/subscription-service:port-fix

cd ../../..

echo -e "${GREEN}✅ Docker image built and pushed${NC}"

# =================================================================
# PHASE 2: UPDATE KUBERNETES DEPLOYMENT
# =================================================================
echo -e "${YELLOW}📋 Phase 2: Updating Kubernetes Deployment${NC}"

echo "🔧 Creating deployment patch with new image and environment variables..."

cat > fix-subscription-complete.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: subscription-service
  namespace: sap-microservices
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: subscription-service
        image: gcr.io/sap-project-466005/subscription-service:port-fix
        ports:
        - containerPort: 3003
          name: http
        env:
        - name: SUBSCRIPTION_SERVICE_PORT
          value: "3003"
        - name: PORT
          value: "3003"
        - name: LOG_LEVEL
          value: "info"
        - name: LOG_TO_CONSOLE
          value: "true"
        - name: DISABLE_FILE_LOGGING
          value: "true"
        - name: ELASTICSEARCH_ENABLED
          value: "false"
        - name: NODE_ENV
          value: "production"
        - name: SERVICE_NAME
          value: "subscription-service"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              key: redis-url
              name: database-secrets
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              key: supabase-url
              name: supabase-secrets
        - name: SUPABASE_ANON_KEY
          valueFrom:
            secretKeyRef:
              key: supabase-anon-key
              name: supabase-secrets
        - name: SUPABASE_SERVICE_KEY
          valueFrom:
            secretKeyRef:
              key: supabase-service-key
              name: supabase-secrets
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              key: jwt-secret
              name: auth-secrets
        - name: USER_SERVICE_PERMISSION_API_URL
          valueFrom:
            configMapKeyRef:
              key: USER_SERVICE_URL
              name: microservices-config
        livenessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 90
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 5
        readinessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 60
          periodSeconds: 15
          timeoutSeconds: 5
          failureThreshold: 3
        resources:
          limits:
            memory: "1Gi"
            cpu: "500m"
          requests:
            memory: "512Mi"
            cpu: "250m"
EOF

echo "📝 Applying complete subscription service fix..."
kubectl apply -f fix-subscription-complete.yaml

echo -e "${GREEN}✅ Deployment updated with new image and environment${NC}"

# =================================================================
# PHASE 3: UPDATE API GATEWAY CONFIGURATION
# =================================================================
echo -e "${YELLOW}📋 Phase 3: Ensuring API Gateway Configuration${NC}"

echo "🔧 Updating API Gateway environment variables..."

cat > api-gateway-env-fix.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: sap-microservices
spec:
  template:
    spec:
      containers:
      - name: api-gateway
        env:
        - name: SUBSCRIPTION_SERVICE_URL
          value: "http://subscription-service.sap-microservices.svc.cluster.local:3003"
        - name: CONTENT_SERVICE_URL
          value: "http://content-service.sap-microservices.svc.cluster.local:3003"
        - name: USER_SERVICE_URL
          value: "http://user-service.sap-microservices.svc.cluster.local:3002"
        - name: AUTH_SERVICE_URL
          value: "http://auth-service.sap-microservices.svc.cluster.local:3001"
EOF

kubectl patch deployment api-gateway -n sap-microservices --patch-file api-gateway-env-fix.yaml

echo -e "${GREEN}✅ API Gateway configuration updated${NC}"

# =================================================================
# PHASE 4: RESTART AND VERIFY
# =================================================================
echo -e "${YELLOW}📋 Phase 4: Restart and Verification${NC}"

echo "🔄 Waiting for deployment rollout..."
kubectl rollout status deployment/subscription-service -n sap-microservices --timeout=300s

echo "🔄 Restarting API Gateway..."
kubectl rollout restart deployment/api-gateway -n sap-microservices
kubectl rollout status deployment/api-gateway -n sap-microservices --timeout=300s

echo "⏳ Waiting 30 seconds for services to stabilize..."
sleep 30

echo ""
echo "🔍 Checking subscription service logs for correct port usage..."
kubectl logs -n sap-microservices deployment/subscription-service --tail=10

echo ""
echo "🔍 Testing service connectivity..."

# Test direct service
echo "Testing direct service health..."
kubectl port-forward service/subscription-service 3003:3003 -n sap-microservices &
FORWARD_PID=$!
sleep 5

DIRECT_TEST=$(curl -s "http://localhost:3003/health" 2>/dev/null || echo "FAILED")
if [[ "$DIRECT_TEST" == "FAILED" ]]; then
    echo "❌ Direct service test: FAILED"
else
    echo "✅ Direct service test: PASSED"
    echo "Response: $DIRECT_TEST"
fi

kill $FORWARD_PID 2>/dev/null || true
wait $FORWARD_PID 2>/dev/null || true

# Test API Gateway
echo ""
echo "Testing API Gateway routing..."
API_HEALTH=$(curl -s "http://34.93.4.25/subscription/health" 2>/dev/null || echo "FAILED")
if [[ "$API_HEALTH" == "FAILED" ]] || [[ "$API_HEALTH" == *"Not Found"* ]]; then
    echo "❌ API Gateway health test: FAILED"
    echo "Response: $API_HEALTH"
else
    echo "✅ API Gateway health test: PASSED"
    echo "Response: $API_HEALTH"
fi

API_PLANS=$(curl -s "http://34.93.4.25/subscription/plans" 2>/dev/null || echo "FAILED")
if [[ "$API_PLANS" == "FAILED" ]] || [[ "$API_PLANS" == *"Not Found"* ]]; then
    echo "❌ API Gateway plans test: FAILED"
    echo "Response: $API_PLANS"
else
    echo "✅ API Gateway plans test: PASSED"
    echo "Response (first 100 chars): ${API_PLANS:0:100}..."
fi

# =================================================================
# COMPLETION SUMMARY
# =================================================================
echo ""
echo -e "${GREEN}🎉 Complete Subscription Service Fix Applied!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary of Changes:${NC}"
echo "✅ Fixed source code: Removed detectPort() automatic port selection"
echo "✅ Updated config: Added PORT fallback to SUBSCRIPTION_SERVICE_PORT"
echo "✅ Built new Docker image with fixes"
echo "✅ Updated Kubernetes deployment with new image"
echo "✅ Set both SUBSCRIPTION_SERVICE_PORT and PORT environment variables"
echo "✅ Scaled to single replica to avoid port conflicts"
echo "✅ Updated API Gateway service URLs"
echo ""

if [[ "$API_HEALTH" != "FAILED" ]] && [[ "$API_HEALTH" != *"Not Found"* ]]; then
    echo -e "${GREEN}🚀 SUCCESS: Subscription service is now working correctly!${NC}"
    echo ""
    echo -e "${BLUE}📋 Available Endpoints:${NC}"
    echo "• http://34.93.4.25/subscription/health"
    echo "• http://34.93.4.25/subscription/plans" 
    echo ""
    echo -e "${YELLOW}📝 Next Steps:${NC}"
    echo "1. Test Redis cache population with working endpoints"
    echo "2. Verify all subscription service functionalities"
    echo "3. Test the full user subscription flow"
else
    echo -e "${YELLOW}⚠️  Deployment completed but routing may need additional attention${NC}"
    echo ""
    echo "🔍 Additional debugging steps:"
    echo "kubectl describe pod -n sap-microservices -l app=subscription-service"
    echo "kubectl logs -f -n sap-microservices deployment/api-gateway"
fi

# Cleanup
rm -f fix-subscription-complete.yaml api-gateway-env-fix.yaml

echo ""
echo -e "${BLUE}🔄 Monitor with:${NC}"
echo "kubectl get pods -n sap-microservices -w"
echo "kubectl logs -f -n sap-microservices deployment/subscription-service"
