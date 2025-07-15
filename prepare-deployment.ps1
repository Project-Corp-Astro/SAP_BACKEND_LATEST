# ============================================================================
# SAP Backend - Deployment Preparation Script
# ============================================================================
# This script prepares your environment for GCP deployment
# Run this before executing deploy-containerized.sh

param(
    [switch]$CheckOnly,
    [switch]$InstallTools,
    [switch]$SetupAuth
)

# Colors for output
function Write-ColorOutput($Text, $Color = "White") {
    Write-Host $Text -ForegroundColor $Color
}

function Write-Success($Text) { Write-ColorOutput "✅ $Text" "Green" }
function Write-Warning($Text) { Write-ColorOutput "⚠️ $Text" "Yellow" }
function Write-Error($Text) { Write-ColorOutput "❌ $Text" "Red" }
function Write-Info($Text) { Write-ColorOutput "ℹ️ $Text" "Cyan" }

Write-ColorOutput "🚀 SAP Backend Deployment Preparation" "Blue"
Write-ColorOutput "========================================" "Blue"

# ============================================================================
# STEP 1: ENVIRONMENT VALIDATION
# ============================================================================
Write-Info "Step 1: Validating Current Environment..."

$errors = @()
$warnings = @()

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Success "Docker is installed: $dockerVersion"
} catch {
    $errors += "Docker is not installed or not accessible"
    Write-Error "Docker is not installed or not accessible"
}

# Check kubectl
try {
    $kubectlVersion = kubectl version --client --short 2>$null
    Write-Success "kubectl is installed: $kubectlVersion"
} catch {
    $errors += "kubectl is not installed or not accessible"
    Write-Error "kubectl is not installed or not accessible"
}

# Check gcloud
try {
    $gcloudVersion = gcloud version --format="value(Google Cloud SDK)" 2>$null
    Write-Success "Google Cloud SDK is installed: $gcloudVersion"
} catch {
    $warnings += "Google Cloud SDK is not installed"
    Write-Warning "Google Cloud SDK is not installed"
}

# Check Terraform
try {
    $terraformVersion = terraform --version 2>$null | Select-Object -First 1
    Write-Success "Terraform is installed: $terraformVersion"
} catch {
    $warnings += "Terraform is not installed"
    Write-Warning "Terraform is not installed"
}

# ============================================================================
# STEP 2: CONFIGURATION VALIDATION
# ============================================================================
Write-Info "Step 2: Validating Configuration Files..."

# Check Terraform configuration
if (Test-Path ".\infrastructure\gcp\terraform\terraform.tfvars") {
    Write-Success "Terraform variables file exists"
    
    # Check for placeholder values
    $tfvarsContent = Get-Content ".\infrastructure\gcp\terraform\terraform.tfvars" -Raw
    if ($tfvarsContent -match "your-gcp-project-id|your-terraform-state-bucket") {
        Write-Warning "terraform.tfvars contains placeholder values - needs updating"
        $warnings += "terraform.tfvars needs production values"
    } else {
        Write-Success "terraform.tfvars appears to have real values"
    }
} else {
    $errors += "terraform.tfvars not found"
    Write-Error "terraform.tfvars not found in infrastructure/gcp/terraform/"
}

# Check environment file
if (Test-Path ".\.env") {
    Write-Success ".env file exists"
} else {
    Write-Warning ".env file not found - you may need to create it from .env.example"
    $warnings += ".env file should be created from .env.example"
}

# Check Docker files
$dockerfiles = @(
    ".\infrastructure\docker\Dockerfile",
    ".\infrastructure\docker\Dockerfile.microservice",
    ".\infrastructure\docker\Dockerfile.health-monitor"
)

foreach ($dockerfile in $dockerfiles) {
    if (Test-Path $dockerfile) {
        Write-Success "Found: $dockerfile"
    } else {
        $errors += "Missing: $dockerfile"
        Write-Error "Missing: $dockerfile"
    }
}

# Check Kubernetes manifests
if (Test-Path ".\deployment\gitops") {
    Write-Success "GitOps deployment manifests found"
} else {
    $errors += "GitOps deployment manifests not found"
    Write-Error "GitOps deployment manifests not found in deployment/gitops/"
}

# ============================================================================
# STEP 3: QUICK FIXES
# ============================================================================
if (-not $CheckOnly) {
    Write-Info "Step 3: Applying Quick Fixes..."

    # Create .env from template if it doesn't exist
    if (-not (Test-Path ".\.env") -and (Test-Path ".\.env.example")) {
        Copy-Item ".\.env.example" ".\.env"
        Write-Success "Created .env from template"
        Write-Warning "Please update .env with your actual values"
    }

    # Fix container image references for GCP
    Write-Info "Fixing container image references for GCP..."
    try {
        $gitopsFiles = Get-ChildItem -Path ".\deployment\gitops" -Filter "*.yaml" -Recurse -ErrorAction SilentlyContinue
        foreach ($file in $gitopsFiles) {
            $content = Get-Content $file.FullName -Raw
            $updated = $content -replace "ghcr\.io/[^/]+/", "gcr.io/sap-project-466005/"
            Set-Content $file.FullName $updated
        }
        Write-Success "Updated container image references in GitOps manifests"
    } catch {
        Write-Warning "Could not update container image references: $_"
    }
}

# ============================================================================
# STEP 4: INSTALLATION HELPERS
# ============================================================================
if ($InstallTools) {
    Write-Info "Step 4: Tool Installation Instructions..."
    
    Write-ColorOutput "`n📦 INSTALLATION COMMANDS:" "Yellow"
    
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-ColorOutput "`n🔧 Google Cloud SDK:" "Cyan"
        Write-ColorOutput "1. Download from: https://cloud.google.com/sdk/docs/install-sdk#windows" "White"
        Write-ColorOutput "2. Or use Chocolatey: choco install gcloudsdk" "White"
    }
    
    if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
        Write-ColorOutput "`n🔧 Terraform:" "Cyan"
        Write-ColorOutput "1. Download from: https://developer.hashicorp.com/terraform/downloads" "White"
        Write-ColorOutput "2. Or use Chocolatey: choco install terraform" "White"
    }
}

# ============================================================================
# STEP 5: AUTHENTICATION SETUP
# ============================================================================
if ($SetupAuth) {
    Write-Info "Step 5: Authentication Setup..."
    
    if (Get-Command gcloud -ErrorAction SilentlyContinue) {
        Write-Info "Setting up Google Cloud authentication..."
        try {
            & gcloud auth login
            & gcloud auth application-default login
            & gcloud config set project sap-project-466005
            Write-Success "Google Cloud authentication configured"
        } catch {
            Write-Error "Failed to setup Google Cloud authentication: $_"
        }
    } else {
        Write-Warning "gcloud CLI not available - install Google Cloud SDK first"
    }
}

# ============================================================================
# SUMMARY REPORT
# ============================================================================
Write-ColorOutput "`n📊 DEPLOYMENT READINESS SUMMARY" "Blue"
Write-ColorOutput "==============================" "Blue"

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Success "🎉 Environment is ready for deployment!"
    Write-Info "You can now run: .\deploy-containerized.sh"
} elseif ($errors.Count -eq 0) {
    Write-Warning "⚠️ Environment has minor issues but is deployable"
    Write-Info "Warnings to address:"
    foreach ($warning in $warnings) {
        Write-ColorOutput "  • $warning" "Yellow"
    }
    Write-Info "`nYou can proceed with deployment, but consider fixing warnings first"
} else {
    Write-Error "❌ Environment has critical issues that must be fixed"
    Write-Info "Critical errors:"
    foreach ($errorMsg in $errors) {
        Write-ColorOutput "  • $errorMsg" "Red"
    }
    Write-Info "`nFix these errors before attempting deployment"
}

Write-ColorOutput "`n🚀 NEXT STEPS:" "Blue"
if ($errors.Count -eq 0) {
    Write-ColorOutput "1. Run: .\prepare-deployment.ps1 -SetupAuth (if not done)" "White"
    Write-ColorOutput "2. Review terraform.tfvars for production values" "White"
    Write-ColorOutput "3. Execute: .\deploy-containerized.sh" "White"
} else {
    Write-ColorOutput "1. Run: .\prepare-deployment.ps1 -InstallTools" "White"
    Write-ColorOutput "2. Install missing tools (gcloud, terraform)" "White"
    Write-ColorOutput "3. Run this script again to re-validate" "White"
}
