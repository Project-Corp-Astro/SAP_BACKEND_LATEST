# 🚀 Deployment Configurations

**GitOps and deployment manifests for SAP Backend microservices**

## 📁 Directory Structure

```
deployment/
└── gitops/                  # ArgoCD GitOps configurations
    ├── applications/        # ArgoCD application definitions
    ├── projects/            # ArgoCD project configurations
    ├── repositories/        # Git repository connections
    └── sync-policies/       # Automated synchronization policies
```

## 🎯 GitOps with ArgoCD

This directory contains all GitOps configurations for automated deployment using ArgoCD. The GitOps approach ensures:

- **Declarative configuration** management
- **Version-controlled deployments**
- **Automated synchronization** between Git and Kubernetes
- **Rollback capabilities** for safe deployments
- **Multi-environment support** (dev, staging, production)

## 📊 Deployment Components

| Component | Purpose | Configuration | Status |
|-----------|---------|---------------|--------|
| **Applications** | ArgoCD app definitions | Service deployment configs | ✅ Ready |
| **Projects** | Environment separation | RBAC and resource management | ✅ Ready |
| **Repositories** | Git source connections | Private repo access | ✅ Ready |
| **Sync Policies** | Automated deployment | Health checks, rollback | ✅ Ready |

## 🛠️ ArgoCD Applications

### Core Services
- **api-gateway**: Central routing and load balancing
- **auth-service**: Authentication and authorization
- **user-service**: User management operations
- **content-service**: Content management and delivery
- **subscription-service**: Subscription and billing

### Infrastructure Services
- **monitoring-stack**: Prometheus, Grafana, alerting
- **logging-stack**: ELK stack for centralized logging
- **security-stack**: RBAC, network policies, secrets

## 🔧 Deployment Process

### 1. Initial Setup
```bash
# Install ArgoCD in cluster
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Apply ArgoCD configurations
kubectl apply -f gitops/projects/
kubectl apply -f gitops/repositories/
kubectl apply -f gitops/applications/
```

### 2. Access ArgoCD UI
```bash
# Get ArgoCD admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### 3. Sync Applications
- Applications will automatically sync based on sync policies
- Manual sync available through ArgoCD UI or CLI
- Health status monitoring for all deployments

## 📈 Deployment Features

### Automated Synchronization
- **Git-based triggers**: Automatic deployment on Git commits
- **Health monitoring**: Continuous health checks
- **Rollback automation**: Automatic rollback on deployment failures

### Multi-Environment Support
- **Environment separation**: Different ArgoCD projects per environment
- **Configuration management**: Environment-specific values
- **Progressive deployment**: Staged rollouts across environments

### Security & Compliance
- **RBAC integration**: Role-based deployment permissions
- **Secret management**: Secure handling of sensitive data
- **Audit logging**: Complete deployment audit trail

## 🔄 Sync Policies

### Application Sync
```yaml
syncPolicy:
  automated:
    prune: true      # Remove resources not in Git
    selfHeal: true   # Automatically fix drift
  syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
```

### Health Checks
- **Readiness probes**: Ensure services are ready
- **Liveness probes**: Monitor service health
- **Custom health checks**: Application-specific health validation

## 🎯 Best Practices

### Git Workflow
1. **Feature branches**: Develop features in separate branches
2. **Pull requests**: Code review before merging
3. **Protected main branch**: Prevent direct commits to main
4. **Automated testing**: CI/CD validation before deployment

### ArgoCD Management
1. **Application of Applications**: Manage ArgoCD apps with ArgoCD
2. **Resource quotas**: Limit resource usage per environment
3. **RBAC policies**: Restrict access based on roles
4. **Monitoring**: Track deployment metrics and health

## 🔗 Related Documentation

- **GCP Deployment Guide**: [`../docs/deployment/gcp-deployment-guide.md`](../docs/deployment/gcp-deployment-guide.md)
- **Infrastructure Configs**: [`../infrastructure/`](../infrastructure/)
- **Security Policies**: [`../docs/security/`](../docs/security/)

## 📞 Troubleshooting

### Common Issues
1. **Sync failures**: Check ArgoCD logs and application health
2. **Resource conflicts**: Verify RBAC permissions and quotas
3. **Git connectivity**: Ensure repository access and credentials
4. **Health check failures**: Review application logs and metrics

### Monitoring Commands
```bash
# Check ArgoCD application status
argocd app list

# Get application details
argocd app get <app-name>

# Sync application manually
argocd app sync <app-name>

# View application logs
argocd app logs <app-name>
```

---

**Deployment Status**: Production Ready  
**ArgoCD Version**: 2.8+  
**GitOps Model**: Fully Implemented  
**Multi-Environment**: Supported
