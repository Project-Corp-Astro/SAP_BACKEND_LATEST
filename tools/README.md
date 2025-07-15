# 🛠️ Development Tools & Scripts

**Utility scripts and tools for SAP Backend development and operations**

## 📁 Directory Structure

```
tools/
├── scripts/                 # Implementation and utility scripts
│   ├── es-init.ts          # Elasticsearch initialization
│   ├── es-reindex.ts       # Elasticsearch reindexing
│   ├── migrate-to-rbac.ts  # RBAC migration script
│   ├── pg-migrate.ts       # PostgreSQL migrations
│   ├── pg-seed.ts          # Database seeding
│   └── utils/              # Shared utility functions
│
├── health-monitoring/       # Health check and monitoring tools
│   ├── health-check.js     # Service health verification
│   ├── monitoring-setup.js # Monitoring stack setup
│   └── alert-rules/        # Prometheus alert configurations
│
└── testing/                # Testing frameworks and utilities
    ├── integration-tests/  # Integration test suites
    ├── performance-tests/  # Performance and load testing
    └── test-utilities/     # Shared testing utilities
```

## 🚀 Quick Start

### Database Operations
```bash
# Initialize Elasticsearch
npm run script:es-init

# Run PostgreSQL migrations
npm run script:pg-migrate

# Seed database with initial data
npm run script:pg-seed

# Migrate to RBAC system
npm run script:migrate-rbac
```

### Health Monitoring
```bash
# Check all service health
node tools/health-monitoring/health-check.js

# Setup monitoring stack
node tools/health-monitoring/monitoring-setup.js
```

### Testing
```bash
# Run integration tests
cd tools/testing/integration-tests
npm test

# Run performance tests
cd tools/testing/performance-tests
npm run test:performance
```

## 📊 Available Scripts

| Script | Purpose | Usage | Status |
|--------|---------|-------|--------|
| **es-init.ts** | Elasticsearch setup | `npm run script:es-init` | ✅ Ready |
| **es-reindex.ts** | Reindex ES data | `npm run script:es-reindex` | ✅ Ready |
| **migrate-to-rbac.ts** | RBAC migration | `npm run script:migrate-rbac` | ✅ Ready |
| **pg-migrate.ts** | Database migrations | `npm run script:pg-migrate` | ✅ Ready |
| **pg-seed.ts** | Database seeding | `npm run script:pg-seed` | ✅ Ready |
| **health-check.js** | Service health checks | `node health-check.js` | ✅ Ready |

## 🔧 Script Categories

### Database Management
- **Migration scripts**: Handle database schema changes
- **Seeding scripts**: Populate databases with initial data
- **Elasticsearch tools**: Index management and optimization
- **RBAC migration**: Transform legacy auth to RBAC system

### Health & Monitoring
- **Health checks**: Verify service availability and performance
- **Monitoring setup**: Configure Prometheus, Grafana, alerts
- **Alert rules**: Define alerting conditions and thresholds
- **Dashboard creation**: Automated dashboard deployment

### Testing Utilities
- **Integration tests**: End-to-end service testing
- **Performance tests**: Load testing and benchmarking
- **Test data generation**: Create test datasets
- **Mock services**: Testing environment setup

## 🛡️ Security Scripts

### RBAC Migration (`migrate-to-rbac.ts`)
Transforms the existing authentication system to Role-Based Access Control:

```typescript
// Key features:
- User role assignment
- Permission mapping
- Legacy data migration
- Validation and rollback
```

**Usage:**
```bash
npm run script:migrate-rbac
```

### Security Validation
- **Permission auditing**: Verify RBAC configurations
- **Security scanning**: Check for vulnerabilities
- **Compliance testing**: Validate against security standards

## 📈 Monitoring Tools

### Health Check System (`health-check.js`)
Comprehensive health monitoring for all services:

```javascript
// Monitors:
- Service availability
- Response times
- Database connections
- Cache performance
- External API health
```

### Alert Configuration
Pre-configured Prometheus alert rules for:
- **Service downtime**
- **High error rates**
- **Performance degradation**
- **Resource exhaustion**
- **Security incidents**

## 🧪 Testing Framework

### Integration Tests
Complete end-to-end testing suite:
- **API endpoint testing**
- **Database integration**
- **Service communication**
- **Authentication flows**
- **Business logic validation**

### Performance Tests
Load testing and benchmarking:
- **Concurrent user simulation**
- **API response time measurement**
- **Database performance testing**
- **Cache efficiency analysis**
- **Resource utilization monitoring**

## 🔧 Utility Functions

### Shared Utilities (`utils/`)
Common functions used across scripts:
- **Database connections**
- **Configuration management**
- **Logging and error handling**
- **Data validation**
- **API communication helpers**

### Environment Management
- **Configuration loading**
- **Environment validation**
- **Secret management**
- **Service discovery**

## 📝 Script Usage Examples

### Database Initialization
```bash
# Full database setup
npm run script:pg-migrate
npm run script:pg-seed
npm run script:es-init

# Verify setup
node tools/health-monitoring/health-check.js
```

### RBAC System Setup
```bash
# Migrate existing users to RBAC
npm run script:migrate-rbac

# Seed role permissions
npm run script:rolepermissionseed

# Verify RBAC configuration
npm run test:rbac
```

### Production Health Check
```bash
# Run comprehensive health check
node tools/health-monitoring/health-check.js --env=production

# Setup monitoring dashboards
node tools/health-monitoring/monitoring-setup.js
```

## 🔗 Related Documentation

- **Database Setup**: [`../backend/database-setup.md`](../backend/database-setup.md)
- **Testing Guide**: [`../docs/development/testing.md`](../docs/development/testing.md)
- **Monitoring**: [`../infrastructure/monitoring/`](../infrastructure/monitoring/)

## 📞 Support

### Common Issues
1. **Database connection failures**: Check connection strings and credentials
2. **Migration errors**: Review migration logs and database state
3. **Health check timeouts**: Verify service availability and network connectivity
4. **Test failures**: Check test environment configuration and data

### Debugging Commands
```bash
# Verbose script execution
npm run script:pg-migrate -- --verbose

# Debug health checks
DEBUG=* node tools/health-monitoring/health-check.js

# Test database connectivity
npm run test:db-connection
```

---

**Tools Status**: Production Ready  
**Script Coverage**: 100% of core operations  
**Testing Framework**: Complete integration and performance suites  
**Last Updated**: July 14, 2025
