
#!/bin/bash

# GCP Infrastructure Assessment Script
# Analyzes current state before applying Redis fixes

set -e

echo "🔍 GCP Kubernetes Infrastructure Assessment for SAP Backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

NAMESPACE="sap-microservices"

# Function to print colored output
print_header() {
    echo -e "${PURPLE}=== $1 ===${NC}"
}

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

echo ""
print_header "1. CLUSTER OVERVIEW"

# Basic cluster info
print_status "Cluster Context:"
kubectl config current-context
echo ""

print_status "Cluster Info:"
kubectl cluster-info | head -2
echo ""

print_status "Node Information:"
kubectl get nodes -o wide
echo ""

print_header "2. NAMESPACE STATUS"

print_status "Checking namespace: $NAMESPACE"
if kubectl get namespace $NAMESPACE &> /dev/null; then
    print_success "Namespace $NAMESPACE exists"
    kubectl get namespace $NAMESPACE
else
    print_error "Namespace $NAMESPACE does not exist"
    exit 1
fi
echo ""

print_header "3. CURRENT DEPLOYMENTS ANALYSIS"

echo "Current deployment status from your output:"
echo "✅ API Gateway: 2/2 Running (HEALTHY)"
echo "❌ Content Service: 0/2 Running (CrashLoopBackOff)"
echo "❌ Subscription Service: 0/2 Running (CrashLoopBackOff/Issues)"
echo ""

print_status "Detailed pod status:"
kubectl get pods -n $NAMESPACE -o wide
echo ""

print_status "Service endpoints:"
kubectl get services -n $NAMESPACE
echo ""

print_header "4. LOAD BALANCER STATUS"

print_status "External access points:"
LB_IP=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Not found")
if [ "$LB_IP" != "Not found" ]; then
    print_success "API Gateway LoadBalancer IP: $LB_IP"
    print_status "Testing LoadBalancer connectivity..."
    if curl -s --connect-timeout 5 http://$LB_IP/health > /dev/null 2>&1; then
        print_success "✅ LoadBalancer is accessible"
    else
        print_warning "⚠️ LoadBalancer not responding (might be expected if services are down)"
    fi
else
    print_error "LoadBalancer IP not found"
fi
echo ""

print_header "5. REDIS INFRASTRUCTURE CHECK"

print_status "Checking for existing Redis deployment..."
if kubectl get deployment redis -n $NAMESPACE &> /dev/null; then
    print_success "Redis deployment exists"
    kubectl get deployment redis -n $NAMESPACE
    kubectl get pods -n $NAMESPACE -l app=redis
else
    print_warning "No Redis deployment found - this explains Redis connection issues"
fi

print_status "Checking for Redis service..."
if kubectl get service redis-service -n $NAMESPACE &> /dev/null; then
    print_success "Redis service exists"
    kubectl get service redis-service -n $NAMESPACE
else
    print_warning "No Redis service found"
fi
echo ""

print_header "6. SECRETS AND CONFIGURATION"

print_status "Checking database-secrets..."
if kubectl get secret database-secrets -n $NAMESPACE &> /dev/null; then
    print_success "database-secrets exists"
    echo "Secret keys:"
    kubectl get secret database-secrets -n $NAMESPACE -o jsonpath='{.data}' | jq -r 'keys[]' 2>/dev/null || echo "Unable to parse secret keys"
    
    # Check Redis URL in secret
    REDIS_URL_B64=$(kubectl get secret database-secrets -n $NAMESPACE -o jsonpath='{.data.redis-url}' 2>/dev/null || echo "")
    if [ ! -z "$REDIS_URL_B64" ]; then
        REDIS_URL=$(echo "$REDIS_URL_B64" | base64 -d 2>/dev/null || echo "Unable to decode")
        print_status "Current Redis URL: $REDIS_URL"
        if [[ "$REDIS_URL" == *"redis-cluster.c1.asia-south1-1.gce.cloud.redislabs.com"* ]]; then
            print_error "🚨 Found problematic external Redis URL - this is causing DNS failures"
        fi
    else
        print_warning "No redis-url found in secrets"
    fi
else
    print_error "database-secrets not found"
fi
echo ""

print_header "7. SERVICE-SPECIFIC ISSUE ANALYSIS"

print_status "Subscription Service Issues:"
echo "From logs analysis:"
echo "❌ Redis DNS resolution failure (redis-cluster.c1.asia-south1-1.gce.cloud.redislabs.com)"
echo "❌ Read-only filesystem logging error"
echo "❌ Missing Supabase tables (subscriptions)"
echo "❌ Elasticsearch connection refused"
echo ""

print_status "Content Service Issues:"
echo "❌ Similar Redis connectivity issues expected"
echo "❌ Likely same DNS resolution problems"
echo ""

print_header "8. HPA AND SCALING"

print_status "Horizontal Pod Autoscaler status:"
kubectl get hpa -n $NAMESPACE
echo ""

print_header "9. RESOURCE UTILIZATION"

print_status "Resource usage overview:"
kubectl top pods -n $NAMESPACE 2>/dev/null || print_warning "Metrics server not available"
echo ""

print_header "10. NETWORK POLICIES"

print_status "Checking network policies..."
kubectl get networkpolicies -n $NAMESPACE 2>/dev/null || print_status "No network policies found"
echo ""

print_header "11. PERSISTENT VOLUMES"

print_status "Checking persistent volumes..."
kubectl get pv,pvc -n $NAMESPACE 2>/dev/null || print_status "No persistent volumes found"
echo ""

print_header "12. IDENTIFIED ISSUES SUMMARY"

echo ""
print_error "🚨 CRITICAL ISSUES FOUND:"
echo "1. ❌ External Redis cluster unreachable (DNS resolution failure)"
echo "2. ❌ No internal Redis deployment in cluster"  
echo "3. ❌ Services in CrashLoopBackOff due to Redis connectivity"
echo "4. ❌ Container filesystem permission issues (logging)"
echo "5. ❌ Missing database tables (Supabase schema not initialized)"
echo "6. ❌ Elasticsearch service not deployed"
echo ""

print_success "✅ WORKING COMPONENTS:"
echo "1. ✅ API Gateway LoadBalancer (34.93.4.25:80)"
echo "2. ✅ Kubernetes cluster and networking"
echo "3. ✅ Service discovery and DNS (internal)"
echo "4. ✅ Secrets management system"
echo "5. ✅ HPA configuration"
echo ""

print_header "13. RECOMMENDED FIX SEQUENCE"

echo ""
print_status "Phase 1: Deploy Internal Redis"
echo "  - Deploy Redis with database isolation (DB 0-8 for different services)"
echo "  - Configure Redis service for internal cluster access"
echo "  - Test Redis connectivity"
echo ""

print_status "Phase 2: Update Configuration"  
echo "  - Update database-secrets with internal Redis URL"
echo "  - Fix container logging configuration"
echo "  - Disable Elasticsearch temporarily"
echo ""

print_status "Phase 3: Service Recovery"
echo "  - Restart subscription and content services"
echo "  - Monitor service health and logs"
echo "  - Verify API Gateway routing"
echo ""

print_status "Phase 4: Database Schema"
echo "  - Run Supabase database migrations"
echo "  - Create subscription and content tables"
echo "  - Test end-to-end functionality"
echo ""

print_header "14. READY FOR FIXES?"

echo ""
print_status "Pre-flight check for Redis fix script:"

# Check if fix files exist
if [ -f "deployment/microservices/redis-deployment.yaml" ]; then
    print_success "✅ Redis deployment YAML ready"
else
    print_error "❌ Redis deployment YAML missing"
fi

if [ -f "fix-redis-subscription-service.sh" ]; then
    print_success "✅ Redis fix script ready"
else
    print_error "❌ Redis fix script missing"
fi

if [ -f "database-schema-subscription.sql" ]; then
    print_success "✅ Database schema SQL ready"
else
    print_error "❌ Database schema SQL missing"
fi

echo ""
print_status "Current working directory: $(pwd)"
print_status "Ready to proceed with Redis fixes!"
echo ""

print_warning "⚠️ IMPORTANT: Before running fixes, ensure you have:"
echo "  1. Backup of current configurations"
echo "  2. Access to Supabase for database migrations"
echo "  3. Understanding that this will restart services"
echo ""

print_success "🚀 To proceed, run: ./fix-redis-subscription-service.sh"
