# 🚀 Subscription Service Deployment Guide

## Quick Start

### 1. Update Database Credentials
Before deploying, update the secrets.yaml file with your actual database credentials:

```bash
# Edit the secrets file
nano deployment/microservices/secrets.yaml
```

Replace these placeholders with your actual credentials:
- `YOUR_USERNAME` - Your MongoDB Atlas username
- `YOUR_PASSWORD` - Your MongoDB Atlas password  
- `YOUR_CLUSTER` - Your MongoDB Atlas cluster name
- `YOUR_REDIS_HOST` - Your Redis instance host

### 2. Build and Push Docker Image (if not done)
```bash
# Build the subscription service image
cd backend/services/subscription-management-service
docker build -t asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/subscription-service:latest .

# Push to Google Container Registry
docker push asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/subscription-service:latest
```

### 3. Deploy Using Script
```bash
# Make the script executable
chmod +x deploy-subscription-service.sh

# Run the deployment
./deploy-subscription-service.sh
```

### 4. Manual Deployment (Alternative)
```bash
# Create namespace
kubectl create namespace sap-microservices --dry-run=client -o yaml | kubectl apply -f -

# Apply secrets
kubectl apply -f deployment/microservices/secrets.yaml

# Deploy subscription service
kubectl apply -f deployment/microservices/subscription-service-deployment.yaml

# Check status
kubectl get pods -n sap-microservices -l app=subscription-service
```

## Troubleshooting

### Database Connection Issues
1. Check secrets are properly applied:
```bash
kubectl get secrets -n sap-microservices
kubectl describe secret database-secrets -n sap-microservices
```

2. Check pod logs for connection errors:
```bash
kubectl logs -n sap-microservices -l app=subscription-service
```

### Common Issues & Solutions

**Issue**: Pods stuck in `ImagePullBackOff`
**Solution**: Ensure the Docker image is built and pushed to the registry

**Issue**: `CrashLoopBackOff` due to database connection
**Solution**: Verify MongoDB Atlas credentials in secrets.yaml

**Issue**: Supabase connection errors
**Solution**: Verify Supabase URL and keys in secrets.yaml

### Health Checks
```bash
# Port forward to test locally
kubectl port-forward -n sap-microservices svc/subscription-service 3003:3003

# Test health endpoint
curl http://localhost:3003/health
```

## Configuration Details

### Environment Variables
The subscription service uses these environment variables:
- `MONGODB_URL` - MongoDB connection string
- `SUPABASE_URL` - Supabase project URL
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `PAYMENT_GATEWAY_KEY` - Payment processor API key

### Service Communication
The subscription service communicates with:
- **Auth Service** (port 3001) - for user authentication
- **User Service** (port 3002) - for user data
- **MongoDB** - for subscription data storage
- **Supabase** - for additional subscription features
- **Redis** - for caching and session management

### Auto-scaling
The service includes HPA (Horizontal Pod Autoscaler) with:
- Min replicas: 2
- Max replicas: 10
- CPU threshold: 70%
- Memory threshold: 80%

## Next Steps

After successful deployment:
1. Test all subscription endpoints
2. Verify payment gateway integration
3. Check inter-service communication
4. Monitor logs and metrics
5. Set up alerts and monitoring
