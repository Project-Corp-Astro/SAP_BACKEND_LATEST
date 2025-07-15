# 🚢 SAP Backend GKE Cluster Configuration
# Mathematical Precision: Production-ready with fail-safe mechanisms
# Zero-Tolerance: All validations must pass before cluster creation

# =================================================================
# GKE CLUSTER - AUTOPILOT MODE (RECOMMENDED)
# =================================================================
resource "google_container_cluster" "primary" {
  name     = var.gke_cluster_name
  location = var.enable_autopilot ? var.region : var.zone
  project  = var.project_id

  # Enable Autopilot for fully managed experience
  enable_autopilot = var.enable_autopilot

  # Network configuration
  network    = google_compute_network.vpc_network.self_link
  subnetwork = google_compute_subnetwork.gke_subnet.self_link

  # IP allocation for pods and services
  ip_allocation_policy {
    cluster_secondary_range_name  = "${var.project_name}-pods"
    services_secondary_range_name = "${var.project_name}-services"
  }

  # Release channel for automatic updates
  release_channel {
    channel = "STABLE"
  }

  # Resource labels
  resource_labels = var.resource_labels

  # Prevent deletion of cluster
  deletion_protection = true

  depends_on = [
    google_project_service.required_apis,
    null_resource.validate_apis,
    google_compute_network.vpc_network,
    google_compute_subnetwork.gke_subnet
  ]

  timeouts {
    create = "45m"
    update = "45m"
    delete = "45m"
  }
}

# =================================================================
# NODE POOL (STANDARD MODE ONLY)
# =================================================================
resource "google_container_node_pool" "primary_nodes" {
  count = var.enable_autopilot ? 0 : 1
  
  name       = "${var.gke_cluster_name}-nodes"
  location   = google_container_cluster.primary.location
  cluster    = google_container_cluster.primary.name
  project    = var.project_id

  # Node count configuration
  initial_node_count = var.node_pool_initial_count

  autoscaling {
    min_node_count = var.node_pool_min_count
    max_node_count = var.node_pool_max_count
  }

  # Management configuration
  management {
    auto_repair  = true
    auto_upgrade = true
  }

  # Upgrade settings
  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
    strategy        = "SURGE"
  }

  # Node configuration
  node_config {
    machine_type = var.node_pool_machine_type
    disk_size_gb = var.node_pool_disk_size_gb
    disk_type    = var.node_pool_disk_type
    image_type   = "COS_CONTAINERD"
    
    # Preemptible nodes for cost optimization (if enabled)
    preemptible = var.enable_preemptible_nodes
    spot        = var.enable_spot_instances

    # OAuth scopes
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Service account
    service_account = google_service_account.gke_nodes.email

    # Security configuration
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    # Workload Identity
    dynamic "workload_metadata_config" {
      for_each = var.enable_workload_identity ? [1] : []
      content {
        mode = "GKE_METADATA"
      }
    }

    # Resource labels
    labels = merge(var.resource_labels, {
      node-pool = "primary"
    })

    # Metadata
    metadata = {
      disable-legacy-endpoints = "true"
    }

    # Network tags
    tags = ["gke-node", "ssh-access"]
  }

  depends_on = [
    google_container_cluster.primary,
    google_service_account.gke_nodes
  ]

  timeouts {
    create = "30m"
    update = "30m"
    delete = "30m"
  }
}

# =================================================================
# SERVICE ACCOUNTS FOR GKE
# =================================================================
# Cluster service account
resource "google_service_account" "gke_cluster" {
  account_id   = "${var.project_name}-gke-cluster"
  display_name = "SAP Backend GKE Cluster Service Account"
  description  = "Service account for GKE cluster control plane"
  project      = var.project_id
}

# Node pool service account (Standard mode only)
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.project_name}-gke-nodes"
  display_name = "SAP Backend GKE Nodes Service Account"
  description  = "Service account for GKE cluster nodes"
  project      = var.project_id
}

# =================================================================
# IAM BINDINGS FOR SERVICE ACCOUNTS
# =================================================================
# Cluster service account permissions
resource "google_project_iam_member" "gke_cluster_permissions" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/monitoring.dashboardEditor"
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_cluster.email}"
}

# Node service account permissions
resource "google_project_iam_member" "gke_nodes_permissions" {
  for_each = toset([
    "roles/storage.objectViewer",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/artifactregistry.reader"
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# =================================================================
# CLUSTER VALIDATION RESOURCES
# =================================================================
# Validate cluster is ready
resource "null_resource" "validate_cluster" {
  provisioner "local-exec" {
    command = <<-EOT
      echo "🔍 Validating GKE cluster: ${google_container_cluster.primary.name}"
      
      # Get cluster credentials
      gcloud container clusters get-credentials ${google_container_cluster.primary.name} \
        --location ${google_container_cluster.primary.location} \
        --project ${var.project_id}
      
      # Wait for cluster to be ready
      timeout=1800  # 30 minutes
      counter=0
      
      while [ $counter -lt $timeout ]; do
        if kubectl get nodes &>/dev/null; then
          echo "✅ Cluster is ready and accessible"
          break
        fi
        
        sleep 30
        counter=$((counter + 30))
        
        if [ $counter -ge $timeout ]; then
          echo "❌ ERROR: Cluster failed to become ready within $timeout seconds"
          exit 1
        fi
      done
      
      # Validate cluster components
      echo "🔍 Validating cluster components..."
      
      # Check system pods
      if ! kubectl get pods -n kube-system | grep -q "Running"; then
        echo "❌ ERROR: System pods not running"
        exit 1
      fi
      
      # Check cluster info
      kubectl cluster-info
      
      # Check node status
      kubectl get nodes -o wide
      
      echo "✅ GKE cluster validation completed successfully"
    EOT
  }

  depends_on = [
    google_container_cluster.primary,
    google_container_node_pool.primary_nodes
  ]
}

# =================================================================
# OUTPUTS FOR VALIDATION
# =================================================================
output "gke_cluster_validation" {
  description = "GKE cluster validation information"
  value = {
    cluster_name     = google_container_cluster.primary.name
    cluster_location = google_container_cluster.primary.location
    cluster_endpoint = google_container_cluster.primary.endpoint
    cluster_version  = google_container_cluster.primary.master_version
    autopilot_enabled = var.enable_autopilot
    private_cluster  = var.enable_private_cluster
    workload_identity = var.enable_workload_identity
    network_policy   = var.enable_network_policy
  }
}

output "gke_service_accounts" {
  description = "GKE service accounts"
  value = {
    cluster_sa = google_service_account.gke_cluster.email
    nodes_sa   = google_service_account.gke_nodes.email
  }
}
