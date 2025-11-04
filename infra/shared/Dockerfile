# Multi-stage Dockerfile for NestJS microservices
# Optimized for production with minimal image size and better layer caching
# Usage: docker build --build-arg APP_NAME=auth -t heidi-auth -f infra/shared/Dockerfile .

ARG NODE_VERSION=24.11.0

# Stage 1: Base image with minimal runtime dependencies
FROM node:${NODE_VERSION}-alpine AS base

# Install essential runtime dependencies
# OpenSSL is required for Prisma Client at runtime
RUN apk add --no-cache dumb-init curl wget openssl libc6-compat ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Stage 2: Dependencies installation (shared layer for better caching)
FROM base AS deps

# Copy package files for dependency installation
COPY package.json package-lock.json* ./
COPY tsconfig.json nest-cli.json ./

# Install production dependencies only
# npm ci is faster and more reliable than npm install for Docker builds
# Using --legacy-peer-deps to match Yarn's peer dependency handling
RUN npm ci --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Stage 3: Prisma generation (cached - runs once for all services)
# This stage is cached separately and only rebuilt when Prisma schemas or script change
FROM base AS prisma-generate

# Install build dependencies for Prisma generation
# Note: openssl, libc6-compat, ca-certificates are already in base stage
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    bash \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (needed for Prisma CLI)
RUN npm ci --legacy-peer-deps

# Copy Prisma schemas and generation script
# These files determine cache invalidation - only rebuild when they change
COPY libs/prisma/src/schemas/ ./libs/prisma/src/schemas/
COPY scripts/prisma-generate-all.sh ./scripts/prisma-generate-all.sh
RUN chmod +x scripts/prisma-generate-all.sh

# Generate all Prisma clients once (cached across all service builds)
RUN bash scripts/prisma-generate-all.sh

# Remove build dependencies (keep only Prisma generated files)
RUN apk del .build-deps

# Stage 4: Build stage
FROM base AS build

# Install build dependencies (including bash for scripts)
# Note: openssl, libc6-compat, ca-certificates are already in base stage
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    bash \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package.json package-lock.json* ./
COPY tsconfig.json nest-cli.json ./

# Install all dependencies (including dev dependencies for building)
# npm ci is faster and more reliable than npm install for Docker builds
# Using --legacy-peer-deps to match Yarn's peer dependency handling
RUN npm ci --legacy-peer-deps

# Copy source code
COPY apps/ ./apps/
COPY libs/ ./libs/

# Build argument for service name
ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# Build the specific app
# Limit Node.js memory to prevent resource exhaustion during builds
RUN npm run build:${APP_NAME}

# Remove build dependencies to reduce image size
RUN apk del .build-deps

# Stage 5: Production runtime (minimal image)
FROM base AS production

WORKDIR /app

ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production

# Copy only production dependencies from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from build stage
COPY --from=build --chown=nestjs:nodejs /app/dist/apps/${APP_NAME} ./dist

# Copy Prisma generated client directly from prisma-generate stage (required at runtime)
# These are generated artifacts and don't change during build, so copy directly from source
COPY --from=prisma-generate --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma-generate --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy necessary libs that might be needed at runtime (includes Prisma schemas at libs/prisma/src/schemas/)
COPY --from=build --chown=nestjs:nodejs /app/libs ./libs

# Create logs directory
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

USER nestjs

# Health check (uses default port, actual port comes from SERVICE_PORT env var)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.SERVICE_PORT || '3000') + '/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
