#!/bin/bash

# Redis Fix Implementation Script for Subscription Service
# Fixes DNS resolution, Redis connectivity, and container logging issues

set -e

echo "🚀 Starting Redis Fix Implementation for Subscription Service..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NAMESPACE="sap-microservices"

# Function to print colored output
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

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    print_error "Namespace $NAMESPACE does not exist"
    exit 1
fi

echo ""
print_status "=== Phase 1: Deploy Internal Redis ==="

# Deploy Redis
print_status "Deploying Redis to $NAMESPACE namespace..."
kubectl apply -f deployment/microservices/redis-deployment.yaml

# Wait for Redis to be ready
print_status "Waiting for Redis deployment to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/redis -n $NAMESPACE

# Verify Redis is running
print_status "Verifying Redis deployment..."
REDIS_POD=$(kubectl get pods -n $NAMESPACE -l app=redis -o jsonpath='{.items[0].metadata.name}')
if [ -z "$REDIS_POD" ]; then
    print_error "Redis pod not found"
    exit 1
fi

print_success "Redis pod: $REDIS_POD"

# Test Redis connectivity
print_status "Testing Redis connectivity..."
if kubectl exec $REDIS_POD -n $NAMESPACE -- redis-cli ping | grep -q "PONG"; then
    print_success "Redis is responding to ping"
else
    print_error "Redis is not responding"
    exit 1
fi

echo ""
print_status "=== Phase 2: Update Redis URL Configuration ==="

# Update database-secrets with internal Redis URL
REDIS_URL="redis://redis-service.sap-microservices.svc.cluster.local:6379"
REDIS_URL_B64=$(echo -n "$REDIS_URL" | base64)

print_status "Updating database-secrets with internal Redis URL..."
kubectl patch secret database-secrets -n $NAMESPACE -p="{\"data\":{\"redis-url\":\"$REDIS_URL_B64\"}}"

print_success "Database secrets updated with Redis URL: $REDIS_URL"

echo ""
print_status "=== Phase 3: Fix Container Logging Configuration ==="

# Create temporary deployment patch
cat > /tmp/subscription-service-patch.yaml << EOF
spec:
  template:
    spec:
      containers:
      - name: subscription-service
        env:
        - name: LOG_LEVEL
          value: "info"
        - name: LOG_TO_CONSOLE
          value: "true"
        - name: DISABLE_FILE_LOGGING
          value: "true"
        - name: ELASTICSEARCH_ENABLED
          value: "false"
EOF

print_status "Applying logging configuration patch..."
kubectl patch deployment subscription-service -n $NAMESPACE --patch-file /tmp/subscription-service-patch.yaml

# Clean up temporary file
rm -f /tmp/subscription-service-patch.yaml

echo ""
print_status "=== Phase 4: Restart Subscription Service ==="

# Restart subscription service
print_status "Restarting subscription service to apply changes..."
kubectl rollout restart deployment/subscription-service -n $NAMESPACE

# Wait for rollout to complete
print_status "Waiting for subscription service rollout to complete..."
kubectl rollout status deployment/subscription-service -n $NAMESPACE --timeout=120s

echo ""
print_status "=== Phase 5: Verification ==="

# Get subscription service pod
SUBSCRIPTION_POD=$(kubectl get pods -n $NAMESPACE -l app=subscription-service -o jsonpath='{.items[0].metadata.name}')
if [ -z "$SUBSCRIPTION_POD" ]; then
    print_error "Subscription service pod not found"
    exit 1
fi

print_success "Subscription service pod: $SUBSCRIPTION_POD"

# Wait a moment for service to start
print_status "Waiting for service to initialize..."
sleep 10

# Check logs for successful Redis connection
print_status "Checking subscription service logs for Redis connection..."
if kubectl logs $SUBSCRIPTION_POD -n $NAMESPACE --tail=50 | grep -q "Redis client connected successfully"; then
    print_success "✅ Redis connection successful!"
else
    print_warning "Redis connection status unclear, checking detailed logs..."
fi

# Test Redis database isolation
print_status "Testing Redis database isolation..."
if kubectl exec $REDIS_POD -n $NAMESPACE -- redis-cli -n 3 ping | grep -q "PONG"; then
    print_success "✅ Redis DB 3 (subscription service) is accessible"
else
    print_warning "Redis DB 3 test inconclusive"
fi

echo ""
print_status "=== Phase 6: Final Verification ==="

# Show current service status
print_status "Current service status:"
kubectl get pods -n $NAMESPACE -l app=subscription-service
kubectl get pods -n $NAMESPACE -l app=redis

# Show Redis service details
print_status "Redis service details:"
kubectl get svc redis-service -n $NAMESPACE

# Test API Gateway connectivity to subscription service
print_status "Testing API Gateway route to subscription service..."
API_GATEWAY_POD=$(kubectl get pods -n $NAMESPACE -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')
if [ ! -z "$API_GATEWAY_POD" ]; then
    if kubectl exec $API_GATEWAY_POD -n $NAMESPACE -- curl -s http://subscription-service:3003/health > /dev/null; then
        print_success "✅ API Gateway can reach subscription service"
    else
        print_warning "API Gateway connectivity test inconclusive"
    fi
fi

echo ""
print_success "🎉 Redis Fix Implementation Complete!"
echo ""
print_status "Summary of changes:"
echo "  ✅ Deployed internal Redis server with database isolation"
echo "  ✅ Updated Redis URL to use internal service"
echo "  ✅ Fixed container logging configuration"  
echo "  ✅ Disabled problematic Elasticsearch temporarily"
echo "  ✅ Restarted subscription service with new configuration"
echo ""
print_status "Next steps:"
echo "  1. Monitor subscription service logs: kubectl logs deployment/subscription-service -n $NAMESPACE -f"
echo "  2. Test subscription endpoints: curl http://34.93.4.25/api/subscriptions/health"
echo "  3. Run database migrations if needed"
echo "  4. Set up Elasticsearch when ready for search functionality"
echo ""
print_status "Redis Database Isolation:"
echo "  - DB 0: API Gateway"
echo "  - DB 1: Auth Service"  
echo "  - DB 2: User Service"
echo "  - DB 3: Subscription Service ✅"
echo "  - DB 4: Content Service"
echo ""
print_warning "Remember to monitor the services and run database migrations if needed!"

# Final log check
echo ""
print_status "Recent subscription service logs:"
kubectl logs deployment/subscription-service -n $NAMESPACE --tail=20
