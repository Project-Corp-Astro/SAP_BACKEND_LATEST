# 📊 SAP Backend GCP Infrastructure - Outputs
# Mathematical Precision: All critical information for next phases
# Zero-Tolerance: All outputs must be validated and accessible

# =================================================================
# PROJECT & AUTHENTICATION OUTPUTS
# =================================================================
output "project_info" {
  description = "GCP Project information for validation"
  value = {
    project_id      = var.project_id
    project_name    = var.project_name
    region         = var.region
    zone           = var.zone
    terraform_state = var.terraform_state_bucket
  }
  sensitive = false
}

output "project_apis" {
  description = "Enabled GCP APIs"
  value = {
    enabled_apis = [for api in google_project_service.required_apis : api.service]
    api_count    = length(local.required_apis)
  }
}

# =================================================================
# NETWORKING OUTPUTS
# =================================================================
output "network_configuration" {
  description = "VPC and subnet configuration"
  value = {
    vpc_network = {
      id                = google_compute_network.vpc_network.id
      name              = google_compute_network.vpc_network.name
      self_link         = google_compute_network.vpc_network.self_link
      gateway_ipv4      = google_compute_network.vpc_network.gateway_ipv4
    }
    
    gke_subnet = {
      id                = google_compute_subnetwork.gke_subnet.id
      name              = google_compute_subnetwork.gke_subnet.name
      ip_cidr_range     = google_compute_subnetwork.gke_subnet.ip_cidr_range
      region            = google_compute_subnetwork.gke_subnet.region
      secondary_ranges  = {
        pods     = var.pods_cidr_range
        services = var.services_cidr_range
      }
    }
    
    firewall_rules = {
      internal     = google_compute_firewall.allow_internal.name
      ssh          = google_compute_firewall.allow_ssh.name
      lb_health    = google_compute_firewall.allow_lb_health_check.name
    }
  }
}

# =================================================================
# GKE CLUSTER OUTPUTS
# =================================================================
output "gke_cluster" {
  description = "GKE cluster information"
  value = {
    # Cluster basics
    name              = google_container_cluster.primary.name
    location          = google_container_cluster.primary.location
    endpoint          = google_container_cluster.primary.endpoint
    master_version    = google_container_cluster.primary.master_version
    
    # Configuration
    autopilot_enabled = var.enable_autopilot
    private_cluster   = var.enable_private_cluster
    workload_identity = var.enable_workload_identity
    network_policy    = var.enable_network_policy
    
    # Networking
    cluster_ipv4_cidr = google_container_cluster.primary.cluster_ipv4_cidr
    services_ipv4_cidr = google_container_cluster.primary.services_ipv4_cidr
    
    # Security
    master_auth = {
      cluster_ca_certificate = google_container_cluster.primary.master_auth.0.cluster_ca_certificate
    }
  }
  sensitive = false
}

output "gke_connection_command" {
  description = "Command to connect to GKE cluster"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --location ${google_container_cluster.primary.location} --project ${var.project_id}"
}

output "gke_service_accounts_detailed" {
  description = "GKE service accounts detailed information"
  value = {
    cluster = {
      email        = google_service_account.gke_cluster.email
      unique_id    = google_service_account.gke_cluster.unique_id
      display_name = google_service_account.gke_cluster.display_name
    }
    nodes = {
      email        = google_service_account.gke_nodes.email
      unique_id    = google_service_account.gke_nodes.unique_id
      display_name = google_service_account.gke_nodes.display_name
    }
  }
}

# =================================================================
# SECURITY OUTPUTS
# =================================================================
output "security_configuration" {
  description = "Security configuration summary"
  value = {
    workload_identity_enabled = var.enable_workload_identity
    workload_pool            = var.enable_workload_identity ? "${var.project_id}.svc.id.goog" : null
    network_policy_enabled   = var.enable_network_policy
    private_cluster_enabled  = var.enable_private_cluster
    binary_authorization     = var.enable_binary_authorization
    pod_security_policy      = var.enable_pod_security_policy
  }
}

# =================================================================
# MONITORING & LOGGING OUTPUTS
# =================================================================
output "monitoring_configuration" {
  description = "Monitoring and logging configuration"
  value = {
    cloud_monitoring_enabled = var.enable_monitoring
    cloud_logging_enabled    = var.enable_logging
    log_retention_days       = var.log_retention_days
    
    cluster_monitoring = {
      enable_components = [
        "SYSTEM_COMPONENTS",
        "WORKLOADS",
        "APISERVER",
        "SCHEDULER",
        "CONTROLLER_MANAGER",
        "STORAGE",
        "HPA",
        "POD",
        "DAEMONSET",
        "DEPLOYMENT",
        "STATEFULSET"
      ]
      managed_prometheus = true
    }
    
    cluster_logging = {
      enable_components = [
        "SYSTEM_COMPONENTS",
        "WORKLOADS",
        "APISERVER",
        "SCHEDULER",
        "CONTROLLER_MANAGER"
      ]
    }
  }
}

# =================================================================
# COST OPTIMIZATION OUTPUTS
# =================================================================
output "cost_configuration" {
  description = "Cost optimization settings"
  value = {
    autopilot_enabled     = var.enable_autopilot
    preemptible_nodes     = var.enable_preemptible_nodes
    spot_instances        = var.enable_spot_instances
    resource_labels       = var.resource_labels
    
    estimated_monthly_cost = {
      note = "Actual costs depend on usage and regional pricing"
      autopilot_mode = var.enable_autopilot ? "Variable based on actual resource usage" : "N/A"
      standard_mode = var.enable_autopilot ? "N/A" : "Fixed based on node pool configuration"
    }
  }
}

# =================================================================
# NEXT STEPS OUTPUTS
# =================================================================
output "next_steps" {
  description = "Next steps for deployment"
  value = {
    module_1_status = "✅ COMPLETE - Infrastructure Foundation"
    next_module     = "Module 2: Database Migration"
    
    validation_commands = [
      "gcloud projects describe ${var.project_id}",
      "gcloud container clusters describe ${google_container_cluster.primary.name} --location ${google_container_cluster.primary.location}",
      "kubectl cluster-info",
      "kubectl get nodes"
    ]
    
    required_for_next_module = [
      "Cloud SQL setup",
      "Redis Memorystore configuration",
      "Database migration scripts",
      "Connection configuration"
    ]
  }
}

# =================================================================
# TROUBLESHOOTING OUTPUTS
# =================================================================
output "troubleshooting" {
  description = "Troubleshooting information"
  value = {
    common_issues = {
      cluster_connection = "Run: gcloud container clusters get-credentials ${google_container_cluster.primary.name} --location ${google_container_cluster.primary.location} --project ${var.project_id}"
      kubectl_access     = "Ensure you have Kubernetes Engine Developer role or higher"
      api_access        = "Verify all required APIs are enabled in GCP Console"
      billing           = "Ensure billing is enabled for the project"
    }
    
    log_locations = {
      terraform_logs = "Local logs directory"
      gcp_logs      = "Google Cloud Logging (cloud.google.com/logging)"
      cluster_logs  = "GKE cluster logs in Cloud Logging"
    }
    
    support_resources = [
      "GKE Documentation: https://cloud.google.com/kubernetes-engine/docs",
      "Terraform GCP Provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs",
      "Project Documentation: docs/deployment/gcp-production-deployment-plan.md"
    ]
  }
}

# =================================================================
# VALIDATION OUTPUTS FOR AUTOMATION
# =================================================================
output "validation_data" {
  description = "Data for automated validation scripts"
  value = {
    cluster_endpoint = google_container_cluster.primary.endpoint
    cluster_ca_cert  = google_container_cluster.primary.master_auth.0.cluster_ca_certificate
    project_number   = data.google_project.project.number
    
    dns_resolution = {
      cluster_endpoint_hostname = contains(google_container_cluster.primary.endpoint, "//") ? split("//", google_container_cluster.primary.endpoint)[1] : google_container_cluster.primary.endpoint
      private_cluster          = var.enable_private_cluster
    }
    
    connectivity_tests = [
      {
        name        = "cluster_api_server"
        endpoint    = google_container_cluster.primary.endpoint
        description = "Test cluster API server connectivity"
      },
      {
        name        = "google_apis"
        endpoint    = "https://www.googleapis.com"
        description = "Test Google APIs connectivity"
      }
    ]
  }
  sensitive = false
}

# =================================================================
# DEPLOYMENT SUMMARY
# =================================================================
output "deployment_summary" {
  description = "Complete deployment summary"
  value = {
    deployment_date    = timestamp()
    terraform_version  = "~> 1.5"
    provider_version   = "~> 5.0"
    
    infrastructure = {
      project_id     = var.project_id
      region         = var.region
      cluster_name   = google_container_cluster.primary.name
      network_name   = google_compute_network.vpc_network.name
      subnet_name    = google_compute_subnetwork.gke_subnet.name
    }
    
    features_enabled = {
      autopilot            = var.enable_autopilot
      private_cluster      = var.enable_private_cluster
      workload_identity    = var.enable_workload_identity
      network_policy       = var.enable_network_policy
      monitoring           = var.enable_monitoring
      logging              = var.enable_logging
    }
    
    status = "✅ Module 1 Complete - Ready for Module 2"
  }
}
