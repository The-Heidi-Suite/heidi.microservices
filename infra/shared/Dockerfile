# Multi-stage Dockerfile for NestJS microservices
# Optimized for production with minimal image size and better layer caching
# Usage: docker build --build-arg APP_NAME=auth -t heidi-auth -f infra/shared/Dockerfile .

ARG NODE_VERSION=24.11.0

# Stage 1: Base image with minimal runtime dependencies
FROM node:${NODE_VERSION}-alpine AS base

# Install essential runtime dependencies
RUN apk add --no-cache dumb-init curl wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Stage 2: Dependencies installation (shared layer for better caching)
FROM base AS deps

# Copy package files for dependency installation
COPY package.json yarn.lock ./
COPY tsconfig.json nest-cli.json ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production && \
    yarn cache clean

# Stage 3: Build stage
FROM base AS build

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package.json yarn.lock ./
COPY tsconfig.json nest-cli.json ./

# Install all dependencies (including dev dependencies for building)
RUN yarn install --frozen-lockfile

# Copy source code
COPY apps/ ./apps/
COPY libs/ ./libs/

# Build argument for service name
ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# Generate Prisma Client (required for build)
RUN yarn prisma:generate

# Build the specific app
RUN yarn build:${APP_NAME}

# Remove build dependencies to reduce image size
RUN apk del .build-deps

# Stage 4: Production runtime (minimal image)
FROM base AS production

WORKDIR /app

ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production

# Copy only production dependencies from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from build stage
COPY --from=build --chown=nestjs:nodejs /app/dist/apps/${APP_NAME} ./dist

# Copy Prisma schema and generated client (required at runtime)
COPY --from=build --chown=nestjs:nodejs /app/libs/prisma/schema ./libs/prisma/schema
COPY --from=build --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy necessary libs that might be needed at runtime
COPY --from=build --chown=nestjs:nodejs /app/libs ./libs

# Create logs directory
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

USER nestjs

# Expose port (will be overridden by environment variable)
EXPOSE 3000

# Health check (uses default port, actual port comes from SERVICE_PORT env var)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.SERVICE_PORT || '3000') + '/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
