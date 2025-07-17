#!/bin/bash
# 🔧 Fix Permission Client Dependencies Script

set -e

echo "🚀 Fixing permission-client dependencies..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Creating new package structure...${NC}"

# Create new package structure if it doesn't exist
if [ ! -d "packages/permission-client" ]; then
    mkdir -p packages/permission-client/src
    echo -e "${GREEN}✅ Created packages/permission-client directory${NC}"
fi

echo -e "${BLUE}Step 2: Moving package files...${NC}"

# Copy files from backend/packages to packages/permission-client if source exists
if [ -d "backend/packages" ]; then
    cp -r backend/packages/* packages/permission-client/ 2>/dev/null || true
    echo -e "${GREEN}✅ Moved package files${NC}"
fi

echo -e "${BLUE}Step 3: Installing workspace dependencies...${NC}"

# Install workspace dependencies
npm install

echo -e "${BLUE}Step 4: Building permission client...${NC}"

# Build the permission client package
cd packages/permission-client
npm install
npm run build
cd ../..

echo -e "${BLUE}Step 5: Updating service dependencies...${NC}"

# Update content service dependencies
cd backend/services/content-service
npm install
cd ../../..

# Update subscription service dependencies if it exists
if [ -d "backend/services/subscription-management-service" ]; then
    cd backend/services/subscription-management-service
    npm install
    cd ../../..
fi

echo -e "${BLUE}Step 6: Testing builds...${NC}"

# Test content service build
cd backend/services/content-service
npm run build
cd ../../..

echo -e "${GREEN}🎉 Permission client dependency fix completed!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the application: npm run dev"
echo "2. Build Docker image: docker build -f backend/services/content-service/Dockerfile.workspace ."
echo "3. Verify all imports are working correctly"
