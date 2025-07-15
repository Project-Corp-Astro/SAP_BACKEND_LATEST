# 🚀 Module 1 Deployment Guide - Step by Step

**Status**: Ready for deployment  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: GCP account with billing enabled  

---

## 🎯 **BEFORE YOU START**

### **Required Information**
You need these two pieces of information before proceeding:

1. **Your GCP Project ID** (e.g., `my-sap-backend-project`)
2. **A GCS bucket name for Terraform state** (e.g., `my-terraform-state-bucket`)

### **Required Tools**
- Google Cloud SDK (`gcloud`) - [Install Guide](https://cloud.google.com/sdk/docs/install)
- Terraform >= 1.5.0 - [Install Guide](https://terraform.io/downloads)
- Git Bash or WSL (for running shell scripts on Windows)

---

## 📝 **STEP 1: Update Configuration**

### **1.1 Edit terraform.tfvars**
Open `infrastructure/gcp/terraform/terraform.tfvars` and update:

```bash
# Change this line:
project_id = "test-sap-backend-project"
# To your actual project ID:
project_id = "YOUR_ACTUAL_PROJECT_ID"

# Change this line:
terraform_state_bucket = "gs://test-sap-terraform-state"
# To your actual bucket:
terraform_state_bucket = "gs://YOUR_ACTUAL_BUCKET_NAME"
```

### **1.2 Verify Configuration**
```bash
cd infrastructure/gcp/terraform
cat terraform.tfvars | grep -E "project_id|terraform_state_bucket"
```

---

## 🔐 **STEP 2: GCP Authentication**

### **2.1 Login to Google Cloud**
```bash
gcloud auth login
```

### **2.2 Set Active Project**
```bash
gcloud config set project YOUR_PROJECT_ID
```

### **2.3 Enable Application Default Credentials**
```bash
gcloud auth application-default login
```

### **2.4 Verify Authentication**
```bash
gcloud auth list
gcloud projects describe YOUR_PROJECT_ID
```

---

## 🧪 **STEP 3: Pre-Deployment Validation**

### **3.1 Run Pre-flight Checks**
```bash
cd infrastructure/gcp/terraform
bash validate-preflight.sh
```

**Expected Output:**
```
✅ Prerequisites validation passed
✅ GCP authentication validation passed
✅ Terraform configuration validation passed
✅ GCP project validation passed
✅ GCP APIs validation completed
✅ Terraform state bucket validation passed
✅ Network configuration validation passed
🎉 All pre-flight validations passed! Ready for deployment.
```

### **3.2 If Validation Fails**
- Check error messages and fix issues
- Ensure billing is enabled on your GCP project
- Verify you have necessary permissions

---

## 🚀 **STEP 4: Infrastructure Deployment**

### **4.1 Full Automated Deployment**
```bash
cd infrastructure/gcp/terraform
./deploy.sh all
```

### **4.2 Step-by-Step Deployment (Alternative)**
If you prefer to see each step:

```bash
# Step 1: Validation
./deploy.sh validate

# Step 2: Planning
./deploy.sh plan

# Step 3: Apply (will ask for confirmation)
./deploy.sh apply

# Step 4: Verification
./deploy.sh verify

# Step 5: Generate summary
./deploy.sh complete
```

---

## ✅ **STEP 5: Post-Deployment Verification**

### **5.1 Connect to GKE Cluster**
```bash
gcloud container clusters get-credentials sap-backend-test-cluster \
  --region us-central1 --project YOUR_PROJECT_ID
```

### **5.2 Verify Cluster Health**
```bash
kubectl cluster-info
kubectl get nodes
kubectl get namespaces
```

**Expected Output:**
```
NAME     STATUS   ROLES    AGE   VERSION
node-1   Ready    <none>   5m    v1.28.x
```

### **5.3 Test Basic Functionality**
```bash
# Test pod creation
kubectl run test-pod --image=nginx --rm -it --restart=Never -- echo "Hello GKE"

# Check system pods
kubectl get pods -n kube-system
```

---

## 📊 **STEP 6: Validate Success Metrics**

### **6.1 Performance Validation**
- ✅ Cluster creation time < 15 minutes
- ✅ API response time < 200ms
- ✅ All nodes in Ready state

### **6.2 Security Validation**
- ✅ Workload Identity enabled
- ✅ Private endpoints configured
- ✅ Proper RBAC permissions

### **6.3 Cost Validation**
- ✅ Autopilot mode active (pay-per-use)
- ✅ Resource labels applied
- ✅ Monitoring enabled for cost tracking

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

#### **Authentication Problems**
```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login
```

#### **API Not Enabled**
```bash
# Enable required APIs manually
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
```

#### **Terraform State Issues**
```bash
# Check if bucket exists
gsutil ls gs://YOUR_BUCKET_NAME

# Create bucket if needed
gsutil mb gs://YOUR_BUCKET_NAME
```

#### **Cluster Connection Issues**
```bash
# Reset kubeconfig
gcloud container clusters get-credentials sap-backend-test-cluster \
  --region us-central1 --project YOUR_PROJECT_ID
```

---

## 🔄 **ROLLBACK PROCEDURE**

If something goes wrong:

```bash
cd infrastructure/gcp/terraform
./deploy.sh rollback
```

**⚠️ WARNING:** This will destroy all created resources!

---

## 🎉 **SUCCESS INDICATORS**

You'll know Module 1 is successful when:

- ✅ All validation scripts pass
- ✅ GKE cluster is accessible via kubectl
- ✅ No critical errors in logs
- ✅ Terraform state is stored in GCS
- ✅ All resources have proper labels

---

## 📋 **NEXT STEPS AFTER MODULE 1**

Once Module 1 is complete:

1. ✅ **Review deployment summary** in logs directory
2. ✅ **Commit configuration** to version control
3. ✅ **Document any customizations** made
4. ✅ **Proceed to Module 2**: Database Migration

---

**Ready to deploy? Start with Step 1! 🚀**
