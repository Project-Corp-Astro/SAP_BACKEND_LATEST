#!/bin/bash
# Comprehensive build script for Content Service

set -e  # Exit on any error

echo "🚀 Starting Content Service Build Process..."

# Build command for Google Cloud Shell
cd ~/SAP_BACKEND_LATEST/backend

echo "🧹 Cleaning previous builds..."
docker system prune -f

echo "🔍 Checking dependency conflicts..."
./scripts/audit-dependencies.sh

echo "🏗️ Building Docker image..."
# Build with proper context and no cache
docker build \
  --no-cache \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --build-arg BUILD_ENV=production \
  -f services/content-service/Dockerfile \
  -t asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices/content-service:v19 \
  .

echo "✅ Build completed successfully!"

echo "🔍 Checking image size..."
docker images | grep content-service:v19

echo "📝 Build Summary:"
echo "- Image: content-service:v19"
echo "- Registry: asia-south1-docker.pkg.dev/sap-project-466005/sap-microservices"
echo "- Ready for deployment"
