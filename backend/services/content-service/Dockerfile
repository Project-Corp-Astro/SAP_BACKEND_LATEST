# 📝 Multi-Stage Dockerfile for Content Service
# Optimized for content management and Elasticsearch integration
# Build size target: < 190MB | Startup time: < 15 seconds

# ================================
# Stage 1: Base Dependencies
# ================================
FROM node:18-alpine AS base

# Content service environment
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false \
    NODE_OPTIONS="--max-old-space-size=512" \
    PORT=3005

# Install system dependencies including media processing tools
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    ca-certificates \
    imagemagick \
    ffmpeg && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S contentuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy the packages directory (already built)
COPY ../../packages/ ./packages/

# Copy the shared directory for shared utilities
COPY ../../shared/ ./shared/

# Return to app directory and copy content service files
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./

# ================================
# Stage 2: Development Dependencies  
# ================================
FROM base AS development

# Install all dependencies including devDependencies
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source code directly (no build step - using ts-node in production)
COPY src/ ./src/

# ================================
# Stage 3: Production Dependencies
# ================================
FROM base AS production-deps

# Install ALL dependencies including dev dependencies for ts-node runtime
RUN npm install --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

# ================================
# Stage 4: Production Runtime
# ================================
FROM node:18-alpine AS production

# Production environment for content service
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512" \
    PORT=3005 \
    TINI_SUBREAPER=true \
    MAX_FILE_SIZE=50MB

# Install runtime dependencies for content processing
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    ca-certificates \
    imagemagick \
    ffmpeg && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S contentuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=production-deps --chown=contentuser:nodejs /app/node_modules ./node_modules

# Install ts-node globally for runtime execution
RUN npm install -g ts-node typescript

# Copy the built packages  
COPY --from=development --chown=contentuser:nodejs /app/packages ./packages

# Copy source application and packages
COPY --from=development --chown=contentuser:nodejs /app/src ./src
COPY --from=development --chown=contentuser:nodejs /app/packages ./packages
COPY --from=development --chown=contentuser:nodejs /app/package.json ./
COPY --from=development --chown=contentuser:nodejs /app/tsconfig.json ./

# Create content directories with proper permissions
RUN mkdir -p /app/logs /app/uploads /app/media /app/temp && \
    chown -R contentuser:nodejs /app/logs /app/uploads /app/media /app/temp && \
    chmod 755 /app/uploads /app/media && \
    chmod 700 /app/temp

# Security cleanup
RUN rm -rf /tmp/* /var/tmp/* /root/.npm /root/.cache

# Switch to non-root user
USER contentuser

# Health check for content service
HEALTHCHECK --interval=30s --timeout=15s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:3005/health || exit 1

# Expose port
EXPOSE 3005

# Signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start content service with ts-node
CMD ["npm", "start"]

# ================================
# Metadata
# ================================
LABEL maintainer="SAP Backend Team" \
      version="1.0.0" \
      description="Content Management Service for SAP Backend" \
      service="content-service" \
      environment="production" \
      security.scan="required" \
      features="CMS,search,media-processing" \
      dependencies="elasticsearch,mongodb" \
      performance.target="startup<15s,memory<512MB"
