# 🔐 Multi-Stage Dockerfile for Auth Service
# Security-hardened for authentication service
# Build size target: < 180MB | Startup time: < 15 seconds

# ================================
# Stage 1: Base Dependencies
# ================================
FROM node:18-alpine AS base

# Security-focused environment variables
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false \
    NODE_OPTIONS="--max-old-space-size=512" \
    PORT=3001

# Install security updates and crypto dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    openssl \
    ca-certificates \
    tzdata && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S authuser -u 1001 -G nodejs

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
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source code
COPY src/ ./src/
COPY jest.config.js ./

# Build the application
RUN npm run build && \
    npm run test --if-present && \
    npm cache clean --force

# ================================
# Stage 3: Production Dependencies
# ================================
FROM base AS production-deps

# Install only production dependencies
RUN npm install --production --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

# ================================
# Stage 4: Production Runtime
# ================================
FROM node:18-alpine AS production

# Security environment for auth service
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512" \
    PORT=3001 \
    TINI_SUBREAPER=true \
    JWT_ALGORITHM=HS256

# Install minimal runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    openssl \
    ca-certificates \
    tzdata && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S authuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=production-deps --chown=authuser:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=development --chown=authuser:nodejs /app/dist ./dist
COPY --from=development --chown=authuser:nodejs /app/package.json ./

# Create secure directories
RUN mkdir -p /app/logs /app/keys && \
    chown -R authuser:nodejs /app/logs /app/keys && \
    chmod 700 /app/keys

# Security: Remove potential attack vectors and create secure temp
RUN rm -rf /tmp/* /var/tmp/* /root/.npm /root/.cache && \
    mkdir -p /tmp && chmod 1777 /tmp

# Switch to non-root user
USER authuser

# Health check with auth-specific endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the auth service
CMD ["node", "dist/index.js"]

# ================================
# Security Metadata
# ================================
LABEL maintainer="SAP Security Team" \
      version="1.0.0" \
      description="Authentication Service for SAP Backend" \
      service="auth-service" \
      environment="production" \
      security.level="critical" \
      security.scan="required" \
      compliance="SOC2,GDPR" \
      performance.target="startup<15s,memory<512MB"
