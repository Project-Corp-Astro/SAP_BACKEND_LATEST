# ============================================================================
# SAP Backend - Deployment Preparation Script
# ============================================================================

param(
    [switch]$CheckOnly,
    [switch]$InstallTools,
    [switch]$SetupAuth
)

function Write-Success($Text) { Write-Host "✅ $Text" -ForegroundColor Green }
function Write-Warning($Text) { Write-Host "⚠️ $Text" -ForegroundColor Yellow }
function Write-Error($Text) { Write-Host "❌ $Text" -ForegroundColor Red }
function Write-Info($Text) { Write-Host "ℹ️ $Text" -ForegroundColor Cyan }

Write-Host "🚀 SAP Backend Deployment Preparation" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue

# Environment validation
Write-Info "Step 1: Validating Current Environment..."

$errorsList = @()
$warningsList = @()

# Check Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker is installed: $dockerVersion"
    } else {
        $errorsList += "Docker is not installed or not accessible"
        Write-Error "Docker is not installed or not accessible"
    }
} catch {
    $errorsList += "Docker is not installed or not accessible"
    Write-Error "Docker is not installed or not accessible"
}

# Check kubectl
try {
    $kubectlVersion = kubectl version --client 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "kubectl is installed"
    } else {
        $errorsList += "kubectl is not installed or not accessible"
        Write-Error "kubectl is not installed or not accessible"
    }
} catch {
    $errorsList += "kubectl is not installed or not accessible"
    Write-Error "kubectl is not installed or not accessible"
}

# Check gcloud
try {
    $gcloudTest = gcloud version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Google Cloud SDK is installed"
    } else {
        $warningsList += "Google Cloud SDK is not installed"
        Write-Warning "Google Cloud SDK is not installed"
    }
} catch {
    $warningsList += "Google Cloud SDK is not installed"
    Write-Warning "Google Cloud SDK is not installed"
}

# Check Terraform
try {
    $terraformTest = terraform --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Terraform is installed"
    } else {
        $warningsList += "Terraform is not installed"
        Write-Warning "Terraform is not installed"
    }
} catch {
    $warningsList += "Terraform is not installed"
    Write-Warning "Terraform is not installed"
}

# Configuration validation
Write-Info "Step 2: Validating Configuration Files..."

if (Test-Path ".\infrastructure\gcp\terraform\terraform.tfvars") {
    Write-Success "Terraform variables file exists"
} else {
    $errorsList += "terraform.tfvars not found"
    Write-Error "terraform.tfvars not found"
}

if (Test-Path ".\.env") {
    Write-Success ".env file exists"
} else {
    Write-Warning ".env file not found"
    $warningsList += ".env file should be created"
}

# Summary
Write-Host "`n📊 DEPLOYMENT READINESS SUMMARY" -ForegroundColor Blue
Write-Host "==============================" -ForegroundColor Blue

if ($errorsList.Count -eq 0 -and $warningsList.Count -eq 0) {
    Write-Success "🎉 Environment is ready for deployment!"
    Write-Info "You can now run the deployment script"
} elseif ($errorsList.Count -eq 0) {
    Write-Warning "⚠️ Environment has minor issues but is deployable"
    Write-Info "Warnings to address:"
    foreach ($warning in $warningsList) {
        Write-Host "  • $warning" -ForegroundColor Yellow
    }
} else {
    Write-Error "❌ Environment has critical issues that must be fixed"
    Write-Info "Critical issues:"
    foreach ($errorItem in $errorsList) {
        Write-Host "  • $errorItem" -ForegroundColor Red
    }
}

Write-Host "`n🚀 NEXT STEPS:" -ForegroundColor Blue
if ($errorsList.Count -eq 0) {
    Write-Host "1. Install missing tools if needed (gcloud, terraform)" -ForegroundColor White
    Write-Host "2. Review terraform.tfvars for production values" -ForegroundColor White
    Write-Host "3. Execute: .\deploy-containerized.sh" -ForegroundColor White
} else {
    Write-Host "1. Install missing tools (Docker, kubectl, gcloud, terraform)" -ForegroundColor White
    Write-Host "2. Run this script again to re-validate" -ForegroundColor White
}
