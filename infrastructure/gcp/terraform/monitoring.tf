# ============================================================================
# Module 2: Database Monitoring and Alerting Configuration
# ============================================================================
# Purpose: Monitoring for Redis (GCP) and MongoDB (Atlas) - No PostgreSQL
# Architecture: Supabase for subscriptions, MongoDB for auth/user/content
# Zero-Tolerance Policy: Monitor all critical database metrics
# Mathematical Precision: Calculated thresholds based on instance capacity
# ============================================================================

# ============================================================================
# Redis Monitoring (Primary Database Monitoring)
# ============================================================================
# Note: PostgreSQL monitoring removed - using Supabase (external)
# MongoDB monitoring handled by Atlas (external)
# Focus: Redis cache monitoring for optimal performance
# ============================================================================

# PostgreSQL Database Instance Monitoring (CONDITIONAL)
resource "google_monitoring_alert_policy" "postgres_instance_down" {
  count        = var.enable_monitoring && var.enable_cloud_sql ? 1 : 0
  display_name = "${var.environment}-postgres-instance-down"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "PostgreSQL instance is down"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"${var.project_id}:${google_sql_database_instance.postgresql_primary[0].name}\""
      comparison      = "COMPARISON_LESS_THAN"
      threshold_value = 1
      duration        = "60s"
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "1800s"  # 30 minutes
  }
  
  documentation {
    content = "PostgreSQL database instance is not responding. Check instance status and connectivity."
  }
}

# PostgreSQL Connection Count Alert (CONDITIONAL)
resource "google_monitoring_alert_policy" "postgres_high_connections" {
  count        = var.enable_monitoring && var.enable_cloud_sql ? 1 : 0
  display_name = "${var.environment}-postgres-high-connections"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "PostgreSQL high connection count"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/network/connections\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.environment == "production" ? 160 : 80  # 80% of max connections
      duration        = "300s"  # 5 minutes
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "PostgreSQL connection count is high. Consider connection pooling or scaling the instance."
  }
}

# PostgreSQL CPU Utilization Alert
resource "google_monitoring_alert_policy" "postgres_high_cpu" {
  display_name = "${var.environment}-postgres-high-cpu"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "PostgreSQL high CPU utilization"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8  # 80%
      duration        = "600s"  # 10 minutes
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "PostgreSQL CPU utilization is high. Consider optimizing queries or scaling the instance."
  }
}

# PostgreSQL Memory Utilization Alert
resource "google_monitoring_alert_policy" "postgres_high_memory" {
  display_name = "${var.environment}-postgres-high-memory"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "PostgreSQL high memory utilization"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/memory/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85  # 85%
      duration        = "600s"  # 10 minutes
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "PostgreSQL memory utilization is high. Consider optimizing queries or increasing instance memory."
  }
}

# PostgreSQL Disk Utilization Alert
resource "google_monitoring_alert_policy" "postgres_high_disk" {
  display_name = "${var.environment}-postgres-high-disk"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "PostgreSQL high disk utilization"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/disk/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8  # 80%
      duration        = "300s"  # 5 minutes
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "PostgreSQL disk utilization is high. Disk will auto-resize, but monitor for costs."
  }
}

# PostgreSQL Replication Lag Alert (for production)
resource "google_monitoring_alert_policy" "postgres_replication_lag" {
  count = var.environment == "production" ? 1 : 0
  
  display_name = "${var.environment}-postgres-replication-lag"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "PostgreSQL replication lag is high"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/replication/replica_lag\""
      comparison      = "COMPARISON_GT"
      threshold_value = 30  # 30 seconds
      duration        = "300s"  # 5 minutes
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "PostgreSQL replication lag is high. Check replica health and network connectivity."
  }
}

# ============================================================================
# Redis Monitoring
# ============================================================================

# Redis Instance Down Alert (CONDITIONAL)
resource "google_monitoring_alert_policy" "redis_instance_down" {
  count        = var.enable_monitoring && var.enable_redis ? 1 : 0
  display_name = "${var.environment}-redis-instance-down"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Redis instance is down"
    
    condition_threshold {
      filter          = "resource.type=\"redis_instance\" AND resource.labels.instance_id=\"${google_redis_instance.main_cache[0].name}\""
      comparison      = "COMPARISON_LESS_THAN"
      threshold_value = 1
      duration        = "60s"
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "1800s"  # 30 minutes
  }
  
  documentation {
    content = "Redis instance is not responding. Check instance status and connectivity."
  }
}

# Redis Memory Utilization Alert
resource "google_monitoring_alert_policy" "redis_high_memory" {
  display_name = "${var.environment}-redis-high-memory"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Redis high memory utilization"
    
    condition_threshold {
      filter          = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85  # 85%
      duration        = "300s"  # 5 minutes
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "Redis memory utilization is high. Consider scaling up or optimizing data structures."
  }
}

# Redis Connection Count Alert
resource "google_monitoring_alert_policy" "redis_high_connections" {
  display_name = "${var.environment}-redis-high-connections"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Redis high connection count"
    
    condition_threshold {
      filter          = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/connections/clients\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.environment == "production" ? 800 : 400  # Based on instance capacity
      duration        = "300s"  # 5 minutes
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "Redis connection count is high. Check for connection leaks or scale the instance."
  }
}

# Redis CPU Utilization Alert
resource "google_monitoring_alert_policy" "redis_high_cpu" {
  display_name = "${var.environment}-redis-high-cpu"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Redis high CPU utilization"
    
    condition_threshold {
      filter          = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/cpu_utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8  # 80%
      duration        = "600s"  # 10 minutes
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "Redis CPU utilization is high. Check for expensive operations or scale the instance."
  }
}

# ============================================================================
# Database Performance Monitoring
# ============================================================================

# PostgreSQL Slow Query Alert
resource "google_monitoring_alert_policy" "postgres_slow_queries" {
  display_name = "${var.environment}-postgres-slow-queries"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "PostgreSQL slow queries detected"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.environment == "production" ? 50 : 25  # Concurrent queries
      duration        = "300s"  # 5 minutes
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "High number of concurrent PostgreSQL queries detected. Check for slow or blocking queries."
  }
}

# Redis Operations Rate Alert
resource "google_monitoring_alert_policy" "redis_high_ops_rate" {
  display_name = "${var.environment}-redis-high-ops-rate"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Redis high operations rate"
    
    condition_threshold {
      filter          = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/operations/total\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.environment == "production" ? 10000 : 5000  # ops/second
      duration        = "300s"  # 5 minutes
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "Redis operations rate is high. Monitor for performance impact and consider scaling."
  }
}

# ============================================================================
# Backup and Recovery Monitoring
# ============================================================================

# PostgreSQL Backup Failure Alert
resource "google_monitoring_alert_policy" "postgres_backup_failure" {
  display_name = "${var.environment}-postgres-backup-failure"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "PostgreSQL backup failed"
    
    condition_absent {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/backup/backup_count\""
      duration        = "86400s"  # 24 hours
      
      aggregations {
        alignment_period   = "3600s"  # 1 hour
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "PostgreSQL backup has not run in 24 hours. Check backup configuration and logs."
  }
}

# ============================================================================
# Security Monitoring
# ============================================================================

# Unauthorized Database Access Alert
resource "google_monitoring_alert_policy" "postgres_auth_failures" {
  display_name = "${var.environment}-postgres-auth-failures"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "PostgreSQL authentication failures"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/authentication/failure_count\""
      comparison      = "COMPARISON_GT"
      threshold_value = 10  # 10 failures in 5 minutes
      duration        = "300s"  # 5 minutes
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  documentation {
    content = "Multiple PostgreSQL authentication failures detected. Possible unauthorized access attempt."
  }
}

# ============================================================================
# Custom Metrics Dashboard
# ============================================================================

# Database Dashboard
resource "google_monitoring_dashboard" "database_dashboard" {
  dashboard_json = jsonencode({
    displayName = "${var.environment} Database Monitoring Dashboard"
    mosaicLayout = {
      tiles = [
        {
          width = 6
          height = 4
          widget = {
            title = "PostgreSQL CPU Utilization"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\""
                    aggregation = {
                      alignmentPeriod = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
                plotType = "LINE"
              }]
              yAxis = {
                label = "CPU Utilization (%)"
                scale = "LINEAR"
              }
            }
          }
        },
        {
          width = 6
          height = 4
          xPos = 6
          widget = {
            title = "Redis Memory Usage"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\""
                    aggregation = {
                      alignmentPeriod = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
                plotType = "LINE"
              }]
              yAxis = {
                label = "Memory Usage (%)"
                scale = "LINEAR"
              }
            }
          }
        },
        {
          width = 6
          height = 4
          yPos = 4
          widget = {
            title = "PostgreSQL Connections"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/network/connections\""
                    aggregation = {
                      alignmentPeriod = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
                plotType = "LINE"
              }]
              yAxis = {
                label = "Active Connections"
                scale = "LINEAR"
              }
            }
          }
        },
        {
          width = 6
          height = 4
          xPos = 6
          yPos = 4
          widget = {
            title = "Redis Operations Rate"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/operations/total\""
                    aggregation = {
                      alignmentPeriod = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
                plotType = "LINE"
              }]
              yAxis = {
                label = "Operations/sec"
                scale = "LINEAR"
              }
            }
          }
        }
      ]
    }
  })
}

# ============================================================================
# Variables for Monitoring
# ============================================================================

variable "notification_channels" {
  description = "List of notification channel IDs for alerts"
  type        = list(string)
  default     = []
}

# ============================================================================
# Outputs
# ============================================================================

output "monitoring_dashboard_url" {
  description = "URL to the database monitoring dashboard"
  value       = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.database_dashboard.id}?project=${var.project_id}"
}

output "alert_policies" {
  description = "Created alert policy names"
  value = [
    google_monitoring_alert_policy.postgres_instance_down.display_name,
    google_monitoring_alert_policy.postgres_high_connections.display_name,
    google_monitoring_alert_policy.redis_instance_down.display_name,
    google_monitoring_alert_policy.redis_high_memory.display_name
  ]
}
