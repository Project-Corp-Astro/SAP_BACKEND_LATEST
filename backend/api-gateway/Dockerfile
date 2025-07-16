# 🚀 Multi-Stage Dockerfile for API Gateway
# Optimized for production deployment with security hardening
# Build size target: < 150MB | Startup time: < 10 seconds

# ================================
# Stage 1: Base Dependencies
# ================================
FROM node:18-alpine AS base

# Set security and performance environment variables
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false \
    NODE_OPTIONS="--max-old-space-size=256" \
    PORT=5001

# Install security updates and required system packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tzdata && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gateway -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# ================================
# Stage 2: Development Dependencies
# ================================
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm ci --include=dev --no-audit --no-fund

# Copy source code
COPY src/ ./src/
COPY typedoc.json ./

# Build the application
RUN npm run build && \
    npm run docs && \
    npm cache clean --force

# ================================
# Stage 3: Production Dependencies
# ================================
FROM base AS production-deps

# Install only production dependencies
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# ================================
# Stage 4: Production Runtime
# ================================
FROM node:18-alpine AS production

# Security and performance environment
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=256" \
    PORT=5001 \
    TINI_SUBREAPER=true

# Install minimal runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gateway -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=production-deps --chown=gateway:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=development --chown=gateway:nodejs /app/dist ./dist
COPY --from=development --chown=gateway:nodejs /app/package.json ./

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R gateway:nodejs /app/logs

# Security: Remove potential attack vectors
RUN rm -rf /tmp/* /var/tmp/* /root/.npm /root/.cache

# Switch to non-root user
USER gateway

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

# Expose port
EXPOSE 5001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# ================================
# Production Image Metadata
# ================================
LABEL maintainer="SAP Backend Team" \
      version="1.0.0" \
      description="API Gateway for SAP Backend" \
      service="api-gateway" \
      environment="production" \
      security.scan="required" \
      performance.target="startup<10s,memory<256MB"
