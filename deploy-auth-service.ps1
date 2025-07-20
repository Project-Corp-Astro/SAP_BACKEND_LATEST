# 🚀 PowerShell Deployment Script for SAP Auth Service

# SAP Auth Service - Google Cloud Deployment
# PowerShell script for Windows deployment

param(
    [string]$ProjectId = "sap-project-466005",
    [string]$Region = "asia-south1",
    [string]$Zone = "asia-south1-a",
    [string]$ClusterName = "sap-microservices-cluster",
    [string]$ImageTag = "v1"
)

Write-Host "🚀 Starting SAP Auth Service Deployment to Google Cloud..." -ForegroundColor Green

# Function to check if command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Command "gcloud")) {
    Write-Error "❌ Google Cloud CLI not found. Please install from: https://cloud.google.com/sdk/docs/install"
    exit 1
}

if (-not (Test-Command "kubectl")) {
    Write-Error "❌ kubectl not found. Please install kubectl"
    exit 1
}

if (-not (Test-Command "docker")) {
    Write-Error "❌ Docker not found. Please install Docker Desktop"
    exit 1
}

Write-Host "✅ All prerequisites found!" -ForegroundColor Green

# Set Google Cloud project
Write-Host "🔧 Configuring Google Cloud project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Get cluster credentials
Write-Host "🔑 Getting cluster credentials..." -ForegroundColor Yellow
gcloud container clusters get-credentials $ClusterName --zone=$Zone

# Configure Docker authentication
Write-Host "🐳 Configuring Docker authentication..." -ForegroundColor Yellow
gcloud auth configure-docker "$Region-docker.pkg.dev"

# Navigate to auth service directory
$AuthServicePath = "d:\31-rbac-implementation\SAP_BACKEND_LATEST\backend\services\auth-service"
Write-Host "📁 Navigating to auth service directory: $AuthServicePath" -ForegroundColor Yellow

if (-not (Test-Path $AuthServicePath)) {
    Write-Error "❌ Auth service directory not found: $AuthServicePath"
    exit 1
}

Set-Location $AuthServicePath

# Build Docker image
$ImageName = "$Region-docker.pkg.dev/$ProjectId/sap-microservices/auth-service:$ImageTag"
Write-Host "🔨 Building Docker image: $ImageName" -ForegroundColor Yellow

docker build -f Dockerfile.standalone -t $ImageName .

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Docker build failed"
    exit 1
}

Write-Host "✅ Docker image built successfully!" -ForegroundColor Green

# Push Docker image
Write-Host "📤 Pushing Docker image to Artifact Registry..." -ForegroundColor Yellow
docker push $ImageName

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Docker push failed"
    exit 1
}

Write-Host "✅ Docker image pushed successfully!" -ForegroundColor Green

# Navigate to deployment directory
$DeploymentPath = "d:\31-rbac-implementation\SAP_BACKEND_LATEST\deployment\microservices"
Write-Host "📁 Navigating to deployment directory: $DeploymentPath" -ForegroundColor Yellow

if (-not (Test-Path $DeploymentPath)) {
    Write-Error "❌ Deployment directory not found: $DeploymentPath"
    exit 1
}

Set-Location $DeploymentPath

# Create namespace if not exists
Write-Host "🏷️ Creating/updating namespace..." -ForegroundColor Yellow
kubectl create namespace sap-microservices --dry-run=client -o yaml | kubectl apply -f -

# Apply secrets
Write-Host "🔐 Applying secrets..." -ForegroundColor Yellow
kubectl apply -f secrets.yaml

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to apply secrets"
    exit 1
}

Write-Host "✅ Secrets applied successfully!" -ForegroundColor Green

# Update deployment image if needed
$DeploymentFile = "auth-service-deployment.yaml"
if (Test-Path $DeploymentFile) {
    # Read and update deployment file with new image
    $content = Get-Content $DeploymentFile -Raw
    $content = $content -replace "asia-south1-docker\.pkg\.dev/sap-project-466005/sap-microservices/auth-service:v1", $ImageName
    $content | Set-Content $DeploymentFile
}

# Deploy auth service
Write-Host "🚀 Deploying auth service..." -ForegroundColor Yellow
kubectl apply -f auth-service-deployment.yaml

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to deploy auth service"
    exit 1
}

Write-Host "✅ Auth service deployment applied!" -ForegroundColor Green

# Wait for rollout to complete
Write-Host "⏳ Waiting for deployment rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/auth-service -n sap-microservices --timeout=300s

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Deployment rollout failed or timed out"
    exit 1
}

Write-Host "✅ Deployment rollout completed successfully!" -ForegroundColor Green

# Check deployment status
Write-Host "📊 Checking deployment status..." -ForegroundColor Yellow
kubectl get pods -n sap-microservices -l app=auth-service

# Get service details
Write-Host "🌐 Service details:" -ForegroundColor Yellow
kubectl get service auth-service -n sap-microservices

# Display final status
Write-Host "`n🎉 SAP Auth Service Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "📋 Deployment Summary:" -ForegroundColor Cyan
Write-Host "  • Project ID: $ProjectId" -ForegroundColor White
Write-Host "  • Cluster: $ClusterName" -ForegroundColor White
Write-Host "  • Region: $Region" -ForegroundColor White
Write-Host "  • Image: $ImageName" -ForegroundColor White
Write-Host "  • Namespace: sap-microservices" -ForegroundColor White

Write-Host "`n🔍 Useful Commands:" -ForegroundColor Cyan
Write-Host "  • Check pods: kubectl get pods -n sap-microservices -l app=auth-service" -ForegroundColor White
Write-Host "  • View logs: kubectl logs -l app=auth-service -n sap-microservices -f" -ForegroundColor White
Write-Host "  • Port forward: kubectl port-forward service/auth-service 3001:3001 -n sap-microservices" -ForegroundColor White
Write-Host "  • Scale service: kubectl scale deployment auth-service --replicas=3 -n sap-microservices" -ForegroundColor White

Write-Host "`n🌐 Service URLs:" -ForegroundColor Cyan
$externalIP = kubectl get service auth-service -n sap-microservices -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
if ($externalIP) {
    Write-Host "  • External URL: http://$externalIP:3001" -ForegroundColor White
    Write-Host "  • Health Check: http://$externalIP:3001/health" -ForegroundColor White
} else {
    Write-Host "  • Internal URL: http://auth-service.sap-microservices.svc.cluster.local:3001" -ForegroundColor White
    Write-Host "  • Use port-forward for local access" -ForegroundColor White
}

Write-Host "`n✅ Deployment completed successfully!" -ForegroundColor Green
