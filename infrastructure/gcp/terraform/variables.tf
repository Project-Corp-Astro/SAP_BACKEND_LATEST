# 🔧 SAP Backend GCP Infrastructure - Variables
# Mathematical Precision: All variables validated with constraints
# Zero-Tolerance: Invalid inputs will cause immediate failure

# =================================================================
# PROJECT CONFIGURATION
# =================================================================
variable "project_id" {
  description = "The GCP project ID where resources will be created"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z][-a-z0-9]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, start with lowercase letter, contain only lowercase letters, numbers, and hyphens."
  }
}

variable "project_name" {
  description = "Name prefix for resources"
  type        = string
  default     = "sap-backend"
  
  validation {
    condition     = can(regex("^[a-z][-a-z0-9]{2,20}$", var.project_name))
    error_message = "Project name must be 3-21 characters, lowercase letters, numbers, and hyphens only."
  }
}

variable "terraform_state_bucket" {
  description = "GCS bucket for Terraform state storage"
  type        = string
  
  validation {
    condition     = can(regex("^gs://[a-z0-9][-_.a-z0-9]{1,61}[a-z0-9]$", var.terraform_state_bucket))
    error_message = "Terraform state bucket must be a valid GCS bucket URL (gs://bucket-name)."
  }
}

# =================================================================
# REGION & ZONE CONFIGURATION
# =================================================================
variable "region" {
  description = "The GCP region for regional resources"
  type        = string
  default     = "us-central1"
  
  validation {
    condition = contains([
      "us-central1", "us-east1", "us-east4", "us-west1", "us-west2", "us-west3", "us-west4",
      "europe-west1", "europe-west2", "europe-west3", "europe-west4", "europe-west6",
      "asia-east1", "asia-northeast1", "asia-south1", "asia-southeast1"
    ], var.region)
    error_message = "Region must be a valid GCP region with sufficient quota and services."
  }
}

variable "zone" {
  description = "The GCP zone for zonal resources"
  type        = string
  default     = "us-central1-a"
  
  validation {
    condition     = can(regex("^[a-z]+-[a-z0-9]+-[a-z]$", var.zone))
    error_message = "Zone must be a valid GCP zone format (region-zone)."
  }
}

# =================================================================
# NETWORKING CONFIGURATION
# =================================================================
variable "gke_subnet_cidr" {
  description = "CIDR range for GKE subnet"
  type        = string
  default     = "10.0.0.0/20"
  
  validation {
    condition     = can(cidrhost(var.gke_subnet_cidr, 0))
    error_message = "GKE subnet CIDR must be a valid IPv4 CIDR range."
  }
  
  validation {
    condition     = split("/", var.gke_subnet_cidr)[1] <= "24"
    error_message = "GKE subnet CIDR must be /24 or larger (smaller number) to accommodate cluster needs."
  }
}

variable "pods_cidr_range" {
  description = "CIDR range for Kubernetes pods"
  type        = string
  default     = "10.1.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.pods_cidr_range, 0))
    error_message = "Pods CIDR must be a valid IPv4 CIDR range."
  }
  
  validation {
    condition     = split("/", var.pods_cidr_range)[1] <= "20"
    error_message = "Pods CIDR must be /20 or larger to accommodate pod scaling."
  }
}

variable "services_cidr_range" {
  description = "CIDR range for Kubernetes services"
  type        = string
  default     = "10.2.0.0/20"
  
  validation {
    condition     = can(cidrhost(var.services_cidr_range, 0))
    error_message = "Services CIDR must be a valid IPv4 CIDR range."
  }
  
  validation {
    condition     = split("/", var.services_cidr_range)[1] <= "24"
    error_message = "Services CIDR must be /24 or larger for service discovery."
  }
}

variable "authorized_ssh_ranges" {
  description = "List of authorized IP ranges for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # SECURITY WARNING: Restrict this in production
  
  validation {
    condition     = alltrue([for cidr in var.authorized_ssh_ranges : can(cidrhost(cidr, 0))])
    error_message = "All authorized SSH ranges must be valid IPv4 CIDR ranges."
  }
}

# =================================================================
# GKE CLUSTER CONFIGURATION
# =================================================================
variable "gke_cluster_name" {
  description = "Name of the GKE cluster"
  type        = string
  default     = "sap-backend-cluster"
  
  validation {
    condition     = can(regex("^[a-z][-a-z0-9]{0,39}$", var.gke_cluster_name))
    error_message = "GKE cluster name must be 1-40 characters, start with lowercase letter, contain only lowercase letters, numbers, and hyphens."
  }
}

variable "gke_cluster_version" {
  description = "Kubernetes version for GKE cluster"
  type        = string
  default     = "1.28"
  
  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+", var.gke_cluster_version))
    error_message = "GKE cluster version must be in format 'major.minor' (e.g., '1.28')."
  }
}

variable "enable_autopilot" {
  description = "Enable GKE Autopilot mode (fully managed)"
  type        = bool
  default     = true
}

variable "enable_private_cluster" {
  description = "Enable private GKE cluster"
  type        = bool
  default     = true
}

variable "master_ipv4_cidr_block" {
  description = "CIDR block for GKE master nodes (private cluster)"
  type        = string
  default     = "172.16.0.0/28"
  
  validation {
    condition     = can(cidrhost(var.master_ipv4_cidr_block, 0))
    error_message = "Master IPv4 CIDR block must be a valid IPv4 CIDR range."
  }
  
  validation {
    condition     = split("/", var.master_ipv4_cidr_block)[1] == "28"
    error_message = "Master IPv4 CIDR block must be exactly /28 for GKE private clusters."
  }
}

# =================================================================
# NODE POOL CONFIGURATION (Standard Mode Only)
# =================================================================
variable "node_pool_machine_type" {
  description = "Machine type for GKE node pool"
  type        = string
  default     = "e2-standard-4"
  
  validation {
    condition = contains([
      "e2-medium", "e2-standard-2", "e2-standard-4", "e2-standard-8",
      "n2-standard-2", "n2-standard-4", "n2-standard-8",
      "c2-standard-4", "c2-standard-8"
    ], var.node_pool_machine_type)
    error_message = "Machine type must be a valid GCP machine type suitable for production workloads."
  }
}

variable "node_pool_disk_size_gb" {
  description = "Disk size in GB for each node"
  type        = number
  default     = 100
  
  validation {
    condition     = var.node_pool_disk_size_gb >= 50 && var.node_pool_disk_size_gb <= 1000
    error_message = "Node pool disk size must be between 50 and 1000 GB."
  }
}

variable "node_pool_disk_type" {
  description = "Disk type for node pool"
  type        = string
  default     = "pd-ssd"
  
  validation {
    condition     = contains(["pd-standard", "pd-ssd", "pd-balanced"], var.node_pool_disk_type)
    error_message = "Disk type must be pd-standard, pd-ssd, or pd-balanced."
  }
}

variable "node_pool_min_count" {
  description = "Minimum number of nodes in the node pool"
  type        = number
  default     = 1
  
  validation {
    condition     = var.node_pool_min_count >= 1 && var.node_pool_min_count <= 10
    error_message = "Node pool minimum count must be between 1 and 10."
  }
}

variable "node_pool_max_count" {
  description = "Maximum number of nodes in the node pool"
  type        = number
  default     = 10
  
  validation {
    condition     = var.node_pool_max_count >= var.node_pool_min_count && var.node_pool_max_count <= 100
    error_message = "Node pool maximum count must be >= min_count and <= 100."
  }
}

variable "node_pool_initial_count" {
  description = "Initial number of nodes in the node pool"
  type        = number
  default     = 3
  
  validation {
    condition     = var.node_pool_initial_count >= var.node_pool_min_count && var.node_pool_initial_count <= var.node_pool_max_count
    error_message = "Node pool initial count must be between min_count and max_count."
  }
}

# =================================================================
# DATABASE CONFIGURATION
# =================================================================
variable "enable_cloud_sql" {
  description = "Enable Cloud SQL PostgreSQL instance"
  type        = bool
  default     = true
}

variable "cloud_sql_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-custom-2-4096"
  
  validation {
    condition = contains([
      "db-custom-1-3840", "db-custom-2-4096", "db-custom-4-8192", 
      "db-custom-8-16384", "db-standard-1", "db-standard-2", "db-standard-4"
    ], var.cloud_sql_tier)
    error_message = "Cloud SQL tier must be a valid PostgreSQL tier."
  }
}

# ============================================================================
# Module 2: Database Configuration Variables
# ============================================================================

# PostgreSQL Configuration
variable "postgres_version" {
  description = "PostgreSQL database version"
  type        = string
  default     = "POSTGRES_15"
  
  validation {
    condition = contains([
      "POSTGRES_13", "POSTGRES_14", "POSTGRES_15", "POSTGRES_16"
    ], var.postgres_version)
    error_message = "PostgreSQL version must be one of: POSTGRES_13, POSTGRES_14, POSTGRES_15, POSTGRES_16."
  }
}

variable "postgres_instance_tier" {
  description = "Machine type for PostgreSQL instance"
  type        = string
  default     = "db-f1-micro"
  
  validation {
    condition = can(regex("^db-(f1-micro|g1-small|n1-standard-[1-8]|n1-highmem-[2-8]|n1-highcpu-[4-8])$", var.postgres_instance_tier))
    error_message = "PostgreSQL instance tier must be a valid Cloud SQL machine type."
  }
}

variable "postgres_disk_size_gb" {
  description = "Initial disk size for PostgreSQL instance in GB"
  type        = number
  default     = 20
  
  validation {
    condition     = var.postgres_disk_size_gb >= 10 && var.postgres_disk_size_gb <= 65536
    error_message = "PostgreSQL disk size must be between 10 GB and 65536 GB."
  }
}

variable "postgres_main_database" {
  description = "Main application database name"
  type        = string
  default     = "sap_main"
  
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.postgres_main_database))
    error_message = "Database name must start with a letter and contain only letters, numbers, and underscores."
  }
}

variable "postgres_auth_database" {
  description = "Authentication database name"
  type        = string
  default     = "sap_auth"
  
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.postgres_auth_database))
    error_message = "Database name must start with a letter and contain only letters, numbers, and underscores."
  }
}

variable "postgres_audit_database" {
  description = "Audit database name"
  type        = string
  default     = "sap_audit"
  
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.postgres_audit_database))
    error_message = "Database name must start with a letter and contain only letters, numbers, and underscores."
  }
}

# PostgreSQL Users
variable "postgres_app_user" {
  description = "Application database user"
  type        = string
  default     = "sap_app_user"
  
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.postgres_app_user))
    error_message = "Username must start with a letter and contain only letters, numbers, and underscores."
  }
}

variable "postgres_readonly_user" {
  description = "Read-only database user"
  type        = string
  default     = "sap_readonly_user"
  
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.postgres_readonly_user))
    error_message = "Username must start with a letter and contain only letters, numbers, and underscores."
  }
}

variable "postgres_migration_user" {
  description = "Migration database user"
  type        = string
  default     = "sap_migration_user"
  
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.postgres_migration_user))
    error_message = "Username must start with a letter and contain only letters, numbers, and underscores."
  }
}

# PostgreSQL Passwords (sensitive)
variable "postgres_app_password" {
  description = "Password for application database user"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.postgres_app_password) >= 12
    error_message = "Password must be at least 12 characters long."
  }
}

variable "postgres_readonly_password" {
  description = "Password for read-only database user"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.postgres_readonly_password) >= 12
    error_message = "Password must be at least 12 characters long."
  }
}

variable "postgres_migration_password" {
  description = "Password for migration database user"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.postgres_migration_password) >= 12
    error_message = "Password must be at least 12 characters long."
  }
}

variable "postgres_authorized_networks" {
  description = "List of authorized networks for PostgreSQL access"
  type = list(object({
    name = string
    cidr = string
  }))
  default = []
  
  validation {
    condition = alltrue([
      for network in var.postgres_authorized_networks :
      can(cidrhost(network.cidr, 0))
    ])
    error_message = "All network CIDRs must be valid CIDR blocks."
  }
}

# Redis Configuration
variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "REDIS_7_0"
  
  validation {
    condition = contains([
      "REDIS_6_X", "REDIS_7_0", "REDIS_7_2"
    ], var.redis_version)
    error_message = "Redis version must be one of: REDIS_6_X, REDIS_7_0, REDIS_7_2."
  }
}

variable "redis_memory_size_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
  
  validation {
    condition     = var.redis_memory_size_gb >= 1 && var.redis_memory_size_gb <= 300
    error_message = "Redis memory size must be between 1 GB and 300 GB."
  }
}

# MongoDB Configuration (Atlas)
variable "mongodb_connection_string" {
  description = "MongoDB Atlas connection string"
  type        = string
  sensitive   = true
  default     = ""
}

variable "mongodb_database_name" {
  description = "MongoDB database name"
  type        = string
  default     = "sap_mongodb"
  
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.mongodb_database_name))
    error_message = "Database name must start with a letter and contain only letters, numbers, and underscores."
  }
}

variable "mongodb_username" {
  description = "MongoDB username"
  type        = string
  default     = "sap_user"
  sensitive   = true
  
  validation {
    condition     = length(var.mongodb_username) >= 3
    error_message = "MongoDB username must be at least 3 characters long."
  }
}

variable "mongodb_password" {
  description = "MongoDB password"
  type        = string
  sensitive   = true
  default     = ""
  
  validation {
    condition     = var.mongodb_password == "" || length(var.mongodb_password) >= 12
    error_message = "MongoDB password must be at least 12 characters long when provided."
  }
}

# =================================================================
# MONITORING & LOGGING
# =================================================================
variable "enable_monitoring" {
  description = "Enable Google Cloud Monitoring"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable Google Cloud Logging"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Log retention period in days"
  type        = number
  default     = 30
  
  validation {
    condition     = var.log_retention_days >= 1 && var.log_retention_days <= 3653
    error_message = "Log retention must be between 1 and 3653 days (10 years)."
  }
}

# =================================================================
# SECURITY CONFIGURATION
# =================================================================
variable "enable_workload_identity" {
  description = "Enable Workload Identity for secure pod-to-GCP service communication"
  type        = bool
  default     = true
}

variable "enable_network_policy" {
  description = "Enable Kubernetes network policy"
  type        = bool
  default     = true
}

variable "enable_pod_security_policy" {
  description = "Enable Pod Security Policy"
  type        = bool
  default     = true
}

variable "enable_binary_authorization" {
  description = "Enable Binary Authorization for container image security"
  type        = bool
  default     = false  # Can be enabled for high-security environments
}

# =================================================================
# COST OPTIMIZATION
# =================================================================
variable "enable_preemptible_nodes" {
  description = "Enable preemptible nodes for cost optimization (non-production only)"
  type        = bool
  default     = false
}

variable "enable_spot_instances" {
  description = "Enable spot instances for additional cost savings"
  type        = bool
  default     = false
}

variable "resource_labels" {
  description = "Labels to apply to all resources for cost tracking"
  type        = map(string)
  default = {
    project     = "sap-backend"
    environment = "production"
    team        = "platform"
    cost-center = "engineering"
  }
  
  validation {
    condition     = alltrue([for k, v in var.resource_labels : can(regex("^[a-z][-_a-z0-9]{0,62}$", k))])
    error_message = "Label keys must be 1-63 characters, lowercase letters, numbers, underscores, and hyphens only."
  }
  
  validation {
    condition     = alltrue([for k, v in var.resource_labels : can(regex("^[a-z][-_a-z0-9]{0,62}$", v))])
    error_message = "Label values must be 1-63 characters, lowercase letters, numbers, underscores, and hyphens only."
  }
}
