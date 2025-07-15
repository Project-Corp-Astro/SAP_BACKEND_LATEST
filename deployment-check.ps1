# SAP Backend Deployment Readiness Check
Write-Host "=== SAP Backend Deployment Readiness Check ===" -ForegroundColor Blue

$issues = @()
$warnings = @()

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Cyan
try {
    $dockerResult = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker is installed" -ForegroundColor Green
    } else {
        $issues += "Docker not available"
        Write-Host "❌ Docker not available" -ForegroundColor Red
    }
} catch {
    $issues += "Docker not available"
    Write-Host "❌ Docker not available" -ForegroundColor Red
}

# Check kubectl
Write-Host "Checking kubectl..." -ForegroundColor Cyan
try {
    $kubectlResult = kubectl version --client 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ kubectl is installed" -ForegroundColor Green
    } else {
        $issues += "kubectl not available"
        Write-Host "❌ kubectl not available" -ForegroundColor Red
    }
} catch {
    $issues += "kubectl not available"
    Write-Host "❌ kubectl not available" -ForegroundColor Red
}

# Check gcloud
Write-Host "Checking Google Cloud SDK..." -ForegroundColor Cyan
try {
    $gcloudResult = gcloud version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Google Cloud SDK is installed" -ForegroundColor Green
    } else {
        $warnings += "Google Cloud SDK not installed"
        Write-Host "⚠️ Google Cloud SDK not installed" -ForegroundColor Yellow
    }
} catch {
    $warnings += "Google Cloud SDK not installed"
    Write-Host "⚠️ Google Cloud SDK not installed" -ForegroundColor Yellow
}

# Check Terraform
Write-Host "Checking Terraform..." -ForegroundColor Cyan
try {
    $terraformResult = terraform --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Terraform is installed" -ForegroundColor Green
    } else {
        $warnings += "Terraform not installed"
        Write-Host "⚠️ Terraform not installed" -ForegroundColor Yellow
    }
} catch {
    $warnings += "Terraform not installed"
    Write-Host "⚠️ Terraform not installed" -ForegroundColor Yellow
}

# Check configuration files
Write-Host "Checking configuration files..." -ForegroundColor Cyan

if (Test-Path ".\infrastructure\gcp\terraform\terraform.tfvars") {
    Write-Host "✅ terraform.tfvars found" -ForegroundColor Green
} else {
    $issues += "terraform.tfvars missing"
    Write-Host "❌ terraform.tfvars missing" -ForegroundColor Red
}

if (Test-Path ".\.env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    $warnings += ".env file missing"
    Write-Host "⚠️ .env file missing" -ForegroundColor Yellow
}

# Docker files check
$dockerFiles = @(
    ".\infrastructure\docker\Dockerfile",
    ".\infrastructure\docker\Dockerfile.microservice"
)

foreach ($file in $dockerFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Found: $file" -ForegroundColor Green
    } else {
        $issues += "Missing: $file"
        Write-Host "❌ Missing: $file" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n=== SUMMARY ===" -ForegroundColor Blue

if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "🎉 READY FOR DEPLOYMENT!" -ForegroundColor Green
    Write-Host "All requirements are met. You can proceed with deployment." -ForegroundColor Green
} elseif ($issues.Count -eq 0) {
    Write-Host "⚠️ DEPLOYMENT POSSIBLE WITH WARNINGS" -ForegroundColor Yellow
    Write-Host "Issues to consider:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  • $warning" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ CRITICAL ISSUES FOUND" -ForegroundColor Red
    Write-Host "Must fix these before deployment:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  • $issue" -ForegroundColor Red
    }
}

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Blue
if ($issues.Count -eq 0) {
    Write-Host "1. Install missing tools (gcloud, terraform) if needed" -ForegroundColor White
    Write-Host "2. Run: .\deploy-containerized.sh" -ForegroundColor White
} else {
    Write-Host "1. Install missing tools" -ForegroundColor White
    Write-Host "2. Fix configuration issues" -ForegroundColor White
    Write-Host "3. Re-run this check" -ForegroundColor White
}
