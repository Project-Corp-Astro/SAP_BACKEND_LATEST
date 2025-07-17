# Build Commands for Google Cloud Shell
# Run these commands in Google Cloud Shell terminal

# Navigate to project directory
cd ~/SAP_BACKEND_LATEST/backend

# Clean previous builds
docker system prune -f

# Build content-service with optimized Dockerfile
docker build \
  --no-cache \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --build-arg BUILD_ENV=production \
  -f services/content-service/Dockerfile \
  -t asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/content-service:v19 \
  .

# Push to registry
docker push asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/content-service:v19

# Update deployment with new image
kubectl set image deployment/content-service content-service=asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/content-service:v19 -n sap-microservices

# Check deployment status
kubectl rollout status deployment/content-service -n sap-microservices
kubectl get pods -n sap-microservices -l app=content-service
