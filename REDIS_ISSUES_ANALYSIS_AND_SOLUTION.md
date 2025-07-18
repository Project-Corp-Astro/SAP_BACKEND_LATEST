# Redis Issues Analysis and Solution for Subscription Service

## 🚨 Critical Issues Identified

### 1. **DNS Resolution Failure**
```
Error: getaddrinfo ENOTFOUND redis-cluster.c1.asia-south1-1.gce.cloud.redislabs.com
```
- **Root Cause**: External Redis cluster URL cannot be resolved from within Kubernetes cluster
- **Impact**: Continuous connection failures and reconnection attempts

### 2. **Container File System Permissions**
```
Error: EROFS: read-only file system, open '/app/logs/subscription-service-2025-07-18.log'
```
- **Root Cause**: Container trying to write to read-only filesystem
- **Impact**: Logging failures and potential service crashes

### 3. **Database Schema Missing**
```
Warning: relation "public.subscriptions" does not exist
```
- **Root Cause**: Supabase database tables not initialized
- **Impact**: Core subscription functionality unavailable

### 4. **Elasticsearch Unavailable**
```
Error: connect ECONNREFUSED 127.0.0.1:9200
```
- **Root Cause**: Elasticsearch not configured in Kubernetes
- **Impact**: Search functionality disabled

## 🔧 Redis Implementation Architecture

Based on codebase analysis, your system uses **Redis Database Isolation**:

```typescript
// Service to DB mapping from redis-manager.ts
export const SERVICE_DB_MAPPING: Record<string, number> = {
  'api-gateway': 0,
  'auth': 1,
  'user': 2,
  'subscription': 3,  // ← Subscription service uses DB 3
  'content': 4,
  'notification': 5,
  'payment': 6,
  'monitoring': 7,
  'analytics': 8,
  'default': 0
};
```

### Current Redis Setup in Subscription Service:
- **Primary Client**: Uses Redis DB 3 for main operations
- **Specialized Caches**:
  - `defaultCache`: General caching with `subscription:default:` prefix
  - `planCache`: Subscription plans with `subscription:plans:` prefix  
  - `userSubsCache`: User subscriptions with `subscription:user-subscriptions:` prefix
  - `promoCache`: Promotions with `subscription:promos:` prefix

## 🛠️ Comprehensive Solution

### Phase 1: Fix Redis Connection (Immediate)

#### Option A: Use Local Redis in Kubernetes
Create internal Redis deployment:

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: sap-microservices
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - --appendonly
        - "yes"
        - --requirepass
        - "$(REDIS_PASSWORD)"
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-secrets
              key: redis-password
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: sap-microservices
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
```

#### Option B: Update Redis URL to Working Instance
Update the secret with a working Redis URL:

```bash
# Create new Redis URL (replace with your working Redis)
kubectl create secret generic database-secrets \
  --from-literal=redis-url="redis://localhost:6379" \
  --namespace=sap-microservices \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Phase 2: Fix Container Logging (Immediate)

Update subscription service deployment to use proper logging:

```yaml
# Fix logging in subscription-service-deployment.yaml
env:
- name: LOG_LEVEL
  value: "info"
- name: LOG_TO_CONSOLE
  value: "true"
- name: DISABLE_FILE_LOGGING
  value: "true"
```

### Phase 3: Fix Database Schema

Create database migration script:

```sql
-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    duration_months INTEGER NOT NULL,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);
```

### Phase 4: Disable Elasticsearch Temporarily

Update subscription service to gracefully handle missing Elasticsearch:

```typescript
// In subscription service configuration
const ELASTICSEARCH_ENABLED = process.env.ELASTICSEARCH_ENABLED === 'true';

if (!ELASTICSEARCH_ENABLED) {
  logger.info('Elasticsearch disabled, search functionality will be limited');
}
```

## 🚀 Implementation Steps

### Step 1: Deploy Internal Redis (Recommended)
```bash
# Apply Redis deployment
kubectl apply -f redis-deployment.yaml

# Verify Redis is running
kubectl get pods -n sap-microservices | grep redis

# Test Redis connection
kubectl exec -it deployment/redis -n sap-microservices -- redis-cli ping
```

### Step 2: Update Redis URL Secret
```bash
# Update database-secrets with internal Redis
kubectl patch secret database-secrets -n sap-microservices -p='{"data":{"redis-url":"'$(echo -n "redis://redis-service.sap-microservices.svc.cluster.local:6379" | base64)'"}}'

# Verify secret update
kubectl get secret database-secrets -n sap-microservices -o yaml
```

### Step 3: Fix Deployment Configuration
```bash
# Restart subscription service to pick up new config
kubectl rollout restart deployment/subscription-service -n sap-microservices

# Monitor restart
kubectl rollout status deployment/subscription-service -n sap-microservices
```

### Step 4: Verify Solution
```bash
# Check logs for successful Redis connection
kubectl logs deployment/subscription-service -n sap-microservices --tail=50

# Should see:
# "Redis client connected successfully"
# "Subscription service using Redis database 3"
```

## 📊 Expected Results After Fix

### Successful Log Patterns:
```
2025-07-18 [subscription-service] info: Redis client connected successfully
2025-07-18 [subscription-service] info: Subscription service using Redis database 3
2025-07-18 [subscription-service] info: Plan-specific cache connected
2025-07-18 [subscription-service] info: User subscription cache connected
2025-07-18 [subscription-service] info: subscription-service running on port 3003
```

### Redis Database Isolation Verification:
```bash
# Connect to Redis and verify DB isolation
kubectl exec -it deployment/redis -n sap-microservices -- redis-cli

# Check subscription service keys (should be in DB 3)
SELECT 3
KEYS subscription:*

# Check other service keys (should be in different DBs)
SELECT 1  # Auth service
KEYS auth:*

SELECT 4  # Content service  
KEYS content:*
```

## 🔍 Monitoring and Validation

### Health Check Commands:
```bash
# Test subscription service health
curl http://34.93.4.25/api/subscriptions/health

# Check Redis connectivity from service
kubectl exec deployment/subscription-service -n sap-microservices -- \
  node -e "const redis = require('ioredis'); const client = new redis('redis://redis-service:6379', {db: 3}); client.ping().then(console.log);"
```

### Performance Metrics:
- Redis connection time should be < 100ms
- Cache hit rate should be > 80% for frequently accessed data
- Service startup time should be < 30 seconds

This solution maintains your existing Redis isolation architecture while fixing the connectivity and operational issues.
