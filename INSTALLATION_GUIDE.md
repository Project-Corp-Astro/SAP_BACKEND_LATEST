# SAP Backend - Tool Installation Guide

## Install Google Cloud SDK
1. Download the installer:
   https://cloud.google.com/sdk/docs/install-sdk#windows

2. Run the installer and follow the setup wizard

3. After installation, restart your terminal and run:
   ```bash
   gcloud init
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project sap-project-466005
   ```

## Install Terraform
1. Download Terraform for Windows:
   https://developer.hashicorp.com/terraform/downloads

2. Extract to C:\terraform\
3. Add C:\terraform\ to your PATH environment variable
4. Restart terminal and verify: terraform --version

## Alternative: Using Chocolatey (if you have it)
```powershell
# Install Chocolatey package manager if not installed:
# https://chocolatey.org/install

# Then install tools:
choco install gcloudsdk
choco install terraform
```

## Verify Installation
After installing, run this to verify:
```powershell
.\deployment-check.ps1
```
