# 🔧 Permission Client Package - Docker Build Solutions

## Problem Analysis

The `@corp-astro/permission-client` package is causing module resolution issues in Docker builds due to:

1. **Local file dependencies** (`file:../../packages`) breaking in containers
2. **Complex build context** with relative paths
3. **TypeScript path mapping conflicts**
4. **Workspace monorepo structure** not properly handled

## Solution 1: Workspace Monorepo (RECOMMENDED) ⭐

### Implementation Steps:

1. **Update Root Package.json**
```json
{
  "workspaces": [
    "api-gateway",
    "services/*", 
    "packages/*",
    "shared"
  ]
}
```

2. **Move Package to Root Level**
```bash
# Move from backend/packages to packages/
mkdir -p packages/permission-client
mv backend/packages/* packages/permission-client/
```

3. **Update Package Dependencies**
```json
{
  "dependencies": {
    "@sap/permission-client": "workspace:*"
  }
}
```

4. **Use Workspace Dockerfile**
```dockerfile
# Copy entire workspace for proper dependency resolution
COPY package*.json ./
COPY packages/ ./packages/
RUN npm ci --workspaces
```

## Solution 2: Inline Module Approach

### Move permission logic directly into services:

1. **Create shared middleware directory**
```bash
mkdir -p shared/middleware
```

2. **Move permission-client to shared**
```typescript
// shared/middleware/permission.middleware.ts
export function requireRemotePermission(permission: string) {
  // Implementation here
}
```

3. **Update imports**
```typescript
import { requireRemotePermission } from '../../shared/middleware/permission.middleware';
```

## Solution 3: Published Package Approach

### Publish to npm registry:

1. **Build and publish package**
```bash
cd packages/permission-client
npm run build
npm publish --registry=https://npm.pkg.github.com
```

2. **Update service dependencies**
```json
{
  "dependencies": {
    "@sap/permission-client": "^1.0.0"
  }
}
```

## Solution 4: Docker Multi-Stage Build (CURRENT FIX)

### Use the provided `Dockerfile.workspace`:

```bash
# Build with workspace-aware Dockerfile
docker build -f Dockerfile.workspace -t content-service .
```

### Benefits:
- ✅ Proper workspace dependency resolution
- ✅ Optimized multi-stage builds
- ✅ Production-ready container
- ✅ Maintains package structure

## Immediate Action Plan

1. **Use Solution 1 (Workspace Monorepo)**
2. **Apply the new Dockerfile.workspace**
3. **Update all service imports to use `@sap/permission-client`**
4. **Test locally with `npm run build`**
5. **Deploy with new Docker configuration**

## Testing Commands

```bash
# Build workspace packages
npm run build:shared

# Test service builds
cd backend/services/content-service
npm run build

# Test Docker build
docker build -f Dockerfile.workspace -t content-service .
```
