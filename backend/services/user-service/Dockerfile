# 👥 Multi-Stage Dockerfile for User Service
# Optimized for user management and RBAC operations
# Build size target: < 170MB | Startup time: < 12 seconds

# ================================
# Stage 1: Base Dependencies
# ================================
FROM node:18-alpine AS base

# User service environment configuration
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false \
    NODE_OPTIONS="--max-old-space-size=384" \
    PORT=3002

# Install system dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S userservice -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# ================================
# Stage 2: Development Dependencies
# ================================
FROM base AS development

# Install all dependencies
RUN npm ci --include=dev --no-audit --no-fund

# Copy source code
COPY src/ ./src/
COPY jest.config.js ./

# Build and test
RUN npm run build && \
    npm run test --if-present && \
    npm cache clean --force

# ================================
# Stage 3: Production Dependencies
# ================================
FROM base AS production-deps

# Install production dependencies only
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# ================================
# Stage 4: Production Runtime
# ================================
FROM node:18-alpine AS production

# Production environment for user service
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=384" \
    PORT=3002 \
    TINI_SUBREAPER=true

# Install minimal runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S userservice -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=production-deps --chown=userservice:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=development --chown=userservice:nodejs /app/dist ./dist
COPY --from=development --chown=userservice:nodejs /app/package.json ./

# Create application directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R userservice:nodejs /app/logs /app/uploads && \
    chmod 755 /app/uploads

# Security cleanup
RUN rm -rf /tmp/* /var/tmp/* /root/.npm /root/.cache

# Switch to non-root user
USER userservice

# Health check for user service
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Expose port
EXPOSE 3002

# Signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start user service
CMD ["node", "dist/index.js"]

# ================================
# Metadata
# ================================
LABEL maintainer="SAP Backend Team" \
      version="1.0.0" \
      description="User Management Service for SAP Backend" \
      service="user-service" \
      environment="production" \
      security.scan="required" \
      features="RBAC,profiles,permissions" \
      performance.target="startup<12s,memory<384MB"
