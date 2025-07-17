# PowerShell script for Windows
# 🔧 Fix Permission Client Dependencies Script

Write-Host "🚀 Fixing permission-client dependencies..." -ForegroundColor Blue

Write-Host "Step 1: Creating new package structure..." -ForegroundColor Cyan

# Create new package structure if it doesn't exist
if (!(Test-Path "packages\permission-client")) {
    New-Item -ItemType Directory -Path "packages\permission-client\src" -Force
    Write-Host "✅ Created packages/permission-client directory" -ForegroundColor Green
}

Write-Host "Step 2: Moving package files..." -ForegroundColor Cyan

# Copy files from backend/packages to packages/permission-client if source exists
if (Test-Path "backend\packages") {
    Copy-Item -Path "backend\packages\*" -Destination "packages\permission-client\" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Moved package files" -ForegroundColor Green
}

Write-Host "Step 3: Installing workspace dependencies..." -ForegroundColor Cyan

# Install workspace dependencies
npm install

Write-Host "Step 4: Building permission client..." -ForegroundColor Cyan

# Build the permission client package
Set-Location "packages\permission-client"
npm install
npm run build
Set-Location "..\..\"

Write-Host "Step 5: Updating service dependencies..." -ForegroundColor Cyan

# Update content service dependencies
Set-Location "backend\services\content-service"
npm install
Set-Location "..\..\..\"

# Update subscription service dependencies if it exists
if (Test-Path "backend\services\subscription-management-service") {
    Set-Location "backend\services\subscription-management-service"
    npm install
    Set-Location "..\..\..\"
}

Write-Host "Step 6: Testing builds..." -ForegroundColor Cyan

# Test content service build
Set-Location "backend\services\content-service"
npm run build
Set-Location "..\..\..\"

Write-Host "🎉 Permission client dependency fix completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the application: npm run dev"
Write-Host "2. Build Docker image: docker build -f backend/services/content-service/Dockerfile.workspace ."
Write-Host "3. Verify all imports are working correctly"
