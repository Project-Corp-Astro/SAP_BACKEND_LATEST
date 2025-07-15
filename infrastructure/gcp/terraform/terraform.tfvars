# =================================================================
# SAP Backend GCP Deployment - TESTING CONFIGURATION
# =================================================================
# ⚠️  TESTING NOTICE: This is a test configuration
# ⚠️  Replace with actual values for production deployment

# =================================================================
# GCP PROJECT CONFIGURATION
# =================================================================
project_id              = "sap-project-466005"                    # Your actual GCP project ID
project_name            = "sap-backend"                           # Keep as is
terraform_state_bucket  = "gs://sap-backend-terraform-state-mumbai"  # Your actual GCS bucket

# =================================================================
# REGION & ZONE CONFIGURATION
# =================================================================
region = "asia-south1"    # Mumbai region
zone   = "asia-south1-a"  # Primary zone in Mumbai

# =================================================================
# NETWORKING CONFIGURATION (TESTING - Smaller ranges)
# =================================================================
gke_subnet_cidr         = "10.0.0.0/22"    # Smaller subnet for testing: 1,022 IPs
pods_cidr_range         = "10.1.0.0/18"    # Pods: 16,382 IPs (sufficient for testing)
services_cidr_range     = "10.2.0.0/22"    # Services: 1,022 IPs
master_ipv4_cidr_block  = "172.16.0.0/28"  # Master nodes: 16 IPs

# SSH access (SECURITY: Restrict to your IP for testing)
authorized_ssh_ranges = [
  "0.0.0.0/0"  # ⚠️ TESTING ONLY: Replace with your actual IP range
]

# =================================================================
# GKE CLUSTER CONFIGURATION (TESTING - Cost Optimized)
# =================================================================
gke_cluster_name         = "sap-backend-test-cluster"
gke_cluster_version      = "1.28"
enable_autopilot         = true    # Recommended for testing
enable_private_cluster   = false   # Public for easier testing (change to true for production)
enable_workload_identity = true    # Security best practice
enable_network_policy    = false   # Disable for simpler testing (enable for production)

# =================================================================
# NODE POOL CONFIGURATION (Ignored in Autopilot mode)
# =================================================================
node_pool_machine_type    = "e2-standard-2"  # Smaller for testing
node_pool_disk_size_gb    = 50               # Smaller disk for testing
node_pool_disk_type       = "pd-standard"    # Standard disk for cost savings
node_pool_min_count       = 1                # Minimum for testing
node_pool_max_count       = 3                # Lower max for testing
node_pool_initial_count   = 1                # Single node start

# =================================================================
# DATABASE CONFIGURATION (TESTING - Minimal)
# =================================================================
enable_cloud_sql      = false               # Disable for Module 1 testing
cloud_sql_tier        = "db-f1-micro"       # Smallest tier for testing
enable_redis          = false               # Disable for Module 1 testing
redis_memory_size_gb  = 1                   # Minimum size

# =================================================================
# MONITORING & LOGGING (TESTING - Basic)
# =================================================================
enable_monitoring     = true   # Keep monitoring for validation
enable_logging        = true   # Keep logging for debugging
log_retention_days    = 7      # Shorter retention for testing

# =================================================================
# SECURITY CONFIGURATION (TESTING - Relaxed)
# =================================================================
enable_pod_security_policy   = false  # Disable for simpler testing
enable_binary_authorization  = false  # Disable for testing

# =================================================================
# COST OPTIMIZATION (TESTING - Maximum savings)
# =================================================================
enable_preemptible_nodes = false  # Keep false for stability
enable_spot_instances    = false  # Keep false for testing

# =================================================================
# RESOURCE LABELS
# =================================================================
resource_labels = {
  project      = "sap-backend"
  environment  = "testing"
  team         = "platform"
  cost-center  = "engineering"
  owner        = "test-deployment"
  created-by   = "terraform"
  purpose      = "module-1-testing"
}

# ============================================================================
# Module 2: Database Configuration
# ============================================================================

# PostgreSQL Configuration
postgres_version       = "POSTGRES_15"
postgres_instance_tier = "db-f1-micro"  # Change to db-n1-standard-2 for production
postgres_disk_size_gb  = 20             # Change to 100+ for production

# Database Names
postgres_main_database  = "sap_main"
postgres_auth_database  = "sap_auth"
postgres_audit_database = "sap_audit"

# Database Users
postgres_app_user       = "sap_app_user"
postgres_readonly_user  = "sap_readonly_user"
postgres_migration_user = "sap_migration_user"

# Database Passwords (CHANGE THESE BEFORE DEPLOYMENT!)
postgres_app_password       = "CHANGE_ME_APP_PASSWORD_123!"
postgres_readonly_password  = "CHANGE_ME_READONLY_PASSWORD_123!"
postgres_migration_password = "CHANGE_ME_MIGRATION_PASSWORD_123!"

# Authorized Networks (Add your IP addresses for emergency access)
postgres_authorized_networks = [
  # {
  #   name = "office"
  #   cidr = "203.0.113.0/24"
  # }
]

# Redis Configuration
redis_version       = "REDIS_7_0"
# redis_memory_size_gb already defined above at line 59

# MongoDB Configuration (Atlas)
mongodb_connection_string = ""  # Add your MongoDB Atlas connection string
mongodb_database_name     = "sap_mongodb"
mongodb_username         = "sap_user"
mongodb_password         = ""  # Add your MongoDB password
