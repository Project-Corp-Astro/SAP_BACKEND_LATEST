#!/bin/bash
# 🔧 Fix Service Startup Issues - Comprehensive Solution
# Addresses Elasticsearch, Supabase tables, and health check failures

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Starting Service Startup Issues Fix...${NC}"

# =================================================================
# PHASE 1: DEPLOY ELASTICSEARCH
# =================================================================
echo -e "${YELLOW}📋 Phase 1: Deploying Elasticsearch${NC}"

echo "🔍 Deploying Elasticsearch for search functionality..."

cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elasticsearch
  namespace: sap-microservices
  labels:
    app: elasticsearch
spec:
  replicas: 1
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:7.17.0
        ports:
        - containerPort: 9200
        - containerPort: 9300
        env:
        - name: discovery.type
          value: single-node
        - name: ES_JAVA_OPTS
          value: "-Xms512m -Xmx512m"
        - name: xpack.security.enabled
          value: "false"
        resources:
          limits:
            memory: "1Gi"
            cpu: "500m"
          requests:
            memory: "512Mi"
            cpu: "250m"
        readinessProbe:
          httpGet:
            path: /_cluster/health
            port: 9200
          initialDelaySeconds: 20
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /_cluster/health
            port: 9200
          initialDelaySeconds: 60
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-service
  namespace: sap-microservices
  labels:
    app: elasticsearch
spec:
  selector:
    app: elasticsearch
  ports:
  - name: http
    port: 9200
    targetPort: 9200
  - name: transport
    port: 9300
    targetPort: 9300
  type: ClusterIP
EOF

echo -e "${GREEN}✅ Elasticsearch deployed${NC}"

# =================================================================
# PHASE 2: UPDATE ELASTICSEARCH CONNECTION IN SERVICES
# =================================================================
echo -e "${YELLOW}📋 Phase 2: Updating Elasticsearch Configuration${NC}"

echo "🔧 Updating database-secrets with Elasticsearch URL..."

# Get current secrets
kubectl get secret database-secrets -n sap-microservices -o yaml > temp-secrets.yaml

# Update with Elasticsearch URL
if grep -q "ELASTICSEARCH_URL" temp-secrets.yaml; then
    echo "📝 Updating existing Elasticsearch URL..."
    kubectl patch secret database-secrets -n sap-microservices --type='json' -p='[{
        "op": "replace",
        "path": "/data/ELASTICSEARCH_URL",
        "value": "'$(echo -n "http://elasticsearch-service.sap-microservices.svc.cluster.local:9200" | base64 -w 0)'"
    }]'
else
    echo "📝 Adding new Elasticsearch URL..."
    kubectl patch secret database-secrets -n sap-microservices --type='json' -p='[{
        "op": "add",
        "path": "/data/ELASTICSEARCH_URL",
        "value": "'$(echo -n "http://elasticsearch-service.sap-microservices.svc.cluster.local:9200" | base64 -w 0)'"
    }]'
fi

# Clean up temp file
rm -f temp-secrets.yaml

echo -e "${GREEN}✅ Elasticsearch configuration updated${NC}"

# =================================================================
# PHASE 3: CREATE SUPABASE SCHEMA
# =================================================================
echo -e "${YELLOW}📋 Phase 3: Creating Supabase Database Schema${NC}"

echo "🗄️ Creating subscription tables in Supabase..."

# Check if we have database schema file
if [ -f "database-schema-subscription.sql" ]; then
    echo "📝 Database schema file found, ready for manual application"
    echo "⚠️  Please apply the schema manually in Supabase:"
    echo "    1. Go to Supabase Dashboard"
    echo "    2. Navigate to SQL Editor"
    echo "    3. Run the contents of database-schema-subscription.sql"
    echo ""
    echo "📄 Schema file location: $(pwd)/database-schema-subscription.sql"
else
    echo "⚠️  Database schema file not found. Creating basic subscription tables..."
    
    cat > quick-subscription-schema.sql << 'EOF'
-- Quick Subscription Schema for immediate deployment
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Subscription Plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    features JSONB DEFAULT '{}',
    max_users INTEGER,
    max_storage_gb INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT true,
    payment_method_id VARCHAR(100),
    last_payment_date TIMESTAMP WITH TIME ZONE,
    next_payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS subscription_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subscription_id UUID REFERENCES subscriptions(id),
    metric_name VARCHAR(50) NOT NULL,
    usage_value INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (name, description, price, billing_cycle, features, max_users, max_storage_gb) 
VALUES 
    ('Basic', 'Basic subscription plan', 9.99, 'monthly', '{"api_calls": 1000, "support": "email"}', 5, 10),
    ('Pro', 'Professional subscription plan', 29.99, 'monthly', '{"api_calls": 10000, "support": "priority"}', 25, 100),
    ('Enterprise', 'Enterprise subscription plan', 99.99, 'monthly', '{"api_calls": 100000, "support": "dedicated"}', 100, 1000)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_subscription_id ON subscription_usage(subscription_id);
EOF

    echo "📄 Created quick schema file: quick-subscription-schema.sql"
    echo "⚠️  Please apply this schema in Supabase SQL Editor"
fi

echo -e "${GREEN}✅ Database schema preparation complete${NC}"

# =================================================================
# PHASE 4: UPDATE SERVICE HEALTH CHECKS
# =================================================================
echo -e "${YELLOW}📋 Phase 4: Improving Service Health Checks${NC}"

echo "🩺 Creating health check improvement patch..."

cat > health-check-patch.yaml << 'EOF'
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
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 5
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: content-service
  namespace: sap-microservices
spec:
  template:
    spec:
      containers:
      - name: content-service
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 5
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
EOF

echo "📝 Applying health check improvements..."
kubectl patch deployment subscription-service -n sap-microservices --patch-file health-check-patch.yaml
kubectl patch deployment content-service -n sap-microservices --patch-file health-check-patch.yaml

echo -e "${GREEN}✅ Health checks improved${NC}"

# =================================================================
# PHASE 5: RESTART SERVICES
# =================================================================
echo -e "${YELLOW}📋 Phase 5: Restarting Services${NC}"

echo "🔄 Restarting all services with new configuration..."

# Restart deployments to pick up new config
kubectl rollout restart deployment/subscription-service -n sap-microservices
kubectl rollout restart deployment/content-service -n sap-microservices

echo "⏳ Waiting for Elasticsearch to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/elasticsearch -n sap-microservices

echo "⏳ Waiting for services to restart..."
kubectl rollout status deployment/subscription-service -n sap-microservices --timeout=300s
kubectl rollout status deployment/content-service -n sap-microservices --timeout=300s

echo -e "${GREEN}✅ Services restarted${NC}"

# =================================================================
# PHASE 6: VERIFICATION
# =================================================================
echo -e "${YELLOW}📋 Phase 6: Verification${NC}"

echo "🔍 Checking deployment status..."
kubectl get pods -n sap-microservices -o wide

echo ""
echo "🔍 Checking Elasticsearch health..."
kubectl exec -n sap-microservices deployment/elasticsearch -- curl -s localhost:9200/_cluster/health | head -1

echo ""
echo "🔍 Recent service logs..."
echo "--- Subscription Service ---"
kubectl logs -n sap-microservices deployment/subscription-service --tail=10 || echo "No logs yet"

echo ""
echo "--- Content Service ---"
kubectl logs -n sap-microservices deployment/content-service --tail=10 || echo "No logs yet"

# =================================================================
# COMPLETION SUMMARY
# =================================================================
echo ""
echo -e "${GREEN}🎉 Service Startup Issues Fix Completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary of Changes:${NC}"
echo "✅ Elasticsearch deployed and configured"
echo "✅ Service configurations updated with Elasticsearch URL"
echo "✅ Database schema files prepared for Supabase"
echo "✅ Health check timeouts increased"
echo "✅ Resource limits adjusted"
echo "✅ Services restarted with new configuration"
echo ""
echo -e "${BLUE}📝 Manual Steps Required:${NC}"
echo "1. Apply database schema in Supabase SQL Editor"
echo "2. Monitor service logs for successful startup"
echo "3. Test service endpoints when ready"
echo ""
echo -e "${GREEN}🚀 Your services should now start successfully!${NC}"

# Cleanup temp files
rm -f health-check-patch.yaml

echo ""
echo "🔍 Monitor progress with:"
echo "kubectl get pods -n sap-microservices -w"
echo "kubectl logs -f -n sap-microservices deployment/subscription-service"
