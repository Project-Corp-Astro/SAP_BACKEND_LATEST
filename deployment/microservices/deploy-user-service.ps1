# 🚀 User Service Deployment Script for Google Cloud (PowerShell)
# This script builds and deploys the user service to GKE

param(
    [string]$ProjectId = "sap-project-466005",
    [string]$Region = "asia-south1", 
    [string]$ClusterName = "sap-backend-test-cluster",
    [string]$ServiceName = "user-service"
)

Write-Host "🚀 Starting User Service Deployment..." -ForegroundColor Green

# Configuration
$ImageTag = "asia-south1-docker.pkg.dev/$ProjectId/sap-microservices/${ServiceName}:latest"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "Project ID: $ProjectId"
Write-Host "Region: $Region" 
Write-Host "Cluster: $ClusterName"
Write-Host "Service: $ServiceName"
Write-Host "Image: $ImageTag"
Write-Host ""

# Check if we're in Google Cloud Shell
$IsCloudShell = Test-Path "/google/devshell"

if (-not $IsCloudShell) {
    Write-Host "❌ This script should be run in Google Cloud Shell for Docker access" -ForegroundColor Red
    Write-Host "📋 Manual steps:" -ForegroundColor Yellow
    Write-Host "1. Upload files to Google Cloud Shell"
    Write-Host "2. Run: chmod +x deploy-user-service.sh && ./deploy-user-service.sh"
    exit 1
}

try {
    # Step 1: Build Docker Image
    Write-Host "🏗️ Step 1: Building Docker Image..." -ForegroundColor Yellow
    Set-Location ../backend
    docker build -f services/user-service/Dockerfile.simple -t ${ServiceName}:latest .
    
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed"
    }
    Write-Host "✅ Docker image built successfully" -ForegroundColor Green

    # Step 2: Tag and Push to Artifact Registry
    Write-Host "🏷️ Step 2: Tagging and pushing to Artifact Registry..." -ForegroundColor Yellow
    docker tag ${ServiceName}:latest $ImageTag
    docker push $ImageTag
    
    if ($LASTEXITCODE -ne 0) {
        throw "Image push failed"
    }
    Write-Host "✅ Image pushed to Artifact Registry" -ForegroundColor Green

    # Step 3: Get GKE Credentials
    Write-Host "🔐 Step 3: Getting GKE credentials..." -ForegroundColor Yellow
    gcloud container clusters get-credentials $ClusterName --region=$Region --project=$ProjectId

    # Step 4: Apply Deployment
    Write-Host "🚀 Step 4: Deploying to Kubernetes..." -ForegroundColor Yellow
    Set-Location ../deployment/microservices
    kubectl apply -f user-service-deployment.yaml
    
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment failed"
    }
    Write-Host "✅ Deployment applied successfully" -ForegroundColor Green

    # Step 5: Check deployment status
    Write-Host "📊 Step 5: Checking deployment status..." -ForegroundColor Yellow
    kubectl get pods -l app=user-service -n sap-microservices
    kubectl get service user-service -n sap-microservices

    Write-Host ""
    Write-Host "🎉 User Service Deployment Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Summary:" -ForegroundColor Yellow
    Write-Host "• Docker image: $ImageTag"
    Write-Host "• Deployment: user-service in sap-microservices namespace"
    Write-Host "• Service endpoint: http://user-service.sap-microservices.svc.cluster.local:3002"
    Write-Host "• Health check: http://user-service.sap-microservices.svc.cluster.local:3002/health"

} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
