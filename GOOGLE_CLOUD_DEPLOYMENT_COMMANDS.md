# 🚀 Google Cloud Deployment Commands for SAP Auth Service

## Prerequisites Setup

### 1. Install and Configure Google Cloud CLI
```bash
# Download and install gcloud CLI if not already installed
# Visit: https://cloud.google.com/sdk/docs/install

# Authenticate with Google Cloud
gcloud auth login

# Set your project (replace with your actual project ID)
gcloud config set project sap-project-466005

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 2. Configure Docker Authentication
```bash
# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

## Step 1: Create GKE Cluster (if not exists)

```bash
# Create GKE cluster in asia-south1 region
gcloud container clusters create sap-microservices-cluster \
    --zone=asia-south1-a \
    --num-nodes=3 \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=5 \
    --machine-type=e2-medium \
    --disk-size=20GB \
    --enable-network-policy \
    --enable-ip-alias

# Get cluster credentials
gcloud container clusters get-credentials sap-microservices-cluster --zone=asia-south1-a
```

## Step 2: Create Kubernetes Namespace

```bash
# Create the microservices namespace
kubectl create namespace sap-microservices

# Set default namespace
kubectl config set-context --current --namespace=sap-microservices
```

## Step 3: Build and Push Docker Image

```bash
# Navigate to auth service directory
cd "d:\31-rbac-implementation\SAP_BACKEND_LATEST\backend\services\auth-service"

# Build Docker image
docker build -f Dockerfile.standalone -t asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/auth-service:v1 .

# Push image to Google Artifact Registry
docker push asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/auth-service:v1
```

## Step 4: Deploy Secrets and ConfigMaps

```bash
# Navigate to deployment directory
cd "d:\31-rbac-implementation\SAP_BACKEND_LATEST\deployment\microservices"

# Apply secrets (contains database URLs, JWT secrets, etc.)
kubectl apply -f secrets.yaml

# Verify secrets are created
kubectl get secrets -n sap-microservices
```

## Step 5: Deploy Auth Service

```bash
# Deploy the auth service
kubectl apply -f auth-service-deployment.yaml

# Verify deployment
kubectl get deployments -n sap-microservices
kubectl get pods -n sap-microservices -l app=auth-service
kubectl get services -n sap-microservices
```

## Step 6: Monitoring and Verification

### Check Pod Status
```bash
# Watch pod startup
kubectl get pods -n sap-microservices -w

# Check pod logs
kubectl logs -l app=auth-service -n sap-microservices -f

# Describe pod for detailed info
kubectl describe pod -l app=auth-service -n sap-microservices
```

### Test Service Health
```bash
# Port forward to test locally
kubectl port-forward service/auth-service 3001:3001 -n sap-microservices

# In another terminal, test health endpoint
curl http://localhost:3001/health

# Or using PowerShell
Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET
```

## Step 7: Expose Service (Optional - for external access)

### Option A: LoadBalancer Service
```bash
# Create LoadBalancer service for external access
kubectl patch service auth-service -n sap-microservices -p '{"spec":{"type":"LoadBalancer"}}'

# Get external IP
kubectl get service auth-service -n sap-microservices
```

### Option B: Ingress (Recommended for production)
```bash
# Apply ingress configuration (if you have ingress.yaml)
kubectl apply -f ingress.yaml
```

## Step 8: Update and Redeploy

### For code updates:
```bash
# 1. Rebuild image with new tag
docker build -f Dockerfile.standalone -t asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/auth-service:v2 .

# 2. Push new image
docker push asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/auth-service:v2

# 3. Update deployment
kubectl set image deployment/auth-service auth-service=asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/auth-service:v2 -n sap-microservices

# 4. Monitor rollout
kubectl rollout status deployment/auth-service -n sap-microservices
```

## Step 9: Scaling

```bash
# Scale replicas
kubectl scale deployment auth-service --replicas=3 -n sap-microservices

# Enable horizontal pod autoscaling
kubectl autoscale deployment auth-service --cpu-percent=70 --min=2 --max=10 -n sap-microservices
```

## Troubleshooting Commands

### Check Events
```bash
kubectl get events -n sap-microservices --sort-by='.lastTimestamp'
```

### Debug Pod Issues
```bash
# Get pod details
kubectl describe pod [POD_NAME] -n sap-microservices

# Execute into pod
kubectl exec -it [POD_NAME] -n sap-microservices -- /bin/sh

# Check resource usage
kubectl top pods -n sap-microservices
```

### View Service Endpoints
```bash
kubectl get endpoints -n sap-microservices
```

## Cleanup Commands (if needed)

```bash
# Delete auth service
kubectl delete -f auth-service-deployment.yaml

# Delete secrets
kubectl delete -f secrets.yaml

# Delete namespace (removes everything)
kubectl delete namespace sap-microservices

# Delete GKE cluster
gcloud container clusters delete sap-microservices-cluster --zone=asia-south1-a
```

## Production Checklist ✅

- [ ] Update secrets.yaml with production values
- [ ] Set strong JWT secrets (32+ characters)
- [ ] Update MongoDB Atlas connection strings
- [ ] Configure Redis cluster connection
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Set up SSL/TLS certificates
- [ ] Configure network policies
- [ ] Set resource limits and requests
- [ ] Enable cluster autoscaling

## Quick Deployment Script

```bash
#!/bin/bash
# Quick deployment script

echo "🚀 Deploying SAP Auth Service to Google Cloud..."

# Set project and authenticate
gcloud config set project sap-project-466005
gcloud container clusters get-credentials sap-microservices-cluster --zone=asia-south1-a

# Build and push image
cd "d:\31-rbac-implementation\SAP_BACKEND_LATEST\backend\services\auth-service"
docker build -f Dockerfile.standalone -t asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/auth-service:latest .
docker push asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/auth-service:latest

# Deploy to Kubernetes
cd "d:\31-rbac-implementation\SAP_BACKEND_LATEST\deployment\microservices"
kubectl apply -f secrets.yaml
kubectl apply -f auth-service-deployment.yaml

# Wait for deployment
kubectl rollout status deployment/auth-service -n sap-microservices

echo "✅ Auth Service deployed successfully!"
echo "📊 Check status: kubectl get pods -n sap-microservices -l app=auth-service"
echo "📋 View logs: kubectl logs -l app=auth-service -n sap-microservices -f"
```

---

**Note**: Replace `sap-project-466005` with your actual Google Cloud Project ID if different.
