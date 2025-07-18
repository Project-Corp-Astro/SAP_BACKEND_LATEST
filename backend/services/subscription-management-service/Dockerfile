# 💳 Multi-Stage Dockerfile for Subscription Service
# Optimized for billing and subscription management
# Build size target: < 175MB | Startup time: < 13 seconds

# ================================
# Stage 1: Base Dependencies
# ================================
FROM node:18-alpine AS base

# Subscription service environment
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false \
    NODE_OPTIONS="--max-old-space-size=384" \
    PORT=3003

# Install system dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    ca-certificates \
    openssl && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S subuser -u 1001 -G nodejs

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

# Build the application (skip tests since jest.config.js doesn't exist)
RUN npm run build && \
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

# Production environment for subscription service
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=384" \
    PORT=3003 \
    TINI_SUBREAPER=true

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    ca-certificates \
    openssl && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S subuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=production-deps --chown=subuser:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=development --chown=subuser:nodejs /app/dist ./dist
COPY --from=development --chown=subuser:nodejs /app/package.json ./

# Create service directories
RUN mkdir -p /app/logs /app/invoices /app/reports && \
    chown -R subuser:nodejs /app/logs /app/invoices /app/reports && \
    chmod 755 /app/invoices /app/reports

# Security cleanup
RUN rm -rf /tmp/* /var/tmp/* /root/.npm /root/.cache

# Switch to non-root user
USER subuser

# Health check for subscription service
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Expose port
EXPOSE 3003

# Signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start subscription service
CMD ["node", "dist/index.js"]

# ================================
# Metadata
# ================================
LABEL maintainer="SAP Backend Team" \
      version="1.0.0" \
      description="Subscription Management Service for SAP Backend" \
      service="subscription-service" \
      environment="production" \
      security.scan="required" \
      features="billing,subscriptions,payments" \
      dependencies="postgresql,redis" \
      compliance="PCI-DSS" \
      performance.target="startup<13s,memory<384MB"
