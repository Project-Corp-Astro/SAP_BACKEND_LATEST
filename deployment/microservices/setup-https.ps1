# 🔒 SAP Backend HTTPS Setup Script (PowerShell)
# This script installs NGINX Ingress Controller and cert-manager for HTTPS access

param(
    [switch]$UseHelm = $false
)

Write-Host "🚀 Setting up HTTPS for SAP Backend Microservices..." -ForegroundColor Green

# Check if kubectl is available
if (!(Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ kubectl is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if helm is available
$InstallMethod = "kubectl"
if (Get-Command helm -ErrorAction SilentlyContinue) {
    Write-Host "✅ Helm found, using Helm installation" -ForegroundColor Green
    $InstallMethod = "helm"
} else {
    Write-Host "⚠️  Helm not found, installing via kubectl apply..." -ForegroundColor Yellow
}

Write-Host "📋 Step 1: Installing NGINX Ingress Controller" -ForegroundColor Blue

# Install NGINX Ingress Controller
if ($InstallMethod -eq "helm") {
    # Install via Helm (recommended)
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx `
        --namespace ingress-nginx `
        --create-namespace `
        --set controller.service.type=LoadBalancer `
        --set 'controller.service.loadBalancerSourceRanges={0.0.0.0/0}' `
        --set controller.replicaCount=2 `
        --set controller.resources.requests.cpu=100m `
        --set controller.resources.requests.memory=90Mi `
        --set 'controller.service.annotations."cloud\.google\.com/load-balancer-type"=External'
} else {
    # Install via kubectl
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
}

Write-Host "📋 Step 2: Waiting for NGINX Ingress Controller to be ready" -ForegroundColor Blue

# Wait for ingress controller to be ready
kubectl wait --namespace ingress-nginx `
  --for=condition=ready pod `
  --selector=app.kubernetes.io/component=controller `
  --timeout=300s

Write-Host "📋 Step 3: Installing cert-manager" -ForegroundColor Blue

if ($InstallMethod -eq "helm") {
    # Install cert-manager via Helm
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    helm upgrade --install cert-manager jetstack/cert-manager `
        --namespace cert-manager `
        --create-namespace `
        --set installCRDs=true `
        --set global.leaderElection.namespace=cert-manager
} else {
    # Install cert-manager via kubectl
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
}

Write-Host "📋 Step 4: Waiting for cert-manager to be ready" -ForegroundColor Blue

# Wait for cert-manager to be ready
kubectl wait --for=condition=available --timeout=300s --namespace cert-manager deployment --all

Write-Host "📋 Step 5: Applying HTTPS Ingress configuration" -ForegroundColor Blue

# Apply the HTTPS Ingress configuration
kubectl apply -f deployment/microservices/https-ingress-setup.yaml

Write-Host "📋 Step 6: Getting external IP addresses" -ForegroundColor Blue

# Get the NGINX Ingress external IP
Write-Host "⏳ Waiting for NGINX Ingress external IP..." -ForegroundColor Yellow
Start-Sleep 30

$NginxExternalIP = ""
for ($i = 1; $i -le 10; $i++) {
    try {
        $NginxExternalIP = kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
        if ($NginxExternalIP) {
            break
        }
    } catch {
        # Continue trying
    }
    Write-Host "⏳ Waiting for external IP assignment... (attempt $i/10)" -ForegroundColor Yellow
    Start-Sleep 15
}

if ($NginxExternalIP) {
    Write-Host "✅ NGINX Ingress External IP: $NginxExternalIP" -ForegroundColor Green
} else {
    Write-Host "⚠️  External IP not assigned yet. Check later with:" -ForegroundColor Yellow
    Write-Host "kubectl get service ingress-nginx-controller -n ingress-nginx"
}

# Get API Gateway LoadBalancer IP
try {
    $ApiGatewayIP = kubectl get service api-gateway -n sap-microservices -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
} catch {
    $ApiGatewayIP = ""
}

Write-Host "📊 Setup Summary:" -ForegroundColor Green
Write-Host "✅ NGINX Ingress Controller: Installed" -ForegroundColor Green
Write-Host "✅ cert-manager: Installed" -ForegroundColor Green
Write-Host "✅ HTTPS Ingress: Applied" -ForegroundColor Green

Write-Host "🌐 Access URLs:" -ForegroundColor Blue
if ($NginxExternalIP) {
    Write-Host "🔒 HTTPS URL (with automatic SSL): https://$($NginxExternalIP.Replace('.', '-')).nip.io" -ForegroundColor Green
    Write-Host "🔓 HTTP URL (redirects to HTTPS): http://$($NginxExternalIP.Replace('.', '-')).nip.io" -ForegroundColor Green
}

if ($ApiGatewayIP) {
    Write-Host "📡 Direct API Gateway (HTTP): http://$ApiGatewayIP" -ForegroundColor Yellow
}

Write-Host "🔍 Monitoring Commands:" -ForegroundColor Blue
Write-Host "kubectl get ingress -n sap-microservices"
Write-Host "kubectl describe ingress sap-backend-nip-ingress -n sap-microservices"
Write-Host "kubectl get certificate -n sap-microservices"
Write-Host "kubectl get pods -n ingress-nginx"
Write-Host "kubectl get pods -n cert-manager"

Write-Host "🎉 HTTPS setup complete! Your API Gateway now supports both HTTP and HTTPS access." -ForegroundColor Green
Write-Host "📝 Note: SSL certificates may take 2-5 minutes to be issued by Let's Encrypt." -ForegroundColor Yellow
