# 📝 Multi-Stage Dockerfile for Content Service
# Optimized for content management and Elasticsearch integration

# ================================
# Stage 1: Base Dependencies
# ================================
FROM node:18-alpine AS base

# Build argument for environment
ARG BUILD_ENV=production

# Content service environment
ENV NODE_ENV=$BUILD_ENV \
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

# ================================
# Stage 2: Build Dependencies
# ================================
FROM base AS builder

# Install build tools
RUN apk add --no-cache python3 make g++

# Copy and build the packages first
COPY ../../packages/ ./packages/
WORKDIR /app/packages
RUN npm install --legacy-peer-deps --include=dev && npm run build

# Copy shared utilities
WORKDIR /app
COPY ../../shared/ ./shared/

# Copy service files
COPY services/content-service/package*.json ./
COPY services/content-service/tsconfig.json ./

# Install all dependencies (including dev for building)
ENV NODE_ENV=development
RUN npm install --legacy-peer-deps

# Copy source code
COPY services/content-service/src/ ./src/

# Build the application
RUN npm run build

# ================================
# Stage 3: Production Runtime
# ================================
FROM node:18-alpine AS production

# Production environment
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512" \
    PORT=3005

# Install runtime dependencies
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

# Copy built packages and dependencies from builder stage
COPY --from=builder --chown=contentuser:nodejs /app/packages ./packages
COPY --from=builder --chown=contentuser:nodejs /app/shared ./shared
COPY --from=builder --chown=contentuser:nodejs /app/node_modules ./node_modules

# Copy package files and built application
COPY --from=builder --chown=contentuser:nodejs /app/package*.json ./
COPY --from=builder --chown=contentuser:nodejs /app/dist ./dist

# Clean up dev dependencies but keep the built local package
RUN npm prune --production

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/media /app/temp && \
    chown -R contentuser:nodejs /app && \
    chmod 755 /app/uploads /app/media

# Switch to non-root user
USER contentuser

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:3005/health || exit 1

# Expose port
EXPOSE 3005

# Signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

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
      dependencies="mongodb" \
      performance.target="startup<15s,memory<512MB"
