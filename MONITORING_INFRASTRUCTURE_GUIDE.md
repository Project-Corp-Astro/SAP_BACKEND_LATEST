# SAP Backend Monitoring Infrastructure Guide
## Prometheus & Grafana Deployment and Management

### 📊 Overview
Your SAP Backend has comprehensive monitoring infrastructure prepared but not yet deployed. This guide covers deployment, management, and usage of your Prometheus and Grafana monitoring stack.

---

## 🏗️ Infrastructure Analysis

### Available Monitoring Components

#### 1. **Prometheus Configuration**
- **Location**: `monitoring/prometheus/prometheus.yml`
- **Features**: 
  - 15s scrape intervals for real-time monitoring
  - Alert rules for critical system events
  - Service discovery for API Gateway, Auth, Content, and Subscription services
  - External labels for production environment tracking

#### 2. **Grafana Setup**
- **Location**: `infrastructure/kubernetes/base/monitoring/grafana/`
- **Components**:
  - Datasources configuration (Prometheus + Elasticsearch)
  - Custom dashboards for SAP Backend overview
  - ConfigMap-based configuration management

#### 3. **High Availability Monitoring**
- **Location**: `infrastructure/kubernetes/high-availability/health-monitoring/`
- **Features**:
  - ServiceMonitor for automated service discovery
  - PrometheusRule for HA alerting
  - Crash loop detection and service down alerts

---

## 🚀 Deployment Commands

### Step 1: Create Monitoring Namespace
```bash
kubectl create namespace monitoring
```

### Step 2: Deploy Prometheus Operator (if not exists)
```bash
# Install Prometheus Operator via Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install with custom values
helm install prometheus-operator prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.ruleSelectorNilUsesHelmValues=false
```

### Step 3: Deploy Custom Prometheus Configuration
```bash
# Create Prometheus ConfigMap
kubectl create configmap prometheus-config \
  --from-file=monitoring/prometheus/prometheus.yml \
  --namespace monitoring

# Create Alert Rules ConfigMap
kubectl create configmap prometheus-rules \
  --from-file=monitoring/prometheus/alert_rules.yml \
  --namespace monitoring
```

### Step 4: Deploy Grafana Datasources
```bash
kubectl apply -f infrastructure/kubernetes/base/monitoring/grafana/datasources.yaml
```

### Step 5: Deploy HA Health Monitoring
```bash
kubectl apply -f infrastructure/kubernetes/high-availability/health-monitoring/prometheus-monitoring.yaml
```

---

## 🔍 Monitoring Status Check Commands

### Check Deployment Status
```bash
# Check all monitoring components
kubectl get all -n monitoring

# Check Prometheus pods specifically
kubectl get pods -n monitoring -l app=prometheus

# Check Grafana pods
kubectl get pods -n monitoring -l app=grafana

# Check services and endpoints
kubectl get svc -n monitoring
```

### Verify Configuration
```bash
# Check Prometheus configuration
kubectl get configmap prometheus-config -n monitoring -o yaml

# Check Grafana datasources
kubectl get configmap grafana-datasources -n monitoring -o yaml

# Check ServiceMonitors
kubectl get servicemonitors -n monitoring

# Check PrometheusRules
kubectl get prometheusrules -n monitoring
```

---

## 🌐 Access and Usage

### Access Prometheus
```bash
# Port forward to access Prometheus UI
kubectl port-forward -n monitoring svc/prometheus-operator-kube-p-prometheus 9090:9090

# Access via: http://localhost:9090
```

### Access Grafana
```bash
# Port forward to access Grafana UI
kubectl port-forward -n monitoring svc/prometheus-operator-grafana 3000:80

# Get Grafana admin password
kubectl get secret -n monitoring prometheus-operator-grafana -o jsonpath="{.data.admin-password}" | base64 --decode

# Access via: http://localhost:3000
# Username: admin
# Password: [decoded password from above]
```

### Create LoadBalancer for External Access (Production)
```bash
# Create LoadBalancer service for Grafana
kubectl patch svc prometheus-operator-grafana -n monitoring -p '{"spec":{"type":"LoadBalancer"}}'

# Create LoadBalancer service for Prometheus
kubectl patch svc prometheus-operator-kube-p-prometheus -n monitoring -p '{"spec":{"type":"LoadBalancer"}}'

# Get external IPs
kubectl get svc -n monitoring
```

---

## 📈 Monitoring Targets Configuration

### Current Monitoring Targets (from prometheus.yml)

#### API Gateway Monitoring
```yaml
- job_name: 'api-gateway'
  static_configs:
    - targets: ['api-gateway:3000']
  metrics_path: /metrics
  scrape_interval: 30s
```

#### Auth Service Monitoring
```yaml
- job_name: 'auth-service'
  static_configs:
    - targets: ['auth-service:3001']
  metrics_path: /metrics
  scrape_interval: 30s
```

#### Content Service Monitoring
```yaml
- job_name: 'content-service'
  static_configs:
    - targets: ['content-service:3005']
  metrics_path: /metrics
  scrape_interval: 30s
```

#### Subscription Service Monitoring
```yaml
- job_name: 'subscription-service'
  static_configs:
    - targets: ['subscription-service:3003']
  metrics_path: /metrics
  scrape_interval: 30s
```

---

## 🚨 Alert Rules Analysis

### Critical Alerts Configured

#### 1. Pod Crash Loop Detection
```yaml
- alert: PodCrashLooping
  expr: rate(kube_pod_container_status_restarts_total[5m]) > 0
  for: 5m
  severity: critical
```

#### 2. Service Down Detection
```yaml
- alert: ServiceDown
  expr: up{job="kubernetes-services"} == 0
  for: 2m
  severity: critical
```

#### 3. High Memory Usage
```yaml
- alert: HighMemoryUsage
  expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
  for: 5m
  severity: warning
```

---

## 🔧 Service Integration Commands

### Add Metrics Endpoints to Your Services

#### For Node.js/Express Services (API Gateway, Auth, etc.)
```bash
# Install prometheus client
npm install prom-client

# Add to your service code:
# const client = require('prom-client');
# const register = new client.Registry();
# 
# app.get('/metrics', (req, res) => {
#   res.set('Content-Type', register.contentType);
#   res.end(register.metrics());
# });
```

### Update Service Deployments for Monitoring
```bash
# Add annotations to enable monitoring
kubectl annotate deployment api-gateway prometheus.io/scrape=true
kubectl annotate deployment api-gateway prometheus.io/port=3000
kubectl annotate deployment api-gateway prometheus.io/path=/metrics

kubectl annotate deployment auth-service prometheus.io/scrape=true
kubectl annotate deployment auth-service prometheus.io/port=3001
kubectl annotate deployment auth-service prometheus.io/path=/metrics
```

---

## 📊 Dashboard Management

### Import Custom Dashboards
```bash
# Apply the custom SAP Backend dashboard
kubectl create configmap grafana-dashboard-sap-backend \
  --from-file=infrastructure/kubernetes/base/monitoring/grafana/dashboards/sap-backend-overview.json \
  --namespace monitoring

# Label for Grafana discovery
kubectl label configmap grafana-dashboard-sap-backend grafana_dashboard=1 -n monitoring
```

### Key Metrics to Monitor

#### System Health Metrics
- **Pod Restart Count**: `kube_pod_container_status_restarts_total`
- **Service Uptime**: `up{job="kubernetes-services"}`
- **Response Time**: `http_request_duration_seconds`
- **Error Rate**: `http_requests_total{status=~"5.."}`

#### Business Metrics
- **API Gateway Requests**: `http_requests_total{service="api-gateway"}`
- **Auth Service Login Success**: `auth_login_success_total`
- **Content Service Operations**: `content_operations_total`
- **Subscription Events**: `subscription_events_total`

---

## 🔍 Troubleshooting Commands

### Check Service Discovery
```bash
# Check if services are being discovered
kubectl get servicemonitors -n monitoring
kubectl describe servicemonitor ha-health-monitor -n monitoring

# Check Prometheus targets
# Access Prometheus UI -> Status -> Targets
```

### Debug Prometheus Configuration
```bash
# Check Prometheus config reload
kubectl logs -n monitoring prometheus-operator-kube-p-prometheus-0 -c prometheus

# Validate configuration
kubectl exec -n monitoring prometheus-operator-kube-p-prometheus-0 -c prometheus -- \
  promtool check config /etc/prometheus/config_out/prometheus.env.yaml
```

### Monitor Resource Usage
```bash
# Check monitoring namespace resource usage
kubectl top pods -n monitoring
kubectl top nodes

# Check persistent volumes for data storage
kubectl get pv -n monitoring
kubectl get pvc -n monitoring
```

---

## 📋 Monitoring Checklist

### ✅ Deployment Verification
- [ ] Monitoring namespace created
- [ ] Prometheus Operator installed
- [ ] Custom Prometheus config applied
- [ ] Grafana datasources configured
- [ ] ServiceMonitors deployed
- [ ] Alert rules configured

### ✅ Service Integration
- [ ] API Gateway metrics endpoint added
- [ ] Auth Service metrics endpoint added  
- [ ] Content Service metrics endpoint added
- [ ] Subscription Service metrics endpoint added
- [ ] Service annotations for discovery added

### ✅ Access Configuration
- [ ] Prometheus UI accessible
- [ ] Grafana UI accessible
- [ ] LoadBalancer services created (production)
- [ ] Custom dashboards imported
- [ ] Alert manager configured

### ✅ Monitoring Validation
- [ ] All services appearing in Prometheus targets
- [ ] Metrics being collected successfully
- [ ] Dashboards showing data
- [ ] Alerts triggering correctly
- [ ] ServiceMonitors discovering services

---

## 🎯 Quick Start Commands Summary

```bash
# 1. Create namespace and deploy basic monitoring
kubectl create namespace monitoring

# 2. Install Prometheus Operator
helm install prometheus-operator prometheus-community/kube-prometheus-stack --namespace monitoring

# 3. Apply your custom configurations
kubectl apply -f infrastructure/kubernetes/base/monitoring/grafana/datasources.yaml
kubectl apply -f infrastructure/kubernetes/high-availability/health-monitoring/prometheus-monitoring.yaml

# 4. Access services
kubectl port-forward -n monitoring svc/prometheus-operator-kube-p-prometheus 9090:9090 &
kubectl port-forward -n monitoring svc/prometheus-operator-grafana 3000:80 &

# 5. Check status
kubectl get all -n monitoring
```

Your monitoring infrastructure is comprehensively prepared - it just needs deployment! 🚀
