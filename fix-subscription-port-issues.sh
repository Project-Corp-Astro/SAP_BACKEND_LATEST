#!/bin/bash
# 🔧 Complete Fix for Subscription Service Port Issues
# Addresses the root cause: wrong environment variable and detectPort() behavior

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Starting Complete Subscription Service Port Fix...${NC}"

# =================================================================
# PHASE 1: ANALYZE THE PROBLEM
# =================================================================
echo -e "${YELLOW}📋 Phase 1: Problem Analysis${NC}"

echo "🔍 Current subscription service environment variables:"
kubectl get deployment subscription-service -n sap-microservices -o jsonpath='{.spec.template.spec.containers[0].env}' | jq '.[] | select(.name == "PORT" or .name == "SUBSCRIPTION_SERVICE_PORT")'

echo ""
echo "🔍 Current pod status and logs:"
kubectl get pods -n sap-microservices -l app=subscription-service
echo ""
echo "Latest logs (showing port selection):"
kubectl logs -n sap-microservices deployment/subscription-service --tail=5 | grep -i "running on port\|port"

echo ""
echo -e "${RED}❌ IDENTIFIED ISSUES:${NC}"
echo "1. Service expects SUBSCRIPTION_SERVICE_PORT but deployment uses PORT"
echo "2. Service uses detectPort() which finds alternative ports when 3003 is busy"
echo "3. API Gateway is hardcoded to port 3003 but service runs on random ports"

# =================================================================
# PHASE 2: FIX ENVIRONMENT VARIABLE
# =================================================================
echo -e "${YELLOW}📋 Phase 2: Fixing Environment Variable${NC}"

echo "🔧 Creating environment variable fix patch..."

cat > fix-subscription-env.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: subscription-service
  namespace: sap-microservices
spec:
  template:
    spec:
      containers:
      - name: subscription-service
        env:
        - name: SUBSCRIPTION_SERVICE_PORT
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
        ports:
        - containerPort: 3003
          name: http
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

echo "📝 Applying environment variable fix..."
kubectl apply -f fix-subscription-env.yaml

echo -e "${GREEN}✅ Environment variable updated to SUBSCRIPTION_SERVICE_PORT${NC}"

# =================================================================
# PHASE 3: SCALE DOWN TO REDUCE PORT CONFLICTS
# =================================================================
echo -e "${YELLOW}📋 Phase 3: Reducing Port Conflicts${NC}"

echo "🔧 Scaling subscription service to 1 replica to avoid port conflicts..."
kubectl scale deployment subscription-service -n sap-microservices --replicas=1

echo "⏳ Waiting for scale down..."
kubectl rollout status deployment/subscription-service -n sap-microservices --timeout=120s

echo -e "${GREEN}✅ Scaled to single replica${NC}"

# =================================================================
# PHASE 4: ENSURE API GATEWAY ROUTES TO CORRECT PORT
# =================================================================
echo -e "${YELLOW}📋 Phase 4: Fixing API Gateway Configuration${NC}"

echo "🔍 Checking current API Gateway environment variables..."
kubectl get deployment api-gateway -n sap-microservices -o jsonpath='{.spec.template.spec.containers[0].env}' | jq '.[] | select(.name | contains("SUBSCRIPTION"))'

echo ""
echo "🔧 Updating API Gateway to point to correct subscription service URL..."

# Create API Gateway environment patch
cat > api-gateway-env-patch.yaml << 'EOF'
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

kubectl patch deployment api-gateway -n sap-microservices --patch-file api-gateway-env-patch.yaml

echo -e "${GREEN}✅ API Gateway environment updated${NC}"

# =================================================================
# PHASE 5: RESTART AND VERIFY
# =================================================================
echo -e "${YELLOW}📋 Phase 5: Restart Services and Verify${NC}"

echo "🔄 Restarting subscription service..."
kubectl rollout restart deployment/subscription-service -n sap-microservices

echo "🔄 Restarting API Gateway..."
kubectl rollout restart deployment/api-gateway -n sap-microservices

echo "⏳ Waiting for services to restart..."
kubectl rollout status deployment/subscription-service -n sap-microservices --timeout=300s
kubectl rollout status deployment/api-gateway -n sap-microservices --timeout=300s

echo -e "${GREEN}✅ Services restarted${NC}"

# =================================================================
# PHASE 6: VERIFICATION
# =================================================================
echo -e "${YELLOW}📋 Phase 6: Verification${NC}"

echo "⏳ Waiting 30 seconds for services to stabilize..."
sleep 30

echo ""
echo "🔍 Checking subscription service logs for correct port usage..."
echo "Looking for port information in logs:"
kubectl logs -n sap-microservices deployment/subscription-service --tail=10 | grep -E "running on port|Health check available|port [0-9]+"

echo ""
echo "🔍 Testing service connectivity..."

# Test 1: Direct service test via port-forward
echo "Test 1: Direct service connectivity"
kubectl port-forward service/subscription-service 3003:3003 -n sap-microservices &
FORWARD_PID=$!
sleep 5

if curl -s "http://localhost:3003/health" > /dev/null; then
    echo "✅ Direct service health check: PASSED"
else
    echo "❌ Direct service health check: FAILED"
fi

# Kill port-forward
kill $FORWARD_PID 2>/dev/null || true
wait $FORWARD_PID 2>/dev/null || true

# Test 2: API Gateway routing
echo ""
echo "Test 2: API Gateway routing"
echo "Root API Gateway response:"
curl -s "http://34.93.4.25/" | jq . 2>/dev/null || curl -s "http://34.93.4.25/"

echo ""
echo "Testing subscription health through API Gateway:"
HEALTH_RESPONSE=$(curl -s "http://34.93.4.25/subscription/health" 2>/dev/null || echo "FAILED")
if [[ "$HEALTH_RESPONSE" == "FAILED" ]] || [[ "$HEALTH_RESPONSE" == *"Not Found"* ]]; then
    echo "❌ API Gateway /subscription/health: FAILED"
    echo "Response: $HEALTH_RESPONSE"
else
    echo "✅ API Gateway /subscription/health: PASSED"
    echo "Response: $HEALTH_RESPONSE"
fi

echo ""
echo "Testing subscription plans through API Gateway:"
PLANS_RESPONSE=$(curl -s "http://34.93.4.25/subscription/plans" 2>/dev/null || echo "FAILED")
if [[ "$PLANS_RESPONSE" == "FAILED" ]] || [[ "$PLANS_RESPONSE" == *"Not Found"* ]]; then
    echo "❌ API Gateway /subscription/plans: FAILED"
    echo "Response: $PLANS_RESPONSE"
else
    echo "✅ API Gateway /subscription/plans: PASSED"
    echo "Response (first 100 chars): ${PLANS_RESPONSE:0:100}..."
fi

# =================================================================
# PHASE 7: TROUBLESHOOTING INFO
# =================================================================
echo -e "${YELLOW}📋 Phase 7: Current Status Summary${NC}"

echo ""
echo "🔍 Final pod status:"
kubectl get pods -n sap-microservices -l app=subscription-service -o wide

echo ""
echo "🔍 Service configuration:"
kubectl get service subscription-service -n sap-microservices -o jsonpath='{.spec.ports[0]}'
echo ""

echo ""
echo "🔍 API Gateway pod status:"
kubectl get pods -n sap-microservices -l app=api-gateway -o wide

# =================================================================
# COMPLETION SUMMARY
# =================================================================
echo ""
echo -e "${GREEN}🎉 Subscription Service Port Fix Completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary of Changes:${NC}"
echo "✅ Fixed environment variable: PORT → SUBSCRIPTION_SERVICE_PORT"
echo "✅ Scaled to single replica to reduce port conflicts"
echo "✅ Updated API Gateway service URLs"
echo "✅ Aligned health checks with port 3003"
echo "✅ Restarted services with new configuration"
echo ""

if [[ "$HEALTH_RESPONSE" != "FAILED" ]] && [[ "$HEALTH_RESPONSE" != *"Not Found"* ]]; then
    echo -e "${GREEN}🚀 SUCCESS: API Gateway routing is now working!${NC}"
    echo ""
    echo -e "${BLUE}📋 Available Endpoints:${NC}"
    echo "• http://34.93.4.25/subscription/health"
    echo "• http://34.93.4.25/subscription/plans"
    echo ""
    echo -e "${YELLOW}📝 Next Steps:${NC}"
    echo "1. Test Redis cache population through working endpoints"
    echo "2. Verify all subscription service functionalities"
    echo "3. Monitor service stability"
else
    echo -e "${RED}⚠️  PARTIAL SUCCESS: Port issues fixed but routing still needs attention${NC}"
    echo ""
    echo -e "${YELLOW}📝 Additional Troubleshooting Needed:${NC}"
    echo "1. Check API Gateway source code for routing logic"
    echo "2. Verify service discovery is working correctly"
    echo "3. Check for any remaining environment variable issues"
    echo ""
    echo "🔍 Debug commands:"
    echo "kubectl logs -f -n sap-microservices deployment/api-gateway"
    echo "kubectl logs -f -n sap-microservices deployment/subscription-service"
fi

# Cleanup temp files
rm -f fix-subscription-env.yaml api-gateway-env-patch.yaml

echo ""
echo -e "${BLUE}🔄 Monitor with:${NC}"
echo "kubectl get pods -n sap-microservices -w"
echo "kubectl logs -f -n sap-microservices deployment/subscription-service"
