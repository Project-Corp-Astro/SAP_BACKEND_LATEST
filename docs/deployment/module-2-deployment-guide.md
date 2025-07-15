# 🗄️ Module 2 Deployment Guide - Database Infrastructure

**Status**: Ready for deployment after Module 1  
**Estimated Time**: 45-60 minutes  
**Prerequisites**: Module 1 completed successfully  

---

## 🎯 **MODULE 2 OVERVIEW**

Module 2 implements enterprise-grade database infrastructure with:
- **PostgreSQL**: Cloud SQL with high availability and automatic backups
- **Redis**: Memorystore for caching and session management
- **MongoDB**: Atlas integration for document storage
- **Security**: KMS encryption, private networking, secrets management
- **Monitoring**: Uptime checks, performance metrics, alerting

---

## 📋 **BEFORE YOU START**

### **Prerequisites Check**
✅ Module 1 deployed successfully  
✅ GKE cluster accessible  
✅ VPC networking configured  
✅ Terraform authenticated and working  

### **Required Information**
1. **Database Passwords** (12+ characters, complex)
   - PostgreSQL application user password
   - PostgreSQL read-only user password
   - PostgreSQL migration user password

2. **MongoDB Configuration** (if using MongoDB Atlas)
   - Atlas connection string
   - Database username and password

### **Capacity Planning**
Choose appropriate instance sizes based on your environment:

| Environment | PostgreSQL | Redis | Estimated Cost/Month |
|-------------|------------|-------|---------------------|
| Development | db-f1-micro | 1GB | ~$32 |
| Staging | db-g1-small | 2GB | ~$75 |
| Production | db-n1-standard-2 | 4GB+ | ~$204+ |

---

## 🔐 **STEP 1: Configure Database Passwords**

### **1.1 Generate Secure Passwords**
```bash
# Generate secure passwords (Linux/WSL)
openssl rand -base64 32 | tr -d "=+/" | cut -c1-20

# Or use PowerShell (Windows)
[System.Web.Security.Membership]::GeneratePassword(20, 5)
```

### **1.2 Update terraform.tfvars**
Edit `infrastructure/gcp/terraform/terraform.tfvars`:

```bash
# Database Passwords (CHANGE THESE!)
postgres_app_password       = "YourSecureAppPassword123!"
postgres_readonly_password  = "YourSecureReadonlyPassword123!"
postgres_migration_password = "YourSecureMigrationPassword123!"

# MongoDB Configuration (if using Atlas)
mongodb_connection_string = "mongodb+srv://username:password@cluster.mongodb.net/dbname"
mongodb_username         = "your_mongo_user"
mongodb_password         = "YourSecureMongoPassword123!"
```

### **1.3 Verify Password Security**
```bash
cd infrastructure/gcp/terraform
bash validate-module-2.sh
```

**Expected Output:**
```
✅ Database passwords validated
✅ All Module 2 validations passed!
```

---

## 🏗️ **STEP 2: Infrastructure Deployment**

### **2.1 Pre-Deployment Validation**
```bash
cd infrastructure/gcp/terraform
bash validate-module-2.sh
```

### **2.2 Review Estimated Costs**
The validation script will show estimated monthly costs:
```
📊 ESTIMATED MONTHLY COSTS (USD):
   PostgreSQL (db-f1-micro): ~$7
   Redis (1GB): ~$25
   Total Estimated: ~$32/month
```

### **2.3 Deploy Database Infrastructure**
```bash
cd infrastructure/gcp/terraform
bash deploy-module-2.sh deploy
```

**Deployment Progress:**
```
🚀 MODULE 2: DATABASE INFRASTRUCTURE DEPLOYMENT
▶ Validating prerequisites...
▶ Enabling required APIs...
▶ Deploying networking components...
▶ Deploying KMS encryption...
▶ Creating PostgreSQL instance... (⏰ ~20 minutes)
▶ Creating Redis instance... (⏰ ~5 minutes)
▶ Deploying secrets management...
▶ Configuring monitoring...
```

### **2.4 Monitor Deployment Progress**
The deployment creates several resources:
- **VPC Private Service Connection** (~2 minutes)
- **KMS Key Ring and Crypto Key** (~1 minute)
- **PostgreSQL Cloud SQL Instance** (~20 minutes)
- **Redis Memorystore Instance** (~5 minutes)
- **Secret Manager Secrets** (~2 minutes)
- **Monitoring Configuration** (~2 minutes)

---

## ✅ **STEP 3: Verify Deployment**

### **3.1 Check Deployment Status**
```bash
cd infrastructure/gcp/terraform
bash deploy-module-2.sh status
```

### **3.2 Verify Database Instances**
```bash
# Check PostgreSQL instance
gcloud sql instances list --filter="name~sap-postgres"

# Check Redis instance
gcloud redis instances list --region=us-central1
```

**Expected Output:**
```
NAME                          DATABASE_VERSION  LOCATION     TIER         STATUS
test-sap-postgres-a1b2c3d4   POSTGRES_15       us-central1  db-f1-micro  RUNNABLE

NAME                       REGION       TIER   SIZE_GB  STATUS
test-sap-redis-a1b2c3d4   us-central1  BASIC  1        READY
```

### **3.3 Test Database Connectivity**
```bash
# Get connection details
cd infrastructure/gcp/terraform
terraform output postgres_private_ip
terraform output redis_host

# Test PostgreSQL connection (from GKE cluster)
kubectl run postgres-test --image=postgres:15 --rm -it --restart=Never -- \
  psql -h [POSTGRES_IP] -U sap_app_user -d sap_main -c "SELECT version();"

# Test Redis connection (from GKE cluster)
kubectl run redis-test --image=redis:7 --rm -it --restart=Never -- \
  redis-cli -h [REDIS_HOST] ping
```

---

## 🔄 **STEP 4: Database Migration (Optional)**

If you have existing data to migrate:

### **4.1 Install Migration Dependencies**
```bash
cd backend
npm install pg ioredis mongodb
```

### **4.2 Configure Source Databases**
Update environment variables in `.env`:
```bash
# Source database connections (your current databases)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sap_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_local_password

REDIS_HOST=localhost
REDIS_PORT=6379

MONGO_URI=mongodb://localhost:27017/sap-db
```

### **4.3 Run Database Migration**
```bash
cd backend
node scripts/migrate-databases.js
```

**Migration Progress:**
```
🚀 Database Migration Orchestrator
▶ Loading target configuration from terraform...
▶ Creating backups before migration...
▶ Migrating PostgreSQL data...
▶ Migrating Redis data...
📋 MIGRATION REPORT
Status: SUCCESS
Duration: 45s
Tables Processed: 12
Rows Migrated: 5,420
Redis Keys Processed: 230
```

---

## 🔐 **STEP 5: Security Configuration**

### **5.1 Verify Secret Manager**
```bash
# List created secrets
gcloud secrets list --filter="name~sap"

# Verify secret access (should work from GKE pods)
gcloud secrets versions access latest --secret="test-postgres-connection"
```

### **5.2 Configure Application Access**
Update your application configuration to use secrets:

```yaml
# k8s-deployment.yaml example
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: sap-backend-sa
  containers:
  - name: app
    env:
    - name: POSTGRES_CONFIG
      valueFrom:
        secretKeyRef:
          name: postgres-connection
          key: config
```

### **5.3 Test Security Measures**
```bash
# Verify KMS encryption
gcloud kms keys list --location=us-central1 --keyring=test-sap-database-keyring

# Check private networking (should show no public IPs)
gcloud sql instances describe [POSTGRES_INSTANCE] --format="value(ipAddresses[].ipAddress)"
```

---

## 📊 **STEP 6: Monitoring Setup**

### **6.1 Verify Uptime Checks**
```bash
# List monitoring checks
gcloud monitoring uptime list --filter="displayName~postgres OR displayName~redis"
```

### **6.2 Access Database Metrics**
```bash
# View PostgreSQL metrics
gcloud monitoring metrics list --filter="metric.type~cloudsql"

# View Redis metrics  
gcloud monitoring metrics list --filter="metric.type~redis"
```

### **6.3 Configure Alerts (Optional)**
Create alert policies for critical metrics:
- PostgreSQL connection count > 80%
- Redis memory usage > 90%
- Database downtime > 1 minute

---

## 🔧 **STEP 7: Application Integration**

### **7.1 Update Backend Configuration**
Modify your backend services to use the new databases:

```javascript
// config/database.js
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function getDatabaseConfig() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/postgres-connection/versions/latest`,
  });
  
  return JSON.parse(version.payload.data.toString());
}
```

### **7.2 Update Environment Variables**
```bash
# For local development, use Cloud SQL Proxy
cloud_sql_proxy -instances=[CONNECTION_NAME]=tcp:5432 &

# Update .env for local development
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=sap_app_user
POSTGRES_PASSWORD=[FROM_SECRET_MANAGER]
POSTGRES_DB=sap_main

REDIS_HOST=[REDIS_HOST_FROM_TERRAFORM]
REDIS_PORT=6379
```

### **7.3 Test Application Connectivity**
```bash
cd backend
npm run test:database-connections
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

#### **PostgreSQL Connection Failed**
```bash
# Check instance status
gcloud sql instances describe [INSTANCE_NAME]

# Verify networking
gcloud compute networks subnets list --filter="network~sap-vpc"

# Check firewall rules
gcloud compute firewall-rules list --filter="network~sap-vpc"
```

#### **Redis Connection Timeout**
```bash
# Verify Redis instance
gcloud redis instances describe [INSTANCE_NAME] --region=[REGION]

# Check VPC connectivity
gcloud compute instances list --filter="zone~us-central1"
```

#### **Secret Manager Access Denied**
```bash
# Check service account permissions
gcloud projects get-iam-policy [PROJECT_ID] --flatten="bindings[].members" --filter="bindings.members~sap-backend"

# Grant secret accessor role
gcloud secrets add-iam-policy-binding [SECRET_NAME] \
  --member="serviceAccount:[SA_EMAIL]" \
  --role="roles/secretmanager.secretAccessor"
```

#### **High Costs**
```bash
# Check actual usage
gcloud billing budgets list
gcloud monitoring timeseries list --filter="resource.type=cloudsql_database"

# Optimize instance sizes
# Edit terraform.tfvars and re-deploy:
postgres_instance_tier = "db-f1-micro"  # Smaller instance
redis_memory_size_gb = 1                # Reduce memory
```

---

## 🔄 **ROLLBACK PROCEDURE**

If you need to rollback Module 2:

```bash
cd infrastructure/gcp/terraform
bash deploy-module-2.sh rollback
```

**⚠️ WARNING:** This will destroy all database instances and data!

For safer rollback:
1. Export data first: `pg_dump`, Redis BGSAVE
2. Destroy only problematic resources
3. Restore from backups if needed

---

## 📈 **PERFORMANCE OPTIMIZATION**

### **PostgreSQL Optimization**
```sql
-- Connect to your database and run:
-- Check connection pooling
SHOW max_connections;

-- Monitor query performance
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public';
```

### **Redis Optimization**
```bash
# Connect to Redis and check:
redis-cli info memory
redis-cli config get maxmemory-policy

# Monitor key patterns
redis-cli --bigkeys
redis-cli --hotkeys
```

---

## 🎯 **SUCCESS CRITERIA**

Module 2 is successful when:

- ✅ PostgreSQL instance is running and accessible
- ✅ Redis instance is ready and responding
- ✅ All secrets are stored in Secret Manager
- ✅ Private networking is configured
- ✅ KMS encryption is active
- ✅ Monitoring and alerts are configured
- ✅ Application can connect to databases
- ✅ Migration completed (if applicable)

---

## 📋 **NEXT STEPS AFTER MODULE 2**

Once Module 2 is complete:

1. ✅ **Test all database connections** from applications
2. ✅ **Run database migrations** for schema updates
3. ✅ **Configure monitoring dashboards**
4. ✅ **Set up backup verification**
5. ✅ **Proceed to Module 3**: Service Configuration and Deployment

---

**Ready for database deployment? Start with Step 1! 🚀**

**Module 2 Total Estimated Time: 45-60 minutes**  
**Next: Module 3 - Service Configuration** 📱
