# 🎯 Manual Deployment Guide - GCP Console
**Alternative for users without local Terraform installation**

## 🌐 **Deploy via Google Cloud Console**

### **Prerequisites**
- Access to Google Cloud Console
- Project: `sap-project-466005`
- Region: `asia-south1` (Mumbai)

---

## 📋 **Step 1: VPC Network Setup**

1. **Navigate to VPC Networks:**
   - Go to: https://console.cloud.google.com/networking/networks
   - Click **"CREATE VPC NETWORK"**

2. **Create VPC Network:**
   ```
   Name: sap-backend-vpc
   Description: SAP Backend VPC Network
   Subnet creation mode: Custom
   ```

3. **Create Subnet:**
   ```
   Subnet Details:
   - Name: gke-subnet
   - Region: asia-south1
   - IP address range: 10.0.0.0/22
   
   Secondary IP ranges:
   - Pod IP range: 10.1.0.0/18
   - Service IP range: 10.2.0.0/22
   ```

4. **Firewall Rules:**
   - Create rules for internal communication
   - Allow SSH access
   - Allow load balancer health checks

---

## 🔧 **Step 2: GKE Cluster Setup**

1. **Navigate to Kubernetes Engine:**
   - Go to: https://console.cloud.google.com/kubernetes

2. **Create GKE Cluster:**
   ```
   Cluster Details:
   - Name: sap-backend-gke
   - Location type: Regional
   - Region: asia-south1
   - Release channel: Regular
   
   Node Pools:
   - Name: default-pool
   - Machine type: e2-standard-4
   - Number of nodes: 3
   - Disk size: 100 GB
   ```

3. **Network Configuration:**
   ```
   Network: sap-backend-vpc
   Node subnet: gke-subnet
   Pod address range: 10.1.0.0/18
   Service address range: 10.2.0.0/22
   ```

---

## 🔐 **Step 3: IAM & Security Setup**

1. **Create Service Accounts:**
   - Navigate to IAM > Service Accounts
   - Create accounts for each service

2. **Required Service Accounts:**
   ```
   - sap-backend-compute-sa
   - sap-backend-gke-sa
   - sap-backend-storage-sa
   - sap-backend-monitoring-sa
   ```

3. **Assign Roles:**
   - Compute Engine roles
   - Kubernetes Engine roles
   - Storage roles
   - Monitoring roles

---

## 📊 **Step 4: Monitoring Setup**

1. **Enable APIs:**
   - Monitoring API
   - Logging API
   - Error Reporting API

2. **Create Monitoring Workspace:**
   - Navigate to Monitoring
   - Create workspace for project

---

## ✅ **Verification Steps**

After manual setup, verify:

1. **VPC Network:** `sap-backend-vpc` exists
2. **GKE Cluster:** `sap-backend-gke` is running
3. **Service Accounts:** All accounts created with proper roles
4. **Monitoring:** Workspace configured

---

## 🎯 **Next Steps**

Once Module 1 is manually deployed:
1. **Proceed to Module 2** database setup
2. **Use terraform for Module 2** (databases.tf)
3. **Deploy applications** to GKE cluster

---

**Estimated Time:** 45-60 minutes for manual setup
**Difficulty:** Intermediate
**Cost:** ~$50-100/month for basic setup
