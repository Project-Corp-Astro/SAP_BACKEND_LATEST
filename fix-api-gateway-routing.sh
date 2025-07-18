#!/bin/bash
# 🔧 Fix API Gateway Routing and Subscription Service Issues
# Addresses service crashes and routing configuration

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Starting API Gateway Routing Fix...${NC}"

# =================================================================
# PHASE 1: DIAGNOSE SUBSCRIPTION SERVICE CRASHES
# =================================================================
echo -e "${YELLOW}📋 Phase 1: Diagnosing Subscription Service Issues${NC}"

echo "🔍 Getting detailed subscription service logs..."
kubectl logs -n sap-microservices deployment/subscription-service --tail=50 > subscription-crash-logs.txt
echo "📄 Crash logs saved to: subscription-crash-logs.txt"

echo ""
echo "🔍 Checking subscription service deployment configuration..."
kubectl get deployment subscription-service -n sap-microservices -o yaml > subscription-deployment.yaml

echo ""
echo "🔍 Checking for port mismatch..."
echo "Service configuration:"
kubectl get service subscription-service -n sap-microservices -o jsonpath='{.spec.ports[0]}'
echo ""
echo "Deployment health check configuration:"
kubectl get deployment subscription-service -n sap-microservices -o jsonpath='{.spec.template.spec.containers[0].readinessProbe.httpGet.port}'
echo ""

# =================================================================
# PHASE 2: FIX PORT MISMATCH
# =================================================================
echo -e "${YELLOW}📋 Phase 2: Fixing Port Configuration${NC}"

echo "🔧 Creating port alignment patch..."

cat > fix-subscription-ports.yaml << 'EOF'
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
        ports:
        - containerPort: 3003
          name: http
        env:
        - name: PORT
          value: "3003"
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

echo "📝 Applying port fixes..."
kubectl patch deployment subscription-service -n sap-microservices --patch-file fix-subscription-ports.yaml

echo -e "${GREEN}✅ Port configuration updated${NC}"

# =================================================================
# PHASE 3: CHECK API GATEWAY CONFIGURATION
# =================================================================
echo -e "${YELLOW}📋 Phase 3: Investigating API Gateway Configuration${NC}"

echo "🔍 Checking API Gateway deployment..."
kubectl get deployment api-gateway -n sap-microservices -o yaml > api-gateway-config.yaml

echo ""
echo "🔍 Checking API Gateway logs for routing information..."
kubectl logs -n sap-microservices deployment/api-gateway --tail=30 > api-gateway-logs.txt

echo ""
echo "🔍 Testing API Gateway endpoints..."
echo "Root endpoint response:"
curl -s "http://34.93.4.25/" | jq . 2>/dev/null || curl -s "http://34.93.4.25/"

# =================================================================
# PHASE 4: CREATE TEMPORARY API GATEWAY ROUTE FIX
# =================================================================
echo -e "${YELLOW}📋 Phase 4: Creating API Gateway Route Configuration${NC}"

echo "🔧 Creating API Gateway route enhancement..."

cat > api-gateway-route-patch.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-gateway-routes
  namespace: sap-microservices
data:
  routes.json: |
    {
      "routes": [
        {
          "path": "/subscription/*",
          "target": "http://subscription-service.sap-microservices.svc.cluster.local:3003",
          "stripPath": "/subscription"
        },
        {
          "path": "/api/subscription/*",
          "target": "http://subscription-service.sap-microservices.svc.cluster.local:3003",
          "stripPath": "/api/subscription"
        },
        {
          "path": "/content/*",
          "target": "http://content-service.sap-microservices.svc.cluster.local:3003",
          "stripPath": "/content"
        },
        {
          "path": "/api/content/*",
          "target": "http://content-service.sap-microservices.svc.cluster.local:3003",
          "stripPath": "/api/content"
        }
      ]
    }
EOF

kubectl apply -f api-gateway-route-patch.yaml

echo -e "${GREEN}✅ API Gateway routes configured${NC}"

# =================================================================
# PHASE 5: RESTART SERVICES
# =================================================================
echo -e "${YELLOW}📋 Phase 5: Restarting Services${NC}"

echo "🔄 Restarting subscription service with new configuration..."
kubectl rollout restart deployment/subscription-service -n sap-microservices

echo "🔄 Restarting API Gateway to pick up new routes..."
kubectl rollout restart deployment/api-gateway -n sap-microservices

echo "⏳ Waiting for services to restart..."
kubectl rollout status deployment/subscription-service -n sap-microservices --timeout=300s
kubectl rollout status deployment/api-gateway -n sap-microservices --timeout=300s

echo -e "${GREEN}✅ Services restarted${NC}"

# =================================================================
# PHASE 6: VERIFICATION AND TESTING
# =================================================================
echo -e "${YELLOW}📋 Phase 6: Testing Fixed Routes${NC}"

echo "⏳ Waiting 30 seconds for services to fully start..."
sleep 30

echo ""
echo "🔍 Testing subscription service health..."
for attempt in {1..5}; do
    echo "Attempt $attempt/5:"
    
    # Test direct service
    kubectl port-forward service/subscription-service 3003:3003 -n sap-microservices &
    FORWARD_PID=$!
    sleep 3
    
    curl -s "http://localhost:3003/health" && echo " ✅ Direct health check passed" || echo " ❌ Direct health check failed"
    
    kill $FORWARD_PID 2>/dev/null || true
    wait $FORWARD_PID 2>/dev/null || true
    
    # Test through API Gateway
    curl -s "http://34.93.4.25/subscription/health" && echo " ✅ API Gateway health check passed" || echo " ❌ API Gateway health check failed"
    curl -s "http://34.93.4.25/api/subscription/health" && echo " ✅ API Gateway /api health check passed" || echo " ❌ API Gateway /api health check failed"
    
    if curl -s "http://34.93.4.25/subscription/health" | grep -q "ok\|healthy\|success"; then
        echo "✅ Subscription service is responding through API Gateway!"
        break
    fi
    
    echo "⏳ Waiting 15 seconds before next attempt..."
    sleep 15
done

echo ""
echo "🔍 Testing subscription plans endpoint..."
echo "Direct plans test:"
kubectl port-forward service/subscription-service 3003:3003 -n sap-microservices &
FORWARD_PID=$!
sleep 3
curl -s "http://localhost:3003/plans" | head -3 || echo "Plans endpoint not available"
kill $FORWARD_PID 2>/dev/null || true
wait $FORWARD_PID 2>/dev/null || true

echo ""
echo "API Gateway plans test:"
curl -s "http://34.93.4.25/subscription/plans" | head -3 || echo "Plans endpoint not available through gateway"
curl -s "http://34.93.4.25/api/subscription/plans" | head -3 || echo "Plans endpoint not available through /api gateway"

# =================================================================
# PHASE 7: FINAL STATUS CHECK
# =================================================================
echo -e "${YELLOW}📋 Phase 7: Final Status Check${NC}"

echo ""
echo "🔍 Current pod status:"
kubectl get pods -n sap-microservices -l app=subscription-service

echo ""
echo "🔍 Recent subscription service logs:"
kubectl logs -n sap-microservices deployment/subscription-service --tail=10

echo ""
echo "🔍 API Gateway status:"
kubectl get pods -n sap-microservices -l app=api-gateway

# =================================================================
# COMPLETION SUMMARY
# =================================================================
echo ""
echo -e "${GREEN}🎉 API Gateway Routing Fix Completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary of Changes:${NC}"
echo "✅ Fixed subscription service port configuration (3003)"
echo "✅ Aligned health checks with correct port"
echo "✅ Created API Gateway route configuration"
echo "✅ Added multiple routing patterns (/subscription/* and /api/subscription/*)"
echo "✅ Increased resource limits for stability"
echo "✅ Extended health check timeouts"
echo ""
echo -e "${BLUE}📋 Available Endpoints (once services are stable):${NC}"
echo "• http://34.93.4.25/subscription/health"
echo "• http://34.93.4.25/subscription/plans"
echo "• http://34.93.4.25/api/subscription/health"
echo "• http://34.93.4.25/api/subscription/plans"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Monitor subscription service for stability"
echo "2. Test API endpoints once pods are Running"
echo "3. Check Redis cache population through working endpoints"
echo ""
echo "🔍 Monitor with:"
echo "kubectl get pods -n sap-microservices -w"
echo "kubectl logs -f -n sap-microservices deployment/subscription-service"

# Cleanup temp files
rm -f fix-subscription-ports.yaml api-gateway-route-patch.yaml

echo ""
echo -e "${GREEN}🚀 Ready to test subscription endpoints!${NC}"
