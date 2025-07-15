# 🏗️ SAP Backend GCP Infrastructure - Main Configuration
# Mathematical Precision: Zero-Tolerance Error Policy
# Validation: All resources must pass pre-flight checks

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }

  backend "gcs" {
    bucket = var.terraform_state_bucket
    prefix = "sap-backend/terraform-state"
  }
}

# =================================================================
# PROVIDER CONFIGURATION WITH VALIDATION
# =================================================================
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Kubernetes provider - configured after GKE cluster creation
provider "kubernetes" {
  host                   = "https://${google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth.0.cluster_ca_certificate)
}

data "google_client_config" "default" {}

# =================================================================
# PROJECT VALIDATION & CONFIGURATION
# =================================================================
data "google_project" "project" {
  project_id = var.project_id
}

# Validate project exists and is accessible
resource "null_resource" "validate_project" {
  provisioner "local-exec" {
    command = <<-EOT
      echo "🔍 Validating GCP Project: ${var.project_id}"
      
      # Check project exists
      if ! gcloud projects describe ${var.project_id} &>/dev/null; then
        echo "❌ ERROR: Project ${var.project_id} not found or not accessible"
        exit 1
      fi
      
      # Check billing is enabled
      if ! gcloud billing projects describe ${var.project_id} --format="value(billingEnabled)" | grep -q "True"; then
        echo "❌ ERROR: Billing not enabled for project ${var.project_id}"
        exit 1
      fi
      
      echo "✅ Project validation passed"
    EOT
  }
}

# =================================================================
# REQUIRED APIS ACTIVATION WITH VALIDATION
# =================================================================
locals {
  required_apis = [
    "container.googleapis.com",          # Google Kubernetes Engine
    "compute.googleapis.com",            # Compute Engine (for GKE nodes)
    # "cloudsql.googleapis.com",          # Cloud SQL - Disabled (using Supabase)
    "redis.googleapis.com",             # Cloud Memorystore for Redis
    "secretmanager.googleapis.com",     # Secret Manager
    "monitoring.googleapis.com",        # Cloud Monitoring
    "logging.googleapis.com",           # Cloud Logging
    "cloudtrace.googleapis.com",        # Cloud Trace
    "clouderrorreporting.googleapis.com", # Error Reporting
    "artifactregistry.googleapis.com",  # Artifact Registry
    "cloudbuild.googleapis.com",        # Cloud Build
    "cloudresourcemanager.googleapis.com", # Resource Manager
    "iam.googleapis.com",               # Identity and Access Management
    "servicenetworking.googleapis.com", # Service Networking (for private services)
    "dns.googleapis.com",               # Cloud DNS
    "certificatemanager.googleapis.com" # Certificate Manager
  ]
}

# Enable required APIs with dependency management
resource "google_project_service" "required_apis" {
  for_each = toset(local.required_apis)
  
  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy        = false

  depends_on = [null_resource.validate_project]

  timeouts {
    create = "10m"
    update = "5m"
  }
}

# Validate APIs are enabled
resource "null_resource" "validate_apis" {
  count = length(local.required_apis)
  
  provisioner "local-exec" {
    command = <<-EOT
      echo "🔍 Validating API: ${local.required_apis[count.index]}"
      
      # Wait for API to be fully activated
      timeout=300
      counter=0
      
      while [ $counter -lt $timeout ]; do
        if gcloud services list --enabled --filter="name:${local.required_apis[count.index]}" --format="value(name)" | grep -q "${local.required_apis[count.index]}"; then
          echo "✅ API ${local.required_apis[count.index]} is active"
          break
        fi
        
        sleep 5
        counter=$((counter + 5))
        
        if [ $counter -ge $timeout ]; then
          echo "❌ ERROR: API ${local.required_apis[count.index]} failed to activate within $timeout seconds"
          exit 1
        fi
      done
    EOT
  }

  depends_on = [google_project_service.required_apis]
}

# =================================================================
# NETWORKING FOUNDATION
# =================================================================
resource "google_compute_network" "vpc_network" {
  name                    = "${var.project_name}-vpc"
  auto_create_subnetworks = false
  mtu                     = 1460
  description            = "VPC network for SAP Backend microservices"

  depends_on = [google_project_service.required_apis]
}

# Subnet for GKE cluster
resource "google_compute_subnetwork" "gke_subnet" {
  name          = "${var.project_name}-gke-subnet"
  ip_cidr_range = var.gke_subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc_network.id
  description   = "Subnet for GKE cluster nodes"

  # Secondary IP ranges for pods and services
  secondary_ip_range {
    range_name    = "${var.project_name}-pods"
    ip_cidr_range = var.pods_cidr_range
  }

  secondary_ip_range {
    range_name    = "${var.project_name}-services"
    ip_cidr_range = var.services_cidr_range
  }

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling       = 0.5
    metadata            = "INCLUDE_ALL_METADATA"
  }
}

# =================================================================
# FIREWALL RULES WITH SECURITY VALIDATION
# =================================================================
# Allow internal communication
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.project_name}-allow-internal"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [
    var.gke_subnet_cidr,
    var.pods_cidr_range,
    var.services_cidr_range
  ]

  description = "Allow communication within VPC network"
}

# Allow SSH access (restricted to authorized IPs)
resource "google_compute_firewall" "allow_ssh" {
  name    = "${var.project_name}-allow-ssh"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = var.authorized_ssh_ranges
  target_tags   = ["ssh-access"]

  description = "Allow SSH access from authorized IP ranges"
}

# Allow HTTPS/HTTP for load balancer
resource "google_compute_firewall" "allow_lb_health_check" {
  name    = "${var.project_name}-allow-lb-health-check"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080"]
  }

  source_ranges = [
    "130.211.0.0/22",  # Google Cloud Load Balancer health check ranges
    "35.191.0.0/16"
  ]

  target_tags = ["lb-health-check"]

  description = "Allow Google Cloud Load Balancer health checks"
}

# =================================================================
# VALIDATION OUTPUTS
# =================================================================
output "project_validation" {
  description = "Project validation status"
  value = {
    project_id     = data.google_project.project.project_id
    project_name   = data.google_project.project.name
    project_number = data.google_project.project.number
    billing_account = data.google_project.project.billing_account
  }
}

output "network_validation" {
  description = "Network configuration validation"
  value = {
    vpc_network_id     = google_compute_network.vpc_network.id
    vpc_network_name   = google_compute_network.vpc_network.name
    gke_subnet_id      = google_compute_subnetwork.gke_subnet.id
    gke_subnet_range   = google_compute_subnetwork.gke_subnet.ip_cidr_range
    pods_range         = var.pods_cidr_range
    services_range     = var.services_cidr_range
  }
}

output "firewall_validation" {
  description = "Firewall rules validation"
  value = {
    internal_firewall = google_compute_firewall.allow_internal.name
    ssh_firewall      = google_compute_firewall.allow_ssh.name
    lb_firewall       = google_compute_firewall.allow_lb_health_check.name
  }
}
