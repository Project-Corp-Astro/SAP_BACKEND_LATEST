# ============================================================================
# Module 2: Database Infrastructure Configuration
# ============================================================================
# Purpose: GCP Cloud SQL (PostgreSQL), Memorystore (Redis), and MongoDB Atlas
# Zero-Tolerance Policy: All operations must pass validation before deployment
# Mathematical Precision: Calculated timeouts, connection limits, and capacity
# ============================================================================

# ============================================================================
# Cloud SQL - PostgreSQL Primary Database
# ============================================================================

# Random suffix for unique naming
resource "random_id" "db_name_suffix" {
  byte_length = 4
}

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "postgresql_primary" {
  name             = "${var.environment}-sap-postgres-${random_id.db_name_suffix.hex}"
  database_version = var.postgres_version
  region          = var.region
  project         = var.project_id

  # Deletion protection - CRITICAL for production
  deletion_protection = var.environment == "production" ? true : false

  settings {
    # Instance tier calculation: 
    # Development: db-f1-micro (0.6GB RAM)
    # Staging: db-g1-small (1.7GB RAM) 
    # Production: db-n1-standard-2 (7.5GB RAM)
    tier = var.postgres_instance_tier

    # Disk configuration with mathematical precision
    disk_type    = "PD_SSD"
    disk_size    = var.postgres_disk_size_gb
    disk_autoresize = true
    disk_autoresize_limit = var.postgres_disk_size_gb * 3 # Maximum 3x auto-growth

    # Availability configuration
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"

    # Backup configuration - Zero data loss tolerance
    backup_configuration {
      enabled                        = true
      start_time                    = "03:00" # 3 AM UTC (low traffic time)
      point_in_time_recovery_enabled = true
      location                      = var.region
      
      # Retention: Production=30 days, Others=7 days
      backup_retention_settings {
        retained_backups = var.environment == "production" ? 30 : 7
        retention_unit   = "COUNT"
      }

      # Binary logging for point-in-time recovery
      binary_log_enabled = true
      
      # Transaction log retention
      transaction_log_retention_days = var.environment == "production" ? 7 : 3
    }

    # IP configuration - Private networking for security
    ip_configuration {
      ipv4_enabled    = false  # No public IP for security
      private_network = google_compute_network.vpc_network.id
      
      # Authorized networks for emergency access only
      dynamic "authorized_networks" {
        for_each = var.postgres_authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.cidr
        }
      }
    }

    # Database flags for performance optimization
    dynamic "database_flags" {
      for_each = {
        # Connection limits based on environment
        max_connections = var.environment == "production" ? "200" : "100"
        
        # Memory configuration (25% of instance RAM)
        shared_preload_libraries = "pg_stat_statements"
        
        # Performance optimization
        random_page_cost         = "1.1"  # SSD optimization
        effective_cache_size     = var.environment == "production" ? "5GB" : "1GB"
        maintenance_work_mem     = var.environment == "production" ? "256MB" : "64MB"
        
        # Security settings
        log_statement            = "all"
        log_min_duration_statement = "1000"  # Log queries > 1 second
        log_connections          = "on"
        log_disconnections       = "on"
        
        # High availability settings for production
        wal_level               = var.environment == "production" ? "replica" : "minimal"
        max_wal_senders         = var.environment == "production" ? "3" : "0"
        checkpoint_timeout      = "5min"
      }
      
      content {
        name  = database_flags.key
        value = database_flags.value
      }
    }

    # Maintenance window - Low traffic period
    maintenance_window {
      day          = 7    # Sunday
      hour         = 3    # 3 AM UTC
      update_track = "stable"
    }

    # Insights and monitoring
    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }

  # Lifecycle management
  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      settings[0].disk_size  # Allow auto-resize
    ]
  }

  # Dependency management
  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_compute_network.vpc_network
  ]

  # Resource labels for cost tracking and management
  labels = {
    environment = var.environment
    service     = "sap-backend"
    component   = "database"
    module      = "module-2"
    tier        = "primary"
    managed_by  = "terraform"
    backup      = "enabled"
    monitoring  = "enabled"
  }
}

# ============================================================================
# Cloud SQL Databases Creation
# ============================================================================

# Main application database
resource "google_sql_database" "sap_main_db" {
  name     = var.postgres_main_database
  instance = google_sql_database_instance.postgresql_primary.name
  project  = var.project_id

  # Character set for international support
  charset   = "UTF8"
  collation = "en_US.UTF8"

  lifecycle {
    prevent_destroy = true
  }
}

# Authentication database (separate for security)
resource "google_sql_database" "sap_auth_db" {
  name     = var.postgres_auth_database
  instance = google_sql_database_instance.postgresql_primary.name
  project  = var.project_id

  charset   = "UTF8"
  collation = "en_US.UTF8"

  lifecycle {
    prevent_destroy = true
  }
}

# Audit database for compliance
resource "google_sql_database" "sap_audit_db" {
  name     = var.postgres_audit_database
  instance = google_sql_database_instance.postgresql_primary.name
  project  = var.project_id

  charset   = "UTF8"
  collation = "en_US.UTF8"

  lifecycle {
    prevent_destroy = true
  }
}

# ============================================================================
# Cloud SQL Users with Principle of Least Privilege
# ============================================================================

# Application service user
resource "google_sql_user" "app_user" {
  name     = var.postgres_app_user
  instance = google_sql_database_instance.postgresql_primary.name
  password = var.postgres_app_password
  project  = var.project_id

  lifecycle {
    ignore_changes = [password]
  }
}

# Read-only user for reporting and analytics
resource "google_sql_user" "readonly_user" {
  name     = var.postgres_readonly_user
  instance = google_sql_database_instance.postgresql_primary.name
  password = var.postgres_readonly_password
  project  = var.project_id

  lifecycle {
    ignore_changes = [password]
  }
}

# Migration user with elevated privileges
resource "google_sql_user" "migration_user" {
  name     = var.postgres_migration_user
  instance = google_sql_database_instance.postgresql_primary.name
  password = var.postgres_migration_password
  project  = var.project_id

  lifecycle {
    ignore_changes = [password]
  }
}

# ============================================================================
# Memorystore Redis - Cache and Session Store
# ============================================================================

# Redis instance for caching and sessions
resource "google_redis_instance" "main_cache" {
  name         = "${var.environment}-sap-redis-${random_id.db_name_suffix.hex}"
  project      = var.project_id
  region       = var.region
  memory_size_gb = var.redis_memory_size_gb

  # Redis version
  redis_version = var.redis_version

  # Network configuration
  authorized_network = google_compute_network.vpc_network.id

  # High availability for production
  tier = var.environment == "production" ? "STANDARD_HA" : "BASIC"

  # Redis configuration
  redis_configs = {
    # Memory policy when Redis reaches memory limit
    maxmemory-policy = "allkeys-lru"
    
    # Persistence configuration (RDB snapshots)
    save = var.environment == "production" ? "900 1 300 10 60 10000" : "3600 1"
    
    # Performance optimization
    tcp-keepalive = "300"
    timeout       = "300"
    
    # Security
    requirepass = "true"
  }

  # Maintenance configuration
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }

  # Security settings
  auth_enabled = true
  transit_encryption_mode = var.environment == "production" ? "SERVER_AUTHENTICATION" : "DISABLED"

  # Resource labels
  labels = {
    environment = var.environment
    service     = "sap-backend"
    component   = "cache"
    module      = "module-2"
    managed_by  = "terraform"
    ha_enabled  = var.environment == "production" ? "true" : "false"
  }

  # Dependency management
  depends_on = [
    google_compute_network.vpc_network
  ]
}

# ============================================================================
# MongoDB Atlas Integration (Third-party but managed via GCP)
# ============================================================================

# Note: MongoDB Atlas requires separate provider configuration
# This section provides the foundation for MongoDB integration

# Secret for MongoDB connection string
resource "google_secret_manager_secret" "mongodb_connection" {
  secret_id = "${var.environment}-mongodb-connection"
  project   = var.project_id

  replication {
    auto {
      customer_managed_encryption {
        kms_key_name = google_kms_crypto_key.database_key.id
      }
    }
  }

  labels = {
    environment = var.environment
    service     = "sap-backend"
    component   = "database"
    type        = "mongodb"
    module      = "module-2"
  }
}

# Placeholder for MongoDB connection string
resource "google_secret_manager_secret_version" "mongodb_connection" {
  secret = google_secret_manager_secret.mongodb_connection.id
  secret_data = jsonencode({
    connection_string = var.mongodb_connection_string
    database_name     = var.mongodb_database_name
    username         = var.mongodb_username
    password         = var.mongodb_password
  })

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# ============================================================================
# Database Security - KMS Keys
# ============================================================================

# KMS KeyRing for database encryption
resource "google_kms_key_ring" "database_keyring" {
  name     = "${var.environment}-sap-database-keyring"
  location = var.region
  project  = var.project_id
}

# Database encryption key
resource "google_kms_crypto_key" "database_key" {
  name     = "${var.environment}-database-key"
  key_ring = google_kms_key_ring.database_keyring.id
  purpose  = "ENCRYPT_DECRYPT"

  version_template {
    algorithm = "GOOGLE_SYMMETRIC_ENCRYPTION"
  }

  rotation_period = var.environment == "production" ? "7776000s" : "31536000s" # 90 days for prod, 1 year for others

  lifecycle {
    prevent_destroy = true
  }

  labels = {
    environment = var.environment
    service     = "sap-backend"
    purpose     = "database-encryption"
    module      = "module-2"
  }
}

# ============================================================================
# Database Connection Secrets Management
# ============================================================================

# PostgreSQL connection secret
resource "google_secret_manager_secret" "postgres_connection" {
  secret_id = "${var.environment}-postgres-connection"
  project   = var.project_id

  replication {
    auto {
      customer_managed_encryption {
        kms_key_name = google_kms_crypto_key.database_key.id
      }
    }
  }

  labels = {
    environment = var.environment
    service     = "sap-backend"
    component   = "database"
    type        = "postgresql"
    module      = "module-2"
  }
}

# PostgreSQL connection details
resource "google_secret_manager_secret_version" "postgres_connection" {
  secret = google_secret_manager_secret.postgres_connection.id
  secret_data = jsonencode({
    host     = google_sql_database_instance.postgresql_primary.private_ip_address
    port     = 5432
    database = google_sql_database.sap_main_db.name
    username = google_sql_user.app_user.name
    password = var.postgres_app_password
    ssl_mode = "require"
  })

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Redis connection secret
resource "google_secret_manager_secret" "redis_connection" {
  secret_id = "${var.environment}-redis-connection"
  project   = var.project_id

  replication {
    auto {
      customer_managed_encryption {
        kms_key_name = google_kms_crypto_key.database_key.id
      }
    }
  }

  labels = {
    environment = var.environment
    service     = "sap-backend"
    component   = "cache"
    type        = "redis"
    module      = "module-2"
  }
}

# Redis connection details
resource "google_secret_manager_secret_version" "redis_connection" {
  secret = google_secret_manager_secret.redis_connection.id
  secret_data = jsonencode({
    host     = google_redis_instance.main_cache.host
    port     = google_redis_instance.main_cache.port
    auth_string = google_redis_instance.main_cache.auth_string
  })

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# ============================================================================
# Database Monitoring and Alerting
# ============================================================================

# Cloud SQL monitoring
resource "google_monitoring_uptime_check_config" "postgres_uptime" {
  display_name = "${var.environment}-postgres-uptime-check"
  project      = var.project_id
  timeout      = "10s"
  period       = "60s"

  tcp_check {
    port = 5432
  }

  monitored_resource {
    type = "gce_instance"
    labels = {
      instance_id = google_sql_database_instance.postgresql_primary.first_ip_address
      zone        = "${var.region}-a"
    }
  }

  content_matchers {
    content = ""
    matcher = "NOT_MATCHES_REGEX"
  }
}

# Redis monitoring
resource "google_monitoring_uptime_check_config" "redis_uptime" {
  display_name = "${var.environment}-redis-uptime-check"
  project      = var.project_id
  timeout      = "10s"
  period       = "60s"

  tcp_check {
    port = 6379
  }

  monitored_resource {
    type = "gce_instance"
    labels = {
      instance_id = google_redis_instance.main_cache.host
      zone        = "${var.region}-a"
    }
  }
}

# ============================================================================
# Private Service Networking (Required for Cloud SQL)
# ============================================================================

# Private IP allocation for Cloud SQL
resource "google_compute_global_address" "private_ip_allocation" {
  name          = "${var.environment}-private-ip-allocation"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc_network.id
}

# Private service connection for Cloud SQL
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_allocation.name]

  depends_on = [
    google_compute_global_address.private_ip_allocation
  ]
}

# ============================================================================
# Output Values for Module Integration
# ============================================================================

# PostgreSQL outputs
output "postgres_instance_name" {
  description = "Name of the PostgreSQL instance"
  value       = google_sql_database_instance.postgresql_primary.name
}

output "postgres_private_ip" {
  description = "Private IP address of PostgreSQL instance"
  value       = google_sql_database_instance.postgresql_primary.private_ip_address
  sensitive   = true
}

output "postgres_connection_name" {
  description = "Connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.postgresql_primary.connection_name
}

# Redis outputs
output "redis_host" {
  description = "Redis instance host"
  value       = google_redis_instance.main_cache.host
  sensitive   = true
}

output "redis_port" {
  description = "Redis instance port"
  value       = google_redis_instance.main_cache.port
}

# Secrets outputs
output "postgres_secret_name" {
  description = "Name of the PostgreSQL connection secret"
  value       = google_secret_manager_secret.postgres_connection.secret_id
}

output "redis_secret_name" {
  description = "Name of the Redis connection secret"
  value       = google_secret_manager_secret.redis_connection.secret_id
}

output "mongodb_secret_name" {
  description = "Name of the MongoDB connection secret"
  value       = google_secret_manager_secret.mongodb_connection.secret_id
}
